package com.erppos.backend.integration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.testcontainers.containers.PostgreSQLContainer;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class UnitQuantityPolicyMigrationTest {
    @Test
    @Timeout(90)
    void v26IsAdditiveNullableAndDoesNotClassifyExistingUnits() throws Exception {
        try (var postgres = new PostgreSQLContainer<>("postgres:16-alpine")) {
            postgres.start();
            var placeholders = Map.of("harden_default_seed_users", "false", "harden_default_seed_users_include_admin", "false");
            Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .placeholders(placeholders).target("25").load().migrate();
            try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                 var statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO units(code,name) VALUES ('LEGACY-QA','Synthetic legacy unit')");
                long count;
                try (var rows = statement.executeQuery("SELECT COUNT(*) FROM units")) { rows.next(); count = rows.getLong(1); }
                assertEquals(1, Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                        .placeholders(placeholders).target("26").load().migrate().migrationsExecuted);
                try (var rows = statement.executeQuery("SELECT COUNT(*) FROM units WHERE quantity_policy IS NULL")) {
                    rows.next(); assertEquals(count, rows.getLong(1));
                }
                try (var rows = statement.executeQuery("SELECT is_nullable, column_default FROM information_schema.columns WHERE table_name='units' AND column_name='quantity_policy'")) {
                    assertTrue(rows.next()); assertEquals("YES", rows.getString(1)); assertNull(rows.getString(2));
                }
                statement.executeUpdate("INSERT INTO units(code,name,quantity_policy) VALUES ('WHOLE-QA','Synthetic whole','WHOLE')");
                statement.executeUpdate("INSERT INTO units(code,name,quantity_policy) VALUES ('DEC-QA','Synthetic decimal','DECIMAL_2')");
                for (String invalid : new String[]{"UNKNOWN", "INVALID_POLICY"}) {
                    SQLException error = assertThrows(SQLException.class, () -> statement.executeUpdate(
                            "INSERT INTO units(code,name,quantity_policy) VALUES ('INVALID-QA','Synthetic invalid','" + invalid + "')"));
                    assertEquals("23514", error.getSQLState());
                }
            }
        }
    }
}
