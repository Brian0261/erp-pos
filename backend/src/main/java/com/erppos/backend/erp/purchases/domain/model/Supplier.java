package com.erppos.backend.erp.purchases.domain.model;

import java.time.Instant;

public record Supplier(
        Long id,
        String documentNumber,
        String name,
        String contactName,
        String phone,
        String email,
        String address,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}

