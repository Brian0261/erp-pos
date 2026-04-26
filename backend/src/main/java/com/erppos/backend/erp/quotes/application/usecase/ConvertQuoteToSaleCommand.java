package com.erppos.backend.erp.quotes.application.usecase;

import java.util.List;

public record ConvertQuoteToSaleCommand(
        Long warehouseId,
        String comment,
        List<QuotePaymentCommand> payments
) {
}

