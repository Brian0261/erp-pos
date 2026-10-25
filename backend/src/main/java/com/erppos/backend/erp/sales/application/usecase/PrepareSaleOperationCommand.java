package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import java.util.UUID;

public record PrepareSaleOperationCommand(int protocolVersion, String origin, UUID operationId,
        CreateSaleCommand command, Long quoteId, ConvertQuoteToSaleCommand quoteCommand, ReceiptIntent receiptIntent) {}
