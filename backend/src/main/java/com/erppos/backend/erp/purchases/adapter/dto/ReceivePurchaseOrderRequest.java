package com.erppos.backend.erp.purchases.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ReceivePurchaseOrderRequest(
        LocalDate receiptDate,
        @Size(max = 400, message = "notes max length is 400")
        String notes,
        @NotEmpty(message = "items are required")
        List<@Valid ReceivePurchaseItemRequest> items
) {
}

