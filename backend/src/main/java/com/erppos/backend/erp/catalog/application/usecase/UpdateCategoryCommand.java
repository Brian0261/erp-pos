package com.erppos.backend.erp.catalog.application.usecase;

public record UpdateCategoryCommand(
        String name,
        String description
) {
}
