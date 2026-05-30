package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.EcommerceBrandEntity;

public final class EcommerceBrandMapper {
    private EcommerceBrandMapper() {
    }

    public static EcommerceBrand toDomain(EcommerceBrandEntity entity) {
        return new EcommerceBrand(
                entity.getId(),
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

    public static EcommerceBrandEntity toEntity(EcommerceBrand brand) {
        EcommerceBrandEntity entity = new EcommerceBrandEntity();
        merge(entity, brand);
        return entity;
    }

    public static void merge(EcommerceBrandEntity entity, EcommerceBrand brand) {
        entity.setName(brand.name());
        entity.setSlug(brand.slug());
        entity.setDescription(brand.description());
        entity.setActive(brand.active());
        entity.setCreatedBy(brand.createdBy());
        entity.setUpdatedBy(brand.updatedBy());
    }
}
