package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingSeries;

import java.util.List;

public interface BillingSeriesUseCase {
    BillingSeries create(CreateBillingSeriesCommand command);
    List<BillingSeries> list();
    BillingSeries getById(Long id);
    BillingSeries update(Long id, UpdateBillingSeriesCommand command);
    void deactivate(Long id);
}

