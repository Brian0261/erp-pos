package com.erppos.backend.erp.sales.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VoidSaleRequest(
        @NotBlank(message = "reason is required")
        @Size(max = 400, message = "reason max length is 400")
        String reason
) {
}

