package com.erppos.backend.integration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@Timeout(90)
class SaleOperationRecoveryMigrationTest {
    private static final Map<String, String> PLACEHOLDERS = Map.of(
            "harden_default_seed_users", "false", "harden_default_seed_users_include_admin", "false");

    @Test void v28PreservesCompletedIdentitiesAndPurgedResultsWithoutCreatingPreparations() throws Exception {
        try (var postgres = new PostgreSQLContainer<>("postgres:16-alpine")) {
            postgres.start(); migrate(postgres, "27");
            try (Connection connection = connect(postgres); Statement statement = connection.createStatement()) {
                long sale = seedSale(statement);
                statement.executeUpdate("""
                        insert into sale_operations(actor_user_id,operation_id,request_hash,sale_id)
                        select opened_by_user_id,'00000000-0000-0000-0000-000000000001','%s',%d
                        from cash_register_sessions where id=(select cash_register_session_id from sales where id=%d)
                        """.formatted("a".repeat(64), sale, sale));
                statement.executeUpdate("""
                        insert into sale_operations(actor_user_id,operation_id,request_hash,sale_id)
                        select opened_by_user_id,'00000000-0000-0000-0000-000000000002','%s',null
                        from cash_register_sessions where id=(select cash_register_session_id from sales where id=%d)
                        """.formatted("b".repeat(64), sale));
                assertEquals(1, migrate(postgres, "28").migrationsExecuted);
                try (ResultSet rows = statement.executeQuery("select operation_id,request_hash,sale_id,protocol_version,origin,state,command_snapshot,receipt_intent from sale_operations order by operation_id")) {
                    assertTrue(rows.next()); assertEquals("a".repeat(64), rows.getString("request_hash"));
                    assertEquals(sale, rows.getLong("sale_id")); assertLegacy(rows);
                    assertTrue(rows.next()); assertEquals("b".repeat(64), rows.getString("request_hash"));
                    assertNull(rows.getObject("sale_id")); assertLegacy(rows); assertFalse(rows.next());
                }
                // A purged legacy row must remain a tombstone even after future cascades.
                statement.executeUpdate("delete from sales where id=" + sale);
                try (ResultSet rows = statement.executeQuery("select count(*) from sale_operations where sale_id is null and state='COMPLETED' and protocol_version=0")) {
                    assertTrue(rows.next()); assertEquals(2, rows.getInt(1));
                }
                SQLException duplicate = assertThrows(SQLException.class, () -> statement.executeUpdate("""
                        insert into sale_operations(actor_user_id,operation_id,request_hash,sale_id)
                        select actor_user_id,operation_id,request_hash,sale_id from sale_operations limit 1
                        """));
                assertEquals("23505", duplicate.getSQLState(), "V27 identity uniqueness remains enforced");
            }
        }
    }

    @Test void incompatibleImportedActiveDocumentsStopV28WithoutRemovingOrRepairingHistory() throws Exception {
        try (var postgres = new PostgreSQLContainer<>("postgres:16-alpine")) {
            postgres.start(); migrate(postgres, "27");
            try (Connection connection = connect(postgres); Statement statement = connection.createStatement()) {
                long sale = seedSale(statement);
                // V22 already prevents this state. Simulate an incompatible historical import in this disposable DB.
                statement.executeUpdate("drop index uq_electronic_documents_sale_active");
                long receiptSeries = returnedId(statement, """
                        insert into billing_series(document_type,series,current_number,environment,created_by,updated_by)
                        values('RECEIPT','BR99',1,'LOCAL','synthetic','synthetic') returning id
                        """);
                long invoiceSeries = returnedId(statement, """
                        insert into billing_series(document_type,series,current_number,environment,created_by,updated_by)
                        values('INVOICE','FR99',1,'LOCAL','synthetic','synthetic') returning id
                        """);
                insertDocument(statement, sale, receiptSeries, "RECEIPT", "BR99");
                insertDocument(statement, sale, invoiceSeries, "INVOICE", "FR99");
                assertThrows(FlywayException.class, () -> migrate(postgres, "28"));
                try (ResultSet rows = statement.executeQuery("select count(*) from electronic_documents where sale_id=" + sale)) {
                    assertTrue(rows.next()); assertEquals(2, rows.getInt(1), "Migration failure must not delete or repair imported documents");
                }
                try (ResultSet rows = statement.executeQuery("select count(*) from information_schema.columns where table_name='sale_operations' and column_name='protocol_version'")) {
                    assertTrue(rows.next()); assertEquals(0, rows.getInt(1), "The additive migration must roll back atomically");
                }
            }
        }
    }

    private void assertLegacy(ResultSet rows) throws SQLException {
        assertEquals(0, rows.getInt("protocol_version")); assertEquals("LEGACY", rows.getString("origin"));
        assertEquals("COMPLETED", rows.getString("state")); assertNull(rows.getObject("command_snapshot"));
        assertNull(rows.getObject("receipt_intent"));
    }
    private org.flywaydb.core.api.output.MigrateResult migrate(PostgreSQLContainer<?> postgres, String target) {
        return Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .placeholders(PLACEHOLDERS).target(target).load().migrate();
    }
    private Connection connect(PostgreSQLContainer<?> postgres) throws SQLException {
        return DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }
    private long seedSale(Statement statement) throws SQLException {
        long warehouse = returnedId(statement, "insert into warehouses(code,name,type) values('RECOVERY-MIGRATION','Synthetic migration','MAIN_WAREHOUSE') returning id");
        long cash = returnedId(statement, "insert into cash_register_sessions(opened_by_user_id,opened_at,opening_amount,status) select id,now(),0,'OPEN' from users order by id limit 1 returning id");
        return returnedId(statement, """
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,total_amount,paid_amount,change_amount,sold_at,created_by)
                values(%d,%d,'SYNTHETIC-MIGRATION','COMPLETED',10,0,10,10,0,now(),'synthetic') returning id
                """.formatted(cash, warehouse));
    }
    private long returnedId(Statement statement, String sql) throws SQLException {
        try (ResultSet rows = statement.executeQuery(sql)) { assertTrue(rows.next()); return rows.getLong(1); }
    }
    private void insertDocument(Statement statement, long sale, long series, String type, String prefix) throws SQLException {
        statement.executeUpdate("""
                insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,number,full_number,subtotal_amount,tax_amount,total_amount,created_by,updated_by)
                values(%d,%d,'%s','DRAFT','LOCAL','%s',1,'%s-00000001',10,0,10,'synthetic','synthetic')
                """.formatted(sale, series, type, prefix, prefix));
    }
}
