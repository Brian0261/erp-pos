package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.BillingSaleSnapshot;

import java.util.Optional;

public interface BillingSaleReadPort {
    Optional<BillingSaleSnapshot> findById(Long saleId);
}

