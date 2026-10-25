package com.erppos.backend.erp.sales.application.usecase;

import java.util.List;

public record SaleOperationPageResult(List<SaleOperationResult> items,int page,int size,long totalItems,int totalPages) {}
