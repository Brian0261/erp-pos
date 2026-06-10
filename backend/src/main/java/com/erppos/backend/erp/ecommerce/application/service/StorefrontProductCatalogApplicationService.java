package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontAvailabilityResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontBrandSummaryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategoryListItemResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategoryDetailResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategoryPageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategorySummaryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontImageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontPriceResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductDetailResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductListItemResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductPageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontSeoResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontSitemapEntryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontSitemapResult;
import com.erppos.backend.erp.ecommerce.application.usecase.StorefrontProductCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontSitemapEntryProjection;
import com.erppos.backend.erp.ecommerce.domain.port.StorefrontProductReadPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class StorefrontProductCatalogApplicationService implements StorefrontProductCatalogUseCase {

    private static final String SUPPORTED_SORT = "name_asc";
    private static final int MAX_PRODUCTS_SIZE = 50;
    private static final int MAX_CATEGORIES_SIZE = 100;
    private static final String DEFAULT_CURRENCY = "PEN";

    private final StorefrontProductReadPort storefrontProductReadPort;

    public StorefrontProductCatalogApplicationService(StorefrontProductReadPort storefrontProductReadPort) {
        this.storefrontProductReadPort = storefrontProductReadPort;
    }

    @Override
    public StorefrontProductPageResult listPublishedProducts(int page, int size, String sort, String categorySlug) {
        validatePage(page);
        validateProductsSize(size);
        validateSort(sort);

        Page<StorefrontPublicProductProjection> products = storefrontProductReadPort.findPublishedProducts(
                PageRequest.of(page, size),
                normalizeCategorySlug(categorySlug)
        );

        return new StorefrontProductPageResult(
                products.getContent().stream().map(this::toPublicProduct).toList(),
                products.getNumber(),
                products.getSize(),
                products.getTotalElements(),
                products.getTotalPages()
        );
    }

    @Override
    public StorefrontCategoryPageResult listPublicCategories(int page, int size, String sort) {
        validatePage(page);
        validateCategoriesSize(size);
        validateSort(sort);

        Page<StorefrontPublicCategoryProjection> categories = storefrontProductReadPort.findPublicCategories(PageRequest.of(page, size));

        return new StorefrontCategoryPageResult(
                categories.getContent().stream().map(this::toPublicCategory).toList(),
                categories.getNumber(),
                categories.getSize(),
                categories.getTotalElements(),
                categories.getTotalPages()
        );
    }

    @Override
    public StorefrontProductDetailResult getPublishedProductBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Public resource not found");
        }

        StorefrontPublicProductDetailProjection detail = storefrontProductReadPort.findPublishedProductDetailBySlug(slug.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Public resource not found"));

        return toPublicDetail(detail);
    }

    @Override
    public StorefrontCategoryDetailResult getPublicCategoryBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Public resource not found");
        }

        StorefrontPublicCategoryDetailProjection detail = storefrontProductReadPort.findPublicCategoryDetailBySlug(slug.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Public resource not found"));

        return toPublicCategoryDetail(detail);
    }

    @Override
    public StorefrontSitemapResult getPublicSitemap() {
        List<StorefrontSitemapEntryResult> entries = storefrontProductReadPort.findPublicSitemapEntries().stream()
                .filter(this::isValidPublicSitemapEntry)
                .map(this::toSitemapEntry)
                .toList();

        return new StorefrontSitemapResult(
                Instant.now(),
                entries,
                entries.size()
        );
    }

    private StorefrontProductListItemResult toPublicProduct(StorefrontPublicProductProjection item) {
        String currency = item.effectivePriceCurrency() == null || item.effectivePriceCurrency().isBlank()
                ? DEFAULT_CURRENCY
                : item.effectivePriceCurrency();
        BigDecimal amount = item.effectivePriceAmount() == null ? BigDecimal.ZERO : item.effectivePriceAmount();

        StorefrontCategorySummaryResult category = null;
        if (item.categorySlug() != null && !item.categorySlug().isBlank()) {
            category = new StorefrontCategorySummaryResult(item.categorySlug(), item.categoryName());
        }

        StorefrontBrandSummaryResult brand = null;
        if (item.brandSlug() != null && !item.brandSlug().isBlank()) {
            brand = new StorefrontBrandSummaryResult(item.brandSlug(), item.brandName());
        }

        StorefrontImageResult primaryImage = null;
        if (item.primaryImageUrl() != null && !item.primaryImageUrl().isBlank()) {
            primaryImage = new StorefrontImageResult(
                    item.primaryImageUrl(),
                    item.primaryImageAltText(),
                    item.primaryImageType(),
                    item.primaryImageDisplayOrder()
            );
        }

        return new StorefrontProductListItemResult(
                item.slug(),
                item.name(),
                item.shortDescription(),
                primaryImage,
                new StorefrontPriceResult(amount, currency, currency + " " + amount),
                new StorefrontAvailabilityResult("NOT_AVAILABLE", "No disponible temporalmente", false),
                category,
                brand
        );
    }

    private StorefrontProductDetailResult toPublicDetail(StorefrontPublicProductDetailProjection item) {
        String currency = item.effectivePriceCurrency() == null || item.effectivePriceCurrency().isBlank()
                ? DEFAULT_CURRENCY
                : item.effectivePriceCurrency();
        BigDecimal amount = item.effectivePriceAmount() == null ? BigDecimal.ZERO : item.effectivePriceAmount();

        StorefrontCategorySummaryResult category = null;
        if (item.categorySlug() != null && !item.categorySlug().isBlank()) {
            category = new StorefrontCategorySummaryResult(item.categorySlug(), item.categoryName());
        }

        StorefrontBrandSummaryResult brand = null;
        if (item.brandSlug() != null && !item.brandSlug().isBlank()) {
            brand = new StorefrontBrandSummaryResult(item.brandSlug(), item.brandName());
        }

        StorefrontImageResult primaryImage = null;
        if (item.primaryImageUrl() != null && !item.primaryImageUrl().isBlank()) {
            primaryImage = new StorefrontImageResult(
                    item.primaryImageUrl(),
                    item.primaryImageAltText(),
                    item.primaryImageType(),
                    item.primaryImageDisplayOrder()
            );
        }

        boolean indexable = computeIndexable(item);

        StorefrontSeoResult seo = null;
        if (hasSeoData(item)) {
            seo = new StorefrontSeoResult(
                    item.seoTitle(),
                    item.seoDescription(),
                    item.canonicalPath(),
                    item.robotsPolicy(),
                    item.ogTitle(),
                    item.ogDescription(),
                    item.ogImageUrl(),
                    indexable
            );
        }

        return new StorefrontProductDetailResult(
                item.slug(),
                item.name(),
                item.description(),
                primaryImage,
                List.of(),
                new StorefrontPriceResult(amount, currency, currency + " " + amount),
                new StorefrontAvailabilityResult("NOT_AVAILABLE", "No disponible temporalmente", false),
                category,
                brand,
                seo,
                item.canonicalPath(),
                indexable
        );
    }

    private StorefrontCategoryListItemResult toPublicCategory(StorefrontPublicCategoryProjection category) {
        return new StorefrontCategoryListItemResult(
                category.slug(),
                category.name(),
                category.description()
        );
    }

    private StorefrontCategoryDetailResult toPublicCategoryDetail(StorefrontPublicCategoryDetailProjection item) {
        boolean indexable = computeCategoryIndexable(item);

        StorefrontSeoResult seo = null;
        if (hasCategorySeoData(item)) {
            seo = new StorefrontSeoResult(
                    item.seoTitle(),
                    item.seoDescription(),
                    item.canonicalPath(),
                    item.robotsPolicy(),
                    item.ogTitle(),
                    item.ogDescription(),
                    item.ogImageUrl(),
                    indexable
            );
        }

        return new StorefrontCategoryDetailResult(
                item.slug(),
                item.name(),
                item.description(),
                item.productCount(),
                seo,
                item.canonicalPath(),
                indexable
        );
    }

    private StorefrontSitemapEntryResult toSitemapEntry(StorefrontSitemapEntryProjection item) {
        return new StorefrontSitemapEntryResult(
                item.loc(),
                item.type(),
                item.lastModified()
        );
    }

    private boolean isValidPublicSitemapEntry(StorefrontSitemapEntryProjection item) {
        if (item == null || !notBlank(item.loc()) || !notBlank(item.type())) {
            return false;
        }
        String loc = item.loc().trim();
        if (!loc.startsWith("/")) {
            return false;
        }
        String normalized = loc.toLowerCase(Locale.ROOT);
        return !normalized.startsWith("/api/")
                && !normalized.startsWith("/ecommerce-admin/")
                && !normalized.contains("/checkout")
                && !normalized.contains("/pedidos")
                && !normalized.contains("?");
    }

    private boolean hasSeoData(StorefrontPublicProductDetailProjection item) {
        return notBlank(item.seoTitle())
                || notBlank(item.seoDescription())
                || notBlank(item.canonicalPath())
                || notBlank(item.robotsPolicy())
                || notBlank(item.ogTitle())
                || notBlank(item.ogDescription())
                || notBlank(item.ogImageUrl())
                || item.seoIndexable() != null;
    }

    private boolean computeIndexable(StorefrontPublicProductDetailProjection item) {
        if (!Boolean.TRUE.equals(item.seoIndexable())) {
            return false;
        }
        if (!notBlank(item.seoTitle()) || !notBlank(item.seoDescription()) || !notBlank(item.canonicalPath())) {
            return false;
        }
        if (!notBlank(item.robotsPolicy())) {
            return false;
        }
        return RobotsPolicy.INDEX_FOLLOW.name().equals(item.robotsPolicy().trim().toUpperCase(Locale.ROOT));
    }

    private boolean hasCategorySeoData(StorefrontPublicCategoryDetailProjection item) {
        return notBlank(item.seoTitle())
                || notBlank(item.seoDescription())
                || notBlank(item.canonicalPath())
                || notBlank(item.robotsPolicy())
                || notBlank(item.ogTitle())
                || notBlank(item.ogDescription())
                || notBlank(item.ogImageUrl())
                || item.seoIndexable() != null;
    }

    private boolean computeCategoryIndexable(StorefrontPublicCategoryDetailProjection item) {
        if (item.productCount() <= 0) {
            return false;
        }
        if (!Boolean.TRUE.equals(item.seoIndexable())) {
            return false;
        }
        if (!notBlank(item.seoTitle()) || !notBlank(item.seoDescription()) || !notBlank(item.canonicalPath())) {
            return false;
        }
        if (!notBlank(item.robotsPolicy())) {
            return false;
        }
        return RobotsPolicy.INDEX_FOLLOW.name().equals(item.robotsPolicy().trim().toUpperCase(Locale.ROOT));
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeCategorySlug(String categorySlug) {
        if (categorySlug == null || categorySlug.isBlank()) {
            return null;
        }
        return categorySlug.trim();
    }

    private void validatePage(int page) {
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page: must be greater than or equal to 0");
        }
    }

    private void validateProductsSize(int size) {
        if (size <= 0 || size > MAX_PRODUCTS_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid size: must be between 1 and 50");
        }
    }

    private void validateCategoriesSize(int size) {
        if (size <= 0 || size > MAX_CATEGORIES_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid size: must be between 1 and 100");
        }
    }

    private void validateSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return;
        }
        if (!SUPPORTED_SORT.equalsIgnoreCase(sort.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort: only name_asc is supported");
        }
    }
}
