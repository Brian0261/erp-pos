package com.erppos.backend.erp.quotes.application.usecase;

import java.time.LocalDate;
import java.util.List;

public record CreateQuoteCommand(
        String customerName,
        String customerDocument,
        String customerPhone,
        String customerEmail,
        LocalDate issueDate,
        LocalDate expiresAt,
        String notes,
        List<QuoteItemCommand> items
) {
}

