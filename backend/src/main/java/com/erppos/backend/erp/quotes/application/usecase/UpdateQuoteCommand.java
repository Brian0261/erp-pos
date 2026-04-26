package com.erppos.backend.erp.quotes.application.usecase;

import java.time.LocalDate;
import java.util.List;

public record UpdateQuoteCommand(
        String customerName,
        String customerDocument,
        String customerPhone,
        String customerEmail,
        LocalDate expiresAt,
        String notes,
        List<QuoteItemCommand> items
) {
}

