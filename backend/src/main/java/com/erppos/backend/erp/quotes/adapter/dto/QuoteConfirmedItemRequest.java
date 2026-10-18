package com.erppos.backend.erp.quotes.adapter.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record QuoteConfirmedItemRequest(@NotNull Long quoteItemId, @NotNull BigDecimal quantity,
        @NotNull BigDecimal discountAmount, @NotNull BigDecimal confirmedUnitPrice) {}
