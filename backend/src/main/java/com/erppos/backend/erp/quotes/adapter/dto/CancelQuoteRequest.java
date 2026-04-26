package com.erppos.backend.erp.quotes.adapter.dto;

import jakarta.validation.constraints.Size;

public record CancelQuoteRequest(
        @Size(max = 400, message = "comment max length is 400")
        String comment
) {
}

