package com.erppos.backend.erp.quotes.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record CreateQuoteRequest(
        @NotBlank(message = "customerName is required")
        @Size(max = 180, message = "customerName max length is 180")
        String customerName,
        @Size(max = 40, message = "customerDocument max length is 40")
        String customerDocument,
        @Size(max = 40, message = "customerPhone max length is 40")
        String customerPhone,
        @Size(max = 160, message = "customerEmail max length is 160")
        String customerEmail,
        LocalDate issueDate,
        @NotNull(message = "expiresAt is required")
        LocalDate expiresAt,
        @Size(max = 400, message = "notes max length is 400")
        String notes,
        @NotEmpty(message = "items are required")
        List<@Valid QuoteItemRequest> items
) {
}

