package com.erppos.backend.erp.reports.adapter.rest;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.reports.adapter.dto.CashRegisterReportResponse;
import com.erppos.backend.erp.reports.adapter.dto.DocumentTypeCountResponse;
import com.erppos.backend.erp.reports.adapter.dto.ElectronicDocumentsReportResponse;
import com.erppos.backend.erp.reports.adapter.dto.InventoryMovementReportItemResponse;
import com.erppos.backend.erp.reports.adapter.dto.LowStockItemResponse;
import com.erppos.backend.erp.reports.adapter.dto.PaymentMethodAmountResponse;
import com.erppos.backend.erp.reports.adapter.dto.PurchasesReportResponse;
import com.erppos.backend.erp.reports.adapter.dto.QuotesReportResponse;
import com.erppos.backend.erp.reports.adapter.dto.SalesByDayResponse;
import com.erppos.backend.erp.reports.adapter.dto.SalesReportResponse;
import com.erppos.backend.erp.reports.adapter.dto.SupplierPurchaseAmountResponse;
import com.erppos.backend.erp.reports.adapter.dto.TopProductReportItemResponse;
import com.erppos.backend.erp.reports.application.usecase.ReportsUseCase;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportsController {

    private final ReportsUseCase reportsUseCase;

    public ReportsController(ReportsUseCase reportsUseCase) {
        this.reportsUseCase = reportsUseCase;
    }

    @GetMapping("/sales")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<SalesReportResponse> sales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(toResponse(reportsUseCase.sales(from, to)));
    }

    @GetMapping("/cash-registers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<CashRegisterReportResponse> cashRegister(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(reportsUseCase.cashRegister(id)));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<List<LowStockItemResponse>> lowStock(@RequestParam(defaultValue = "0") double threshold) {
        return ResponseEntity.ok(reportsUseCase.lowStock(threshold).stream().map(this::toResponse).toList());
    }

    @GetMapping("/inventory-movements")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<List<InventoryMovementReportItemResponse>> inventoryMovements(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long warehouseId
    ) {
        return ResponseEntity.ok(reportsUseCase.inventoryMovements(from, to, productId, warehouseId).stream().map(this::toResponse).toList());
    }

    @GetMapping("/purchases")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<PurchasesReportResponse> purchases(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long supplierId
    ) {
        return ResponseEntity.ok(toResponse(reportsUseCase.purchases(from, to, supplierId)));
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<List<TopProductReportItemResponse>> topProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(reportsUseCase.topProducts(from, to, limit).stream().map(this::toResponse).toList());
    }

    @GetMapping("/quotes")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<QuotesReportResponse> quotes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(toResponse(reportsUseCase.quotes(from, to)));
    }

    @GetMapping("/electronic-documents")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ElectronicDocumentsReportResponse> electronicDocuments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) ElectronicDocumentStatus status
    ) {
        return ResponseEntity.ok(toResponse(reportsUseCase.electronicDocuments(from, to, status)));
    }

    private SalesReportResponse toResponse(SalesReport report) {
        return new SalesReportResponse(
                report.totalSalesAmount(),
                report.totalSalesCount(),
                report.averageTicket(),
                report.voidedSalesCount(),
                report.salesByPaymentMethod().stream().map(this::toResponse).toList(),
                report.salesByDay().stream().map(this::toResponse).toList()
        );
    }

    private PaymentMethodAmountResponse toResponse(PaymentMethodAmount item) {
        return new PaymentMethodAmountResponse(item.paymentMethod(), item.amount());
    }

    private SalesByDayResponse toResponse(SalesByDay item) {
        return new SalesByDayResponse(item.day(), item.totalAmount(), item.salesCount());
    }

    private CashRegisterReportResponse toResponse(CashRegisterReport report) {
        return new CashRegisterReportResponse(
                report.openingAmount(),
                report.countedAmount(),
                report.expectedCashAmount(),
                report.differenceAmount(),
                report.totalSales(),
                report.salesByPaymentMethod().stream().map(this::toResponse).toList(),
                report.openedAt(),
                report.closedAt(),
                report.status()
        );
    }

    private LowStockItemResponse toResponse(LowStockItem item) {
        return new LowStockItemResponse(
                item.productId(),
                item.sku(),
                item.barcode(),
                item.productName(),
                item.warehouseId(),
                item.warehouseName(),
                item.currentStock(),
                item.threshold()
        );
    }

    private InventoryMovementReportItemResponse toResponse(InventoryMovementReportItem item) {
        return new InventoryMovementReportItemResponse(
                item.movementType(),
                item.productName(),
                item.warehouseName(),
                item.quantity(),
                item.previousStock(),
                item.newStock(),
                item.reason(),
                item.createdAt(),
                item.createdBy()
        );
    }

    private PurchasesReportResponse toResponse(PurchasesReport report) {
        return new PurchasesReportResponse(
                report.totalPurchaseAmount(),
                report.purchaseOrderCount(),
                report.receivedOrdersCount(),
                report.purchasesBySupplier().stream().map(this::toResponse).toList()
        );
    }

    private SupplierPurchaseAmountResponse toResponse(SupplierPurchaseAmount item) {
        return new SupplierPurchaseAmountResponse(item.supplierId(), item.supplierName(), item.amount());
    }

    private TopProductReportItemResponse toResponse(TopProductReportItem item) {
        return new TopProductReportItemResponse(
                item.productId(),
                item.sku(),
                item.barcode(),
                item.productName(),
                item.quantitySold(),
                item.totalAmount()
        );
    }

    private QuotesReportResponse toResponse(QuotesReport report) {
        return new QuotesReportResponse(
                report.totalQuotes(),
                report.convertedQuotes(),
                report.cancelledQuotes(),
                report.conversionRate(),
                report.totalConvertedAmount()
        );
    }

    private ElectronicDocumentsReportResponse toResponse(ElectronicDocumentsReport report) {
        return new ElectronicDocumentsReportResponse(
                report.totalDocuments(),
                report.acceptedCount(),
                report.rejectedCount(),
                report.errorCount(),
                report.totalAmount(),
                report.documentsByType().stream().map(this::toResponse).toList()
        );
    }

    private DocumentTypeCountResponse toResponse(DocumentTypeCount item) {
        return new DocumentTypeCountResponse(item.documentType(), item.count());
    }
}

