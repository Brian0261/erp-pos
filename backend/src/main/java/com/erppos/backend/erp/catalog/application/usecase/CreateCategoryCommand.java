package com.erppos.backend.erp.catalog.application.usecase;
public record CreateCategoryCommand(
        String name,
        String description
) {
}
