package com.erppos.backend.integration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
class BillingSeriesOptimisticConcurrencyMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void v25ShouldBackfillExistingRowsAndMigrateCleanDatabaseFromZero() throws SQLException {
        Flyway v24 = flyway("public", MigrationVersion.fromVersion("24"));
        v24.migrate();

        try (Connection connection = connection()) {
            assertFalse(columnExists(connection, "public", "billing_series", "version"));
            execute(connection, """
                    INSERT INTO billing_series (
                        document_type, series, current_number, environment, active,
                        created_by, updated_by
                    ) VALUES ('RECEIPT', 'B925', 17, 'BETA', FALSE, '4d-2b-1-test', '4d-2b-1-test')
                    """);
        }

        Flyway latest = flyway("public", null);
        latest.migrate();
        latest.validate();

        try (Connection connection = connection()) {
            assertTrue(columnExists(connection, "public", "billing_series", "version"));
            assertEquals(0L, queryLong(
                    connection,
                    "SELECT version FROM billing_series WHERE series = 'B925'"
            ));
            assertEquals("NO", queryString(
                    connection,
                    """
                            SELECT is_nullable
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'billing_series'
                              AND column_name = 'version'
                            """
            ));
            assertTrue(queryString(
                    connection,
                    """
                            SELECT column_default
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'billing_series'
                              AND column_name = 'version'
                            """
            ).contains("0"));
            assertEquals(1L, queryLong(
                    connection,
                    """
                            SELECT COUNT(*)
                            FROM pg_constraint constraint_definition
                            JOIN pg_class table_definition
                              ON table_definition.oid = constraint_definition.conrelid
                            JOIN pg_namespace schema_definition
                              ON schema_definition.oid = table_definition.relnamespace
                            WHERE schema_definition.nspname = 'public'
                              AND table_definition.relname = 'billing_series'
                              AND constraint_definition.conname = 'chk_billing_series_version'
                            """
            ));

            execute(connection, """
                    INSERT INTO billing_series (
                        document_type, series, current_number, environment, active,
                        created_by, updated_by
                    ) VALUES ('INVOICE', 'F925', 3, 'BETA', FALSE, '4d-2b-1-test', '4d-2b-1-test')
                    """);
            assertEquals(0L, queryLong(
                    connection,
                    "SELECT version FROM billing_series WHERE series = 'F925'"
            ));
            assertThrows(SQLException.class, () -> execute(
                    connection,
                    "UPDATE billing_series SET version = -1 WHERE series = 'B925'"
            ));
            assertThrows(SQLException.class, () -> execute(
                    connection,
                    "UPDATE billing_series SET version = NULL WHERE series = 'B925'"
            ));
        }

        try (Connection connection = connection();
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA fresh_4d2b1");
        }

        Flyway fresh = flyway("fresh_4d2b1", null);
        fresh.migrate();
        fresh.validate();

        try (Connection connection = connection()) {
            assertTrue(columnExists(connection, "fresh_4d2b1", "billing_series", "version"));
            assertEquals("25", fresh.info().current().getVersion().getVersion());
        }
    }

    private Flyway flyway(String schema, MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .defaultSchema(schema)
                .schemas(schema)
                .placeholders(Map.of(
                        "harden_default_seed_users", "false",
                        "harden_default_seed_users_include_admin", "false"
                ));
        if (target != null) {
            configuration.target(target);
        }
        return configuration.load();
    }

    private Connection connection() throws SQLException {
        return java.sql.DriverManager.getConnection(
                POSTGRES.getJdbcUrl(),
                POSTGRES.getUsername(),
                POSTGRES.getPassword()
        );
    }

    private boolean columnExists(
            Connection connection,
            String schema,
            String table,
            String column
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = ?
                  AND table_name = ?
                  AND column_name = ?
                """)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            statement.setString(3, column);
            try (ResultSet resultSet = statement.executeQuery()) {
                resultSet.next();
                return resultSet.getLong(1) == 1L;
            }
        }
    }

    private long queryLong(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(sql)) {
            resultSet.next();
            return resultSet.getLong(1);
        }
    }

    private String queryString(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(sql)) {
            resultSet.next();
            return resultSet.getString(1);
        }
    }

    private void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        }
    }
}
