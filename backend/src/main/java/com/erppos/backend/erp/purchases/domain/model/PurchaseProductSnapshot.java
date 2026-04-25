package com.erppos.backend.erp.purchases.domain.model;

public record PurchaseProductSnapshot(
        Long id,
        String name,
        boolean active
) {
}

