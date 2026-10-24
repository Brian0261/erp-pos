package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.quotes.adapter.dto.ConvertQuoteToSaleRequest;
import com.erppos.backend.erp.sales.application.usecase.ReceiptIntent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;

public record PrepareSaleOperationRequest(@NotNull @Min(1) @Max(1) Integer protocolVersion,
        @NotNull @Pattern(regexp="POS|QUOTE") String origin, @NotNull UUID operationId,
        @Valid CreateSaleRequest command, Long quoteId, @Valid ConvertQuoteToSaleRequest quoteCommand,
        ReceiptIntent receiptIntent) {}
