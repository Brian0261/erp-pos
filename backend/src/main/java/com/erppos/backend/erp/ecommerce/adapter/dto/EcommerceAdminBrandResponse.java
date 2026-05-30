package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.time.Instant;

public record EcommerceAdminBrandResponse(
        Long id,
        String name,
        String slug,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
