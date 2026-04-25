package com.erppos.backend.erp.catalog.adapter.dto;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
public record ProductCreateRequest(
        @NotBlank(message = "sku is required")
        @Size(max = 60, message = "sku max length is 60")
        String sku,
        @Size(max = 50, message = "barcode max length is 50")
        String barcode,
        @NotBlank(message = "name is required")
        @Size(max = 180, message = "name max length is 180")
        String name,
        @Size(max = 500, message = "description max length is 500")
        String description,
        @NotNull(message = "categoryId is required")
        Long categoryId,
        @NotNull(message = "unitId is required")
        Long unitId,
        @NotNull(message = "salePrice is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "salePrice must be >= 0")
        BigDecimal salePrice
) {
}
