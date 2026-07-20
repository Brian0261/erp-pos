package com.erppos.backend.integration;

import com.erppos.backend.erp.billing.application.usecase.BillingSeriesUseCase;
import com.erppos.backend.erp.billing.application.usecase.CreateElectronicDocumentFromSaleCommand;
import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.application.usecase.UpdateBillingSeriesCommand;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FiscalSeriesConcurrencyIntegrationTest extends AbstractHttpIntegrationTest {

    private static final Duration WAIT = Duration.ofSeconds(8);
    private static final Duration POLL_INTERVAL = Duration.ofMillis(10);
    private static final AtomicInteger SERIES_SEQUENCE = new AtomicInteger(700);

    @Autowired
    private DataSource dataSource;

    @Autowired
    private BillingSeriesUseCase seriesUseCase;

    @Autowired
    private ElectronicDocumentUseCase documentUseCase;

    private final List<Fixture> fixtures = new ArrayList<>();

    @AfterEach
    void cleanupFixtures() throws SQLException {
        for (int index = fixtures.size() - 1; index >= 0; index--) {
            cleanupFixture(fixtures.get(index));
        }
        fixtures.clear();
    }

    @Test
    @Timeout(30)
    void emissionCommitCannotBeOverwrittenByStaleAdministrativeUpdate() throws Exception {
        Fixture fixture = createFixture(true, 1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Connection emission = dataSource.getConnection();
        Future<BillingSeries> update = null;
        boolean committed = false;
        try {
            emission.setAutoCommit(false);
            int blockerPid = backendPid(emission);
            long issuedNumber = prepareSyntheticEmission(emission, fixture, fixture.saleIds().get(0));

            update = executor.submit(() -> seriesUseCase.update(
                    fixture.seriesId(),
                    updateCommand(fixture, fixture.initialCurrentNumber(), true)
            ));

            awaitBlockedSessions(blockerPid, 1);
            assertFalse(update.isDone(), "Administrative update did not wait for the series lock");

            emission.commit();
            committed = true;

            Future<BillingSeries> completedUpdate = update;
            ExecutionException conflict = assertThrows(
                    ExecutionException.class,
                    () -> completedUpdate.get(WAIT.toMillis(), TimeUnit.MILLISECONDS)
            );
            assertInstanceOf(BillingConflictException.class, conflict.getCause());
            assertEquals(fixture.initialCurrentNumber() + 1, currentNumber(fixture.seriesId()));
            assertEquals(issuedNumber, maxIssuedNumber(fixture.seriesId()));
            assertSeriesInvariant(fixture);
            assertNoDuplicateOrReusedNumbers(fixture);
        } finally {
            if (!committed) {
                rollbackQuietly(emission);
            }
            emission.close();
            cancel(update);
            shutdown(executor);
        }
    }

    @Test
    @Timeout(30)
    void deactivationWaitsForEmissionAndPreservesConfirmedIncrement() throws Exception {
        Fixture fixture = createFixture(true, 1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Connection emission = dataSource.getConnection();
        Future<?> deactivate = null;
        boolean committed = false;
        try {
            emission.setAutoCommit(false);
            int blockerPid = backendPid(emission);
            prepareSyntheticEmission(emission, fixture, fixture.saleIds().get(0));

            deactivate = executor.submit(() -> seriesUseCase.deactivate(fixture.seriesId()));

            awaitBlockedSessions(blockerPid, 1);
            assertFalse(deactivate.isDone(), "Deactivation did not wait for the series lock");

            emission.commit();
            committed = true;
            deactivate.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);

            BillingSeries result = seriesUseCase.getById(fixture.seriesId());
            assertFalse(result.active());
            assertEquals(fixture.initialCurrentNumber() + 1, result.currentNumber());
            assertEquals(1, documentCount(fixture.seriesId()));
            assertSeriesInvariant(fixture);
            assertNoDuplicateOrReusedNumbers(fixture);
        } finally {
            if (!committed) {
                rollbackQuietly(emission);
            }
            emission.close();
            cancel(deactivate);
            shutdown(executor);
        }
    }

    @Test
    @Timeout(30)
    void inactiveEmissionAndReactivationAreLinearizedWithoutConsumingNumberEarly() throws Exception {
        Fixture fixture = createFixture(false, 2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Connection blocker = dataSource.getConnection();
        Future<ElectronicDocument> emission = null;
        Future<BillingSeries> reactivation = null;
        boolean committed = false;
        try {
            blocker.setAutoCommit(false);
            int blockerPid = backendPid(blocker);
            lockSeries(blocker, fixture.seriesId());

            emission = executor.submit(() -> createDocument(fixture, fixture.saleIds().get(0)));
            awaitBlockedSessions(blockerPid, 1);
            reactivation = executor.submit(() -> seriesUseCase.update(
                    fixture.seriesId(),
                    updateCommand(fixture, fixture.initialCurrentNumber(), true)
            ));
            awaitBlockedSessions(blockerPid, 2);

            blocker.commit();
            committed = true;

            Future<ElectronicDocument> completedEmission = emission;
            ExecutionException inactive = assertThrows(
                    ExecutionException.class,
                    () -> completedEmission.get(WAIT.toMillis(), TimeUnit.MILLISECONDS)
            );
            assertInstanceOf(BillingBusinessRuleException.class, inactive.getCause());
            BillingSeries activated = reactivation.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);
            assertTrue(activated.active());
            assertEquals(fixture.initialCurrentNumber(), activated.currentNumber());
            assertEquals(0, documentCount(fixture.seriesId()));

            ElectronicDocument confirmed = createDocument(fixture, fixture.saleIds().get(1));
            assertEquals(fixture.initialCurrentNumber(), confirmed.number());
            assertEquals(fixture.initialCurrentNumber() + 1, currentNumber(fixture.seriesId()));
            assertSeriesInvariant(fixture);
            assertNoDuplicateOrReusedNumbers(fixture);
        } finally {
            if (!committed) {
                rollbackQuietly(blocker);
            }
            blocker.close();
            cancel(emission);
            cancel(reactivation);
            shutdown(executor);
        }
    }

    @Test
    @Timeout(30)
    void twoConcurrentEmissionsReceiveDistinctSequentialNumbersWithoutDeadlock() throws Exception {
        Fixture fixture = createFixture(true, 2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Connection blocker = dataSource.getConnection();
        Future<ElectronicDocument> first = null;
        Future<ElectronicDocument> second = null;
        boolean committed = false;
        try {
            blocker.setAutoCommit(false);
            int blockerPid = backendPid(blocker);
            lockSeries(blocker, fixture.seriesId());

            first = executor.submit(() -> createDocument(fixture, fixture.saleIds().get(0)));
            second = executor.submit(() -> createDocument(fixture, fixture.saleIds().get(1)));
            awaitBlockedSessions(blockerPid, 2);

            blocker.commit();
            committed = true;

            ElectronicDocument firstDocument = first.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);
            ElectronicDocument secondDocument = second.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);
            Set<Long> numbers = Set.of(firstDocument.number(), secondDocument.number());

            assertEquals(
                    Set.of(fixture.initialCurrentNumber(), fixture.initialCurrentNumber() + 1),
                    numbers
            );
            assertEquals(fixture.initialCurrentNumber() + 2, currentNumber(fixture.seriesId()));
            assertEquals(2, documentCount(fixture.seriesId()));
            assertSeriesInvariant(fixture);
            assertNoDuplicateOrReusedNumbers(fixture);
        } finally {
            if (!committed) {
                rollbackQuietly(blocker);
            }
            blocker.close();
            cancel(first);
            cancel(second);
            shutdown(executor);
        }
    }

    @Test
    @Timeout(30)
    void updateAndDeactivateSerializeToAValidAdministrativeOrder() throws Exception {
        Fixture fixture = createFixture(true, 0);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Connection blocker = dataSource.getConnection();
        Future<BillingSeries> update = null;
        Future<?> deactivate = null;
        boolean committed = false;
        long proposedCurrentNumber = fixture.initialCurrentNumber() + 5;
        try {
            blocker.setAutoCommit(false);
            int blockerPid = backendPid(blocker);
            lockSeries(blocker, fixture.seriesId());

            update = executor.submit(() -> seriesUseCase.update(
                    fixture.seriesId(),
                    updateCommand(fixture, proposedCurrentNumber, true)
            ));
            awaitBlockedSessions(blockerPid, 1);
            deactivate = executor.submit(() -> seriesUseCase.deactivate(fixture.seriesId()));
            awaitBlockedSessions(blockerPid, 2);

            blocker.commit();
            committed = true;

            update.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);
            deactivate.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);

            BillingSeries result = seriesUseCase.getById(fixture.seriesId());
            assertFalse(result.active());
            assertEquals(proposedCurrentNumber, result.currentNumber());
            assertEquals(fixture.series(), result.series());
            assertEquals(BillingEnvironment.BETA, result.environment());
            assertEquals(ElectronicDocumentType.RECEIPT, result.documentType());
            assertSeriesInvariant(fixture);
        } finally {
            if (!committed) {
                rollbackQuietly(blocker);
            }
            blocker.close();
            cancel(update);
            cancel(deactivate);
            shutdown(executor);
        }
    }

    @Test
    @Timeout(30)
    void rollbackBeforeEmissionWritesReleasesLockWithoutChangingCounter() throws Exception {
        Fixture fixture = createFixture(true, 0);
        Connection transaction = dataSource.getConnection();
        try {
            transaction.setAutoCommit(false);
            lockSeries(transaction, fixture.seriesId());
            transaction.rollback();

            assertEquals(fixture.initialCurrentNumber(), currentNumber(fixture.seriesId()));
            assertEquals(0, documentCount(fixture.seriesId()));

            BillingSeries updated = seriesUseCase.update(
                    fixture.seriesId(),
                    updateCommand(fixture, fixture.initialCurrentNumber() + 2, true)
            );
            assertEquals(fixture.initialCurrentNumber() + 2, updated.currentNumber());
            assertSeriesLockAvailable(fixture.seriesId());
        } finally {
            rollbackQuietly(transaction);
            transaction.close();
        }
    }

    @Test
    @Timeout(30)
    void rollbackAfterFlushedIncrementAndDocumentLeavesNoPartialState() throws Exception {
        Fixture fixture = createFixture(true, 2);
        Connection transaction = dataSource.getConnection();
        try {
            transaction.setAutoCommit(false);
            prepareSyntheticEmission(transaction, fixture, fixture.saleIds().get(0));
            assertEquals(1, documentCount(transaction, fixture.seriesId()));
            transaction.rollback();

            assertEquals(fixture.initialCurrentNumber(), currentNumber(fixture.seriesId()));
            assertEquals(0, documentCount(fixture.seriesId()));
            assertSeriesLockAvailable(fixture.seriesId());

            ElectronicDocument committed = createDocument(fixture, fixture.saleIds().get(1));
            assertEquals(fixture.initialCurrentNumber(), committed.number());
            assertEquals(fixture.initialCurrentNumber() + 1, currentNumber(fixture.seriesId()));
            assertSeriesInvariant(fixture);
            assertNoDuplicateOrReusedNumbers(fixture);
        } finally {
            rollbackQuietly(transaction);
            transaction.close();
        }
    }

    @Test
    @Timeout(30)
    void confirmedIncrementSurvivesDeactivateAndStaleReactivation() throws Exception {
        Fixture fixture = createFixture(true, 1);
        ElectronicDocument document = createDocument(fixture, fixture.saleIds().get(0));
        assertEquals(fixture.initialCurrentNumber(), document.number());

        seriesUseCase.deactivate(fixture.seriesId());
        assertEquals(fixture.initialCurrentNumber() + 1, currentNumber(fixture.seriesId()));

        BillingConflictException staleReactivation = assertThrows(
                BillingConflictException.class,
                () -> seriesUseCase.update(
                        fixture.seriesId(),
                        updateCommand(fixture, fixture.initialCurrentNumber(), true)
                )
        );
        assertEquals(
                "El proximo correlativo debe ser mayor al ultimo comprobante emitido para esta serie.",
                staleReactivation.getMessage()
        );
        BillingSeries stillInactive = seriesUseCase.getById(fixture.seriesId());
        assertFalse(stillInactive.active());
        assertEquals(fixture.initialCurrentNumber() + 1, stillInactive.currentNumber());

        BillingSeries reactivated = seriesUseCase.update(
                fixture.seriesId(),
                updateCommand(fixture, fixture.initialCurrentNumber() + 1, true)
        );
        assertTrue(reactivated.active());
        assertEquals(fixture.initialCurrentNumber() + 1, reactivated.currentNumber());
        assertSeriesInvariant(fixture);
        assertNoDuplicateOrReusedNumbers(fixture);
    }

    private Fixture createFixture(boolean active, int saleCount) throws SQLException {
        String series = nextSeries();
        long initialCurrentNumber = 40L;
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID userId = queryUuid(connection, "SELECT id FROM users ORDER BY id LIMIT 1");
                long warehouseId = queryLong(connection, "SELECT id FROM warehouses ORDER BY id LIMIT 1");
                long profileId = returningLong(connection, """
                        INSERT INTO company_billing_profile (
                            ruc, legal_name, fiscal_address, environment, active, created_by, updated_by
                        ) VALUES (?, 'InkToy synthetic 4D-2A', 'Synthetic address', 'BETA', TRUE,
                                  '4d-2a-test', '4d-2a-test')
                        RETURNING id
                        """, statement -> statement.setString(1, syntheticRuc(series)));
                long seriesId = returningLong(connection, """
                        INSERT INTO billing_series (
                            document_type, series, current_number, environment, active,
                            created_by, updated_by
                        ) VALUES ('RECEIPT', ?, ?, 'BETA', ?, '4d-2a-test', '4d-2a-test')
                        RETURNING id
                        """, statement -> {
                    statement.setString(1, series);
                    statement.setLong(2, initialCurrentNumber);
                    statement.setBoolean(3, active);
                });
                long cashSessionId = returningLong(connection, """
                        INSERT INTO cash_register_sessions (
                            opened_by_user_id, opened_at, closed_at, opening_amount,
                            counted_amount, expected_cash_amount, difference_amount, status, notes
                        ) VALUES (?, NOW(), NOW(), 0, 0, 0, 0, 'CLOSED', '4D-2A synthetic fixture')
                        RETURNING id
                        """, statement -> statement.setObject(1, userId));
                List<Long> saleIds = new ArrayList<>();
                for (int index = 0; index < saleCount; index++) {
                    int saleIndex = index;
                    saleIds.add(returningLong(connection, """
                            INSERT INTO sales (
                                cash_register_session_id, warehouse_id, sale_number, status,
                                subtotal_amount, discount_amount, total_amount, paid_amount,
                                change_amount, sold_at, created_by
                            ) VALUES (?, ?, ?, 'COMPLETED', 1, 0, 1, 1, 0, NOW(), '4d-2a-test')
                            RETURNING id
                            """, statement -> {
                        statement.setLong(1, cashSessionId);
                        statement.setLong(2, warehouseId);
                        statement.setString(3, "4D2A-" + series + "-" + saleIndex);
                    }));
                }
                connection.commit();
                Fixture fixture = new Fixture(
                        profileId,
                        seriesId,
                        cashSessionId,
                        List.copyOf(saleIds),
                        series,
                        initialCurrentNumber
                );
                fixtures.add(fixture);
                return fixture;
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    private ElectronicDocument createDocument(Fixture fixture, long saleId) {
        return documentUseCase.createFromSale(
                saleId,
                new CreateElectronicDocumentFromSaleCommand(
                        ElectronicDocumentType.RECEIPT,
                        fixture.seriesId(),
                        null,
                        null
                )
        );
    }

    private UpdateBillingSeriesCommand updateCommand(Fixture fixture, long currentNumber, boolean active) {
        return new UpdateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                fixture.series(),
                currentNumber,
                BillingEnvironment.BETA,
                active
        );
    }

    private long prepareSyntheticEmission(Connection connection, Fixture fixture, long saleId) throws SQLException {
        long issuedNumber = lockSeries(connection, fixture.seriesId());
        executeUpdate(
                connection,
                "UPDATE billing_series SET current_number = ?, updated_at = NOW(), updated_by = '4d-2a-test' WHERE id = ?",
                issuedNumber + 1,
                fixture.seriesId()
        );
        executeUpdate(
                connection,
                """
                        INSERT INTO electronic_documents (
                            sale_id, billing_series_id, document_type, status, environment,
                            series, number, full_number, customer_name, currency_code,
                            subtotal_amount, tax_amount, total_amount, created_by, updated_by
                        ) VALUES (?, ?, 'RECEIPT', 'DRAFT', 'BETA', ?, ?, ?,
                                  'CONSUMIDOR FINAL', 'PEN', 1, 0, 1, '4d-2a-test', '4d-2a-test')
                        """,
                saleId,
                fixture.seriesId(),
                fixture.series(),
                issuedNumber,
                fixture.series() + "-" + String.format(Locale.ROOT, "%08d", issuedNumber)
        );
        return issuedNumber;
    }

    private long lockSeries(Connection connection, long seriesId) throws SQLException {
        return queryLong(
                connection,
                "SELECT current_number FROM billing_series WHERE id = ? FOR UPDATE",
                seriesId
        );
    }

    private void awaitBlockedSessions(int blockerPid, int expectedCount) throws SQLException {
        long deadline = System.nanoTime() + WAIT.toNanos();
        int latest = 0;
        while (System.nanoTime() < deadline) {
            try (Connection observer = dataSource.getConnection()) {
                latest = Math.toIntExact(queryLong(
                        observer,
                        """
                                WITH RECURSIVE blocked(pid) AS (
                                    SELECT activity.pid
                                    FROM pg_stat_activity activity
                                    WHERE ? = ANY(pg_blocking_pids(activity.pid))
                                      AND activity.wait_event_type = 'Lock'
                                    UNION
                                    SELECT activity.pid
                                    FROM pg_stat_activity activity
                                    JOIN blocked predecessor
                                      ON predecessor.pid = ANY(pg_blocking_pids(activity.pid))
                                    WHERE activity.wait_event_type = 'Lock'
                                )
                                SELECT COUNT(*) FROM blocked
                                """,
                        blockerPid
                ));
            }
            if (latest >= expectedCount) {
                return;
            }
            LockSupport.parkNanos(POLL_INTERVAL.toNanos());
        }
        assertTrue(
                latest >= expectedCount,
                "Expected " + expectedCount + " blocked sessions behind PID " + blockerPid + " but observed " + latest
        );
    }

    private int backendPid(Connection connection) throws SQLException {
        return Math.toIntExact(queryLong(connection, "SELECT pg_backend_pid()"));
    }

    private long currentNumber(long seriesId) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            return queryLong(connection, "SELECT current_number FROM billing_series WHERE id = ?", seriesId);
        }
    }

    private long maxIssuedNumber(long seriesId) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            return queryLong(
                    connection,
                    "SELECT COALESCE(MAX(number), 0) FROM electronic_documents WHERE billing_series_id = ?",
                    seriesId
            );
        }
    }

    private long documentCount(long seriesId) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            return documentCount(connection, seriesId);
        }
    }

    private long documentCount(Connection connection, long seriesId) throws SQLException {
        return queryLong(
                connection,
                "SELECT COUNT(*) FROM electronic_documents WHERE billing_series_id = ?",
                seriesId
        );
    }

    private void assertSeriesInvariant(Fixture fixture) throws SQLException {
        assertTrue(
                currentNumber(fixture.seriesId()) > maxIssuedNumber(fixture.seriesId()),
                "The next series number must remain greater than every confirmed document number"
        );
    }

    private void assertNoDuplicateOrReusedNumbers(Fixture fixture) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            long documents = queryLong(
                    connection,
                    "SELECT COUNT(*) FROM electronic_documents WHERE billing_series_id = ?",
                    fixture.seriesId()
            );
            long distinctNumbers = queryLong(
                    connection,
                    "SELECT COUNT(DISTINCT number) FROM electronic_documents WHERE billing_series_id = ?",
                    fixture.seriesId()
            );
            assertEquals(documents, distinctNumbers);

            Set<Long> observed = new HashSet<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT number FROM electronic_documents WHERE billing_series_id = ? ORDER BY number"
            )) {
                statement.setLong(1, fixture.seriesId());
                try (ResultSet resultSet = statement.executeQuery()) {
                    while (resultSet.next()) {
                        assertTrue(observed.add(resultSet.getLong(1)), "A confirmed number was reused");
                    }
                }
            }
        }
    }

    private void assertSeriesLockAvailable(long seriesId) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT id FROM billing_series WHERE id = ? FOR UPDATE NOWAIT"
            )) {
                statement.setLong(1, seriesId);
                assertTrue(statement.executeQuery().next());
            } finally {
                connection.rollback();
            }
        }
    }

    private void cleanupFixture(Fixture fixture) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                executeUpdate(
                        connection,
                        "DELETE FROM electronic_document_evidence WHERE electronic_document_id IN "
                                + "(SELECT id FROM electronic_documents WHERE billing_series_id = ?)",
                        fixture.seriesId()
                );
                executeUpdate(
                        connection,
                        "DELETE FROM electronic_document_status_history WHERE electronic_document_id IN "
                                + "(SELECT id FROM electronic_documents WHERE billing_series_id = ?)",
                        fixture.seriesId()
                );
                executeUpdate(
                        connection,
                        "DELETE FROM electronic_document_attempts WHERE electronic_document_id IN "
                                + "(SELECT id FROM electronic_documents WHERE billing_series_id = ?)",
                        fixture.seriesId()
                );
                executeUpdate(
                        connection,
                        "DELETE FROM billing_xml_files WHERE electronic_document_id IN "
                                + "(SELECT id FROM electronic_documents WHERE billing_series_id = ?)",
                        fixture.seriesId()
                );
                executeUpdate(
                        connection,
                        "DELETE FROM electronic_document_items WHERE electronic_document_id IN "
                                + "(SELECT id FROM electronic_documents WHERE billing_series_id = ?)",
                        fixture.seriesId()
                );
                executeUpdate(
                        connection,
                        "DELETE FROM electronic_documents WHERE billing_series_id = ?",
                        fixture.seriesId()
                );
                for (Long saleId : fixture.saleIds()) {
                    executeUpdate(connection, "DELETE FROM sale_payments WHERE sale_id = ?", saleId);
                    executeUpdate(connection, "DELETE FROM sale_items WHERE sale_id = ?", saleId);
                    executeUpdate(connection, "DELETE FROM sales WHERE id = ?", saleId);
                }
                executeUpdate(connection, "DELETE FROM billing_series WHERE id = ?", fixture.seriesId());
                executeUpdate(connection, "DELETE FROM cash_register_sessions WHERE id = ?", fixture.cashSessionId());
                executeUpdate(connection, "DELETE FROM company_billing_profile WHERE id = ?", fixture.profileId());
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    private String nextSeries() {
        int value = SERIES_SEQUENCE.getAndUpdate(current -> current >= 999 ? 700 : current + 1);
        return String.format(Locale.ROOT, "B%03d", value);
    }

    private String syntheticRuc(String series) {
        String digits = series.substring(1);
        return "20999999" + digits;
    }

    private long returningLong(Connection connection, String sql, StatementBinder binder) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.accept(statement);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                return resultSet.getLong(1);
            }
        }
    }

    private long queryLong(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                return resultSet.getLong(1);
            }
        }
    }

    private UUID queryUuid(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                return resultSet.getObject(1, UUID.class);
            }
        }
    }

    private void executeUpdate(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            statement.executeUpdate();
        }
    }

    private void bind(PreparedStatement statement, Object... values) throws SQLException {
        for (int index = 0; index < values.length; index++) {
            statement.setObject(index + 1, values[index]);
        }
    }

    private void cancel(Future<?> future) {
        if (future != null && !future.isDone()) {
            future.cancel(true);
        }
    }

    private void shutdown(ExecutorService executor) throws InterruptedException {
        executor.shutdownNow();
        assertTrue(executor.awaitTermination(WAIT.toMillis(), TimeUnit.MILLISECONDS));
    }

    private void rollbackQuietly(Connection connection) {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.rollback();
            }
        } catch (SQLException ignored) {
            // Best-effort cleanup after the test has already captured the primary failure.
        }
    }

    private record Fixture(
            long profileId,
            long seriesId,
            long cashSessionId,
            List<Long> saleIds,
            String series,
            long initialCurrentNumber
    ) {
    }

    @FunctionalInterface
    private interface StatementBinder {
        void accept(PreparedStatement statement) throws SQLException;
    }
}
