package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.PosProductView;

import java.util.List;

public interface PosUseCase {
    PosProductView lookupByCode(String code, Long warehouseId);
    List<PosProductView> search(String query, Long warehouseId);
}

