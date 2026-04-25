package com.erppos.backend.erp.purchases.adapter.dto;

import java.time.Instant;

public record SupplierResponse(
        Long id,
        String documentNumber,
        String name,
        String contactName,
        String phone,
        String email,
        String address,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}

