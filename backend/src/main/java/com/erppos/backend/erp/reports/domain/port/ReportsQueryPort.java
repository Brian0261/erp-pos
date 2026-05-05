package com.erppos.backend.erp.reports.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.reports.domain.model.CashRegisterReport;
import com.erppos.backend.erp.reports.domain.model.ElectronicDocumentsReport;
import com.erppos.backend.erp.reports.domain.model.InventoryMovementReportItem;
import com.erppos.backend.erp.reports.domain.model.LowStockItem;
import com.erppos.backend.erp.reports.domain.model.PurchasesReport;
import com.erppos.backend.erp.reports.domain.model.QuotesReport;
import com.erppos.backend.erp.reports.domain.model.SalesReport;
import com.erppos.backend.erp.reports.domain.model.TopProductReportItem;

import java.time.LocalDate;
import java.util.List;

public interface ReportsQueryPort {
    SalesReport sales(LocalDate from, LocalDate to);
    CashRegisterReport cashRegister(Long cashRegisterId);
    List<LowStockItem> lowStock(double threshold, int limit);
    List<InventoryMovementReportItem> inventoryMovements(LocalDate from, LocalDate to, Long productId, Long warehouseId, int limit);
    PurchasesReport purchases(LocalDate from, LocalDate to, Long supplierId);
    List<TopProductReportItem> topProducts(LocalDate from, LocalDate to, int limit);
    QuotesReport quotes(LocalDate from, LocalDate to);
    ElectronicDocumentsReport electronicDocuments(LocalDate from, LocalDate to, ElectronicDocumentStatus status);
}

