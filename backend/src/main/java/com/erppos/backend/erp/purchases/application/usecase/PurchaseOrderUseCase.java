package com.erppos.backend.erp.purchases.application.usecase;

import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;

import java.time.LocalDate;
import java.util.List;

public interface PurchaseOrderUseCase {
    PurchaseOrder create(CreatePurchaseOrderCommand command);
    List<PurchaseOrder> list(PurchaseOrderStatus status, Long supplierId, LocalDate from, LocalDate to);
    PurchaseOrder getById(Long id);
    PurchaseOrder update(Long id, UpdatePurchaseOrderCommand command);
    PurchaseOrder approve(Long id);
    PurchaseOrder receive(Long id, ReceivePurchaseOrderCommand command);
    PurchaseOrder cancel(Long id);
}

