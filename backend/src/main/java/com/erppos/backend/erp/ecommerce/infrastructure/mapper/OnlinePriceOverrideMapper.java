package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.OnlinePriceOverrideEntity;

public final class OnlinePriceOverrideMapper {
    private OnlinePriceOverrideMapper() {
    }

    public static OnlinePriceOverride toDomain(OnlinePriceOverrideEntity entity) {
        return new OnlinePriceOverride(
                entity.getId(),
                entity.getProductOnlineProfileId(),
                entity.getAmount(),
                entity.getCurrency(),
                entity.isActive(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getReason(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static OnlinePriceOverrideEntity toEntity(OnlinePriceOverride override) {
        OnlinePriceOverrideEntity entity = new OnlinePriceOverrideEntity();
        merge(entity, override);
        return entity;
    }

    public static void merge(OnlinePriceOverrideEntity entity, OnlinePriceOverride override) {
        entity.setProductOnlineProfileId(override.productOnlineProfileId());
        entity.setAmount(override.amount());
        entity.setCurrency(override.currency());
        entity.setActive(override.active());
        entity.setValidFrom(override.validFrom());
        entity.setValidTo(override.validTo());
        entity.setReason(override.reason());
        entity.setCreatedBy(override.createdBy());
        entity.setUpdatedBy(override.updatedBy());
    }
}
