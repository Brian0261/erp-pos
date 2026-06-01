package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontAvailabilityResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontBrandSummaryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategorySummaryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontImageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontPriceResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductListItemResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductPageResult;
import com.erppos.backend.erp.ecommerce.application.usecase.StorefrontProductCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection;
import com.erppos.backend.erp.ecommerce.domain.port.StorefrontProductReadPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@Transactional(readOnly = true)
public class StorefrontProductCatalogApplicationService implements StorefrontProductCatalogUseCase {

    private static final String SUPPORTED_SORT = "name_asc";
    private static final int MAX_SIZE = 50;
    private static final String DEFAULT_CURRENCY = "PEN";

    private final StorefrontProductReadPort storefrontProductReadPort;

    public StorefrontProductCatalogApplicationService(StorefrontProductReadPort storefrontProductReadPort) {
        this.storefrontProductReadPort = storefrontProductReadPort;
    }

    @Override
    public StorefrontProductPageResult listPublishedProducts(int page, int size, String sort) {
        validatePage(page);
        validateSize(size);
        validateSort(sort);

        Page<StorefrontPublicProductProjection> products = storefrontProductReadPort.findPublishedProducts(PageRequest.of(page, size));

        return new StorefrontProductPageResult(
                products.getContent().stream().map(this::toPublicProduct).toList(),
                products.getNumber(),
                products.getSize(),
                products.getTotalElements(),
                products.getTotalPages()
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

    private void validatePage(int page) {
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page: must be greater than or equal to 0");
        }
    }

    private void validateSize(int size) {
        if (size <= 0 || size > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid size: must be between 1 and 50");
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
