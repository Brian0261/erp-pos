package com.erppos.backend.integration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.testcontainers.containers.PostgreSQLContainer;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@Timeout(120)
class SaleItemIdentitySnapshotMigrationTest {
    private static final Map<String, String> PLACEHOLDERS = Map.of(
            "harden_default_seed_users", "false", "harden_default_seed_users_include_admin", "false");

    @Test
    void v29PreservesV28HistoryWithoutBackfillAndAcceptsExistingCatalogIdentityValues() throws Exception {
        try (var postgres = new PostgreSQLContainer<>("postgres:16-alpine")
                .withLabel("inktoy.qa.scope", "pos-internal-note-1a").withReuse(false)) {
            postgres.start();
            migrate(postgres, "28");
            try (Connection connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
                try (var statement = connection.createStatement(); var version = statement.executeQuery("show server_version_num")) {
                    assertTrue(version.next());
                    assertTrue(version.getInt(1) >= 160000 && version.getInt(1) < 170000);
                }
                long category = id(connection, "insert into categories(name) values('Synthetic NOTE-1A migration') returning id");
                long unit = id(connection, "insert into units(code,name) values('NOTE1AMIG','Synthetic NOTE-1A') returning id");
                long warehouse = id(connection, "insert into warehouses(code,name,type) values('NOTE1AMIG','Synthetic NOTE-1A','MAIN_WAREHOUSE') returning id");
                long product = id(connection, """
                        insert into products(sku,name,category_id,unit_id,sale_price)
                        values('NOTE1AMIG','Nombre previo',?,?,10) returning id
                        """, category, unit);
                long emptyProduct = id(connection, "insert into products(sku,name,category_id,unit_id,sale_price) values('','',?,?,0) returning id", category, unit);
                long cash = id(connection, """
                        insert into cash_register_sessions(opened_by_user_id,opened_at,opening_amount,status)
                        select id,now(),0,'OPEN' from users order by id limit 1 returning id
                        """);
                long sale = id(connection, """
                        insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                            total_amount,paid_amount,change_amount,sold_at,created_by)
                        values(?,?,'NOTE1A-MIGRATION','COMPLETED',1.25,0,1.25,2,0.75,now(),'synthetic') returning id
                        """, cash, warehouse);
                long firstItem = id(connection, """
                        insert into sale_items(sale_id,product_id,quantity,unit_price,discount_amount,line_total)
                        values(?,?,0.125,10,0,1.25) returning id
                        """, sale, product);
                id(connection, "insert into sale_items(sale_id,product_id,quantity,unit_price,discount_amount,line_total) values(?,?,1,0,0,0) returning id", sale, emptyProduct);
                id(connection, "insert into sale_payments(sale_id,payment_method,amount) values(?,'CASH',2) returning id", sale);
                var before = businessRows(connection);
                int tableCount = integer(connection, "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'");

                assertEquals(1, migrate(postgres, "29").migrationsExecuted);
                assertEquals(before, businessRows(connection), "No previous sale, line, payment, product, cash or operation may be rewritten");
                assertEquals(tableCount, integer(connection, "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"));
                assertEquals(2, integer(connection, "select count(*) from sale_items where product_name_snapshot is null and sku_snapshot is null"));
                assertEquals(2, integer(connection, """
                        select count(*) from information_schema.columns where table_schema='public' and table_name='sale_items'
                            and is_nullable='YES' and column_default is null and
                            ((column_name='product_name_snapshot' and character_maximum_length=180)
                                or (column_name='sku_snapshot' and character_maximum_length=60))
                        """));
                try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery("select quantity,unit_price,discount_amount,line_total from sale_items where id=" + firstItem)) {
                    assertTrue(rows.next());
                    assertEquals(new BigDecimal("0.125"), rows.getBigDecimal("quantity"));
                    assertEquals(new BigDecimal("10.00"), rows.getBigDecimal("unit_price"));
                    assertEquals(new BigDecimal("0.00"), rows.getBigDecimal("discount_amount"));
                    assertEquals(new BigDecimal("1.25"), rows.getBigDecimal("line_total"));
                }

                SQLException partialName = assertThrows(SQLException.class, () -> updateIdentity(connection, firstItem, "One-sided", null));
                assertEquals("23514", partialName.getSQLState());
                SQLException partialSku = assertThrows(SQLException.class, () -> updateIdentity(connection, firstItem, null, "ONE-SIDED"));
                assertEquals("23514", partialSku.getSQLState());
                // Empty and whitespace values remain compatible with the preexisting product SQL contract.
                assertEquals(1, updateIdentity(connection, firstItem, "", ""));
                assertEquals(1, updateIdentity(connection, firstItem, "  ", "  "));
                assertEquals(1, updateIdentity(connection, firstItem, "Ñ".repeat(180), "N".repeat(60)));
                assertEquals("22001", assertThrows(SQLException.class,
                        () -> updateIdentity(connection, firstItem, "N".repeat(181), "N")).getSQLState());
                assertEquals("22001", assertThrows(SQLException.class,
                        () -> updateIdentity(connection, firstItem, "N", "N".repeat(61))).getSQLState());
                assertEquals(1, updateIdentity(connection, firstItem, null, null));
                assertEquals(before, businessRows(connection));
                flyway(postgres, "29").validate();
            }
        }
    }

    private org.flywaydb.core.api.output.MigrateResult migrate(PostgreSQLContainer<?> postgres, String target) {
        return flyway(postgres, target).migrate();
    }

    private Flyway flyway(PostgreSQLContainer<?> postgres, String target) {
        return Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .placeholders(PLACEHOLDERS).target(target).load();
    }

    private long id(Connection connection, String sql, Object... arguments) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < arguments.length; index++) statement.setObject(index + 1, arguments[index]);
            try (ResultSet rows = statement.executeQuery()) {
                assertTrue(rows.next());
                return rows.getLong(1);
            }
        }
    }

    private int integer(Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getInt(1);
        }
    }

    private int updateIdentity(Connection connection, long item, String name, String sku) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("update sale_items set product_name_snapshot=?,sku_snapshot=? where id=?")) {
            statement.setString(1, name);
            statement.setString(2, sku);
            statement.setLong(3, item);
            return statement.executeUpdate();
        }
    }

    private Map<String, String> businessRows(Connection connection) throws SQLException {
        Map<String, String> rows = new LinkedHashMap<>();
        for (String table : List.of("sales", "sale_items", "sale_payments", "products", "cash_register_sessions", "sale_operations")) {
            // Static table names only; removing absent JSON keys also works before V29 exists.
            String sql = "select coalesce(jsonb_agg((to_jsonb(t)-'product_name_snapshot'-'sku_snapshot') order by id),'[]')::text from " + table + " t";
            // sale_operations is keyed by actor/operation rather than an id column.
            if (table.equals("sale_operations")) sql = "select coalesce(jsonb_agg(to_jsonb(t) order by actor_user_id,operation_id),'[]')::text from sale_operations t";
            try (var statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
                assertTrue(result.next());
                rows.put(table, result.getString(1));
            }
        }
        return rows;
    }
}
