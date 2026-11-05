package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.Sale;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** One server-clock reference selects the commercial day for the entire read. */
public record TodaySalesResult(LocalDate businessDate, String timeZone, Instant referenceInstant,
                               Instant nextDayStartsAt, List<Sale> sales) {}
