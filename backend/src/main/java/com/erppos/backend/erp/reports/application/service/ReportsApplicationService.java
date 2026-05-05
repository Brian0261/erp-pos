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
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ReportsApplicationService implements ReportsUseCase {

    private static final int DEFAULT_RANGE_DAYS = 30;
    private static final int MAX_RANGE_DAYS = 90;
    private static final int DEFAULT_LOW_STOCK_LIMIT = 200;
    private static final int MAX_LOW_STOCK_LIMIT = 1000;
    private static final int DEFAULT_INVENTORY_MOVEMENTS_LIMIT = 500;
    private static final int MAX_INVENTORY_MOVEMENTS_LIMIT = 2000;

    private final ReportsQueryPort reportsQueryPort;

    public ReportsApplicationService(ReportsQueryPort reportsQueryPort) {
        this.reportsQueryPort = reportsQueryPort;
    }

    @Override
    public SalesReport sales(LocalDate from, LocalDate to) {
        DateRange range = resolveSafeDateRange(from, to);
        return reportsQueryPort.sales(range.from(), range.to());
    }

    @Override
    public CashRegisterReport cashRegister(Long cashRegisterId) {
        if (cashRegisterId == null) {
            throw new ReportBusinessRuleException("cashRegisterId is required");
        }
        return reportsQueryPort.cashRegister(cashRegisterId);
    }

    @Override
    public List<LowStockItem> lowStock(double threshold, Integer limit) {
        if (threshold < 0) {
            throw new ReportBusinessRuleException("threshold must be >= 0");
        }
        int safeLimit = sanitizeLimit(limit, DEFAULT_LOW_STOCK_LIMIT, MAX_LOW_STOCK_LIMIT, "limit must be between 1 and 1000");
        return reportsQueryPort.lowStock(threshold, safeLimit);
    }

    @Override
    public List<InventoryMovementReportItem> inventoryMovements(LocalDate from, LocalDate to, Long productId, Long warehouseId, Integer limit) {
        DateRange range = resolveSafeDateRange(from, to);
        int safeLimit = sanitizeLimit(limit, DEFAULT_INVENTORY_MOVEMENTS_LIMIT, MAX_INVENTORY_MOVEMENTS_LIMIT, "limit must be between 1 and 2000");
        return reportsQueryPort.inventoryMovements(range.from(), range.to(), productId, warehouseId, safeLimit);
    }

    @Override
    public PurchasesReport purchases(LocalDate from, LocalDate to, Long supplierId) {
        DateRange range = resolveSafeDateRange(from, to);
        return reportsQueryPort.purchases(range.from(), range.to(), supplierId);
    }

    @Override
    public List<TopProductReportItem> topProducts(LocalDate from, LocalDate to, Integer limit) {
        DateRange range = resolveSafeDateRange(from, to);
        int safeLimit = limit == null ? 10 : limit;
        if (safeLimit <= 0 || safeLimit > 100) {
            throw new ReportBusinessRuleException("limit must be between 1 and 100");
        }
        return reportsQueryPort.topProducts(range.from(), range.to(), safeLimit);
    }

    @Override
    public QuotesReport quotes(LocalDate from, LocalDate to) {
        DateRange range = resolveSafeDateRange(from, to);
        return reportsQueryPort.quotes(range.from(), range.to());
    }

    @Override
    public ElectronicDocumentsReport electronicDocuments(LocalDate from, LocalDate to, ElectronicDocumentStatus status) {
        DateRange range = resolveSafeDateRange(from, to);
        return reportsQueryPort.electronicDocuments(range.from(), range.to(), status);
    }

    private DateRange resolveSafeDateRange(LocalDate from, LocalDate to) {
        LocalDate resolvedFrom = from;
        LocalDate resolvedTo = to;
        if (resolvedFrom == null && resolvedTo == null) {
            resolvedTo = LocalDate.now(ZoneOffset.UTC);
            resolvedFrom = resolvedTo.minusDays(DEFAULT_RANGE_DAYS - 1L);
        } else if (resolvedFrom != null && resolvedTo == null) {
            resolvedTo = resolvedFrom.plusDays(DEFAULT_RANGE_DAYS - 1L);
        } else if (resolvedFrom == null) {
            resolvedFrom = resolvedTo.minusDays(DEFAULT_RANGE_DAYS - 1L);
        }

        if (resolvedTo.isBefore(resolvedFrom)) {
            throw new ReportBusinessRuleException("to must be >= from");
        }

        long rangeDays = ChronoUnit.DAYS.between(resolvedFrom, resolvedTo) + 1;
        if (rangeDays > MAX_RANGE_DAYS) {
            throw new ReportBusinessRuleException("date range must be <= 90 days");
        }
        return new DateRange(resolvedFrom, resolvedTo);
    }

    private int sanitizeLimit(Integer limit, int defaultLimit, int maxLimit, String errorMessage) {
        int safeLimit = limit == null ? defaultLimit : limit;
        if (safeLimit <= 0 || safeLimit > maxLimit) {
            throw new ReportBusinessRuleException(errorMessage);
        }
        return safeLimit;
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}

