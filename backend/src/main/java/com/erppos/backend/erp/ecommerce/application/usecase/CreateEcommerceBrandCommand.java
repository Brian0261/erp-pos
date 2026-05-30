package com.erppos.backend.erp.ecommerce.application.usecase;

public record CreateEcommerceBrandCommand(
        String name,
        String slug,
        String description
) {
}
