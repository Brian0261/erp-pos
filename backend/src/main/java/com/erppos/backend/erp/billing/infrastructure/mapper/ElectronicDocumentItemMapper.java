package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentItemEntity;

public final class ElectronicDocumentItemMapper {
    private ElectronicDocumentItemMapper() {
    }

    public static ElectronicDocumentItem toDomain(ElectronicDocumentItemEntity entity) {
        return new ElectronicDocumentItem(
                entity.getId(),
                entity.getElectronicDocument().getId(),
                entity.getProductId(),
                entity.getDescription(),
                entity.getQuantity(),
                entity.getUnitPrice(),
                entity.getDiscountAmount(),
                entity.getLineTotal()
        );
    }

    public static ElectronicDocumentItemEntity toEntity(ElectronicDocumentItem item, ElectronicDocumentEntity documentEntity) {
        ElectronicDocumentItemEntity entity = new ElectronicDocumentItemEntity();
        entity.setElectronicDocument(documentEntity);
        entity.setProductId(item.productId());
        entity.setDescription(item.description());
        entity.setQuantity(item.quantity());
        entity.setUnitPrice(item.unitPrice());
        entity.setDiscountAmount(item.discountAmount());
        entity.setLineTotal(item.lineTotal());
        return entity;
    }
}

