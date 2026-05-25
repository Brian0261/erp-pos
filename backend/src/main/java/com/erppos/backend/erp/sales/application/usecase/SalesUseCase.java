package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;

import java.time.LocalDate;
import java.util.List;

public interface SalesUseCase {
    Sale create(CreateSaleCommand command);
    List<Sale> list(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdByFilter);
    List<SalesListItemResult> listItems(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdByFilter);
    Sale getById(Long id);
    Sale voidSale(Long id, VoidSaleCommand command);
}

