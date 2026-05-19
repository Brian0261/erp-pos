package com.erppos.backend.erp.admin.cleanup.application.service;

import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewCommand;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewResult;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewUseCase;
import com.erppos.backend.erp.admin.cleanup.domain.exception.CleanupBusinessRuleException;
import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupPreviewQueryPort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ProductCleanupPreviewApplicationService implements ProductCleanupPreviewUseCase {

    private final ProductCleanupPreviewQueryPort queryPort;

    public ProductCleanupPreviewApplicationService(ProductCleanupPreviewQueryPort queryPort) {
        this.queryPort = queryPort;
    }

    @Override
    public ProductCleanupPreviewResult preview(ProductCleanupPreviewCommand command) {
        LinkedHashSet<Long> requestedProductIds = normalizeProductIds(command.productIds());
        LinkedHashSet<String> requestedSkus = normalizeSkus(command.skus());

        if (requestedProductIds.isEmpty() && requestedSkus.isEmpty()) {
            throw new CleanupBusinessRuleException("At least one productId or sku is required");
        }

        List<ProductCleanupPreviewQueryPort.ProductRow> foundProducts = queryPort.findProducts(requestedProductIds, requestedSkus);
        Map<Long, ProductCleanupPreviewQueryPort.ProductRow> productById = foundProducts.stream()
                .collect(Collectors.toMap(ProductCleanupPreviewQueryPort.ProductRow::id, Function.identity(), (left, right) -> left, LinkedHashMap::new));

        LinkedHashSet<Long> selectedProductIds = new LinkedHashSet<>(productById.keySet());
        List<Long> notFoundProductIds = requestedProductIds.stream()
                .filter(id -> !selectedProductIds.contains(id))
                .toList();
        Set<String> foundNormalizedSkus = foundProducts.stream()
                .map(ProductCleanupPreviewQueryPort.ProductRow::sku)
                .map(this::normalizeSku)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> notFoundSkus = requestedSkus.stream()
                .filter(sku -> !foundNormalizedSkus.contains(sku))
                .toList();

        List<ProductCleanupPreviewQueryPort.SaleRow> saleRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findSalesByProductIds(selectedProductIds);
        Set<Long> saleIds = saleRows.stream().map(ProductCleanupPreviewQueryPort.SaleRow::saleId).collect(Collectors.toCollection(LinkedHashSet::new));
        List<ProductCleanupPreviewQueryPort.SaleItemRow> saleItemRows = saleIds.isEmpty()
                ? List.of()
                : queryPort.findSaleItemsBySaleIds(saleIds);
        List<ProductCleanupPreviewQueryPort.SalePaymentRow> salePaymentRows = saleIds.isEmpty()
                ? List.of()
                : queryPort.findSalePaymentsBySaleIds(saleIds);

        List<ProductCleanupPreviewQueryPort.StockBalanceRow> stockBalanceRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findStockBalancesByProductIds(selectedProductIds);
        List<ProductCleanupPreviewQueryPort.InventoryMovementRow> inventoryMovementRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findInventoryMovementsByProductIds(selectedProductIds);
        List<ProductCleanupPreviewQueryPort.StockTransferItemRow> stockTransferItemRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findStockTransferItemsByProductIds(selectedProductIds);
        List<ProductCleanupPreviewQueryPort.QuoteItemRow> quoteItemRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findQuoteItemsByProductIds(selectedProductIds);
        List<ProductCleanupPreviewQueryPort.PurchaseOrderItemRow> purchaseOrderItemRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findPurchaseOrderItemsByProductIds(selectedProductIds);
        List<ProductCleanupPreviewQueryPort.PurchaseReceiptItemRow> purchaseReceiptItemRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findPurchaseReceiptItemsByProductIds(selectedProductIds);
        List<ProductCleanupPreviewQueryPort.ElectronicDocumentItemRow> electronicDocumentItemRows = selectedProductIds.isEmpty()
                ? List.of()
                : queryPort.findElectronicDocumentItemsByProductIds(selectedProductIds);

        Map<Long, List<ProductCleanupPreviewQueryPort.SaleItemRow>> saleItemsBySaleId = saleItemRows.stream()
                .collect(Collectors.groupingBy(ProductCleanupPreviewQueryPort.SaleItemRow::saleId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, Integer> paymentCountBySaleId = salePaymentRows.stream()
                .collect(Collectors.groupingBy(ProductCleanupPreviewQueryPort.SalePaymentRow::saleId, LinkedHashMap::new, Collectors.summingInt(item -> 1)));

        List<ProductCleanupPreviewResult.SaleImpact> saleImpacts = saleRows.stream()
                .map(sale -> toSaleImpact(sale, saleItemsBySaleId.getOrDefault(sale.saleId(), List.of()), paymentCountBySaleId.getOrDefault(sale.saleId(), 0), selectedProductIds))
                .sorted(Comparator.comparing(ProductCleanupPreviewResult.SaleImpact::saleId))
                .toList();

        Set<Long> mixedSaleIds = saleImpacts.stream()
                .filter(ProductCleanupPreviewResult.SaleImpact::mixedSale)
                .map(ProductCleanupPreviewResult.SaleImpact::saleId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> pureSaleIds = saleImpacts.stream()
                .filter(ProductCleanupPreviewResult.SaleImpact::pureSale)
                .map(ProductCleanupPreviewResult.SaleImpact::saleId)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<ProductCleanupPreviewResult.ProductImpact> productImpacts = foundProducts.stream()
                .map(product -> toProductImpact(
                        product,
                        saleItemRows,
                        mixedSaleIds,
                        pureSaleIds,
                        stockBalanceRows,
                        inventoryMovementRows,
                        stockTransferItemRows,
                        quoteItemRows,
                        purchaseOrderItemRows,
                        purchaseReceiptItemRows,
                        electronicDocumentItemRows
                ))
                .sorted(Comparator.comparing(ProductCleanupPreviewResult.ProductImpact::productId))
                .toList();

        List<String> warnings = new ArrayList<>();
        List<String> blockers = new ArrayList<>();
        addIf(!notFoundProductIds.isEmpty() || !notFoundSkus.isEmpty(), warnings,
                "Some requested products were not found in the catalog.");
        addIf(productImpacts.stream().anyMatch(ProductCleanupPreviewResult.ProductImpact::active), blockers,
                "Active products detected. Deactivate them before any purge attempt.");
        addIf(!mixedSaleIds.isEmpty(), blockers,
                mixedSaleIds.size() + " mixed sale(s) detected. These sales combine selected and non-selected products.");
        addIf(!electronicDocumentItemRows.isEmpty(), blockers,
                electronicDocumentItemRows.size() + " electronic document item(s) detected. Billing history blocks purge.");
        addIf(!purchaseOrderItemRows.isEmpty(), blockers,
                purchaseOrderItemRows.size() + " purchase order item(s) detected. Procurement history blocks purge.");
        addIf(!purchaseReceiptItemRows.isEmpty(), blockers,
                purchaseReceiptItemRows.size() + " purchase receipt item(s) detected. Receipt history blocks purge.");
        addIf(!stockTransferItemRows.isEmpty(), blockers,
                stockTransferItemRows.size() + " stock transfer item(s) detected. Transfer history blocks purge.");
        addIf(!pureSaleIds.isEmpty(), warnings,
                pureSaleIds.size() + " pure sale(s) detected. Future execute would need to remove complete sales and related payments.");
        addIf(!salePaymentRows.isEmpty(), warnings,
                salePaymentRows.size() + " sale payment(s) are linked to affected sales.");
        addIf(!stockBalanceRows.isEmpty(), warnings,
                stockBalanceRows.size() + " stock balance row(s) detected for selected products.");
        addIf(!inventoryMovementRows.isEmpty(), warnings,
                inventoryMovementRows.size() + " inventory movement row(s) detected for selected products.");
        addIf(!quoteItemRows.isEmpty(), warnings,
                quoteItemRows.size() + " quote item(s) detected for selected products.");
        addIf(foundProducts.isEmpty(), warnings,
                "No matching products were found for the requested identifiers.");

        boolean purgeable = !foundProducts.isEmpty() && blockers.isEmpty();

        List<ProductCleanupPreviewResult.SaleItemImpact> saleItemImpacts = saleItemRows.stream()
                .map(item -> new ProductCleanupPreviewResult.SaleItemImpact(
                        item.saleItemId(),
                        item.saleId(),
                        item.productId(),
                        item.quantity(),
                        item.unitPrice(),
                        item.discountAmount(),
                        item.lineTotal(),
                        selectedProductIds.contains(item.productId())
                ))
                .toList();

        List<ProductCleanupPreviewResult.SalePaymentImpact> salePaymentImpacts = salePaymentRows.stream()
                .map(item -> new ProductCleanupPreviewResult.SalePaymentImpact(
                        item.salePaymentId(),
                        item.saleId(),
                        item.paymentMethod(),
                        item.amount(),
                        item.reference()
                ))
                .toList();

        List<ProductCleanupPreviewResult.StockBalanceImpact> stockBalanceImpacts = stockBalanceRows.stream()
                .map(item -> new ProductCleanupPreviewResult.StockBalanceImpact(
                        item.stockBalanceId(),
                        item.productId(),
                        item.warehouseId(),
                        item.quantity()
                ))
                .toList();

        List<ProductCleanupPreviewResult.InventoryMovementImpact> inventoryMovementImpacts = inventoryMovementRows.stream()
                .map(item -> new ProductCleanupPreviewResult.InventoryMovementImpact(
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
                ))
                .toList();

        List<ProductCleanupPreviewResult.StockTransferItemImpact> stockTransferItemImpacts = stockTransferItemRows.stream()
                .map(item -> new ProductCleanupPreviewResult.StockTransferItemImpact(
                        item.stockTransferItemId(),
                        item.transferId(),
                        item.productId(),
                        item.quantity()
                ))
                .toList();

        List<ProductCleanupPreviewResult.QuoteItemImpact> quoteItemImpacts = quoteItemRows.stream()
                .map(item -> new ProductCleanupPreviewResult.QuoteItemImpact(
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
                ))
                .toList();

        List<ProductCleanupPreviewResult.PurchaseOrderItemImpact> purchaseOrderItemImpacts = purchaseOrderItemRows.stream()
                .map(item -> new ProductCleanupPreviewResult.PurchaseOrderItemImpact(
                        item.purchaseOrderItemId(),
                        item.purchaseOrderId(),
                        item.status(),
                        item.productId(),
                        item.quantityOrdered(),
                        item.quantityReceived(),
                        item.lineTotal()
                ))
                .toList();

        List<ProductCleanupPreviewResult.PurchaseReceiptItemImpact> purchaseReceiptItemImpacts = purchaseReceiptItemRows.stream()
                .map(item -> new ProductCleanupPreviewResult.PurchaseReceiptItemImpact(
                        item.purchaseReceiptItemId(),
                        item.purchaseReceiptId(),
                        item.purchaseOrderId(),
                        item.purchaseOrderItemId(),
                        item.productId(),
                        item.quantityReceived()
                ))
                .toList();

        List<ProductCleanupPreviewResult.ElectronicDocumentItemImpact> electronicDocumentItemImpacts = electronicDocumentItemRows.stream()
                .map(item -> new ProductCleanupPreviewResult.ElectronicDocumentItemImpact(
                        item.electronicDocumentItemId(),
                        item.electronicDocumentId(),
                        item.saleId(),
                        item.fullNumber(),
                        item.status(),
                        item.productId(),
                        item.description(),
                        item.lineTotal()
                ))
                .toList();

        ProductCleanupPreviewResult.Summary summary = new ProductCleanupPreviewResult.Summary(
                requestedProductIds.size() + requestedSkus.size(),
                foundProducts.size(),
                (int) foundProducts.stream().filter(ProductCleanupPreviewQueryPort.ProductRow::active).count(),
                (int) foundProducts.stream().filter(product -> !product.active()).count(),
                saleImpacts.size(),
                mixedSaleIds.size(),
                pureSaleIds.size(),
                inventoryMovementRows.size(),
                electronicDocumentItemRows.size(),
                purgeable,
                List.copyOf(warnings),
                List.copyOf(blockers)
        );

        return new ProductCleanupPreviewResult(
                List.copyOf(requestedProductIds),
                List.copyOf(requestedSkus),
                notFoundProductIds,
                notFoundSkus,
                productImpacts,
                saleImpacts,
                saleItemImpacts,
                salePaymentImpacts,
                stockBalanceImpacts,
                inventoryMovementImpacts,
                stockTransferItemImpacts,
                quoteItemImpacts,
                purchaseOrderItemImpacts,
                purchaseReceiptItemImpacts,
                electronicDocumentItemImpacts,
                purgeable,
                List.copyOf(warnings),
                List.copyOf(blockers),
                summary
        );
    }

    private ProductCleanupPreviewResult.SaleImpact toSaleImpact(
            ProductCleanupPreviewQueryPort.SaleRow sale,
            List<ProductCleanupPreviewQueryPort.SaleItemRow> items,
            int paymentCount,
            Set<Long> selectedProductIds
    ) {
        int selectedItemCount = (int) items.stream().filter(item -> selectedProductIds.contains(item.productId())).count();
        int itemCount = items.size();
        int nonSelectedItemCount = itemCount - selectedItemCount;
        boolean mixedSale = selectedItemCount > 0 && nonSelectedItemCount > 0;
        boolean pureSale = selectedItemCount > 0 && nonSelectedItemCount == 0;

        return new ProductCleanupPreviewResult.SaleImpact(
                sale.saleId(),
                sale.saleNumber(),
                sale.status(),
                sale.subtotalAmount(),
                sale.discountAmount(),
                sale.totalAmount(),
                sale.paidAmount(),
                sale.changeAmount(),
                itemCount,
                selectedItemCount,
                nonSelectedItemCount,
                paymentCount,
                pureSale,
                mixedSale
        );
    }

    private ProductCleanupPreviewResult.ProductImpact toProductImpact(
            ProductCleanupPreviewQueryPort.ProductRow product,
            List<ProductCleanupPreviewQueryPort.SaleItemRow> saleItems,
            Set<Long> mixedSaleIds,
            Set<Long> pureSaleIds,
            List<ProductCleanupPreviewQueryPort.StockBalanceRow> stockBalances,
            List<ProductCleanupPreviewQueryPort.InventoryMovementRow> inventoryMovements,
            List<ProductCleanupPreviewQueryPort.StockTransferItemRow> stockTransferItems,
            List<ProductCleanupPreviewQueryPort.QuoteItemRow> quoteItems,
            List<ProductCleanupPreviewQueryPort.PurchaseOrderItemRow> purchaseOrderItems,
            List<ProductCleanupPreviewQueryPort.PurchaseReceiptItemRow> purchaseReceiptItems,
            List<ProductCleanupPreviewQueryPort.ElectronicDocumentItemRow> documentItems
    ) {
        long mixedSales = saleItems.stream()
                .filter(item -> product.id().equals(item.productId()))
                .map(ProductCleanupPreviewQueryPort.SaleItemRow::saleId)
                .filter(mixedSaleIds::contains)
                .distinct()
                .count();
        long pureSales = saleItems.stream()
                .filter(item -> product.id().equals(item.productId()))
                .map(ProductCleanupPreviewQueryPort.SaleItemRow::saleId)
                .filter(pureSaleIds::contains)
                .distinct()
                .count();
        long stockBalanceCount = stockBalances.stream().filter(item -> product.id().equals(item.productId())).count();
        long inventoryMovementCount = inventoryMovements.stream().filter(item -> product.id().equals(item.productId())).count();
        long stockTransferCount = stockTransferItems.stream().filter(item -> product.id().equals(item.productId())).count();
        long quoteCount = quoteItems.stream().filter(item -> product.id().equals(item.productId())).count();
        long purchaseOrderCount = purchaseOrderItems.stream().filter(item -> product.id().equals(item.productId())).count();
        long purchaseReceiptCount = purchaseReceiptItems.stream().filter(item -> product.id().equals(item.productId())).count();
        long documentCount = documentItems.stream().filter(item -> product.id().equals(item.productId())).count();

        List<String> warnings = new ArrayList<>();
        List<String> blockers = new ArrayList<>();

        addIf(product.active(), blockers, "Product is active.");
        addIf(mixedSales > 0, blockers, mixedSales + " mixed sale(s) include this product.");
        addIf(documentCount > 0, blockers, documentCount + " electronic document item(s) reference this product.");
        addIf(purchaseOrderCount > 0, blockers, purchaseOrderCount + " purchase order item(s) reference this product.");
        addIf(purchaseReceiptCount > 0, blockers, purchaseReceiptCount + " purchase receipt item(s) reference this product.");
        addIf(stockTransferCount > 0, blockers, stockTransferCount + " stock transfer item(s) reference this product.");
        addIf(pureSales > 0, warnings, pureSales + " pure sale(s) include this product.");
        addIf(stockBalanceCount > 0, warnings, stockBalanceCount + " stock balance row(s) reference this product.");
        addIf(inventoryMovementCount > 0, warnings, inventoryMovementCount + " inventory movement row(s) reference this product.");
        addIf(quoteCount > 0, warnings, quoteCount + " quote item(s) reference this product.");

        return new ProductCleanupPreviewResult.ProductImpact(
                product.id(),
                product.sku(),
                product.barcode(),
                product.name(),
                product.active(),
                blockers.isEmpty(),
                !blockers.isEmpty(),
                List.copyOf(warnings),
                List.copyOf(blockers)
        );
    }

    private LinkedHashSet<Long> normalizeProductIds(List<Long> productIds) {
        LinkedHashSet<Long> normalized = new LinkedHashSet<>();
        if (productIds == null) {
            return normalized;
        }
        for (Long productId : productIds) {
            if (productId != null && productId > 0) {
                normalized.add(productId);
            }
        }
        return normalized;
    }

    private LinkedHashSet<String> normalizeSkus(List<String> skus) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (skus == null) {
            return normalized;
        }
        for (String sku : skus) {
            String current = normalizeSku(sku);
            if (current != null) {
                normalized.add(current);
            }
        }
        return normalized;
    }

    private String normalizeSku(String sku) {
        if (sku == null) {
            return null;
        }
        String trimmed = sku.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private void addIf(boolean condition, List<String> messages, String message) {
        if (condition) {
            messages.add(message);
        }
    }
}
