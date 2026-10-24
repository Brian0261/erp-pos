package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.application.usecase.*;
import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import java.time.Instant;
import java.util.UUID;

public record SaleOperationResponse(UUID operationId,int protocolVersion,String origin,String state,
        Long cashRegisterSessionId,Long saleId,Long quoteId,CreateSaleRequest command,
        ConvertQuoteToSaleCommand quoteCommand,ReceiptIntent receiptIntent,Long documentId,String documentStatus,
        String receiptState,Instant createdAt,Instant updatedAt) {
    public static SaleOperationResponse from(SaleOperationResult r) {
        var c=r.command();
        CreateSaleRequest request=c==null?null:new CreateSaleRequest(c.warehouseId(),
                c.items().stream().map(i->new CreateSaleItemRequest(i.productId(),i.quantity(),i.discountAmount(),i.confirmedUnitPrice())).toList(),
                c.payments().stream().map(p->new CreateSalePaymentRequest(p.paymentMethod(),p.amount(),p.reference())).toList(),
                c.operationId(),c.confirmedTotal());
        return new SaleOperationResponse(r.operationId(),r.protocolVersion(),r.origin(),r.state(),r.cashRegisterSessionId(),
                r.saleId(),r.quoteId(),request,r.quoteCommand(),r.receiptIntent(),r.documentId(),r.documentStatus(),
                r.receiptState(),r.createdAt(),r.updatedAt());
    }
}
