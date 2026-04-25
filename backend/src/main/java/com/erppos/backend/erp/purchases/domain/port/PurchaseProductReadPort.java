package com.erppos.backend.erp.purchases.domain.port;

import com.erppos.backend.erp.purchases.domain.model.PurchaseProductSnapshot;

import java.util.Optional;

public interface PurchaseProductReadPort {
    Optional<PurchaseProductSnapshot> findById(Long productId);
}

