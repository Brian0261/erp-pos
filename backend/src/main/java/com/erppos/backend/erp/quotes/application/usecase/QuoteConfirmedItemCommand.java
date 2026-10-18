package com.erppos.backend.erp.quotes.application.usecase;

import java.math.BigDecimal;

public record QuoteConfirmedItemCommand(Long quoteItemId, BigDecimal quantity, BigDecimal discountAmount,
                                        BigDecimal confirmedUnitPrice) {}
