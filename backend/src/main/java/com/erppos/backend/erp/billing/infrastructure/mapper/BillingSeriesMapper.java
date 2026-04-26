package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.infrastructure.persistence.BillingSeriesEntity;

public final class BillingSeriesMapper {
    private BillingSeriesMapper() {
    }

    public static BillingSeries toDomain(BillingSeriesEntity entity) {
        return new BillingSeries(
                entity.getId(),
                entity.getDocumentType(),
                entity.getSeries(),
                entity.getCurrentNumber(),
                entity.getEnvironment(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static BillingSeriesEntity toEntity(BillingSeries series) {
        BillingSeriesEntity entity = new BillingSeriesEntity();
        merge(entity, series);
        return entity;
    }

    public static void merge(BillingSeriesEntity entity, BillingSeries series) {
        entity.setDocumentType(series.documentType());
        entity.setSeries(series.series());
        entity.setCurrentNumber(series.currentNumber());
        entity.setEnvironment(series.environment());
        entity.setActive(series.active());
        entity.setCreatedBy(series.createdBy());
        entity.setUpdatedBy(series.updatedBy());
    }
}

