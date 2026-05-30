package com.erppos.backend.erp.ecommerce.application.usecase;

public record CreateEcommerceOnlineCategoryCommand(
        Long parentId,
        String name,
        String slug,
        String description
) {
}
