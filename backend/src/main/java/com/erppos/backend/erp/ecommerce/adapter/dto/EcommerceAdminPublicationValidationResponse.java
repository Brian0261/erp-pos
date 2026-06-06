package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.MissingRequirement;

import java.math.BigDecimal;
import java.util.List;

public record EcommerceAdminPublicationValidationResponse(
        boolean publishable,
        List<String> errors,
        BigDecimal effectivePrice,
        String currency,
        List<MissingRequirement> missingRequirements
) {
}
