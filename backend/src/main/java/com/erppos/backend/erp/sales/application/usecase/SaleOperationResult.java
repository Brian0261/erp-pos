package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import java.time.Instant;
import java.util.UUID;

public record SaleOperationResult(UUID operationId, int protocolVersion, String origin, String state,
        Long cashRegisterSessionId, Long saleId, Long quoteId, CreateSaleCommand command,
        ConvertQuoteToSaleCommand quoteCommand, ReceiptIntent receiptIntent, Long documentId,
        String documentStatus, String receiptState, Instant createdAt, Instant updatedAt) {}
