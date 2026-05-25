package com.erppos.backend.erp.sales.domain.port;

import com.erppos.backend.erp.sales.domain.model.SaleBillingSummary;

import java.util.Collection;
import java.util.Map;

public interface SalesBillingSummaryReadPort {
    Map<Long, SaleBillingSummary> findLatestBySaleIds(Collection<Long> saleIds);
}
