package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.ecommerce.application.port.EcommercePrimaryImageUrlImportWorkbookPort;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportAction;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportUseCase;
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
public class EcommercePrimaryImageUrlImportApplicationService implements EcommercePrimaryImageUrlImportUseCase {
    private static final int TEMPLATE_PAGE_SIZE = 500;

    private static final String WARNING_URL_NOT_FETCHED = "La URL fue validada por politica, pero no se verifico MIME, dimensiones, peso ni existencia remota.";
    private static final String WARNING_STOREFRONT_STAGING_NOT_VALIDATED = "Storefront Next.js no esta desplegado en Lightsail; render staging no queda validado por esta fase.";
    private static final String WARNING_ALLOWLIST_ALIGNMENT = "Backend allowlist y Storefront allowlist deben mantenerse alineadas.";

    private final EcommercePrimaryImageUrlImportWorkbookPort workbookPort;
    private final ProductRepositoryPort productRepositoryPort;
    private final ProductOnlineProfileRepositoryPort profileRepositoryPort;
    private final ProductAssetRepositoryPort assetRepositoryPort;
    private final PublicImageUrlPolicy publicImageUrlPolicy;
    private final AuditUserProvider auditUserProvider;

    public EcommercePrimaryImageUrlImportApplicationService(
            EcommercePrimaryImageUrlImportWorkbookPort workbookPort,
            ProductRepositoryPort productRepositoryPort,
            ProductOnlineProfileRepositoryPort profileRepositoryPort,
            ProductAssetRepositoryPort assetRepositoryPort,
            PublicImageUrlPolicy publicImageUrlPolicy,
            AuditUserProvider auditUserProvider
    ) {
        this.workbookPort = workbookPort;
        this.productRepositoryPort = productRepositoryPort;
        this.profileRepositoryPort = profileRepositoryPort;
        this.assetRepositoryPort = assetRepositoryPort;
        this.publicImageUrlPolicy = publicImageUrlPolicy;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public byte[] downloadTemplate() {
        return workbookPort.createTemplate(buildTemplateData());
    }

    @Override
    public PreviewResult preview(String originalFilename, byte[] content) {
        validateFile(originalFilename, content);
        List<ParsedRow> parsedRows = workbookPort.parse(content);
        return toPreviewResult(validateRows(parsedRows));
    }

    @Override
    public ConfirmResult confirmFile(String originalFilename, byte[] content) {
        validateFile(originalFilename, content);
        List<ParsedRow> parsedRows = workbookPort.parse(content);
        if (parsedRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file does not contain rows");
        }

        List<ValidatedRow> rows = validateRows(parsedRows);
        List<ConfirmRowResult> results = new ArrayList<>();
        int createdRows = 0;
        int updatedRows = 0;
        int unchangedRows = 0;

        for (ValidatedRow row : rows) {
            if (!row.valid()) {
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), EcommercePrimaryImageUrlImportAction.REJECT, false, row.errors(), row.warnings()));
                continue;
            }
            if (row.action() == EcommercePrimaryImageUrlImportAction.NO_CHANGE) {
                unchangedRows += 1;
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), row.action(), true, List.of(), row.warnings()));
                continue;
            }

            ProductAsset saved = assetRepositoryPort.save(toProductAsset(row));
            if (row.action() == EcommercePrimaryImageUrlImportAction.CREATE) {
                createdRows += 1;
            } else if (row.action() == EcommercePrimaryImageUrlImportAction.UPDATE) {
                updatedRows += 1;
            }
            results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.productId(), row.profileId(), row.action(), true, List.of(), row.warnings()));
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
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            product == null ? null : product.name(),
                            profile.publicationStatus().name(),
                            asset == null ? null : asset.assetUrl()
                    );
                })
                .toList();

        return new TemplateData(rows, List.of(
                "MVP 2S.8F: solo .xlsx; no CSV, ZIP ni carga binaria masiva.",
                "No crea productos ERP ni perfiles online; solo usa SKU existentes con perfil online existente.",
                "No modifica stock, inventario, unidades, costos, precios ERP ni categorias ERP.",
                "sku, imageUrl, altText, source y rightsConfirmed son obligatorios.",
                "imageUrl debe ser path publico relativo o https de dominio permitido por ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS.",
                "El backend no hace HEAD/GET ni descarga imagenes remotas.",
                "rightsConfirmed debe ser true.",
                "source acepta SUPPLIER, OWN, GENERATED u OTHER.",
                "assetType puede quedar vacio; si se informa solo acepta PRODUCT_IMAGE.",
                "displayOrder vacio usa 0; valores invalidos o negativos se rechazan.",
                "Si el perfil esta PUBLISHED y hay CREATE/UPDATE, publishedUpdateConfirmed debe ser true."
        ));
    }

    private List<ValidatedRow> validateRows(List<ParsedRow> parsedRows) {
        Map<String, Integer> skuOccurrences = new LinkedHashMap<>();
        Set<String> requestedSkuKeys = new LinkedHashSet<>();
        for (ParsedRow row : parsedRows) {
            String skuKey = normalizeSkuKey(row.sku());
            if (skuKey != null) {
                skuOccurrences.merge(skuKey, 1, Integer::sum);
                requestedSkuKeys.add(skuKey);
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
            rows.add(validateRow(parsedRow, skuOccurrences, productsBySku, profilesByProductId, assetsByProfileId));
        }
        return rows;
    }

    private ValidatedRow validateRow(
            ParsedRow row,
            Map<String, Integer> skuOccurrences,
            Map<String, Product> productsBySku,
            Map<Long, ProductOnlineProfile> profilesByProductId,
            Map<Long, ProductAsset> assetsByProfileId
    ) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        String sku = trimToNull(row.sku());
        String skuKey = normalizeSkuKey(sku);

        if (sku == null) {
            errors.add("SKU is required");
        } else if (skuOccurrences.getOrDefault(skuKey, 0) > 1) {
            errors.add("SKU is duplicated in file");
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
        String imageUrl = trimToNull(row.imageUrl());
        if (imageUrl == null) {
            errors.add("imageUrl is required");
        } else {
            PublicImageUrlPolicy.ValidationResult validation = publicImageUrlPolicy.validate(imageUrl);
            if (!validation.valid()) {
                errors.add(validation.message());
            }
        }

        String altText = cleanSpaces(row.altText());
        if (altText == null) {
            errors.add("altText is required");
        } else if (altText.length() > 250) {
            errors.add("altText max length is 250");
        }

        AssetSource source = parseSource(row.source(), errors);
        boolean rightsConfirmed = parseRequiredTrue(row.rightsConfirmed(), "rightsConfirmed", errors);
        AssetType assetType = parseAssetType(row.assetType(), errors);
        Integer displayOrder = parseDisplayOrder(row.displayOrder(), errors);
        boolean publishedUpdateConfirmed = parseOptionalTrue(row.publishedUpdateConfirmed());

        EcommercePrimaryImageUrlImportAction desiredAction = determineAction(currentAsset, imageUrl, altText, source, rightsConfirmed, assetType, displayOrder);
        if (profile != null
                && profile.publicationStatus() == OnlinePublicationStatus.PUBLISHED
                && desiredAction != EcommercePrimaryImageUrlImportAction.NO_CHANGE) {
            if (!publishedUpdateConfirmed) {
                errors.add("Published profile update requires explicit confirmation");
            } else {
                warnings.add("Perfil publicado cambiara imagen visible publicamente.");
            }
        }
        if (desiredAction == EcommercePrimaryImageUrlImportAction.UPDATE) {
            warnings.add("Sobrescribira imagen principal existente.");
            if (hasStorageMetadata(currentAsset)) {
                warnings.add("Si reemplaza un asset con metadata S3, la importacion URL-only limpiara metadata storage del asset, pero NO borrara el objeto S3 previo en esta fase.");
            }
        }
        if (desiredAction == EcommercePrimaryImageUrlImportAction.CREATE || desiredAction == EcommercePrimaryImageUrlImportAction.UPDATE) {
            warnings.add(WARNING_URL_NOT_FETCHED);
            warnings.add(WARNING_STOREFRONT_STAGING_NOT_VALIDATED);
            warnings.add(WARNING_ALLOWLIST_ALIGNMENT);
        }

        boolean valid = errors.isEmpty();
        return new ValidatedRow(
                row.rowNumber(),
                sku,
                product == null ? null : product.id(),
                profile == null ? null : profile.id(),
                product == null ? trimToNull(row.productName()) : product.name(),
                profile == null ? trimToNull(row.publicationStatus()) : profile.publicationStatus().name(),
                currentAsset,
                imageUrl,
                altText,
                source,
                rightsConfirmed,
                assetType,
                displayOrder,
                valid ? desiredAction : EcommercePrimaryImageUrlImportAction.REJECT,
                valid,
                List.copyOf(errors),
                List.copyOf(warnings)
        );
    }

    private EcommercePrimaryImageUrlImportAction determineAction(
            ProductAsset currentAsset,
            String imageUrl,
            String altText,
            AssetSource source,
            boolean rightsConfirmed,
            AssetType assetType,
            Integer displayOrder
    ) {
        if (currentAsset == null) {
            return EcommercePrimaryImageUrlImportAction.CREATE;
        }
        if (!Objects.equals(nullToBlank(currentAsset.assetUrl()), nullToBlank(imageUrl))
                || !Objects.equals(nullToBlank(currentAsset.altText()), nullToBlank(altText))
                || currentAsset.source() != source
                || currentAsset.rightsConfirmed() != rightsConfirmed
                || currentAsset.assetType() != assetType
                || currentAsset.displayOrder() != (displayOrder == null ? 0 : displayOrder)) {
            return EcommercePrimaryImageUrlImportAction.UPDATE;
        }
        return EcommercePrimaryImageUrlImportAction.NO_CHANGE;
    }

    private ProductAsset toProductAsset(ValidatedRow row) {
        ProductAsset current = row.currentAsset();
        String actor = auditUserProvider.currentUsername();
        return new ProductAsset(
                current == null ? null : current.id(),
                row.profileId(),
                AssetType.PRODUCT_IMAGE,
                row.imageUrl(),
                row.altText(),
                row.source(),
                row.rightsConfirmed(),
                true,
                true,
                row.displayOrder() == null ? 0 : row.displayOrder(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                current == null ? null : current.createdAt(),
                current == null ? null : current.updatedAt(),
                current == null ? actor : current.createdBy(),
                actor
        );
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
                row.imageUrl(),
                row.altText(),
                row.source() == null ? null : row.source().name(),
                row.rightsConfirmed(),
                row.assetType() == null ? null : row.assetType().name(),
                row.displayOrder(),
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

    private void validateFile(String originalFilename, byte[] content) {
        if (content == null || content.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }
        String filename = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".xlsx")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .xlsx files are supported");
        }
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

    private boolean hasStorageMetadata(ProductAsset asset) {
        return asset != null && (trimToNull(asset.storageProvider()) != null
                || trimToNull(asset.storageBucket()) != null
                || trimToNull(asset.storageKey()) != null
                || trimToNull(asset.mimeType()) != null
                || asset.width() != null
                || asset.height() != null
                || asset.sizeBytes() != null
                || trimToNull(asset.checksumSha256()) != null
                || trimToNull(asset.originalFilename()) != null);
    }

    private String normalizeSkuKey(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String cleanSpaces(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.replaceAll("\\s+", " ");
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

    private record ValidatedRow(
            int rowNumber,
            String sku,
            Long productId,
            Long profileId,
            String productName,
            String publicationStatus,
            ProductAsset currentAsset,
            String imageUrl,
            String altText,
            AssetSource source,
            boolean rightsConfirmed,
            AssetType assetType,
            Integer displayOrder,
            EcommercePrimaryImageUrlImportAction action,
            boolean valid,
            List<String> errors,
            List<String> warnings
    ) {
    }
}
