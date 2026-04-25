package com.erppos.backend.erp.purchases.infrastructure.mapper;

import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderItem;
import com.erppos.backend.erp.purchases.infrastructure.persistence.PurchaseOrderEntity;
import com.erppos.backend.erp.purchases.infrastructure.persistence.PurchaseOrderItemEntity;
import com.erppos.backend.erp.purchases.infrastructure.persistence.SupplierEntity;

import java.util.List;

public final class PurchaseOrderMapper {
    private PurchaseOrderMapper() {
    }

    public static PurchaseOrder toDomain(PurchaseOrderEntity entity) {
        List<PurchaseOrderItem> items = entity.getItems().stream().map(PurchaseOrderMapper::toDomainItem).toList();
        return new PurchaseOrder(
                entity.getId(),
                entity.getSupplier().getId(),
                entity.getWarehouseId(),
                entity.getStatus(),
                entity.getOrderDate(),
                entity.getExpectedDate(),
                entity.getTotalAmount(),
                entity.getNotes(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                items
        );
    }

    public static PurchaseOrderItem toDomainItem(PurchaseOrderItemEntity entity) {
        return new PurchaseOrderItem(
                entity.getId(),
                entity.getPurchaseOrder().getId(),
                entity.getProductId(),
                entity.getQuantityOrdered(),
                entity.getQuantityReceived(),
                entity.getUnitCost(),
                entity.getLineTotal()
        );
    }

    public static PurchaseOrderEntity toEntity(PurchaseOrder purchaseOrder, SupplierEntity supplierEntity) {
        PurchaseOrderEntity entity = new PurchaseOrderEntity();
        merge(entity, purchaseOrder, supplierEntity);
        return entity;
    }

    public static void merge(PurchaseOrderEntity entity, PurchaseOrder purchaseOrder, SupplierEntity supplierEntity) {
        entity.setSupplier(supplierEntity);
        entity.setWarehouseId(purchaseOrder.warehouseId());
        entity.setStatus(purchaseOrder.status());
        entity.setOrderDate(purchaseOrder.orderDate());
        entity.setExpectedDate(purchaseOrder.expectedDate());
        entity.setTotalAmount(purchaseOrder.totalAmount());
        entity.setNotes(purchaseOrder.notes());
        entity.setCreatedBy(purchaseOrder.createdBy());
        entity.setUpdatedBy(purchaseOrder.updatedBy());
    }

    public static PurchaseOrderItemEntity toItemEntity(PurchaseOrderItem item, PurchaseOrderEntity orderEntity) {
        PurchaseOrderItemEntity entity = new PurchaseOrderItemEntity();
        mergeItem(entity, item, orderEntity);
        return entity;
    }

    public static void mergeItem(PurchaseOrderItemEntity entity, PurchaseOrderItem item, PurchaseOrderEntity orderEntity) {
        entity.setPurchaseOrder(orderEntity);
        entity.setProductId(item.productId());
        entity.setQuantityOrdered(item.quantityOrdered());
        entity.setQuantityReceived(item.quantityReceived());
        entity.setUnitCost(item.unitCost());
        entity.setLineTotal(item.lineTotal());
    }
}
