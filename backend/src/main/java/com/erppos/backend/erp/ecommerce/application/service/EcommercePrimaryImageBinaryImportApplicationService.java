package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.ecommerce.application.port.EcommercePrimaryImageBinaryArchivePort;
import com.erppos.backend.erp.ecommerce.application.port.EcommercePrimaryImageBinaryImportWorkbookPort;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageBinaryImportUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportAction;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EcommercePrimaryImageBinaryImportApplicationService implements EcommercePrimaryImageBinaryImportUseCase {
    private static final int TEMPLATE_PAGE_SIZE = 500;
    private static final String WARNING_PUBLISHED_PROFILE = "Perfil publicado cambiara imagen visible publicamente.";
    private static final String WARNING_REPLACE_PRIMARY = "Sobrescribira imagen principal existente.";
    private static final String WARNING_STORAGE_CONSISTENCY = "Importacion parcial: S3 y BD no comparten transaccion global; si una fila falla se reporta individualmente.";
    private static final String WARNING_STOREFRONT_PUBLIC_RENDER = "Validar render en Storefront staging publico despues de confirmar importacion.";

    private final EcommercePrimaryImageBinaryImportWorkbookPort workbookPort;
    private final EcommercePrimaryImageBinaryArchivePort archivePort;
    private final ProductRepositoryPort productRepositoryPort;
    private final ProductOnlineProfileRepositoryPort profileRepositoryPort;
    private final ProductAssetRepositoryPort assetRepositoryPort;
    private final EcommerceProductImageBinaryService productImageBinaryService;
    private final AuditUserProvider auditUserProvider;

    public EcommercePrimaryImageBinaryImportApplicationService(
            EcommercePrimaryImageBinaryImportWorkbookPort workbookPort,
            EcommercePrimaryImageBinaryArchivePort archivePort,
            ProductRepositoryPort productRepositoryPort,
            ProductOnlineProfileRepositoryPort profileRepositoryPort,
            ProductAssetRepositoryPort assetRepositoryPort,
            EcommerceProductImageBinaryService productImageBinaryService,
            AuditUserProvider auditUserProvider
    ) {
        this.workbookPort = workbookPort;
        this.archivePort = archivePort;
        this.productRepositoryPort = productRepositoryPort;
        this.profileRepositoryPort = profileRepositoryPort;
        this.assetRepositoryPort = assetRepositoryPort;
        this.productImageBinaryService = productImageBinaryService;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public byte[] downloadTemplate() {
        return workbookPort.createTemplate(buildTemplateData());
    }

    @Override
    public PreviewResult preview(String workbookFilename, byte[] workbookContent, String archiveFilename, byte[] archiveContent) {
        ImportInput input = parseInput(workbookFilename, workbookContent, archiveFilename, archiveContent);
        return toPreviewResult(validateRows(input.rows(), input.archiveImages()));
    }

    @Override
    public ConfirmResult confirmFile(String workbookFilename, byte[] workbookContent, String archiveFilename, byte[] archiveContent) {
        ImportInput input = parseInput(workbookFilename, workbookContent, archiveFilename, archiveContent);
        if (input.rows().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "workbook does not contain rows");
        }

        List<ValidatedRow> rows = validateRows(input.rows(), input.archiveImages());
        List<ConfirmRowResult> results = new ArrayList<>();
        int createdRows = 0;
        int updatedRows = 0;
        int unchangedRows = 0;

        for (ValidatedRow row : rows) {
            if (!row.valid()) {
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), EcommercePrimaryImageUrlImportAction.REJECT, false, null, null, row.errors(), row.warnings()));
                continue;
            }
            if (row.action() == EcommercePrimaryImageUrlImportAction.NO_CHANGE) {
                unchangedRows += 1;
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), row.action(), true, row.currentAsset().assetUrl(), row.currentAsset().storageKey(), List.of(), row.warnings()));
                continue;
            }

            try {
                EcommerceProductImageBinaryService.StoredProductImage storedImage = productImageBinaryService.store(
                        row.profile(),
                        row.product().name(),
                        row.archiveImage().bytes(),
                        row.archiveImage().normalizedPath(),
                        null
                );
                ProductAsset saved = saveProductAsset(row, storedImage);
                if (row.action() == EcommercePrimaryImageUrlImportAction.CREATE) {
                    createdRows += 1;
                } else if (row.action() == EcommercePrimaryImageUrlImportAction.UPDATE) {
                    updatedRows += 1;
                }
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), row.action(), true, saved.assetUrl(), saved.storageKey(), List.of(), row.warnings()));
            } catch (RuntimeException ex) {
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), row.action(), false, null, null, List.of(errorMessage(ex)), row.warnings()));
            }
        }

        return new ConfirmResult(
                results.size(),
                createdRows,
                updatedRows,
                unchangedRows,
                (int) results.stream().filter(row -> !row.applied()).count(),
                (int) results.stream().filter(row -> !row.warnings().isEmpty()).count(),
                results
        );
    }

    private ImportInput parseInput(String workbookFilename, byte[] workbookContent, String archiveFilename, byte[] archiveContent) {
        validateWorkbookFile(workbookFilename, workbookContent);
        List<ParsedRow> parsedRows = workbookPort.parse(workbookContent);
        Map<String, ArchiveImage> archiveImages = archivePort.parse(archiveFilename, archiveContent);
        return new ImportInput(parsedRows, archiveImages);
    }

    private TemplateData buildTemplateData() {
        List<ProductOnlineProfile> profiles = loadAllProfiles();
        List<Long> productIds = profiles.stream().map(ProductOnlineProfile::productId).distinct().toList();
        Map<Long, Product> productsById = productRepositoryPort.findByIds(productIds).stream()
                .collect(Collectors.toMap(Product::id, product -> product, (left, right) -> left, LinkedHashMap::new));
        Map<Long, ProductAsset> assetsByProfileId = assetRepositoryPort.findPrimaryActiveByProductOnlineProfileIds(
                        profiles.stream().map(ProductOnlineProfile::id).toList()
                ).stream()
                .collect(Collectors.toMap(ProductAsset::productOnlineProfileId, asset -> asset, (left, right) -> left, LinkedHashMap::new));

        List<TemplateRow> rows = profiles.stream()
                .map(profile -> {
                    Product product = productsById.get(profile.productId());
                    ProductAsset asset = assetsByProfileId.get(profile.id());
                    return new TemplateRow(
                            product == null ? null : product.sku(),
                            "images/" + (product == null ? "sku" : product.sku()) + ".jpg",
                            "",
                            "OWN",
                            "true",
                            "",
                            "0",
                            "",
                            product == null ? null : product.name(),
                            profile.publicationStatus().name(),
                            asset == null ? null : asset.assetUrl()
                    );
                })
                .toList();

        return new TemplateData(rows, List.of(
                "MVP 2S.9A: subir .xlsx + .zip; no CSV, presigned URLs ni galeria.",
                "No crea productos ERP ni perfiles online; solo usa SKU existentes con perfil online existente.",
                "No modifica stock, inventario, unidades, costos, precios ERP ni categorias ERP.",
                "sku, imageFile, altText, source y rightsConfirmed son obligatorios.",
                "imageFile debe apuntar a un JPEG/PNG dentro del ZIP, por ejemplo images/sku.jpg.",
                "El ZIP no puede contener rutas absolutas, .., backslashes, entradas duplicadas ni archivos vacios.",
                "rightsConfirmed debe ser true.",
                "source acepta SUPPLIER, OWN, GENERATED u OTHER.",
                "assetType puede quedar vacio; si se informa solo acepta PRODUCT_IMAGE.",
                "displayOrder vacio usa 0; valores invalidos o negativos se rechazan.",
                "Si el perfil esta PUBLISHED y hay CREATE/UPDATE, publishedUpdateConfirmed debe ser true."
        ));
    }

    private List<ValidatedRow> validateRows(List<ParsedRow> parsedRows, Map<String, ArchiveImage> archiveImages) {
        Map<String, Integer> skuOccurrences = new LinkedHashMap<>();
        Map<String, Integer> imageFileOccurrences = new LinkedHashMap<>();
        Set<String> requestedSkuKeys = new LinkedHashSet<>();
        for (ParsedRow row : parsedRows) {
            String skuKey = normalizeSkuKey(row.sku());
            if (skuKey != null) {
                skuOccurrences.merge(skuKey, 1, Integer::sum);
                requestedSkuKeys.add(skuKey);
            }
            String imageFileKey = normalizeImageFileReference(row.imageFile(), new ArrayList<>());
            if (imageFileKey != null) {
                imageFileOccurrences.merge(imageFileKey, 1, Integer::sum);
            }
        }

        Map<String, Product> productsBySku = productRepositoryPort.findBySkusIgnoreCase(requestedSkuKeys).stream()
                .collect(Collectors.toMap(product -> normalizeSkuKey(product.sku()), product -> product, (left, right) -> left, LinkedHashMap::new));
        List<Long> productIds = productsBySku.values().stream().map(Product::id).toList();
        Map<Long, ProductOnlineProfile> profilesByProductId = profileRepositoryPort.findByProductIds(productIds).stream()
                .collect(Collectors.toMap(ProductOnlineProfile::productId, profile -> profile, (left, right) -> left, LinkedHashMap::new));
        Map<Long, ProductAsset> assetsByProfileId = assetRepositoryPort.findPrimaryActiveByProductOnlineProfileIds(
                        profilesByProductId.values().stream().map(ProductOnlineProfile::id).toList()
                ).stream()
                .collect(Collectors.toMap(ProductAsset::productOnlineProfileId, asset -> asset, (left, right) -> left, LinkedHashMap::new));

        List<ValidatedRow> rows = new ArrayList<>();
        for (ParsedRow parsedRow : parsedRows) {
            rows.add(validateRow(parsedRow, skuOccurrences, imageFileOccurrences, productsBySku, profilesByProductId, assetsByProfileId, archiveImages));
        }
        return rows;
    }

    private ValidatedRow validateRow(
            ParsedRow row,
            Map<String, Integer> skuOccurrences,
            Map<String, Integer> imageFileOccurrences,
            Map<String, Product> productsBySku,
            Map<Long, ProductOnlineProfile> profilesByProductId,
            Map<Long, ProductAsset> assetsByProfileId,
            Map<String, ArchiveImage> archiveImages
    ) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        String sku = trimToNull(row.sku());
        String skuKey = normalizeSkuKey(sku);

        if (sku == null) {
            errors.add("SKU is required");
        } else if (skuOccurrences.getOrDefault(skuKey, 0) > 1) {
            errors.add("SKU is duplicated in workbook");
        }

        Product product = skuKey == null ? null : productsBySku.get(skuKey);
        if (sku != null && product == null) {
            errors.add("SKU not found");
        }
        if (product != null && !product.active()) {
            errors.add("Product is inactive");
        }

        ProductOnlineProfile profile = product == null ? null : profilesByProductId.get(product.id());
        if (product != null && profile == null) {
            errors.add("Online profile not found");
        }

        ProductAsset currentAsset = profile == null ? null : assetsByProfileId.get(profile.id());
        String imageFileKey = normalizeImageFileReference(row.imageFile(), errors);
        ArchiveImage archiveImage = null;
        EcommerceProductImageBinaryService.ValidatedProductImage image = null;
        if (imageFileKey != null) {
            if (imageFileOccurrences.getOrDefault(imageFileKey, 0) > 1) {
                errors.add("imageFile is duplicated in workbook");
            }
            archiveImage = archiveImages.get(imageFileKey);
            if (archiveImage == null) {
                errors.add("imageFile not found in ZIP");
            } else {
                try {
                    image = productImageBinaryService.validate(archiveImage.bytes(), null, archiveImage.normalizedPath());
                } catch (EcommerceBusinessRuleException ex) {
                    errors.add(ex.getMessage());
                }
            }
        }

        String altText = cleanSpaces(row.altText());
        if (altText == null) {
            errors.add("altText is required");
        } else if (altText.length() > 180) {
            errors.add("altText max length is 180");
        }

        AssetSource source = parseSource(row.source(), errors);
        boolean rightsConfirmed = parseRequiredTrue(row.rightsConfirmed(), "rightsConfirmed", errors);
        AssetType assetType = parseAssetType(row.assetType(), errors);
        Integer displayOrder = parseDisplayOrder(row.displayOrder(), errors);
        boolean publishedUpdateConfirmed = parseOptionalTrue(row.publishedUpdateConfirmed());

        EcommercePrimaryImageUrlImportAction desiredAction = determineAction(currentAsset, image, altText, source, rightsConfirmed, assetType, displayOrder);
        if (errors.isEmpty()
                && profile != null
                && profile.publicationStatus() == OnlinePublicationStatus.PUBLISHED
                && desiredAction != EcommercePrimaryImageUrlImportAction.NO_CHANGE) {
            if (!publishedUpdateConfirmed) {
                errors.add("Published profile update requires explicit confirmation");
            } else {
                warnings.add(WARNING_PUBLISHED_PROFILE);
            }
        }
        if (errors.isEmpty() && desiredAction == EcommercePrimaryImageUrlImportAction.UPDATE) {
            warnings.add(WARNING_REPLACE_PRIMARY);
        }
        if (errors.isEmpty() && (desiredAction == EcommercePrimaryImageUrlImportAction.CREATE || desiredAction == EcommercePrimaryImageUrlImportAction.UPDATE)) {
            warnings.add(WARNING_STORAGE_CONSISTENCY);
            warnings.add(WARNING_STOREFRONT_PUBLIC_RENDER);
        }

        boolean valid = errors.isEmpty();
        return new ValidatedRow(
                row.rowNumber(),
                sku,
                product == null ? null : product.id(),
                profile == null ? null : profile.id(),
                product == null ? trimToNull(row.productName()) : product.name(),
                profile == null ? trimToNull(row.publicationStatus()) : profile.publicationStatus().name(),
                product,
                profile,
                currentAsset,
                archiveImage,
                imageFileKey,
                altText,
                source,
                rightsConfirmed,
                assetType,
                displayOrder,
                image,
                valid ? desiredAction : EcommercePrimaryImageUrlImportAction.REJECT,
                valid,
                List.copyOf(errors),
                List.copyOf(warnings)
        );
    }

    private EcommercePrimaryImageUrlImportAction determineAction(
            ProductAsset currentAsset,
            EcommerceProductImageBinaryService.ValidatedProductImage image,
            String altText,
            AssetSource source,
            boolean rightsConfirmed,
            AssetType assetType,
            Integer displayOrder
    ) {
        if (currentAsset == null) {
            return EcommercePrimaryImageUrlImportAction.CREATE;
        }
        if (image == null
                || !Objects.equals(nullToBlank(currentAsset.checksumSha256()), nullToBlank(image.checksumSha256()))
                || !Objects.equals(nullToBlank(currentAsset.altText()), nullToBlank(altText))
                || currentAsset.source() != source
                || currentAsset.rightsConfirmed() != rightsConfirmed
                || currentAsset.assetType() != assetType
                || currentAsset.displayOrder() != (displayOrder == null ? 0 : displayOrder)) {
            return EcommercePrimaryImageUrlImportAction.UPDATE;
        }
        return EcommercePrimaryImageUrlImportAction.NO_CHANGE;
    }

    private ProductAsset saveProductAsset(ValidatedRow row, EcommerceProductImageBinaryService.StoredProductImage storedImage) {
        ProductAsset current = row.currentAsset();
        String actor = auditUserProvider.currentUsername();
        ProductAsset asset = new ProductAsset(
                current == null ? null : current.id(),
                row.profileId(),
                AssetType.PRODUCT_IMAGE,
                storedImage.publicUrl(),
                row.altText(),
                row.source(),
                row.rightsConfirmed(),
                true,
                true,
                row.displayOrder() == null ? 0 : row.displayOrder(),
                storedImage.provider(),
                storedImage.bucket(),
                storedImage.storageKey(),
                storedImage.mimeType(),
                storedImage.width(),
                storedImage.height(),
                storedImage.sizeBytes(),
                storedImage.checksumSha256(),
                storedImage.originalFilename(),
                current == null ? null : current.createdAt(),
                current == null ? null : current.updatedAt(),
                current == null ? actor : current.createdBy(),
                actor
        );
        try {
            return assetRepositoryPort.save(asset);
        } catch (RuntimeException ex) {
            productImageBinaryService.cleanupBestEffort(storedImage.storageKey());
            throw ex;
        }
    }

    private PreviewResult toPreviewResult(List<ValidatedRow> rows) {
        return new PreviewResult(
                rows.size(),
                (int) rows.stream().filter(row -> row.action() == EcommercePrimaryImageUrlImportAction.CREATE).count(),
                (int) rows.stream().filter(row -> row.action() == EcommercePrimaryImageUrlImportAction.UPDATE).count(),
                (int) rows.stream().filter(row -> row.action() == EcommercePrimaryImageUrlImportAction.NO_CHANGE).count(),
                (int) rows.stream().filter(row -> !row.valid()).count(),
                (int) rows.stream().filter(row -> !row.warnings().isEmpty()).count(),
                rows.stream().map(this::toPreviewRow).toList()
        );
    }

    private PreviewRow toPreviewRow(ValidatedRow row) {
        return new PreviewRow(
                row.rowNumber(),
                row.sku(),
                row.productId(),
                row.profileId(),
                row.productName(),
                row.publicationStatus(),
                row.currentAsset() == null ? null : row.currentAsset().assetUrl(),
                row.imageFile(),
                row.altText(),
                row.source() == null ? null : row.source().name(),
                row.rightsConfirmed(),
                row.assetType() == null ? null : row.assetType().name(),
                row.displayOrder(),
                row.image() == null ? null : row.image().mimeType(),
                row.image() == null ? null : row.image().width(),
                row.image() == null ? null : row.image().height(),
                row.image() == null ? null : row.image().sizeBytes(),
                row.image() == null ? null : row.image().checksumSha256(),
                row.action(),
                row.valid(),
                row.errors(),
                row.warnings()
        );
    }

    private List<ProductOnlineProfile> loadAllProfiles() {
        List<ProductOnlineProfile> profiles = new ArrayList<>();
        int pageNumber = 0;
        Page<ProductOnlineProfile> page;
        do {
            page = profileRepositoryPort.findAll(PageRequest.of(pageNumber, TEMPLATE_PAGE_SIZE, Sort.by("updatedAt").descending()));
            profiles.addAll(page.getContent());
            pageNumber += 1;
        } while (page.hasNext());
        return profiles;
    }

    private void validateWorkbookFile(String originalFilename, byte[] content) {
        if (content == null || content.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "workbook is required");
        }
        String filename = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".xlsx")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .xlsx workbooks are supported");
        }
    }

    private String normalizeImageFileReference(String value, List<String> errors) {
        String path = trimToNull(value);
        if (path == null) {
            errors.add("imageFile is required");
            return null;
        }
        if (path.contains("\\") || path.startsWith("/") || path.matches("^[A-Za-z]:.*")) {
            errors.add("imageFile path is unsafe");
            return null;
        }
        String[] segments = path.split("/");
        for (String segment : segments) {
            if (segment.isBlank() || ".".equals(segment) || "..".equals(segment)) {
                errors.add("imageFile path is unsafe");
                return null;
            }
        }
        return String.join("/", segments).toLowerCase(Locale.ROOT);
    }

    private AssetSource parseSource(String value, List<String> errors) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            errors.add("source is required");
            return null;
        }
        try {
            return AssetSource.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            errors.add("source is invalid");
            return null;
        }
    }

    private AssetType parseAssetType(String value, List<String> errors) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return AssetType.PRODUCT_IMAGE;
        }
        try {
            AssetType assetType = AssetType.valueOf(normalized.toUpperCase(Locale.ROOT));
            if (assetType != AssetType.PRODUCT_IMAGE) {
                errors.add("assetType must be PRODUCT_IMAGE");
            }
            return assetType;
        } catch (IllegalArgumentException ex) {
            errors.add("assetType must be PRODUCT_IMAGE");
            return null;
        }
    }

    private boolean parseRequiredTrue(String value, String fieldName, List<String> errors) {
        String normalized = trimToNull(value);
        if (!"true".equalsIgnoreCase(normalized)) {
            errors.add(fieldName + " must be true");
            return false;
        }
        return true;
    }

    private boolean parseOptionalTrue(String value) {
        return "true".equalsIgnoreCase(trimToNull(value));
    }

    private Integer parseDisplayOrder(String value, List<String> errors) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return 0;
        }
        try {
            int parsed = Integer.parseInt(normalized);
            if (parsed < 0) {
                errors.add("displayOrder is invalid");
            }
            return parsed;
        } catch (NumberFormatException ex) {
            errors.add("displayOrder is invalid");
            return null;
        }
    }

    private String normalizeSkuKey(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String cleanSpaces(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.replaceAll("\\s+", " ");
    }

    private String errorMessage(RuntimeException ex) {
        String message = trimToNull(ex.getMessage());
        return message == null ? "Import row failed" : message;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private record ImportInput(
            List<ParsedRow> rows,
            Map<String, ArchiveImage> archiveImages
    ) {
    }

    private record ValidatedRow(
            int rowNumber,
            String sku,
            Long productId,
            Long profileId,
            String productName,
            String publicationStatus,
            Product product,
            ProductOnlineProfile profile,
            ProductAsset currentAsset,
            ArchiveImage archiveImage,
            String imageFile,
            String altText,
            AssetSource source,
            boolean rightsConfirmed,
            AssetType assetType,
            Integer displayOrder,
            EcommerceProductImageBinaryService.ValidatedProductImage image,
            EcommercePrimaryImageUrlImportAction action,
            boolean valid,
            List<String> errors,
            List<String> warnings
    ) {
    }
}
