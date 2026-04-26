package com.erppos.backend.erp.billing.adapter.dto;

import java.math.BigDecimal;

public record ElectronicDocumentItemResponse(
        Long id,
        Long productId,
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

