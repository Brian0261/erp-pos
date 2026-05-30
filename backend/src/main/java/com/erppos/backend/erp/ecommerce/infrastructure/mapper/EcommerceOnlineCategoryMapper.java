package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.EcommerceOnlineCategoryEntity;

public final class EcommerceOnlineCategoryMapper {
    private EcommerceOnlineCategoryMapper() {
    }

    public static EcommerceOnlineCategory toDomain(EcommerceOnlineCategoryEntity entity) {
        return new EcommerceOnlineCategory(
                entity.getId(),
                entity.getParentId(),
                entity.getName(),
                entity.getSlug(),
                entity.getDescription(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static EcommerceOnlineCategoryEntity toEntity(EcommerceOnlineCategory category) {
        EcommerceOnlineCategoryEntity entity = new EcommerceOnlineCategoryEntity();
        merge(entity, category);
        return entity;
    }

    public static void merge(EcommerceOnlineCategoryEntity entity, EcommerceOnlineCategory category) {
        entity.setParentId(category.parentId());
        entity.setName(category.name());
        entity.setSlug(category.slug());
        entity.setDescription(category.description());
        entity.setActive(category.active());
        entity.setCreatedBy(category.createdBy());
        entity.setUpdatedBy(category.updatedBy());
    }
}
