package com.erppos.backend.erp.admin.cleanup.adapter.rest;

import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewCommand;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupExecuteCommand;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupExecuteResult;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupExecuteUseCase;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewResult;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewUseCase;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/test-data-cleanup/products")
public class ProductCleanupPreviewController {

    private final ProductCleanupPreviewUseCase previewUseCase;
    private final ProductCleanupExecuteUseCase executeUseCase;

    public ProductCleanupPreviewController(ProductCleanupPreviewUseCase previewUseCase, ProductCleanupExecuteUseCase executeUseCase) {
        this.previewUseCase = previewUseCase;
        this.executeUseCase = executeUseCase;
    }

    @PostMapping("/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductCleanupPreviewResponse> preview(@Valid @RequestBody ProductCleanupPreviewRequest request) {
        ProductCleanupPreviewResult result = previewUseCase.preview(new ProductCleanupPreviewCommand(
                request.productIds(),
                request.skus()
        ));
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/execute")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductCleanupExecuteResponse> execute(@Valid @RequestBody ProductCleanupExecuteRequest request) {
        ProductCleanupExecuteResult result = executeUseCase.execute(new ProductCleanupExecuteCommand(
                request.productIds(),
                request.skus(),
                request.confirmationText()
        ));
        return ResponseEntity.ok(new ProductCleanupExecuteResponse(
                result.deletedProductIds(),
                result.deletedSaleIds(),
                result.deletedProducts(),
                result.deletedSales(),
                result.deletedSaleItems(),
                result.deletedSalePayments(),
                result.deletedQuoteItems(),
                result.deletedPurchaseOrderItems(),
                result.deletedPurchaseReceiptItems(),
                result.deletedStockTransferItems(),
                result.deletedStockBalances(),
                result.deletedInventoryMovements()
        ));
    }

    private ProductCleanupPreviewResponse toResponse(ProductCleanupPreviewResult result) {
        return new ProductCleanupPreviewResponse(
                result.requestedProductIds(),
                result.requestedSkus(),
                result.notFoundProductIds(),
                result.notFoundSkus(),
                result.foundProducts().stream().map(item -> new ProductCleanupPreviewResponse.ProductPreview(
                        item.productId(),
                        item.sku(),
                        item.barcode(),
                        item.name(),
                        item.active(),
                        item.purgeCandidate(),
                        item.blocked(),
                        item.warnings(),
                        item.blockers()
                )).toList(),
                result.relatedSales().stream().map(item -> new ProductCleanupPreviewResponse.SalePreview(
                        item.saleId(),
                        item.saleNumber(),
                        item.status(),
                        item.subtotalAmount(),
                        item.discountAmount(),
                        item.totalAmount(),
                        item.paidAmount(),
                        item.changeAmount(),
                        item.itemCount(),
                        item.selectedItemCount(),
                        item.nonSelectedItemCount(),
                        item.paymentCount(),
                        item.pureSale(),
                        item.mixedSale()
                )).toList(),
                result.relatedSaleItems().stream().map(item -> new ProductCleanupPreviewResponse.SaleItemPreview(
                        item.saleItemId(),
                        item.saleId(),
                        item.productId(),
                        item.quantity(),
                        item.unitPrice(),
                        item.discountAmount(),
                        item.lineTotal(),
                        item.selectedProduct()
                )).toList(),
                result.relatedSalePayments().stream().map(item -> new ProductCleanupPreviewResponse.SalePaymentPreview(
                        item.salePaymentId(),
                        item.saleId(),
                        item.paymentMethod(),
                        item.amount(),
                        item.reference()
                )).toList(),
                result.stockBalances().stream().map(item -> new ProductCleanupPreviewResponse.StockBalancePreview(
                        item.stockBalanceId(),
                        item.productId(),
                        item.warehouseId(),
                        item.quantity()
                )).toList(),
                result.inventoryMovements().stream().map(item -> new ProductCleanupPreviewResponse.InventoryMovementPreview(
                        item.inventoryMovementId(),
                        item.productId(),
                        item.warehouseId(),
                        item.movementType(),
                        item.quantity(),
                        item.previousStock(),
                        item.newStock(),
                        item.reason(),
                        item.referenceType(),
                        item.referenceId()
                )).toList(),
                result.stockTransferItems().stream().map(item -> new ProductCleanupPreviewResponse.StockTransferItemPreview(
                        item.stockTransferItemId(),
                        item.transferId(),
                        item.productId(),
                        item.quantity()
                )).toList(),
                result.quoteItems().stream().map(item -> new ProductCleanupPreviewResponse.QuoteItemPreview(
                        item.quoteItemId(),
                        item.quoteId(),
                        item.quoteNumber(),
                        item.status(),
                        item.convertedSaleId(),
                        item.productId(),
                        item.quantity(),
                        item.unitPrice(),
                        item.discountAmount(),
                        item.lineTotal()
                )).toList(),
                result.purchaseOrderItems().stream().map(item -> new ProductCleanupPreviewResponse.PurchaseOrderItemPreview(
                        item.purchaseOrderItemId(),
                        item.purchaseOrderId(),
                        item.status(),
                        item.productId(),
                        item.quantityOrdered(),
                        item.quantityReceived(),
                        item.lineTotal()
                )).toList(),
                result.purchaseReceiptItems().stream().map(item -> new ProductCleanupPreviewResponse.PurchaseReceiptItemPreview(
                        item.purchaseReceiptItemId(),
                        item.purchaseReceiptId(),
                        item.purchaseOrderId(),
                        item.purchaseOrderItemId(),
                        item.productId(),
                        item.quantityReceived()
                )).toList(),
                result.electronicDocumentItems().stream().map(item -> new ProductCleanupPreviewResponse.ElectronicDocumentItemPreview(
                        item.electronicDocumentItemId(),
                        item.electronicDocumentId(),
                        item.saleId(),
                        item.fullNumber(),
                        item.status(),
                        item.productId(),
                        item.description(),
                        item.lineTotal()
                )).toList(),
                result.purgeable(),
                result.warnings(),
                result.blockers(),
                new ProductCleanupPreviewResponse.Summary(
                        result.summary().totalProducts(),
                        result.summary().foundProducts(),
                        result.summary().activeProducts(),
                        result.summary().inactiveProducts(),
                        result.summary().relatedSales(),
                        result.summary().mixedSales(),
                        result.summary().pureSales(),
                        result.summary().relatedInventoryMovements(),
                        result.summary().relatedDocuments(),
                        result.summary().purgeable(),
                        result.summary().warnings(),
                        result.summary().blockers()
                )
        );
    }
}
