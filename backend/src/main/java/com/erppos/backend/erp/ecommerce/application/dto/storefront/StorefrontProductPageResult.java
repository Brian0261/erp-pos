package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.util.List;

public record StorefrontProductPageResult(
        List<StorefrontProductListItemResult> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
