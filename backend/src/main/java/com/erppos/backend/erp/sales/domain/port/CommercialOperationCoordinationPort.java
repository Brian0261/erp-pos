package com.erppos.backend.erp.sales.domain.port;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cross-module coordination without depending on sales or billing application services. */
public interface CommercialOperationCoordinationPort {
    void lockForSale(Long saleId);
    void lockForSales(List<Long> saleIds);
    Optional<ReceiptIntent> receiptIntentForSale(Long saleId);
    void linkDocument(Long saleId, Long documentId, String documentType, Long seriesId,
                      String customerName, String customerDocument);

    record ReceiptIntent(UUID actorId, String receiptType, Long billingSeriesId,
                         String customerName, String customerDocument) {}
}
