package com.erppos.backend.erp.ecommerce.application.usecase;

import java.math.BigDecimal;
import java.util.List;

public record PublicationValidationResult(
        boolean publishable,
        List<String> errors,
        BigDecimal effectivePrice,
        String currency,
        List<MissingRequirement> missingRequirements
) {
}
