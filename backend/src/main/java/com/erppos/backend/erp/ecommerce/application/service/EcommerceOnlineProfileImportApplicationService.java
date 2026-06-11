package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.catalog.application.usecase.ProductBarcodeStatus;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.ecommerce.application.port.EcommerceOnlineProfileImportWorkbookPort;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportAction;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceBrandRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EcommerceOnlineProfileImportApplicationService implements EcommerceOnlineProfileImportUseCase {
    private static final int TEMPLATE_PAGE_SIZE = 500;
    private static final int SLUG_MAX_LENGTH = 180;
    private static final Set<String> FORBIDDEN_SLUG_TERMS = Set.of("test", "smoke", "demo", "prueba", "example");

    private final EcommerceOnlineProfileImportWorkbookPort workbookPort;
    private final ProductRepositoryPort productRepositoryPort;
    private final ProductOnlineProfileRepositoryPort profileRepositoryPort;
    private final EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;
    private final EcommerceBrandRepositoryPort brandRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public EcommerceOnlineProfileImportApplicationService(
            EcommerceOnlineProfileImportWorkbookPort workbookPort,
            ProductRepositoryPort productRepositoryPort,
            ProductOnlineProfileRepositoryPort profileRepositoryPort,
            EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort,
            EcommerceBrandRepositoryPort brandRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.workbookPort = workbookPort;
        this.productRepositoryPort = productRepositoryPort;
        this.profileRepositoryPort = profileRepositoryPort;
        this.onlineCategoryRepositoryPort = onlineCategoryRepositoryPort;
        this.brandRepositoryPort = brandRepositoryPort;
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
        ValidationBatch validation = validateRows(parsedRows);
        return toPreviewResult(validation.rows());
    }

    @Override
    public ConfirmResult confirmFile(String originalFilename, byte[] content) {
        validateFile(originalFilename, content);
        List<ParsedRow> parsedRows = workbookPort.parse(content);
        if (parsedRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file does not contain rows");
        }

        ValidationBatch validation = validateRows(parsedRows);
        List<ConfirmRowResult> results = new ArrayList<>();
        int createdRows = 0;
        int updatedRows = 0;
        int unchangedRows = 0;

        for (ValidatedRow row : validation.rows()) {
            if (!row.valid()) {
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), EcommerceOnlineProfileImportAction.REJECT, false, null, row.errors()));
                continue;
            }

            if (row.action() == EcommerceOnlineProfileImportAction.NO_CHANGE) {
                unchangedRows += 1;
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.action(), true, row.currentProfileId(), List.of()));
                continue;
            }

            ProductOnlineProfile saved = profileRepositoryPort.save(toProfile(row));
            if (row.action() == EcommerceOnlineProfileImportAction.CREATE) {
                createdRows += 1;
            } else if (row.action() == EcommerceOnlineProfileImportAction.UPDATE) {
                updatedRows += 1;
            }
            results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), row.action(), true, saved.id(), List.of()));
        }

        return new ConfirmResult(
                results.size(),
                createdRows,
                updatedRows,
                unchangedRows,
                (int) results.stream().filter(row -> !row.applied()).count(),
                results
        );
    }

    private TemplateData buildTemplateData() {
        List<EcommerceBrand> brands = brandRepositoryPort.findAll();
        List<EcommerceOnlineCategory> categories = onlineCategoryRepositoryPort.findAll();
        Map<Long, String> brandSlugsById = brands.stream().collect(Collectors.toMap(EcommerceBrand::id, EcommerceBrand::slug));
        Map<Long, String> categorySlugsById = categories.stream().collect(Collectors.toMap(EcommerceOnlineCategory::id, EcommerceOnlineCategory::slug));

        Map<Long, ProductOnlineProfile> profilesByProductId = loadAllProfiles().stream()
                .collect(Collectors.toMap(ProductOnlineProfile::productId, profile -> profile, (left, right) -> left, LinkedHashMap::new));
        Map<Long, Product> productsById = new LinkedHashMap<>();

        int pageNumber = 0;
        Page<Product> productPage;
        do {
            productPage = productRepositoryPort.findByFilters(
                    null,
                    false,
                    null,
                    true,
                    (ProductBarcodeStatus) null,
                    PageRequest.of(pageNumber, TEMPLATE_PAGE_SIZE, Sort.by("name", "sku", "id"))
            );
            for (Product product : productPage.getContent()) {
                productsById.put(product.id(), product);
            }
            pageNumber += 1;
        } while (productPage.hasNext());

        Set<Long> nonPublishedProfileProductIds = profilesByProductId.values().stream()
                .filter(profile -> profile.publicationStatus() != OnlinePublicationStatus.PUBLISHED)
                .map(ProductOnlineProfile::productId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<Long> missingProfileProductIds = nonPublishedProfileProductIds.stream()
                .filter(productId -> !productsById.containsKey(productId))
                .toList();
        if (!missingProfileProductIds.isEmpty()) {
            productRepositoryPort.findByIds(missingProfileProductIds).forEach(product -> productsById.put(product.id(), product));
        }

        List<TemplateProfileRow> rows = productsById.values().stream()
                .filter(product -> {
                    ProductOnlineProfile profile = profilesByProductId.get(product.id());
                    return profile == null || profile.publicationStatus() != OnlinePublicationStatus.PUBLISHED;
                })
                .sorted(Comparator.comparing(Product::name, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Product::sku, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Product::id, Comparator.nullsLast(Long::compareTo)))
                .map(product -> toTemplateRow(product, profilesByProductId.get(product.id()), categorySlugsById, brandSlugsById))
                .toList();

        return new TemplateData(
                rows,
                categories.stream()
                        .map(category -> new TemplateReferenceRow(category.name(), category.slug(), category.active()))
                        .toList(),
                brands.stream()
                        .map(brand -> new TemplateReferenceRow(brand.name(), brand.slug(), brand.active()))
                        .toList(),
                List.of(
                        "No crea productos ERP; solo usa SKU existentes.",
                        "No modifica stock, inventario, unidad, costo, categoria ERP ni precio ERP.",
                        "Los perfiles nuevos se crean como DRAFT; los no publicados mantienen su estado.",
                        "Los perfiles publicados estan protegidos y se rechazan en esta version.",
                        "onlineCategorySlug y brandSlug deben existir en las hojas de referencia y estar activos.",
                        "brandSlug y brandAbsencePolicy no deben completarse juntos.",
                        "brandAbsencePolicy acepta GENERIC o UNBRANDED.",
                        "Si onlineName esta vacio en un perfil nuevo, se usa el nombre ERP.",
                        "Si slug esta vacio, se genera desde onlineName o nombre ERP.",
                        "No usar slugs con test, smoke, demo, prueba o example."
                )
        );
    }

    private TemplateProfileRow toTemplateRow(
            Product product,
            ProductOnlineProfile profile,
            Map<Long, String> categorySlugsById,
            Map<Long, String> brandSlugsById
    ) {
        return new TemplateProfileRow(
                product.sku(),
                product.name(),
                profile == null ? null : profile.publicationStatus().name(),
                profile == null ? null : profile.onlineName(),
                profile == null ? null : profile.slug(),
                profile == null ? null : profile.onlineDescription(),
                profile == null || profile.onlineCategoryId() == null ? null : categorySlugsById.get(profile.onlineCategoryId()),
                profile == null || profile.brandId() == null ? null : brandSlugsById.get(profile.brandId()),
                profile == null || profile.brandAbsencePolicy() == null ? null : profile.brandAbsencePolicy().name()
        );
    }

    private ValidationBatch validateRows(List<ParsedRow> parsedRows) {
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
                .collect(Collectors.toMap(product -> normalizeSkuKey(product.sku()), product -> product, (left, right) -> left));
        List<Long> productIds = productsBySku.values().stream().map(Product::id).toList();
        Map<Long, ProductOnlineProfile> profilesByProductId = profileRepositoryPort.findByProductIds(productIds).stream()
                .collect(Collectors.toMap(ProductOnlineProfile::productId, profile -> profile));
        Map<String, ProductOnlineProfile> existingSlugOwners = loadAllProfiles().stream()
                .filter(profile -> trimToNull(profile.slug()) != null)
                .collect(Collectors.toMap(
                        profile -> normalizeSlug(profile.slug()),
                        profile -> profile,
                        (left, right) -> left
                ));
        Map<String, EcommerceOnlineCategory> categoriesBySlug = onlineCategoryRepositoryPort.findAll().stream()
                .collect(Collectors.toMap(category -> normalizeSlug(category.slug()), category -> category, (left, right) -> left));
        Map<Long, EcommerceOnlineCategory> categoriesById = categoriesBySlug.values().stream()
                .collect(Collectors.toMap(EcommerceOnlineCategory::id, category -> category, (left, right) -> left));
        Map<String, EcommerceBrand> brandsBySlug = brandRepositoryPort.findAll().stream()
                .collect(Collectors.toMap(brand -> normalizeSlug(brand.slug()), brand -> brand, (left, right) -> left));
        Map<Long, EcommerceBrand> brandsById = brandsBySlug.values().stream()
                .collect(Collectors.toMap(EcommerceBrand::id, brand -> brand, (left, right) -> left));

        Map<String, Long> reservedSlugsByProfileId = new HashMap<>();
        List<ValidatedRow> rows = new ArrayList<>();
        for (ParsedRow parsedRow : parsedRows) {
            ValidatedRow validatedRow = validateRow(
                    parsedRow,
                    skuOccurrences,
                    productsBySku,
                    profilesByProductId,
                    existingSlugOwners,
                    categoriesBySlug,
                    categoriesById,
                    brandsBySlug,
                    brandsById,
                    reservedSlugsByProfileId
            );
            rows.add(validatedRow);
            if (validatedRow.valid() && validatedRow.slug() != null) {
                Long owner = validatedRow.currentProfileId() == null ? -1L * validatedRow.rowNumber() : validatedRow.currentProfileId();
                reservedSlugsByProfileId.put(normalizeSlug(validatedRow.slug()), owner);
            }
        }
        return new ValidationBatch(rows);
    }

    private ValidatedRow validateRow(
            ParsedRow row,
            Map<String, Integer> skuOccurrences,
            Map<String, Product> productsBySku,
            Map<Long, ProductOnlineProfile> profilesByProductId,
            Map<String, ProductOnlineProfile> existingSlugOwners,
            Map<String, EcommerceOnlineCategory> categoriesBySlug,
            Map<Long, EcommerceOnlineCategory> categoriesById,
            Map<String, EcommerceBrand> brandsBySlug,
            Map<Long, EcommerceBrand> brandsById,
            Map<String, Long> reservedSlugsByProfileId
    ) {
        List<String> errors = new ArrayList<>();
        List<String> generatedFields = new ArrayList<>();
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

        ProductOnlineProfile current = product == null ? null : profilesByProductId.get(product.id());
        if (current != null && current.publicationStatus() == OnlinePublicationStatus.PUBLISHED) {
            errors.add("Published profile cannot be changed by bulk import");
        }

        String onlineName = resolveOnlineName(row.onlineName(), current, product, generatedFields);
        if (onlineName != null && onlineName.length() > 180) {
            errors.add("onlineName max length is 180");
        }
        String onlineDescription = resolveText(row.onlineDescription(), current == null ? null : current.onlineDescription());
        if (onlineDescription != null && onlineDescription.length() > 2000) {
            errors.add("onlineDescription max length is 2000");
        }

        Long onlineCategoryId = resolveOnlineCategoryId(row.onlineCategorySlug(), current, categoriesBySlug, categoriesById, errors);
        ResolvedBrand resolvedBrand = resolveBrand(row.brandSlug(), row.brandAbsencePolicy(), current, brandsBySlug, brandsById, errors);
        String slug = resolveSlug(row.slug(), current, product, onlineName, sku, existingSlugOwners, reservedSlugsByProfileId, generatedFields, errors);

        EcommerceOnlineProfileImportAction action = determineAction(current, slug, onlineName, onlineDescription, onlineCategoryId, resolvedBrand.brandId(), resolvedBrand.brandAbsencePolicy());
        if (product != null && !product.active() && (action == EcommerceOnlineProfileImportAction.CREATE || action == EcommerceOnlineProfileImportAction.UPDATE)) {
            errors.add("Product is inactive");
        }

        boolean valid = errors.isEmpty();
        return new ValidatedRow(
                row.rowNumber(),
                sku,
                product == null ? trimToNull(row.productName()) : product.name(),
                current == null ? null : current.publicationStatus().name(),
                product == null ? null : product.id(),
                current == null ? null : current.id(),
                current == null ? null : current.publicationStatus(),
                current == null ? null : current.publishedAt(),
                current == null ? null : current.unpublishedAt(),
                current == null ? null : current.version(),
                current == null ? null : current.createdAt(),
                current == null ? null : current.createdBy(),
                slug,
                onlineName,
                onlineDescription,
                onlineCategoryId,
                resolvedBrand.brandId(),
                resolvedBrand.brandAbsencePolicy(),
                trimToNull(row.onlineCategorySlug()),
                trimToNull(row.brandSlug()),
                trimToNull(row.brandAbsencePolicy()),
                valid ? action : EcommerceOnlineProfileImportAction.REJECT,
                valid,
                List.copyOf(errors),
                List.copyOf(generatedFields)
        );
    }

    private String resolveOnlineName(
            String rawOnlineName,
            ProductOnlineProfile current,
            Product product,
            List<String> generatedFields
    ) {
        String explicit = cleanSpaces(rawOnlineName);
        if (explicit != null) {
            return explicit;
        }
        if (current != null && trimToNull(current.onlineName()) != null) {
            return current.onlineName();
        }
        if (product == null) {
            return null;
        }
        generatedFields.add("ONLINE_NAME");
        return cleanSpaces(product.name());
    }

    private Long resolveOnlineCategoryId(
            String rawSlug,
            ProductOnlineProfile current,
            Map<String, EcommerceOnlineCategory> categoriesBySlug,
            Map<Long, EcommerceOnlineCategory> categoriesById,
            List<String> errors
    ) {
        String slug = normalizeSlug(rawSlug);
        if (slug == null) {
            Long currentCategoryId = current == null ? null : current.onlineCategoryId();
            if (currentCategoryId != null) {
                EcommerceOnlineCategory currentCategory = categoriesById.get(currentCategoryId);
                if (currentCategory == null) {
                    errors.add("Online category slug not found");
                } else if (!currentCategory.active()) {
                    errors.add("Online category is inactive");
                }
            }
            return currentCategoryId;
        }
        EcommerceOnlineCategory category = categoriesBySlug.get(slug);
        if (category == null) {
            errors.add("Online category slug not found");
            return null;
        }
        if (!category.active()) {
            errors.add("Online category is inactive");
        }
        return category.id();
    }

    private ResolvedBrand resolveBrand(
            String rawBrandSlug,
            String rawBrandAbsencePolicy,
            ProductOnlineProfile current,
            Map<String, EcommerceBrand> brandsBySlug,
            Map<Long, EcommerceBrand> brandsById,
            List<String> errors
    ) {
        String brandSlug = normalizeSlug(rawBrandSlug);
        String brandAbsencePolicyText = trimToNull(rawBrandAbsencePolicy);
        if (brandSlug != null && brandAbsencePolicyText != null) {
            errors.add("brandSlug and brandAbsencePolicy cannot be combined");
        }

        if (brandSlug != null) {
            EcommerceBrand brand = brandsBySlug.get(brandSlug);
            if (brand == null) {
                errors.add("Brand slug not found");
                return new ResolvedBrand(null, null);
            }
            if (!brand.active()) {
                errors.add("Brand is inactive");
            }
            return new ResolvedBrand(brand.id(), null);
        }

        if (brandAbsencePolicyText != null) {
            try {
                return new ResolvedBrand(null, BrandAbsencePolicy.valueOf(brandAbsencePolicyText.trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ex) {
                errors.add("brandAbsencePolicy is invalid");
                return new ResolvedBrand(null, null);
            }
        }

        if (current != null) {
            if (current.brandId() != null) {
                EcommerceBrand currentBrand = brandsById.get(current.brandId());
                if (currentBrand == null) {
                    errors.add("Brand slug not found");
                } else if (!currentBrand.active()) {
                    errors.add("Brand is inactive");
                }
            }
            return new ResolvedBrand(current.brandId(), current.brandAbsencePolicy());
        }
        return new ResolvedBrand(null, null);
    }

    private String resolveSlug(
            String rawSlug,
            ProductOnlineProfile current,
            Product product,
            String onlineName,
            String sku,
            Map<String, ProductOnlineProfile> existingSlugOwners,
            Map<String, Long> reservedSlugsByProfileId,
            List<String> generatedFields,
            List<String> errors
    ) {
        String explicitSlug = trimToNull(rawSlug);
        Long currentProfileId = current == null ? null : current.id();

        if (explicitSlug == null && current != null && trimToNull(current.slug()) != null) {
            return current.slug();
        }

        boolean generated = explicitSlug == null;
        String normalizedSlug = normalizeSlug(generated ? firstNonBlank(onlineName, product == null ? null : product.name()) : explicitSlug);
        if (normalizedSlug == null) {
            errors.add("Slug is required");
            return null;
        }
        if (normalizedSlug.length() > SLUG_MAX_LENGTH) {
            normalizedSlug = normalizedSlug.substring(0, SLUG_MAX_LENGTH).replaceAll("-+$", "");
        }
        if (hasForbiddenSlugTerm(normalizedSlug)) {
            errors.add("Slug contains prohibited test/demo term");
        }

        if (!generated) {
            ProductOnlineProfile owner = existingSlugOwners.get(normalizedSlug);
            if (owner != null && !Objects.equals(owner.id(), currentProfileId)) {
                errors.add("Slug already exists");
            }
            Long reservedOwner = reservedSlugsByProfileId.get(normalizedSlug);
            if (reservedOwner != null && !Objects.equals(reservedOwner, currentProfileId)) {
                errors.add("Slug is duplicated in file");
            }
            return normalizedSlug;
        }

        generatedFields.add("SLUG");
        boolean collides = slugCollides(normalizedSlug, currentProfileId, existingSlugOwners, reservedSlugsByProfileId);
        if (!collides) {
            return normalizedSlug;
        }

        String adjustedSlug = adjustedSlug(normalizedSlug, sku, currentProfileId, existingSlugOwners, reservedSlugsByProfileId);
        if (adjustedSlug == null) {
            errors.add("Generated slug already exists");
            return normalizedSlug;
        }
        if (hasForbiddenSlugTerm(adjustedSlug)) {
            errors.add("Slug contains prohibited test/demo term");
        }
        generatedFields.add("SLUG_COLLISION_SUFFIX");
        return adjustedSlug;
    }

    private EcommerceOnlineProfileImportAction determineAction(
            ProductOnlineProfile current,
            String slug,
            String onlineName,
            String onlineDescription,
            Long onlineCategoryId,
            Long brandId,
            BrandAbsencePolicy brandAbsencePolicy
    ) {
        if (current == null) {
            return EcommerceOnlineProfileImportAction.CREATE;
        }
        if (!Objects.equals(nullToBlank(current.slug()), nullToBlank(slug))
                || !Objects.equals(nullToBlank(current.onlineName()), nullToBlank(onlineName))
                || !Objects.equals(nullToBlank(current.onlineDescription()), nullToBlank(onlineDescription))
                || !Objects.equals(current.onlineCategoryId(), onlineCategoryId)
                || !Objects.equals(current.brandId(), brandId)
                || current.brandAbsencePolicy() != brandAbsencePolicy) {
            return EcommerceOnlineProfileImportAction.UPDATE;
        }
        return EcommerceOnlineProfileImportAction.NO_CHANGE;
    }

    private ProductOnlineProfile toProfile(ValidatedRow row) {
        String actor = auditUserProvider.currentUsername();
        OnlinePublicationStatus status = row.currentPublicationStatus() == null
                ? OnlinePublicationStatus.DRAFT
                : row.currentPublicationStatus();
        return new ProductOnlineProfile(
                row.currentProfileId(),
                row.productId(),
                status,
                row.slug(),
                row.onlineName(),
                row.onlineDescription(),
                row.onlineCategoryId(),
                row.brandId(),
                row.brandAbsencePolicy(),
                row.currentPublishedAt(),
                row.currentUnpublishedAt(),
                row.currentVersion() == null ? 0L : row.currentVersion(),
                row.currentCreatedAt(),
                null,
                row.currentCreatedBy() == null ? actor : row.currentCreatedBy(),
                actor
        );
    }

    private PreviewResult toPreviewResult(List<ValidatedRow> rows) {
        return new PreviewResult(
                rows.size(),
                (int) rows.stream().filter(row -> row.action() == EcommerceOnlineProfileImportAction.CREATE).count(),
                (int) rows.stream().filter(row -> row.action() == EcommerceOnlineProfileImportAction.UPDATE).count(),
                (int) rows.stream().filter(row -> row.action() == EcommerceOnlineProfileImportAction.NO_CHANGE).count(),
                (int) rows.stream().filter(row -> !row.valid()).count(),
                rows.stream().map(this::toPreviewRow).toList()
        );
    }

    private PreviewRow toPreviewRow(ValidatedRow row) {
        return new PreviewRow(
                row.rowNumber(),
                row.sku(),
                row.productName(),
                row.publicationStatus(),
                row.onlineName(),
                row.slug(),
                row.onlineDescription(),
                row.onlineCategorySlug(),
                row.brandSlug(),
                row.brandAbsencePolicyRaw(),
                row.action(),
                row.valid(),
                row.errors(),
                row.generatedFields()
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

    private boolean slugCollides(
            String slug,
            Long currentProfileId,
            Map<String, ProductOnlineProfile> existingSlugOwners,
            Map<String, Long> reservedSlugsByProfileId
    ) {
        ProductOnlineProfile owner = existingSlugOwners.get(slug);
        if (owner != null && !Objects.equals(owner.id(), currentProfileId)) {
            return true;
        }
        Long reservedOwner = reservedSlugsByProfileId.get(slug);
        return reservedOwner != null && !Objects.equals(reservedOwner, currentProfileId);
    }

    private String adjustedSlug(
            String baseSlug,
            String sku,
            Long currentProfileId,
            Map<String, ProductOnlineProfile> existingSlugOwners,
            Map<String, Long> reservedSlugsByProfileId
    ) {
        String suffix = "sku-" + normalizeSlug(sku);
        if (suffix.endsWith("-")) {
            suffix = suffix.substring(0, suffix.length() - 1);
        }
        String candidate = fitSlugWithSuffix(baseSlug, suffix);
        if (!slugCollides(candidate, currentProfileId, existingSlugOwners, reservedSlugsByProfileId)) {
            return candidate;
        }
        for (int index = 2; index <= 100; index++) {
            candidate = fitSlugWithSuffix(baseSlug, suffix + "-" + index);
            if (!slugCollides(candidate, currentProfileId, existingSlugOwners, reservedSlugsByProfileId)) {
                return candidate;
            }
        }
        return null;
    }

    private String fitSlugWithSuffix(String baseSlug, String suffix) {
        String safeSuffix = normalizeSlug(suffix);
        if (safeSuffix == null) {
            safeSuffix = "sku";
        }
        int baseMaxLength = Math.max(1, SLUG_MAX_LENGTH - safeSuffix.length() - 1);
        String safeBase = baseSlug.length() > baseMaxLength
                ? baseSlug.substring(0, baseMaxLength).replaceAll("-+$", "")
                : baseSlug;
        return safeBase + "-" + safeSuffix;
    }

    private boolean hasForbiddenSlugTerm(String slug) {
        String normalized = slug == null ? "" : slug.toLowerCase(Locale.ROOT);
        for (String term : FORBIDDEN_SLUG_TERMS) {
            if (normalized.contains(term)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeSlug(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "")
                .replaceAll("-{2,}", "-");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeSkuKey(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String resolveText(String rawValue, String currentValue) {
        String explicit = trimToNull(rawValue);
        if (explicit != null) {
            return explicit;
        }
        return currentValue;
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

    private String firstNonBlank(String first, String second) {
        String normalizedFirst = trimToNull(first);
        return normalizedFirst != null ? normalizedFirst : trimToNull(second);
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private record ValidationBatch(List<ValidatedRow> rows) {
    }

    private record ResolvedBrand(Long brandId, BrandAbsencePolicy brandAbsencePolicy) {
    }

    private record ValidatedRow(
            int rowNumber,
            String sku,
            String productName,
            String publicationStatus,
            Long productId,
            Long currentProfileId,
            OnlinePublicationStatus currentPublicationStatus,
            Instant currentPublishedAt,
            Instant currentUnpublishedAt,
            Long currentVersion,
            Instant currentCreatedAt,
            String currentCreatedBy,
            String slug,
            String onlineName,
            String onlineDescription,
            Long onlineCategoryId,
            Long brandId,
            BrandAbsencePolicy brandAbsencePolicy,
            String onlineCategorySlug,
            String brandSlug,
            String brandAbsencePolicyRaw,
            EcommerceOnlineProfileImportAction action,
            boolean valid,
            List<String> errors,
            List<String> generatedFields
    ) {
    }
}
