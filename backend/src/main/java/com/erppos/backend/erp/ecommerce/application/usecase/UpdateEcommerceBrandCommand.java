package com.erppos.backend.erp.ecommerce.application.usecase;

public record UpdateEcommerceBrandCommand(
        String name,
        String slug,
        String description
) {
}
