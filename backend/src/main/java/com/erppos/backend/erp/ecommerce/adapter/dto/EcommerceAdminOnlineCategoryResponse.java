package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.time.Instant;

public record EcommerceAdminOnlineCategoryResponse(
        Long id,
        Long parentId,
        String name,
        String slug,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
