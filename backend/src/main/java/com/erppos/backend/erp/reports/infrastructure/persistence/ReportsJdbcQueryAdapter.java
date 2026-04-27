package com.erppos.backend.erp.reports.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.reports.domain.exception.ReportNotFoundException;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Component
public class ReportsJdbcQueryAdapter implements ReportsQueryPort {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Instant MIN_INSTANT_FILTER = Instant.parse("1970-01-01T00:00:00Z");
    private static final Instant MAX_INSTANT_FILTER = Instant.parse("9999-12-31T23:59:59Z");

    private final JdbcTemplate jdbcTemplate;

    public ReportsJdbcQueryAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public SalesReport sales(LocalDate from, LocalDate to) {
        Instant fromInstant = toFromInstant(from);
        Instant toInstant = toToInstant(to);

        BigDecimal totalSalesAmount = nz(jdbcTemplate.queryForObject(
                """
                        select coalesce(sum(s.total_amount), 0)
                        from sales s
                        where s.status = 'COMPLETED'
                          and s.sold_at >= ? and s.sold_at <= ?
                        """,
                BigDecimal.class,
                Timestamp.from(fromInstant), Timestamp.from(toInstant)
        ));

        Long totalSalesCount = nzLong(jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from sales s
                        where s.status = 'COMPLETED'
                          and s.sold_at >= ? and s.sold_at <= ?
                        """,
                Long.class,
                Timestamp.from(fromInstant), Timestamp.from(toInstant)
        ));

        Long voidedSalesCount = nzLong(jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from sales s
                        where s.status = 'VOIDED'
                          and s.sold_at >= ? and s.sold_at <= ?
                        """,
                Long.class,
                Timestamp.from(fromInstant), Timestamp.from(toInstant)
        ));

        List<PaymentMethodAmount> byPayment = jdbcTemplate.query(
                """
                        select sp.payment_method, coalesce(sum(sp.amount), 0) amount
                        from sale_payments sp
                        join sales s on s.id = sp.sale_id
                        where s.status = 'COMPLETED'
                          and s.sold_at >= ? and s.sold_at <= ?
                        group by sp.payment_method
                        order by sp.payment_method
                        """,
                (rs, rowNum) -> new PaymentMethodAmount(rs.getString("payment_method"), nz(rs.getBigDecimal("amount"))),
                Timestamp.from(fromInstant), Timestamp.from(toInstant)
        );

        List<SalesByDay> byDay = jdbcTemplate.query(
                """
                        select date(s.sold_at) as sold_day, count(*) sales_count, coalesce(sum(s.total_amount), 0) total_amount
                        from sales s
                        where s.status = 'COMPLETED'
                          and s.sold_at >= ? and s.sold_at <= ?
                        group by date(s.sold_at)
                        order by sold_day
                        """,
                (rs, rowNum) -> new SalesByDay(
                        rs.getDate("sold_day").toLocalDate(),
                        nz(rs.getBigDecimal("total_amount")),
                        rs.getLong("sales_count")
                ),
                Timestamp.from(fromInstant), Timestamp.from(toInstant)
        );

        BigDecimal averageTicket = totalSalesCount == 0
                ? ZERO
                : totalSalesAmount.divide(BigDecimal.valueOf(totalSalesCount), 2, java.math.RoundingMode.HALF_UP);

