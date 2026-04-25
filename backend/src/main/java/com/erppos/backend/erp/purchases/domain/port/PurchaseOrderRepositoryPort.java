package com.erppos.backend.erp.purchases.domain.port;

import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepositoryPort {
    PurchaseOrder save(PurchaseOrder purchaseOrder);
    Optional<PurchaseOrder> findById(Long id);
    List<PurchaseOrder> findByFilters(PurchaseOrderStatus status, Long supplierId, LocalDate from, LocalDate to);
}

