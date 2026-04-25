package com.erppos.backend.erp.purchases.application.usecase;

public record CreateSupplierCommand(
        String documentNumber,
        String name,
        String contactName,
        String phone,
        String email,
        String address
) {
}

