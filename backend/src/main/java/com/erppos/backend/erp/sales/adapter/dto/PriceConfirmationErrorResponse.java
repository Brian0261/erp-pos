package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.domain.exception.PriceConfirmationRequiredException.PriceChange;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PriceConfirmationErrorResponse(Instant timestamp, int status, String error, String message,
        String path, String traceId, String code, BigDecimal confirmedTotal, BigDecimal proposedTotal,
        List<PriceChange> changes) {}
