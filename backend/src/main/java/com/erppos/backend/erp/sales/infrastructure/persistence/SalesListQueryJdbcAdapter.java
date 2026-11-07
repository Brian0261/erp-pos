package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.application.usecase.SalesListItemResult;
import com.erppos.backend.erp.sales.application.usecase.SalesListPage;
import com.erppos.backend.erp.sales.application.usecase.SalesListQuery;
import com.erppos.backend.erp.sales.application.usecase.SalesListQueryPort;
import com.erppos.backend.erp.sales.domain.model.SaleBillingSummary;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import com.erppos.backend.erp.shared.domain.policy.CommercialDates;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.StringJoiner;

@Repository
public class SalesListQueryJdbcAdapter implements SalesListQueryPort {
    private static final String SALES = " FROM sales s";
    private static final String SALE_FIELDS = """
            s.id, s.sale_number, s.sold_at, s.status, s.total_amount, s.created_by, s.cash_register_session_id
            """;
    private static final String DOCUMENT_FIELDS = """
            d.id AS document_id, d.document_type, d.full_number, d.status AS document_status, d.environment
            """;
    private static final String LATEST_DOCUMENT = """

            LEFT JOIN LATERAL (
                SELECT id, document_type, full_number, status, environment
                FROM electronic_documents
                WHERE sale_id = s.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) d ON true
            """;
    private static final String ORDER = " ORDER BY s.sold_at DESC, s.id DESC";
    private static final String PAGE = " LIMIT :size OFFSET :offset";

    private final NamedParameterJdbcTemplate jdbc;

    public SalesListQueryJdbcAdapter(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public SalesListPage findPage(SalesListQuery query, String effectiveCreatedBy) {
        var params = new MapSqlParameterSource();
        String where = predicates(query, effectiveCreatedBy, params);
        boolean documentFilter = query.filtersByDocument();
        String matchingSales = SALES + (documentFilter ? LATEST_DOCUMENT : "") + where;
        long total = jdbc.queryForObject("SELECT count(*)" + matchingSales, params, Long.class);
        if (query.offset() >= total) {
            return new SalesListPage(List.of(), total);
        }

        params.addValue("size", query.size()).addValue("offset", query.offset());
        String select = "SELECT " + SALE_FIELDS + ", " + DOCUMENT_FIELDS;
        // When documents are not part of the filter, look them up only for the selected page.
        String pageSql = documentFilter
                ? select + matchingSales + ORDER + PAGE
                : select + " FROM (SELECT " + SALE_FIELDS + matchingSales + ORDER + PAGE + ") s"
                        + LATEST_DOCUMENT + ORDER;
        return new SalesListPage(jdbc.query(pageSql, params, (row, index) -> listItem(row)), total);
    }

    private static String predicates(SalesListQuery query, String owner, MapSqlParameterSource params) {
        var filters = new StringJoiner(" AND ", " WHERE ", "").setEmptyValue("");
        if (owner != null) {
            filters.add("s.created_by = :owner");
            params.addValue("owner", owner);
        }
        if (query.from() != null) {
            filters.add("s.sold_at >= :from");
            params.addValue("from", CommercialDates.start(query.from()).atOffset(ZoneOffset.UTC));
        }
        if (query.to() != null) {
            filters.add("s.sold_at < :toExclusive");
            params.addValue("toExclusive", CommercialDates.endExclusive(query.to()).atOffset(ZoneOffset.UTC));
        }
        if (query.status() != null) {
            filters.add("s.status = :status");
            params.addValue("status", query.status().name());
        }
        if (query.cashRegisterSessionId() != null) {
            filters.add("s.cash_register_session_id = :cashSession");
            params.addValue("cashSession", query.cashRegisterSessionId());
        }
        if (query.saleNumber() != null) {
            filters.add("s.sale_number = :number");
            params.addValue("number", query.saleNumber());
        }
        if (query.saleNumberPrefix() != null) {
            filters.add("s.sale_number LIKE :prefix ESCAPE '!'");
            params.addValue("prefix", query.saleNumberPrefix().replace("!", "!!")
                    .replace("%", "!%").replace("_", "!_") + "%");
        }
        if (query.hasElectronicDocument() != null) {
            filters.add(query.hasElectronicDocument() ? "d.id IS NOT NULL" : "d.id IS NULL");
        }
        if (query.documentStatus() != null) {
            filters.add("d.status = :documentStatus");
            params.addValue("documentStatus", query.documentStatus());
        }
        return filters.toString();
    }

    private static SalesListItemResult listItem(ResultSet row) throws SQLException {
        Long documentId = row.getObject("document_id", Long.class);
        var summary = documentId == null ? SaleBillingSummary.empty() : new SaleBillingSummary(
                true, documentId, row.getString("document_type"), row.getString("full_number"),
                row.getString("document_status"), row.getString("environment"));
        return new SalesListItemResult(
                row.getLong("id"), row.getString("sale_number"), row.getObject("sold_at", OffsetDateTime.class).toInstant(),
                SaleStatus.valueOf(row.getString("status")), row.getBigDecimal("total_amount"),
                row.getString("created_by"), row.getLong("cash_register_session_id"), summary);
    }
}
