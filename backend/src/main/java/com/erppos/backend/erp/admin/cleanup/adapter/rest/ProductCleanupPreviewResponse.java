package com.erppos.backend.erp.admin.cleanup.adapter.rest;

import java.math.BigDecimal;
import java.util.List;

public record ProductCleanupPreviewResponse(
        List<Long> requestedProductIds,
        List<String> requestedSkus,
        List<Long> notFoundProductIds,
        List<String> notFoundSkus,
        List<ProductPreview> foundProducts,
        List<SalePreview> relatedSales,
        List<SaleItemPreview> relatedSaleItems,
        List<SalePaymentPreview> relatedSalePayments,
        List<StockBalancePreview> stockBalances,
        List<InventoryMovementPreview> inventoryMovements,
        List<StockTransferItemPreview> stockTransferItems,
        List<QuoteItemPreview> quoteItems,
        List<PurchaseOrderPreview> purchaseOrders,
        List<PurchaseReceiptPreview> purchaseReceipts,
        List<PurchaseOrderItemPreview> purchaseOrderItems,
        List<PurchaseReceiptItemPreview> purchaseReceiptItems,
        List<ElectronicDocumentItemPreview> electronicDocumentItems,
        boolean purgeable,
        List<String> warnings,
        List<String> blockers,
        Summary summary
) {

    public record ProductPreview(
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

    public record SalePreview(
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

    public record SaleItemPreview(
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

    public record SalePaymentPreview(
            Long salePaymentId,
            Long saleId,
            String paymentMethod,
            BigDecimal amount,
            String reference
    ) {
    }

    public record StockBalancePreview(
            Long stockBalanceId,
            Long productId,
            Long warehouseId,
            BigDecimal quantity
    ) {
    }

    public record InventoryMovementPreview(
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

    public record StockTransferItemPreview(
            Long stockTransferItemId,
            Long transferId,
            Long productId,
            BigDecimal quantity
    ) {
    }

    public record QuoteItemPreview(
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

    public record PurchaseOrderPreview(
            Long purchaseOrderId,
            String status,
            int itemCount,
            int selectedItemCount,
            int nonSelectedItemCount,
            boolean purePurchaseOrder,
            boolean mixedPurchaseOrder
    ) {
    }

    public record PurchaseReceiptPreview(
            Long purchaseReceiptId,
            Long purchaseOrderId,
            int itemCount,
            int selectedItemCount,
            int nonSelectedItemCount,
            boolean purePurchaseReceipt,
            boolean mixedPurchaseReceipt
    ) {
    }

    public record PurchaseOrderItemPreview(
            Long purchaseOrderItemId,
            Long purchaseOrderId,
            String status,
            Long productId,
            BigDecimal quantityOrdered,
            BigDecimal quantityReceived,
            BigDecimal lineTotal
    ) {
    }

    public record PurchaseReceiptItemPreview(
            Long purchaseReceiptItemId,
            Long purchaseReceiptId,
            Long purchaseOrderId,
            Long purchaseOrderItemId,
            Long productId,
            BigDecimal quantityReceived
    ) {
    }

    public record ElectronicDocumentItemPreview(
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
            int relatedPurchaseOrders,
            int purePurchaseOrders,
            int mixedPurchaseOrders,
            int relatedPurchaseReceipts,
            int purePurchaseReceipts,
            int mixedPurchaseReceipts,
            int relatedInventoryMovements,
            int relatedDocuments,
            boolean purgeable,
            List<String> warnings,
            List<String> blockers
    ) {
    }
}
