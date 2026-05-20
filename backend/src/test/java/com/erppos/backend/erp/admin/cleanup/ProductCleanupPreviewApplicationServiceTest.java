package com.erppos.backend.erp.admin.cleanup;

import com.erppos.backend.erp.admin.cleanup.application.service.ProductCleanupPreviewApplicationService;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupExecuteCommand;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupExecuteResult;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewCommand;
import com.erppos.backend.erp.admin.cleanup.application.usecase.ProductCleanupPreviewResult;
import com.erppos.backend.erp.admin.cleanup.domain.exception.CleanupBusinessRuleException;
import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupExecutePort;
import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupPreviewQueryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductCleanupPreviewApplicationServiceTest {

    private StubProductCleanupPreviewQueryPort queryPort;
    private StubProductCleanupExecutePort executePort;
    private ProductCleanupPreviewApplicationService service;

    @BeforeEach
    void setUp() {
        queryPort = new StubProductCleanupPreviewQueryPort();
        executePort = new StubProductCleanupExecutePort();
        service = new ProductCleanupPreviewApplicationService(queryPort, executePort);
    }

    @Test
    void shouldRejectEmptyIdentifiers() {
        assertThrows(CleanupBusinessRuleException.class, () ->
                service.preview(new ProductCleanupPreviewCommand(List.of(), List.of()))
        );
    }

    @Test
    void shouldReportMissingProducts() {
        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(999L), List.of()));

        assertEquals(1, result.summary().totalProducts());
        assertEquals(0, result.summary().foundProducts());
        assertFalse(result.purgeable());
        assertEquals(List.of(999L), result.notFoundProductIds());
    }

    @Test
    void shouldBlockActiveProducts() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(10L, "SKU-ACT", null, "Activo", true));

        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(10L), List.of()));

        assertFalse(result.purgeable());
        assertTrue(result.blockers().stream().anyMatch(message -> message.contains("Active products")));
        assertTrue(result.foundProducts().get(0).blocked());
    }

    @Test
    void shouldAllowInactiveProductsWithoutReferences() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(11L, "SKU-INACTIVE", null, "Inactivo", false));

        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(11L), List.of()));

        assertTrue(result.purgeable());
        assertTrue(result.blockers().isEmpty());
        assertTrue(result.foundProducts().get(0).purgeCandidate());
    }

    @Test
    void shouldClassifyPureSalesAsWarnings() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(12L, "SKU-PURE", null, "Pure", false));
        queryPort.sales = List.of(new ProductCleanupPreviewQueryPort.SaleRow(100L, "S-100", "COMPLETED", BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO));
        queryPort.saleItems = List.of(new ProductCleanupPreviewQueryPort.SaleItemRow(1000L, 100L, 12L, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN));
        queryPort.salePayments = List.of(new ProductCleanupPreviewQueryPort.SalePaymentRow(2000L, 100L, "CASH", BigDecimal.TEN, "REF"));

        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(12L), List.of()));

        assertTrue(result.purgeable());
        assertEquals(1, result.summary().pureSales());
        assertEquals(0, result.summary().mixedSales());
        assertTrue(result.warnings().stream().anyMatch(message -> message.contains("pure sale")));
    }

    @Test
    void shouldBlockMixedSales() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(13L, "SKU-MIX", null, "Mix", false));
        queryPort.sales = List.of(new ProductCleanupPreviewQueryPort.SaleRow(101L, "S-101", "COMPLETED", BigDecimal.valueOf(15), BigDecimal.ZERO, BigDecimal.valueOf(15), BigDecimal.valueOf(15), BigDecimal.ZERO));
        queryPort.saleItems = List.of(
                new ProductCleanupPreviewQueryPort.SaleItemRow(1001L, 101L, 13L, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN),
                new ProductCleanupPreviewQueryPort.SaleItemRow(1002L, 101L, 99L, BigDecimal.ONE, BigDecimal.valueOf(5), BigDecimal.ZERO, BigDecimal.valueOf(5))
        );

        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(13L), List.of()));

        assertFalse(result.purgeable());
        assertEquals(1, result.summary().mixedSales());
        assertTrue(result.blockers().stream().anyMatch(message -> message.contains("mixed sale")));
    }

    @Test
    void shouldWarnForInventoryMovements() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(14L, "SKU-MOV", null, "Mov", false));
        queryPort.inventoryMovements = List.of(new ProductCleanupPreviewQueryPort.InventoryMovementRow(
                3000L, 14L, 1L, "INITIAL_STOCK", BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN, "Seed", "INITIAL_STOCK", "1"
        ));

        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(14L), List.of()));

        assertTrue(result.purgeable());
        assertEquals(1, result.summary().relatedInventoryMovements());
        assertTrue(result.warnings().stream().anyMatch(message -> message.contains("inventory movement")));
    }

    @Test
    void shouldBlockElectronicDocuments() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(15L, "SKU-DOC", null, "Doc", false));
        queryPort.documentItems = List.of(new ProductCleanupPreviewQueryPort.ElectronicDocumentItemRow(
                4000L, 5000L, 100L, "F001-00000001", "GENERATED", 15L, "Product 15", BigDecimal.TEN
        ));

        ProductCleanupPreviewResult result = service.preview(new ProductCleanupPreviewCommand(List.of(15L), List.of()));

        assertFalse(result.purgeable());
        assertEquals(1, result.summary().relatedDocuments());
        assertTrue(result.blockers().stream().anyMatch(message -> message.contains("electronic document")));
    }

    @Test
    void shouldExecuteInactiveProductsWithNoReferences() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(16L, "SKU-DEL", null, "Delete", false));

        ProductCleanupExecuteResult result = service.execute(new ProductCleanupExecuteCommand(List.of(16L), List.of(), "ELIMINAR PRUEBAS"));

        assertEquals(List.of(16L), result.deletedProductIds());
        assertEquals(1, result.deletedProducts());
        assertEquals(Set.of(16L), executePort.deletedProductIds);
    }

    @Test
    void shouldRejectExecuteWhenBlocked() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(17L, "SKU-ACT", null, "Active", true));

        assertThrows(CleanupBusinessRuleException.class, () -> service.execute(new ProductCleanupExecuteCommand(List.of(17L), List.of(), "ELIMINAR PRUEBAS")));
        assertTrue(executePort.deletedProductIds.isEmpty());
    }

    @Test
    void shouldRejectExecuteWhenConfirmationTextIsInvalid() {
        queryPort.products = List.of(new ProductCleanupPreviewQueryPort.ProductRow(18L, "SKU-CONF", null, "Confirm", false));

        assertThrows(CleanupBusinessRuleException.class, () -> service.execute(new ProductCleanupExecuteCommand(List.of(18L), List.of(), "BORRAR")));
        assertTrue(executePort.deletedProductIds.isEmpty());
    }

    private static final class StubProductCleanupPreviewQueryPort implements ProductCleanupPreviewQueryPort {
        private List<ProductRow> products = List.of();
        private List<SaleRow> sales = List.of();
        private List<SaleItemRow> saleItems = List.of();
        private List<SalePaymentRow> salePayments = List.of();
        private List<StockBalanceRow> stockBalances = List.of();
        private List<InventoryMovementRow> inventoryMovements = List.of();
        private List<StockTransferItemRow> stockTransferItems = List.of();
        private List<QuoteItemRow> quoteItems = List.of();
        private List<PurchaseOrderItemRow> purchaseOrderItems = List.of();
        private List<PurchaseReceiptItemRow> purchaseReceiptItems = List.of();
        private List<ElectronicDocumentItemRow> documentItems = List.of();

        @Override
        public List<ProductRow> findProducts(Set<Long> productIds, Set<String> normalizedSkus) {
            return products.stream()
                    .filter(product -> productIds.contains(product.id())
                            || (product.sku() != null && normalizedSkus.contains(product.sku().toLowerCase())))
                    .toList();
        }

        @Override
        public List<SaleRow> findSalesByProductIds(Set<Long> productIds) {
            return sales;
        }

        @Override
        public List<SaleItemRow> findSaleItemsBySaleIds(Set<Long> saleIds) {
            return saleItems;
        }

        @Override
        public List<SalePaymentRow> findSalePaymentsBySaleIds(Set<Long> saleIds) {
            return salePayments;
        }

        @Override
        public List<StockBalanceRow> findStockBalancesByProductIds(Set<Long> productIds) {
            return stockBalances;
        }

        @Override
        public List<InventoryMovementRow> findInventoryMovementsByProductIds(Set<Long> productIds) {
            return inventoryMovements;
        }

        @Override
        public List<StockTransferItemRow> findStockTransferItemsByProductIds(Set<Long> productIds) {
            return stockTransferItems;
        }

        @Override
        public List<QuoteItemRow> findQuoteItemsByProductIds(Set<Long> productIds) {
            return quoteItems;
        }

        @Override
        public List<PurchaseOrderItemRow> findPurchaseOrderItemsByProductIds(Set<Long> productIds) {
            return purchaseOrderItems;
        }

        @Override
        public List<PurchaseReceiptItemRow> findPurchaseReceiptItemsByProductIds(Set<Long> productIds) {
            return purchaseReceiptItems;
        }

        @Override
        public List<ElectronicDocumentItemRow> findElectronicDocumentItemsByProductIds(Set<Long> productIds) {
            return documentItems;
        }
    }

    private static final class StubProductCleanupExecutePort implements ProductCleanupExecutePort {
        private Set<Long> deletedProductIds = Set.of();

        @Override
        public int deleteSaleItemsBySaleIds(Set<Long> saleIds) {
            return 0;
        }

        @Override
        public int deleteSalePaymentsBySaleIds(Set<Long> saleIds) {
            return 0;
        }

        @Override
        public int deleteQuoteItemsByProductIds(Set<Long> productIds) {
            return 0;
        }

        @Override
        public int deletePurchaseOrderItemsByProductIds(Set<Long> productIds) {
            return 0;
        }

        @Override
        public int deletePurchaseReceiptItemsByProductIds(Set<Long> productIds) {
            return 0;
        }

        @Override
        public int deleteStockTransferItemsByProductIds(Set<Long> productIds) {
            return 0;
        }

        @Override
        public int deleteStockBalancesByProductIds(Set<Long> productIds) {
            return 0;
        }

        @Override
        public int deleteInventoryMovementsByProductIds(Set<Long> productIds) {
            return 0;
        }

        @Override
        public int deleteSalesByIds(Set<Long> saleIds) {
            return 0;
        }

        @Override
        public int deleteProductsByIds(Set<Long> productIds) {
            deletedProductIds = Set.copyOf(productIds);
            return productIds.size();
        }
    }
}
