package com.erppos.backend.integration;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FiscalSendTransactionIntegrationTest extends AbstractHttpIntegrationTest {

    private static final Duration BLOCK_OBSERVATION_TIMEOUT = Duration.ofMillis(900);
    private static final Duration POLL_INTERVAL = Duration.ofMillis(10);

    @Autowired
    private DataSource dataSource;

    @RepeatedTest(3)
    @Timeout(value = 15, unit = TimeUnit.SECONDS)
    void independentAttemptInsertWaitsForDocumentForUpdateAndTimesOut() throws Exception {
        Fixture fixture = createFixture();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        CountDownLatch connectionBReady = new CountDownLatch(1);
        CountDownLatch startInsert = new CountDownLatch(1);
        AtomicInteger pidB = new AtomicInteger();
        Connection connectionA = null;
        Future<AttemptInsertOutcome> insertFuture = null;

        try {
            connectionA = dataSource.getConnection();
            connectionA.setAutoCommit(false);
            assertAttemptDocumentForeignKey(connectionA);
            int pidA = backendPid(connectionA);
            lockDocumentForUpdate(connectionA, fixture.documentId());

            insertFuture = executor.submit(() -> attemptInsert(
                    fixture.documentId(),
                    pidB,
                    connectionBReady,
                    startInsert
            ));

            assertTrue(connectionBReady.await(2, TimeUnit.SECONDS), "Connection B did not become ready");
            assertTrue(pidB.get() > 0, "Connection B PID was not captured");
            startInsert.countDown();

            LockObservation observation;
            try (Connection observer = dataSource.getConnection()) {
                observation = awaitBlockingRelationship(observer, pidA, pidB.get());
            }

            AttemptInsertOutcome outcome = insertFuture.get(3, TimeUnit.SECONDS);

            assertTrue(observation.blockedByA(), "PostgreSQL did not report connection A as blocker");
            assertFalse(outcome.insertSucceeded(), "Attempt INSERT unexpectedly succeeded");
            assertEquals("55P03", outcome.sqlState());
            assertTrue(outcome.elapsedMillis() >= 700, "Lock timeout completed too early");
            assertTrue(outcome.elapsedMillis() < 3_000, "Lock timeout exceeded the bounded test window");
            assertEquals(0, attemptCount(fixture.documentId()));

            System.out.printf(
                    Locale.ROOT,
                    "4D-1A lock evidence: blockerPid=%d blockedPid=%d waitEventType=%s waitEvent=%s exception=%s sqlState=%s elapsedMs=%d attemptCount=0%n",
                    pidA,
                    pidB.get(),
                    observation.waitEventType(),
                    observation.waitEvent(),
                    outcome.exceptionClass(),
                    outcome.sqlState(),
                    outcome.elapsedMillis()
            );
        } finally {
            startInsert.countDown();
            if (insertFuture != null && !insertFuture.isDone()) {
                insertFuture.cancel(true);
            }
            try {
                if (connectionA != null) {
                    rollbackAndClose(connectionA);
                }
            } finally {
                executor.shutdownNow();
                try {
                    assertTrue(executor.awaitTermination(3, TimeUnit.SECONDS), "Executor did not terminate");
                } finally {
                    cleanupFixture(fixture);
                }
            }
        }
    }

    private AttemptInsertOutcome attemptInsert(
            long documentId,
            AtomicInteger pid,
            CountDownLatch ready,
            CountDownLatch start
    ) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            pid.set(backendPid(connection));
            execute(connection, "SET LOCAL lock_timeout = '1000ms'");
            ready.countDown();

            if (!start.await(2, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Attempt INSERT was not released");
            }

            long startedAt = System.nanoTime();
            try (PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO electronic_document_attempts (
                        electronic_document_id,
                        operation,
                        attempt_number,
                        result,
                        recoverable,
                        started_at,
                        actor,
                        simulated
                    ) VALUES (?, 'SEND', 1, 'STARTED', FALSE, NOW(), '4d-1a-test', TRUE)
                    """)) {
                statement.setLong(1, documentId);
                statement.executeUpdate();
                connection.rollback();
                return new AttemptInsertOutcome(
                        true,
                        null,
                        null,
                        elapsedMillis(startedAt)
                );
            } catch (SQLException ex) {
                connection.rollback();
                return new AttemptInsertOutcome(
                        false,
                        ex.getClass().getName(),
                        ex.getSQLState(),
                        elapsedMillis(startedAt)
                );
            }
        } finally {
            ready.countDown();
        }
    }

    private LockObservation awaitBlockingRelationship(Connection observer, int pidA, int pidB) throws SQLException {
        long deadline = System.nanoTime() + BLOCK_OBSERVATION_TIMEOUT.toNanos();
        LockObservation latest = new LockObservation(false, null, null);
        while (System.nanoTime() < deadline) {
            latest = observeLock(observer, pidA, pidB);
            if (latest.blockedByA()) {
                return latest;
            }
            LockSupport.parkNanos(POLL_INTERVAL.toNanos());
        }
        return latest;
    }

    private LockObservation observeLock(Connection connection, int pidA, int pidB) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT ? = ANY(pg_blocking_pids(?)) AS blocked_by_a,
                       wait_event_type,
                       wait_event
                FROM pg_stat_activity
                WHERE pid = ?
                """)) {
            statement.setInt(1, pidA);
            statement.setInt(2, pidB);
            statement.setInt(3, pidB);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return new LockObservation(false, null, null);
                }
                return new LockObservation(
                        resultSet.getBoolean("blocked_by_a"),
                        resultSet.getString("wait_event_type"),
                        resultSet.getString("wait_event")
                );
            }
        }
    }

    private Fixture createFixture() throws SQLException {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID userId = queryUuid(connection, "SELECT id FROM users ORDER BY created_at, id LIMIT 1");
                long warehouseId = queryLong(connection, "SELECT id FROM warehouses ORDER BY id LIMIT 1");

                long cashSessionId = returningLong(connection, """
                        INSERT INTO cash_register_sessions (
                            opened_by_user_id,
                            opened_at,
                            closed_at,
                            opening_amount,
                            counted_amount,
                            expected_cash_amount,
                            difference_amount,
                            status,
                            notes
                        ) VALUES (?, NOW(), NOW(), 0, 0, 0, 0, 'CLOSED', '4D-1A synthetic fixture')
                        RETURNING id
                        """, statement -> statement.setObject(1, userId));

                long saleId = returningLong(connection, """
                        INSERT INTO sales (
                            cash_register_session_id,
                            warehouse_id,
                            sale_number,
                            status,
                            subtotal_amount,
                            discount_amount,
                            total_amount,
                            paid_amount,
                            change_amount,
                            sold_at,
                            created_by
                        ) VALUES (?, ?, ?, 'COMPLETED', 1, 0, 1, 1, 0, NOW(), '4d-1a-test')
                        RETURNING id
                        """, statement -> {
                    statement.setLong(1, cashSessionId);
                    statement.setLong(2, warehouseId);
                    statement.setString(3, "LOCK-" + suffix);
                });

                String series = "L" + suffix;
                long seriesId = returningLong(connection, """
                        INSERT INTO billing_series (
                            document_type,
                            series,
                            current_number,
                            environment,
                            active,
                            created_by,
                            updated_by
                        ) VALUES ('INVOICE', ?, 2, 'LOCAL', TRUE, '4d-1a-test', '4d-1a-test')
                        RETURNING id
                        """, statement -> statement.setString(1, series));

                long documentId = returningLong(connection, """
                        INSERT INTO electronic_documents (
                            sale_id,
                            billing_series_id,
                            document_type,
                            status,
                            environment,
                            series,
                            number,
                            full_number,
                            customer_name,
                            customer_document,
                            currency_code,
                            subtotal_amount,
                            tax_amount,
                            total_amount,
                            created_by,
                            updated_by
                        ) VALUES (?, ?, 'INVOICE', 'SIGNED', 'LOCAL', ?, 1, ?, 'Synthetic 4D-1A', '00000000000', 'PEN', 1, 0, 1, '4d-1a-test', '4d-1a-test')
                        RETURNING id
                        """, statement -> {
                    statement.setLong(1, saleId);
                    statement.setLong(2, seriesId);
                    statement.setString(3, series);
                    statement.setString(4, series + "-00000001");
                });

                connection.commit();
                return new Fixture(documentId, seriesId, saleId, cashSessionId);
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    private void cleanupFixture(Fixture fixture) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                delete(connection, "DELETE FROM electronic_document_attempts WHERE electronic_document_id = ?", fixture.documentId());
                delete(connection, "DELETE FROM electronic_documents WHERE id = ?", fixture.documentId());
                delete(connection, "DELETE FROM billing_series WHERE id = ?", fixture.seriesId());
                delete(connection, "DELETE FROM sales WHERE id = ?", fixture.saleId());
                delete(connection, "DELETE FROM cash_register_sessions WHERE id = ?", fixture.cashSessionId());
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    private int backendPid(Connection connection) throws SQLException {
        return Math.toIntExact(queryLong(connection, "SELECT pg_backend_pid()"));
    }

    private long queryLong(Connection connection, String sql) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            assertTrue(resultSet.next(), () -> "Query returned no rows: " + sql);
            return resultSet.getLong(1);
        }
    }

    private UUID queryUuid(Connection connection, String sql) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            assertTrue(resultSet.next(), () -> "Query returned no rows: " + sql);
            return resultSet.getObject(1, UUID.class);
        }
    }

    private long returningLong(Connection connection, String sql, StatementBinder binder) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.bind(statement);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next(), "INSERT did not return an id");
                return resultSet.getLong(1);
            }
        }
    }

    private void lockDocumentForUpdate(Connection connection, long documentId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT id FROM electronic_documents WHERE id = ? FOR UPDATE"
        )) {
            statement.setLong(1, documentId);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next(), "Synthetic document was not found");
            }
        }
    }

    private void assertAttemptDocumentForeignKey(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT COUNT(*)
                FROM pg_constraint constraint_metadata
                JOIN pg_class child_table ON child_table.oid = constraint_metadata.conrelid
                JOIN pg_namespace child_namespace ON child_namespace.oid = child_table.relnamespace
                JOIN LATERAL unnest(constraint_metadata.conkey) WITH ORDINALITY
                    AS child_key(attribute_number, position) ON TRUE
                JOIN pg_attribute child_column
                    ON child_column.attrelid = child_table.oid
                   AND child_column.attnum = child_key.attribute_number
                JOIN pg_class parent_table ON parent_table.oid = constraint_metadata.confrelid
                JOIN pg_namespace parent_namespace ON parent_namespace.oid = parent_table.relnamespace
                JOIN LATERAL unnest(constraint_metadata.confkey) WITH ORDINALITY
                    AS parent_key(attribute_number, position) ON parent_key.position = child_key.position
                JOIN pg_attribute parent_column
                    ON parent_column.attrelid = parent_table.oid
                   AND parent_column.attnum = parent_key.attribute_number
                WHERE constraint_metadata.contype = 'f'
                  AND child_namespace.nspname = current_schema()
                  AND child_table.relname = 'electronic_document_attempts'
                  AND child_column.attname = 'electronic_document_id'
                  AND parent_namespace.nspname = current_schema()
                  AND parent_table.relname = 'electronic_documents'
                  AND parent_column.attname = 'id'
                """)) {
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                assertTrue(
                        resultSet.getLong(1) > 0,
                        "Expected a foreign key from electronic_document_attempts.electronic_document_id to electronic_documents.id"
                );
            }
        }
    }

    private int attemptCount(long documentId) throws SQLException {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM electronic_document_attempts WHERE electronic_document_id = ?"
             )) {
            statement.setLong(1, documentId);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                return resultSet.getInt(1);
            }
        }
    }

    private void execute(Connection connection, String sql) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.execute();
        }
    }

    private void delete(Connection connection, String sql, long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            statement.executeUpdate();
        }
    }

    private void rollbackAndClose(Connection connection) throws SQLException {
        try {
            connection.rollback();
        } finally {
            connection.close();
        }
    }

    private long elapsedMillis(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    @FunctionalInterface
    private interface StatementBinder {
        void bind(PreparedStatement statement) throws SQLException;
    }

    private record Fixture(long documentId, long seriesId, long saleId, long cashSessionId) {
    }

    private record LockObservation(boolean blockedByA, String waitEventType, String waitEvent) {
    }

    private record AttemptInsertOutcome(
            boolean insertSucceeded,
            String exceptionClass,
            String sqlState,
            long elapsedMillis
    ) {
    }
}
