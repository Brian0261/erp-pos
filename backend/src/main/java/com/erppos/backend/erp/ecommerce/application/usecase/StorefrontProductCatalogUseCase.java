package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategoryPageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductPageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductDetailResult;

public interface StorefrontProductCatalogUseCase {
    StorefrontProductPageResult listPublishedProducts(int page, int size, String sort);

    StorefrontCategoryPageResult listPublicCategories(int page, int size, String sort);

    StorefrontProductDetailResult getPublishedProductBySlug(String slug);
}
