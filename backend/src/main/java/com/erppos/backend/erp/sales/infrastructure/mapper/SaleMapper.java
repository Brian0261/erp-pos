package com.erppos.backend.erp.sales.infrastructure.mapper;

import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleItem;
import com.erppos.backend.erp.sales.domain.model.SalePayment;
import com.erppos.backend.erp.sales.infrastructure.persistence.CashRegisterSessionEntity;
import com.erppos.backend.erp.sales.infrastructure.persistence.SaleEntity;
import com.erppos.backend.erp.sales.infrastructure.persistence.SaleItemEntity;
import com.erppos.backend.erp.sales.infrastructure.persistence.SalePaymentEntity;

import java.util.List;

public final class SaleMapper {
    private SaleMapper() {
    }

    public static Sale toDomain(SaleEntity entity) {
        List<SaleItem> items = entity.getItems().stream().map(SaleMapper::toDomainItem).toList();
        List<SalePayment> payments = entity.getPayments().stream().map(SaleMapper::toDomainPayment).toList();
        return new Sale(
                entity.getId(),
                entity.getCashRegisterSession().getId(),
                entity.getWarehouseId(),
                entity.getSaleNumber(),
                entity.getStatus(),
                entity.getSubtotalAmount(),
                entity.getDiscountAmount(),
                entity.getTotalAmount(),
                entity.getPaidAmount(),
                entity.getChangeAmount(),
                entity.getSoldAt(),
                entity.getVoidedAt(),
                entity.getVoidedByUserId(),
                entity.getVoidReason(),
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                items,
                payments
        );
    }

    public static SaleItem toDomainItem(SaleItemEntity entity) {
        return new SaleItem(
                entity.getId(),
                entity.getSale().getId(),
                entity.getProductId(),
                entity.getQuantity(),
                entity.getUnitPrice(),
                entity.getDiscountAmount(),
                entity.getLineTotal()
        );
    }

    public static SalePayment toDomainPayment(SalePaymentEntity entity) {
        return new SalePayment(
                entity.getId(),
                entity.getSale().getId(),
                entity.getPaymentMethod(),
                entity.getAmount(),
                entity.getReference(),
                entity.getCreatedAt()
        );
    }

    public static SaleEntity toEntity(Sale sale, CashRegisterSessionEntity cashSessionEntity) {
        SaleEntity entity = new SaleEntity();
        merge(entity, sale, cashSessionEntity);
        return entity;
    }

    public static void merge(SaleEntity entity, Sale sale, CashRegisterSessionEntity cashSessionEntity) {
        entity.setCashRegisterSession(cashSessionEntity);
        entity.setWarehouseId(sale.warehouseId());
        entity.setSaleNumber(sale.saleNumber());
        entity.setStatus(sale.status());
        entity.setSubtotalAmount(sale.subtotalAmount());
        entity.setDiscountAmount(sale.discountAmount());
        entity.setTotalAmount(sale.totalAmount());
        entity.setPaidAmount(sale.paidAmount());
        entity.setChangeAmount(sale.changeAmount());
        entity.setSoldAt(sale.soldAt());
        entity.setVoidedAt(sale.voidedAt());
        entity.setVoidedByUserId(sale.voidedByUserId());
        entity.setVoidReason(sale.voidReason());
        entity.setCreatedBy(sale.createdBy());
    }

    public static SaleItemEntity toItemEntity(SaleItem item, SaleEntity saleEntity) {
        SaleItemEntity entity = new SaleItemEntity();
        mergeItem(entity, item, saleEntity);
        return entity;
    }

    public static void mergeItem(SaleItemEntity entity, SaleItem item, SaleEntity saleEntity) {
        entity.setSale(saleEntity);
        entity.setProductId(item.productId());
        entity.setQuantity(item.quantity());
        entity.setUnitPrice(item.unitPrice());
        entity.setDiscountAmount(item.discountAmount());
        entity.setLineTotal(item.lineTotal());
    }

    public static SalePaymentEntity toPaymentEntity(SalePayment payment, SaleEntity saleEntity) {
        SalePaymentEntity entity = new SalePaymentEntity();
        mergePayment(entity, payment, saleEntity);
        return entity;
    }

    public static void mergePayment(SalePaymentEntity entity, SalePayment payment, SaleEntity saleEntity) {
        entity.setSale(saleEntity);
        entity.setPaymentMethod(payment.paymentMethod());
        entity.setAmount(payment.amount());
        entity.setReference(payment.reference());
    }
}

