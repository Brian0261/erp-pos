package com.erppos.backend.erp.purchases.infrastructure.mapper;

import com.erppos.backend.erp.purchases.domain.model.PurchaseReceipt;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceiptItem;
import com.erppos.backend.erp.purchases.infrastructure.persistence.PurchaseOrderItemEntity;
import com.erppos.backend.erp.purchases.infrastructure.persistence.PurchaseReceiptEntity;
import com.erppos.backend.erp.purchases.infrastructure.persistence.PurchaseReceiptItemEntity;

import java.util.List;

public final class PurchaseReceiptMapper {
    private PurchaseReceiptMapper() {
    }

    public static PurchaseReceipt toDomain(PurchaseReceiptEntity entity) {
        List<PurchaseReceiptItem> items = entity.getItems().stream().map(PurchaseReceiptMapper::toDomainItem).toList();
        return new PurchaseReceipt(
                entity.getId(),
                entity.getPurchaseOrder().getId(),
                entity.getReceiptDate(),
                entity.getNotes(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                items
        );
    }

    public static PurchaseReceiptItem toDomainItem(PurchaseReceiptItemEntity entity) {
        return new PurchaseReceiptItem(
                entity.getId(),
                entity.getPurchaseReceipt().getId(),
                entity.getPurchaseOrderItem().getId(),
                entity.getProductId(),
                entity.getQuantityReceived()
        );
    }

    public static PurchaseReceiptEntity toEntity(PurchaseReceipt receipt) {
        PurchaseReceiptEntity entity = new PurchaseReceiptEntity();
        merge(entity, receipt);
        return entity;
    }

    public static void merge(PurchaseReceiptEntity entity, PurchaseReceipt receipt) {
        entity.setReceiptDate(receipt.receiptDate());
        entity.setNotes(receipt.notes());
        entity.setCreatedBy(receipt.createdBy());
    }

    public static PurchaseReceiptItemEntity toItemEntity(PurchaseReceiptItem item, PurchaseReceiptEntity receiptEntity,
                                                         PurchaseOrderItemEntity orderItemEntity) {
        PurchaseReceiptItemEntity entity = new PurchaseReceiptItemEntity();
        entity.setPurchaseReceipt(receiptEntity);
        entity.setPurchaseOrderItem(orderItemEntity);
        entity.setProductId(item.productId());
        entity.setQuantityReceived(item.quantityReceived());
        return entity;
    }
}
