package com.erppos.backend.erp.admin.cleanup.application.usecase;

import java.math.BigDecimal;
import java.util.List;

public record ProductCleanupPreviewResult(
        List<Long> requestedProductIds,
        List<String> requestedSkus,
        List<Long> notFoundProductIds,
        List<String> notFoundSkus,
        List<ProductImpact> foundProducts,
        List<SaleImpact> relatedSales,
        List<SaleItemImpact> relatedSaleItems,
        List<SalePaymentImpact> relatedSalePayments,
        List<StockBalanceImpact> stockBalances,
        List<InventoryMovementImpact> inventoryMovements,
        List<StockTransferItemImpact> stockTransferItems,
        List<QuoteItemImpact> quoteItems,
        List<PurchaseOrderItemImpact> purchaseOrderItems,
        List<PurchaseReceiptItemImpact> purchaseReceiptItems,
        List<ElectronicDocumentItemImpact> electronicDocumentItems,
        boolean purgeable,
        List<String> warnings,
        List<String> blockers,
        Summary summary
) {

    public record ProductImpact(
            Long productId,
            String sku,
            String barcode,
            String name,
            boolean active,
            boolean purgeCandidate,
            boolean blocked,
            List<String> warnings,
            List<String> blockers
    ) {
    }

    public record SaleImpact(
            Long saleId,
            String saleNumber,
            String status,
            BigDecimal subtotalAmount,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal changeAmount,
            int itemCount,
            int selectedItemCount,
            int nonSelectedItemCount,
            int paymentCount,
            boolean pureSale,
            boolean mixedSale
    ) {
    }

    public record SaleItemImpact(
            Long saleItemId,
            Long saleId,
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal discountAmount,
            BigDecimal lineTotal,
            boolean selectedProduct
    ) {
    }

    public record SalePaymentImpact(
            Long salePaymentId,
            Long saleId,
            String paymentMethod,
            BigDecimal amount,
            String reference
    ) {
    }

    public record StockBalanceImpact(
            Long stockBalanceId,
            Long productId,
            Long warehouseId,
            BigDecimal quantity
    ) {
    }

    public record InventoryMovementImpact(
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

    public record StockTransferItemImpact(
            Long stockTransferItemId,
            Long transferId,
            Long productId,
            BigDecimal quantity
    ) {
    }

    public record QuoteItemImpact(
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

    public record PurchaseOrderItemImpact(
            Long purchaseOrderItemId,
            Long purchaseOrderId,
            String status,
            Long productId,
            BigDecimal quantityOrdered,
            BigDecimal quantityReceived,
            BigDecimal lineTotal
    ) {
    }

    public record PurchaseReceiptItemImpact(
            Long purchaseReceiptItemId,
            Long purchaseReceiptId,
            Long purchaseOrderId,
            Long purchaseOrderItemId,
            Long productId,
            BigDecimal quantityReceived
    ) {
    }

    public record ElectronicDocumentItemImpact(
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

    public record Summary(
            int totalProducts,
            int foundProducts,
            int activeProducts,
            int inactiveProducts,
            int relatedSales,
            int mixedSales,
            int pureSales,
            int relatedInventoryMovements,
            int relatedDocuments,
            boolean purgeable,
            List<String> warnings,
            List<String> blockers
    ) {
    }
}
