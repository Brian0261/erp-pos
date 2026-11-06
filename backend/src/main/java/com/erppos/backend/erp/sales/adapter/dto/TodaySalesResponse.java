package com.erppos.backend.erp.sales.adapter.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record TodaySalesResponse(LocalDate businessDate, String timeZone, Instant referenceInstant,
                                 Instant nextDayStartsAt, List<SaleResponse> sales) {}
