package com.erppos.backend.erp.admin.cleanup.domain.port;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public interface ProductCleanupPreviewQueryPort {

    List<ProductRow> findProducts(Set<Long> productIds, Set<String> normalizedSkus);

    List<SaleRow> findSalesByProductIds(Set<Long> productIds);

    List<SaleItemRow> findSaleItemsBySaleIds(Set<Long> saleIds);

    List<SalePaymentRow> findSalePaymentsBySaleIds(Set<Long> saleIds);

    List<StockBalanceRow> findStockBalancesByProductIds(Set<Long> productIds);

    List<InventoryMovementRow> findInventoryMovementsByProductIds(Set<Long> productIds);

    List<StockTransferItemRow> findStockTransferItemsByProductIds(Set<Long> productIds);

    List<QuoteItemRow> findQuoteItemsByProductIds(Set<Long> productIds);

    List<PurchaseOrderItemRow> findPurchaseOrderItemsByProductIds(Set<Long> productIds);

    List<PurchaseReceiptItemRow> findPurchaseReceiptItemsByProductIds(Set<Long> productIds);

    List<ElectronicDocumentItemRow> findElectronicDocumentItemsByProductIds(Set<Long> productIds);

    record ProductRow(
            Long id,
            String sku,
            String barcode,
            String name,
            boolean active
    ) {
    }

    record SaleRow(
            Long saleId,
            String saleNumber,
            String status,
            BigDecimal subtotalAmount,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal changeAmount
    ) {
    }

    record SaleItemRow(
            Long saleItemId,
            Long saleId,
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal discountAmount,
            BigDecimal lineTotal
    ) {
    }

    record SalePaymentRow(
            Long salePaymentId,
            Long saleId,
            String paymentMethod,
            BigDecimal amount,
            String reference
    ) {
    }

    record StockBalanceRow(
            Long stockBalanceId,
            Long productId,
            Long warehouseId,
            BigDecimal quantity
    ) {
    }

    record InventoryMovementRow(
            Long inventoryMovementId,
            Long productId,
            Long warehouseId,
            String movementType,
            BigDecimal quantity,
            BigDecimal previousStock,
            BigDecimal newStock,
            String reason,
            String referenceType,
            String referenceId
    ) {
    }

    record StockTransferItemRow(
            Long stockTransferItemId,
            Long transferId,
            Long productId,
            BigDecimal quantity
    ) {
    }

    record QuoteItemRow(
            Long quoteItemId,
            Long quoteId,
            String quoteNumber,
            String status,
            Long convertedSaleId,
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal discountAmount,
            BigDecimal lineTotal
    ) {
    }

    record PurchaseOrderItemRow(
            Long purchaseOrderItemId,
            Long purchaseOrderId,
            String status,
            Long productId,
            BigDecimal quantityOrdered,
            BigDecimal quantityReceived,
            BigDecimal lineTotal
    ) {
    }

    record PurchaseReceiptItemRow(
            Long purchaseReceiptItemId,
            Long purchaseReceiptId,
            Long purchaseOrderId,
            Long purchaseOrderItemId,
            Long productId,
            BigDecimal quantityReceived
    ) {
    }

    record ElectronicDocumentItemRow(
            Long electronicDocumentItemId,
            Long electronicDocumentId,
            Long saleId,
            String fullNumber,
            String status,
            Long productId,
            String description,
            BigDecimal lineTotal
    ) {
    }
}
