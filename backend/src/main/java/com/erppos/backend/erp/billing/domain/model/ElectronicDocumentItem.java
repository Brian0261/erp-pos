package com.erppos.backend.erp.billing.domain.model;

import java.math.BigDecimal;

public record ElectronicDocumentItem(
        Long id,
        Long electronicDocumentId,
        Long productId,
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

