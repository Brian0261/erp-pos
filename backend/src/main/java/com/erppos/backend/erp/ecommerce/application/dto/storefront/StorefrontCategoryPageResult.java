package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.util.List;

public record StorefrontCategoryPageResult(
        List<StorefrontCategoryListItemResult> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
