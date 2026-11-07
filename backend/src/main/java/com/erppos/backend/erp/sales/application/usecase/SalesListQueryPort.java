package com.erppos.backend.erp.sales.application.usecase;

public interface SalesListQueryPort {
    SalesListPage findPage(SalesListQuery query, String effectiveCreatedBy);
}
