package com.erppos.backend.erp.catalog.adapter.dto;

public record ProductLookupResponse(
        Long id,
        String name,
        String sku,
        String barcode,
        boolean active
) {
}