        return new SalesReport(totalSalesAmount, totalSalesCount, averageTicket, voidedSalesCount, byPayment, byDay);
    }

    @Override
    public CashRegisterReport cashRegister(Long cashRegisterId) {
        List<CashRegisterReport> rows = jdbcTemplate.query(
                """
                        select cr.opening_amount, cr.counted_amount, cr.expected_cash_amount, cr.difference_amount,
                               cr.opened_at, cr.closed_at, cr.status,
                               coalesce(sum(case when s.status = 'COMPLETED' then s.total_amount else 0 end), 0) as total_sales
                        from cash_register_sessions cr
                        left join sales s on s.cash_register_session_id = cr.id
                        where cr.id = ?
                        group by cr.id
                        """,
                (rs, rowNum) -> new CashRegisterReport(
                        nz(rs.getBigDecimal("opening_amount")),
                        nz(rs.getBigDecimal("counted_amount")),
                        nz(rs.getBigDecimal("expected_cash_amount")),
                        nz(rs.getBigDecimal("difference_amount")),
                        nz(rs.getBigDecimal("total_sales")),
                        List.of(),
                        toInstant(rs.getTimestamp("opened_at")),
                        toInstant(rs.getTimestamp("closed_at")),
                        CashRegisterStatus.valueOf(rs.getString("status"))
                ),
                cashRegisterId
        );

        if (rows.isEmpty()) {
            throw new ReportNotFoundException("Cash register not found");
        }

        List<PaymentMethodAmount> byPayment = jdbcTemplate.query(
                """
                        select sp.payment_method, coalesce(sum(sp.amount), 0) amount
                        from sale_payments sp
                        join sales s on s.id = sp.sale_id
                        where s.cash_register_session_id = ? and s.status = 'COMPLETED'
                        group by sp.payment_method
                        order by sp.payment_method
                        """,
                (rs, rowNum) -> new PaymentMethodAmount(rs.getString("payment_method"), nz(rs.getBigDecimal("amount"))),
                cashRegisterId
        );

        CashRegisterReport current = rows.get(0);
        return new CashRegisterReport(
                current.openingAmount(),
                current.countedAmount(),
                current.expectedCashAmount(),
                current.differenceAmount(),
                current.totalSales(),
                byPayment,
                current.openedAt(),
                current.closedAt(),
                current.status()
        );
    }

    @Override
    public List<LowStockItem> lowStock(double threshold) {
        BigDecimal th = BigDecimal.valueOf(threshold);
        return jdbcTemplate.query(
                """
                        select sb.product_id, p.sku, p.barcode, p.name product_name,
                               sb.warehouse_id, w.name warehouse_name,
                               sb.quantity
                        from stock_balances sb
                        join products p on p.id = sb.product_id
                        join warehouses w on w.id = sb.warehouse_id
                        where sb.quantity <= ?
                        order by sb.quantity asc
                        """,
                (rs, rowNum) -> new LowStockItem(
                        rs.getLong("product_id"),
                        rs.getString("sku"),
                        rs.getString("barcode"),
                        rs.getString("product_name"),
                        rs.getLong("warehouse_id"),
                        rs.getString("warehouse_name"),
                        nz(rs.getBigDecimal("quantity")),
                        th
                ),
                th
        );
    }

    @Override
    public List<InventoryMovementReportItem> inventoryMovements(LocalDate from, LocalDate to, Long productId, Long warehouseId) {
        Instant fromInstant = toFromInstant(from);
        Instant toInstant = toToInstant(to);

        StringBuilder sql = new StringBuilder("""
                select im.movement_type, p.name product_name, w.name warehouse_name,
                       im.quantity, im.previous_stock, im.new_stock,
                       im.reason, im.created_at, im.created_by
                from inventory_movements im
                join products p on p.id = im.product_id
                join warehouses w on w.id = im.warehouse_id
                where im.created_at >= ? and im.created_at <= ?
                """);
        List<Object> args = new ArrayList<>();
        args.add(Timestamp.from(fromInstant));
        args.add(Timestamp.from(toInstant));

        if (productId != null) {
            sql.append(" and im.product_id = ?");
            args.add(productId);
        }
        if (warehouseId != null) {
            sql.append(" and im.warehouse_id = ?");
            args.add(warehouseId);
        }
        sql.append(" order by im.created_at desc");

        return jdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> new InventoryMovementReportItem(
                        InventoryMovementType.valueOf(rs.getString("movement_type")),
                        rs.getString("product_name"),
                        rs.getString("warehouse_name"),
                        nz(rs.getBigDecimal("quantity")),
                        nz(rs.getBigDecimal("previous_stock")),
                        nz(rs.getBigDecimal("new_stock")),
                        rs.getString("reason"),
                        toInstant(rs.getTimestamp("created_at")),
                        rs.getString("created_by")
                ),
                args.toArray()
        );
    }

    @Override
    public PurchasesReport purchases(LocalDate from, LocalDate to, Long supplierId) {
        LocalDate fromDay = from == null ? LocalDate.of(1970, 1, 1) : from;
        LocalDate toDay = to == null ? LocalDate.of(9999, 12, 31) : to;

        StringBuilder whereSql = new StringBuilder(" where po.order_date >= ? and po.order_date <= ?");
        List<Object> args = new ArrayList<>();
        args.add(Date.valueOf(fromDay));
        args.add(Date.valueOf(toDay));
        if (supplierId != null) {
            whereSql.append(" and po.supplier_id = ?");
            args.add(supplierId);
        }

        BigDecimal totalPurchaseAmount = nz(jdbcTemplate.queryForObject(
                "select coalesce(sum(po.total_amount), 0) from purchase_orders po" + whereSql,
                BigDecimal.class,
                args.toArray()
        ));

        Long purchaseOrderCount = nzLong(jdbcTemplate.queryForObject(
                "select count(*) from purchase_orders po" + whereSql,
                Long.class,
                args.toArray()
        ));

        Long receivedOrdersCount = nzLong(jdbcTemplate.queryForObject(
                "select count(*) from purchase_orders po" + whereSql + " and po.status in ('RECEIVED','PARTIALLY_RECEIVED')",
                Long.class,
                args.toArray()
        ));

        List<SupplierPurchaseAmount> bySupplier = jdbcTemplate.query(
                """
                        select po.supplier_id, s.name supplier_name, coalesce(sum(po.total_amount), 0) amount
                        from purchase_orders po
                        join suppliers s on s.id = po.supplier_id
                        """ + whereSql + " group by po.supplier_id, s.name order by amount desc",
                (rs, rowNum) -> new SupplierPurchaseAmount(
                        rs.getLong("supplier_id"),
                        rs.getString("supplier_name"),
                        nz(rs.getBigDecimal("amount"))
                ),
                args.toArray()
        );

        return new PurchasesReport(totalPurchaseAmount, purchaseOrderCount, receivedOrdersCount, bySupplier);
    }

    @Override
    public List<TopProductReportItem> topProducts(LocalDate from, LocalDate to, int limit) {
        Instant fromInstant = toFromInstant(from);
        Instant toInstant = toToInstant(to);

        return jdbcTemplate.query(
                """
                        select si.product_id, p.sku, p.barcode, p.name product_name,
                               coalesce(sum(si.quantity), 0) quantity_sold,
                               coalesce(sum(si.line_total), 0) total_amount
                        from sale_items si
                        join sales s on s.id = si.sale_id
                        join products p on p.id = si.product_id
                        where s.status = 'COMPLETED'
                          and s.sold_at >= ? and s.sold_at <= ?
                        group by si.product_id, p.sku, p.barcode, p.name
                        order by quantity_sold desc
                        limit ?
                        """,
                (rs, rowNum) -> new TopProductReportItem(
                        rs.getLong("product_id"),
                        rs.getString("sku"),
                        rs.getString("barcode"),
                        rs.getString("product_name"),
                        nz(rs.getBigDecimal("quantity_sold")),
                        nz(rs.getBigDecimal("total_amount"))
                ),
                Timestamp.from(fromInstant), Timestamp.from(toInstant), limit
        );
    }

    @Override
    public QuotesReport quotes(LocalDate from, LocalDate to) {
        LocalDate fromDay = from == null ? LocalDate.of(1970, 1, 1) : from;
        LocalDate toDay = to == null ? LocalDate.of(9999, 12, 31) : to;

        Long totalQuotes = nzLong(jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from quotes q
                        where q.issue_date >= ? and q.issue_date <= ?
                        """,
                Long.class,
                Date.valueOf(fromDay), Date.valueOf(toDay)
        ));

        Long convertedQuotes = nzLong(jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from quotes q
                        where q.issue_date >= ? and q.issue_date <= ?
                          and q.status = 'CONVERTED'
                        """,
                Long.class,
                Date.valueOf(fromDay), Date.valueOf(toDay)
        ));

        Long cancelledQuotes = nzLong(jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from quotes q
                        where q.issue_date >= ? and q.issue_date <= ?
                          and q.status = 'CANCELLED'
                        """,
                Long.class,
                Date.valueOf(fromDay), Date.valueOf(toDay)
        ));

        BigDecimal convertedAmount = nz(jdbcTemplate.queryForObject(
                """
                        select coalesce(sum(s.total_amount), 0)
                        from quotes q
                        join sales s on s.id = q.converted_sale_id
                        where q.issue_date >= ? and q.issue_date <= ?
                          and q.status = 'CONVERTED'
                        """,
                BigDecimal.class,
                Date.valueOf(fromDay), Date.valueOf(toDay)
        ));

        BigDecimal rate = totalQuotes == 0
                ? ZERO
                : BigDecimal.valueOf(convertedQuotes)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalQuotes), 2, java.math.RoundingMode.HALF_UP);

        return new QuotesReport(totalQuotes, convertedQuotes, cancelledQuotes, rate, convertedAmount);
    }

    @Override
    public ElectronicDocumentsReport electronicDocuments(LocalDate from, LocalDate to, ElectronicDocumentStatus status) {
        Instant fromInstant = toFromInstant(from);
        Instant toInstant = toToInstant(to);

        StringBuilder whereSql = new StringBuilder(" where ed.created_at >= ? and ed.created_at <= ?");
        List<Object> args = new ArrayList<>();
        args.add(Timestamp.from(fromInstant));
        args.add(Timestamp.from(toInstant));
        if (status != null) {
            whereSql.append(" and ed.status = ?");
            args.add(status.name());
        }

        Long totalDocuments = nzLong(jdbcTemplate.queryForObject(
                "select count(*) from electronic_documents ed" + whereSql,
                Long.class,
                args.toArray()
        ));

        Long acceptedCount = nzLong(jdbcTemplate.queryForObject(
                "select count(*) from electronic_documents ed" + whereSql + " and ed.status = 'ACCEPTED'",
                Long.class,
                args.toArray()
        ));

        Long rejectedCount = nzLong(jdbcTemplate.queryForObject(
                "select count(*) from electronic_documents ed" + whereSql + " and ed.status = 'REJECTED'",
                Long.class,
                args.toArray()
        ));

        Long errorCount = nzLong(jdbcTemplate.queryForObject(
                "select count(*) from electronic_documents ed" + whereSql + " and ed.status = 'ERROR'",
                Long.class,
                args.toArray()
        ));

        BigDecimal totalAmount = nz(jdbcTemplate.queryForObject(
                "select coalesce(sum(ed.total_amount), 0) from electronic_documents ed" + whereSql,
                BigDecimal.class,
                args.toArray()
        ));

        List<DocumentTypeCount> byType = jdbcTemplate.query(
                "select ed.document_type, count(*) total from electronic_documents ed" + whereSql + " group by ed.document_type order by ed.document_type",
                (rs, rowNum) -> new DocumentTypeCount(rs.getString("document_type"), rs.getLong("total")),
                args.toArray()
        );

        return new ElectronicDocumentsReport(totalDocuments, acceptedCount, rejectedCount, errorCount, totalAmount, byType);
    }

    private Instant toFromInstant(LocalDate from) {
        return from == null ? MIN_INSTANT_FILTER : from.atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private Instant toToInstant(LocalDate to) {
        return to == null ? MAX_INSTANT_FILTER : to.plusDays(1).atStartOfDay().minusSeconds(1).toInstant(ZoneOffset.UTC);
    }

    private Instant toInstant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private BigDecimal nz(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private Long nzLong(Long value) {
        return value == null ? 0L : value;
    }
}


