package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;

public interface CashRegisterUseCase {
    CashRegisterSession open(OpenCashRegisterCommand command);
    CashRegisterSession current();
    CashRegisterSession close(Long id, CloseCashRegisterCommand command);
    CashRegisterSession getById(Long id);
}

