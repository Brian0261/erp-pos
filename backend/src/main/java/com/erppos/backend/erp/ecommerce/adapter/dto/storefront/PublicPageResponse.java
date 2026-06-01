package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.util.List;

public record PublicPageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
