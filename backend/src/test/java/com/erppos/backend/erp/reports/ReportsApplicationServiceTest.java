package com.erppos.backend.erp.reports;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.reports.application.service.ReportsApplicationService;
import com.erppos.backend.erp.reports.domain.model.CashRegisterReport;
import com.erppos.backend.erp.reports.domain.model.DocumentTypeCount;
import com.erppos.backend.erp.reports.domain.model.ElectronicDocumentsReport;
import com.erppos.backend.erp.reports.domain.model.InventoryMovementReportItem;
import com.erppos.backend.erp.reports.domain.model.LowStockItem;
import com.erppos.backend.erp.reports.domain.model.PaymentMethodAmount;
import com.erppos.backend.erp.reports.domain.model.PurchasesReport;
import com.erppos.backend.erp.reports.domain.model.QuotesReport;
import com.erppos.backend.erp.reports.domain.model.SalesByDay;
import com.erppos.backend.erp.reports.domain.model.SalesReport;
import com.erppos.backend.erp.reports.domain.model.SupplierPurchaseAmount;
import com.erppos.backend.erp.reports.domain.model.TopProductReportItem;
import com.erppos.backend.erp.reports.domain.port.ReportsQueryPort;
import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovementType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ReportsApplicationServiceTest {

    private ReportsApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ReportsApplicationService(new StubReportsQueryPort());
    }

    @Test
    void shouldReturnSalesReportByDate() {
        SalesReport report = service.sales(LocalDate.now().minusDays(2), LocalDate.now());
        assertEquals(1L, report.totalSalesCount());
    }

    @Test
    void shouldReturnCashRegisterReport() {
        CashRegisterReport report = service.cashRegister(1L);
        assertEquals(CashRegisterStatus.CLOSED, report.status());
    }

    @Test
    void shouldReturnLowStockReport() {
        List<LowStockItem> items = service.lowStock(5);
        assertFalse(items.isEmpty());
    }

    @Test
    void shouldReturnInventoryMovementsReport() {
        List<InventoryMovementReportItem> items = service.inventoryMovements(LocalDate.now().minusDays(2), LocalDate.now(), null, null);
        assertEquals(InventoryMovementType.SALE_OUT, items.get(0).movementType());
    }

    @Test
    void shouldReturnTopProductsReport() {
        List<TopProductReportItem> items = service.topProducts(LocalDate.now().minusDays(5), LocalDate.now(), 5);
        assertEquals(1L, items.get(0).productId());
    }

    @Test
    void shouldReturnQuotesReport() {
        QuotesReport report = service.quotes(LocalDate.now().minusDays(10), LocalDate.now());
        assertEquals(2L, report.totalQuotes());
    }

    @Test
    void shouldReturnElectronicDocumentsReport() {
        ElectronicDocumentsReport report = service.electronicDocuments(LocalDate.now().minusDays(10), LocalDate.now(), ElectronicDocumentStatus.ACCEPTED);
        assertEquals(1L, report.acceptedCount());
    }

    @Test
    void shouldReturnPurchasesReport() {
        PurchasesReport report = service.purchases(LocalDate.now().minusDays(30), LocalDate.now(), null);
        assertEquals(1L, report.purchaseOrderCount());
    }

    private static class StubReportsQueryPort implements ReportsQueryPort {
        @Override
        public SalesReport sales(LocalDate from, LocalDate to) {
            return new SalesReport(
                    BigDecimal.TEN,
                    1,
                    BigDecimal.TEN,
                    0,
                    List.of(new PaymentMethodAmount("CASH", BigDecimal.TEN)),
                    List.of(new SalesByDay(LocalDate.now(), BigDecimal.TEN, 1))
            );
        }

        @Override
        public CashRegisterReport cashRegister(Long cashRegisterId) {
            return new CashRegisterReport(
                    BigDecimal.ONE,
                    BigDecimal.TEN,
                    BigDecimal.TEN,
                    BigDecimal.ZERO,
                    BigDecimal.TEN,
                    List.of(new PaymentMethodAmount("CASH", BigDecimal.TEN)),
                    Instant.now(),
                    Instant.now(),
                    CashRegisterStatus.CLOSED
            );
        }

        @Override
        public List<LowStockItem> lowStock(double threshold) {
            return List.of(new LowStockItem(1L, "SKU-1", "123", "LAPIZ", 1L, "WH-1", BigDecimal.ONE, BigDecimal.valueOf(threshold)));
        }

        @Override
        public List<InventoryMovementReportItem> inventoryMovements(LocalDate from, LocalDate to, Long productId, Long warehouseId) {
            return List.of(new InventoryMovementReportItem(
                    InventoryMovementType.SALE_OUT,
                    "LAPIZ",
                    "WH-1",
                    BigDecimal.ONE,
                    BigDecimal.TEN,
                    BigDecimal.valueOf(9),
                    "venta",
                    Instant.now(),
                    "cajero"
            ));
        }

        @Override
        public PurchasesReport purchases(LocalDate from, LocalDate to, Long supplierId) {
            return new PurchasesReport(
                    BigDecimal.valueOf(100),
                    1,
                    1,
                    List.of(new SupplierPurchaseAmount(1L, "Proveedor", BigDecimal.valueOf(100)))
            );
        }

        @Override
        public List<TopProductReportItem> topProducts(LocalDate from, LocalDate to, int limit) {
            return List.of(new TopProductReportItem(1L, "SKU-1", "123", "LAPIZ", BigDecimal.TEN, BigDecimal.valueOf(50)));
        }

        @Override
        public QuotesReport quotes(LocalDate from, LocalDate to) {
            return new QuotesReport(2, 1, 0, BigDecimal.valueOf(50), BigDecimal.valueOf(100));
        }

        @Override
        public ElectronicDocumentsReport electronicDocuments(LocalDate from, LocalDate to, ElectronicDocumentStatus status) {
            return new ElectronicDocumentsReport(
                    1,
                    1,
                    0,
                    0,
                    BigDecimal.valueOf(100),
                    List.of(new DocumentTypeCount("INVOICE", 1))
            );
        }
    }
}

