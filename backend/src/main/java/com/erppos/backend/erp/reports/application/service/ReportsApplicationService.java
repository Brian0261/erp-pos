package com.erppos.backend.erp.reports.application.service;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.reports.application.usecase.ReportsUseCase;
import com.erppos.backend.erp.reports.domain.exception.ReportBusinessRuleException;
import com.erppos.backend.erp.reports.domain.model.CashRegisterReport;
import com.erppos.backend.erp.reports.domain.model.ElectronicDocumentsReport;
import com.erppos.backend.erp.reports.domain.model.InventoryMovementReportItem;
import com.erppos.backend.erp.reports.domain.model.LowStockItem;
import com.erppos.backend.erp.reports.domain.model.PurchasesReport;
import com.erppos.backend.erp.reports.domain.model.QuotesReport;
import com.erppos.backend.erp.reports.domain.model.SalesReport;
import com.erppos.backend.erp.reports.domain.model.TopProductReportItem;
import com.erppos.backend.erp.reports.domain.port.ReportsQueryPort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ReportsApplicationService implements ReportsUseCase {

    private final ReportsQueryPort reportsQueryPort;

    public ReportsApplicationService(ReportsQueryPort reportsQueryPort) {
        this.reportsQueryPort = reportsQueryPort;
    }

    @Override
    public SalesReport sales(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return reportsQueryPort.sales(from, to);
    }

    @Override
    public CashRegisterReport cashRegister(Long cashRegisterId) {
        if (cashRegisterId == null) {
            throw new ReportBusinessRuleException("cashRegisterId is required");
        }
        return reportsQueryPort.cashRegister(cashRegisterId);
    }

    @Override
    public List<LowStockItem> lowStock(double threshold) {
        if (threshold < 0) {
            throw new ReportBusinessRuleException("threshold must be >= 0");
        }
        return reportsQueryPort.lowStock(threshold);
    }

    @Override
    public List<InventoryMovementReportItem> inventoryMovements(LocalDate from, LocalDate to, Long productId, Long warehouseId) {
        validateRange(from, to);
        return reportsQueryPort.inventoryMovements(from, to, productId, warehouseId);
    }

    @Override
    public PurchasesReport purchases(LocalDate from, LocalDate to, Long supplierId) {
        validateRange(from, to);
        return reportsQueryPort.purchases(from, to, supplierId);
    }

    @Override
    public List<TopProductReportItem> topProducts(LocalDate from, LocalDate to, Integer limit) {
        validateRange(from, to);
        int safeLimit = limit == null ? 10 : limit;
        if (safeLimit <= 0 || safeLimit > 100) {
            throw new ReportBusinessRuleException("limit must be between 1 and 100");
        }
        return reportsQueryPort.topProducts(from, to, safeLimit);
    }

    @Override
    public QuotesReport quotes(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return reportsQueryPort.quotes(from, to);
    }

    @Override
    public ElectronicDocumentsReport electronicDocuments(LocalDate from, LocalDate to, ElectronicDocumentStatus status) {
        validateRange(from, to);
        return reportsQueryPort.electronicDocuments(from, to, status);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new ReportBusinessRuleException("to must be >= from");
        }
    }
}

