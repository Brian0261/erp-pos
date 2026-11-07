package com.erppos.backend.erp.sales.application.usecase;

import java.util.List;

public record SalesListPage(List<SalesListItemResult> items, long totalItems) {
}
