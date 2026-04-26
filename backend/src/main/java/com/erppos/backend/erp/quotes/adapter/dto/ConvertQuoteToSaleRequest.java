package com.erppos.backend.erp.quotes.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ConvertQuoteToSaleRequest(
        @NotNull(message = "warehouseId is required")
        Long warehouseId,
        @Size(max = 400, message = "comment max length is 400")
        String comment,
        @NotEmpty(message = "payments are required")
        List<@Valid QuotePaymentRequest> payments
) {
}

