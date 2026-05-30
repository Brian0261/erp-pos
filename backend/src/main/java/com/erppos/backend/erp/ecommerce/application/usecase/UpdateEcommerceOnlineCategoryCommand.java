package com.erppos.backend.erp.ecommerce.application.usecase;

public record UpdateEcommerceOnlineCategoryCommand(
        Long parentId,
        String name,
        String slug,
        String description
) {
}
