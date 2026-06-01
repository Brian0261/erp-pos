package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductPageResult;

public interface StorefrontProductCatalogUseCase {
    StorefrontProductPageResult listPublishedProducts(int page, int size, String sort);
}
