package com.erppos.backend.integration;

import com.erppos.backend.erp.billing.application.service.FiscalProviderResultClassification;
import com.erppos.backend.erp.billing.application.service.FiscalProviderResultClassifier;
import com.erppos.backend.erp.billing.application.service.FiscalSendTransactionService;
import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentAttemptRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentEvidenceRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentStatusHistoryRepositoryPort;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

@TestPropertySource(properties = {
        "spring.datasource.hikari.maximum-pool-size=2",
        "spring.datasource.hikari.minimum-idle=0",
        "spring.datasource.hikari.connection-timeout=3000"
})
class FiscalSendTransactionBoundaryIntegrationTest extends AbstractHttpIntegrationTest {

    private static final Duration WAIT = Duration.ofSeconds(8);

    @Autowired
    private ElectronicDocumentUseCase documentUseCase;

    @Autowired
    private FiscalSendTransactionService transactionService;

    @Autowired
    private FiscalProviderResultClassifier resultClassifier;

    @Autowired
    private ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private ElectronicBillingProviderPort providerPort;

    @MockitoSpyBean
    private ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort;

    @MockitoSpyBean
    private ElectronicDocumentStatusHistoryRepositoryPort historyRepositoryPort;

    private Fixture fixture;
    private Fixture secondFixture;

    @BeforeEach
    void resetFiscalTestDoubles() {
        reset(providerPort, evidenceRepositoryPort, historyRepositoryPort);
        when(providerPort.supportsProduction()).thenReturn(false);
    }

    @AfterEach
    void cleanupFiscalFixtures() throws SQLException {
        if (secondFixture != null) {
            cleanupFixture(secondFixture);
            secondFixture = null;
        }
        if (fixture != null) {
            cleanupFixture(fixture);
            fixture = null;
        }
    }

    @Test
    @Timeout(30)
    void providerRunsOutsideTransactionAfterDurablePreparationAndWithoutDocumentLock() throws Exception {
        fixture = createFixture();
        BlockingProvider provider = blockingProvider(ProviderSendResult.accepted("TX-ACCEPTED", "Accepted"), 1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<ElectronicDocument> sendFuture = executor.submit(() -> documentUseCase.send(fixture.documentId()));
        try {
            assertTrue(provider.entered().await(WAIT.toMillis(), TimeUnit.MILLISECONDS));
            assertFalse(provider.transactionActive().get());
            assertEquals("SENT", queryString(
                    "SELECT status FROM electronic_documents WHERE id = ?",
                    fixture.documentId()
            ));
            assertEquals(1, queryLong(
                    "SELECT COUNT(*) FROM electronic_document_attempts "
                            + "WHERE electronic_document_id = ? AND result = 'STARTED'",
                    fixture.documentId()
            ));
            assertDocumentLockIsAvailable(fixture.documentId());

            provider.release().countDown();
            ElectronicDocument result = sendFuture.get(WAIT.toMillis(), TimeUnit.MILLISECONDS);

            assertEquals(ElectronicDocumentStatus.ACCEPTED, result.status());
            assertEquals("SUCCESS", queryString(
                    "SELECT result FROM electronic_document_attempts "
                            + "WHERE electronic_document_id = ? ORDER BY attempt_number DESC LIMIT 1",
                    fixture.documentId()
            ));
            assertEquals(1, provider.calls().get());
        } finally {
            provider.release().countDown();
            shutdown(executor);
        }
    }

    @Test
    @Timeout(30)
    void concurrentSendOnSameDocumentProducesOneProviderCallAndOneInFlightAttempt() throws Exception {
        fixture = createFixture();
        BlockingProvider provider = blockingProvider(ProviderSendResult.accepted("TX-ONE", "Accepted"), 1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Future<ElectronicDocument> first = executor.submit(() -> documentUseCase.send(fixture.documentId()));
        try {
            assertTrue(provider.entered().await(WAIT.toMillis(), TimeUnit.MILLISECONDS));
            Future<ElectronicDocument> second = executor.submit(() -> documentUseCase.send(fixture.documentId()));
            ExecutionException conflict = assertThrows(
                    ExecutionException.class,
                    () -> second.get(WAIT.toMillis(), TimeUnit.MILLISECONDS)
            );
            assertTrue(conflict.getCause() instanceof BillingConflictException);
            assertEquals(1, provider.calls().get());
            assertEquals(1, queryLong(
                    "SELECT COUNT(*) FROM electronic_document_attempts "
                            + "WHERE electronic_document_id = ? AND result IN ('STARTED','PENDING')",
                    fixture.documentId()
            ));
            assertEquals(1, queryLong(
                    "SELECT COUNT(*) FROM electronic_document_attempts "
                            + "WHERE electronic_document_id = ? AND result = 'BLOCKED'",
                    fixture.documentId()
            ));

            provider.release().countDown();
            assertEquals(ElectronicDocumentStatus.ACCEPTED, first.get(WAIT.toMillis(), TimeUnit.MILLISECONDS).status());
            assertEquals(1, provider.calls().get());
            assertEquals(0, queryLong(
                    "SELECT COUNT(*) FROM electronic_document_attempts "
                            + "WHERE electronic_document_id = ? AND result IN ('STARTED','PENDING')",
                    fixture.documentId()
            ));
        } finally {
            provider.release().countDown();
            shutdown(executor);
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("definitiveAndPendingResults")
    @Timeout(30)
    void finalizesDocumentAttemptHistoryAndEvidenceAtomically(
            String name,
            ProviderSendResult providerResult,
            ElectronicDocumentStatus documentStatus,
            FiscalAttemptResult attemptResult,
            FiscalErrorCategory errorCategory
    ) throws Exception {
        fixture = createFixture();
        when(providerPort.send(any(), any())).thenReturn(providerResult);

        ElectronicDocument result = documentUseCase.send(fixture.documentId());
        List<ElectronicDocumentAttempt> attempts =
                attemptRepositoryPort.findByElectronicDocumentId(fixture.documentId());
        ElectronicDocumentAttempt attempt = attempts.get(0);

        assertEquals(documentStatus, result.status(), name);
        assertEquals(attemptResult, attempt.result(), name);
        assertEquals(errorCategory, attempt.errorCategory(), name);
        assertEquals(1, queryLong(
                "SELECT COUNT(*) FROM electronic_document_evidence "
                        + "WHERE electronic_document_id = ? AND attempt_id = ? "
                        + "AND evidence_type = 'PROVIDER_RESPONSE_METADATA'",
                fixture.documentId(),
                attempt.id()
        ));
        assertEquals(documentStatus == ElectronicDocumentStatus.SENT ? 1 : 2, queryLong(
                "SELECT COUNT(*) FROM electronic_document_status_history WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
    }

    @Test
    @Timeout(30)
    void repeatedFinalizationIsIdempotentAndContradictoryFinalizationIsRejected() throws Exception {
        fixture = createFixture();
        ProviderSendResult accepted = ProviderSendResult.accepted("TX-IDEMPOTENT", "Accepted");
        when(providerPort.send(any(), any())).thenReturn(accepted);
        ElectronicDocument first = documentUseCase.send(fixture.documentId());
        ElectronicDocumentAttempt attempt =
                attemptRepositoryPort.findByElectronicDocumentId(fixture.documentId()).get(0);
        long historyBefore = queryLong(
                "SELECT COUNT(*) FROM electronic_document_status_history WHERE electronic_document_id = ?",
                fixture.documentId()
        );
        long evidenceBefore = queryLong(
                "SELECT COUNT(*) FROM electronic_document_evidence WHERE electronic_document_id = ?",
                fixture.documentId()
        );

        ElectronicDocument repeated = transactionService.finalizeSend(
                fixture.documentId(),
                attempt.id(),
                attempt.requestHash(),
                accepted,
                resultClassifier.classify(accepted)
        );

        assertEquals(first.status(), repeated.status());
        assertEquals(historyBefore, queryLong(
                "SELECT COUNT(*) FROM electronic_document_status_history WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        assertEquals(evidenceBefore, queryLong(
                "SELECT COUNT(*) FROM electronic_document_evidence WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        assertEquals("SUCCESS", queryString(
                "SELECT result FROM electronic_document_attempts WHERE id = ?",
                attempt.id()
        ));
        assertEquals("ACCEPTED", queryString(
                "SELECT provider_status FROM electronic_document_attempts WHERE id = ?",
                attempt.id()
        ));
        assertEquals("TX-IDEMPOTENT", queryString(
                "SELECT provider_ticket FROM electronic_document_attempts WHERE id = ?",
                attempt.id()
        ));

        ProviderSendResult rejected = ProviderSendResult.rejected("TX-CONTRADICT", "Rejected");
        assertThrows(BillingConflictException.class, () -> transactionService.finalizeSend(
                fixture.documentId(),
                attempt.id(),
                attempt.requestHash(),
                rejected,
                resultClassifier.classify(rejected)
        ));
        assertEquals("ACCEPTED", queryString(
                "SELECT status FROM electronic_documents WHERE id = ?",
                fixture.documentId()
        ));
        assertEquals(historyBefore, queryLong(
                "SELECT COUNT(*) FROM electronic_document_status_history WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        assertEquals(evidenceBefore, queryLong(
                "SELECT COUNT(*) FROM electronic_document_evidence WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("ambiguousResults")
    @Timeout(30)
    void ambiguousProviderResultRemainsSentPendingAndRetryIsFailClosed(
            String name,
            ProviderSendResult providerResult,
            FiscalErrorCategory category
    ) throws Exception {
        fixture = createFixture();
        when(providerPort.send(any(), any())).thenReturn(providerResult);

        ElectronicDocument result = documentUseCase.send(fixture.documentId());
        BillingConflictException retryFailure = assertThrows(
                BillingConflictException.class,
                () -> documentUseCase.retrySend(fixture.documentId())
        );

        List<ElectronicDocumentAttempt> attempts =
                attemptRepositoryPort.findByElectronicDocumentId(fixture.documentId());
        assertEquals(ElectronicDocumentStatus.SENT, result.status(), name);
        assertEquals(FiscalAttemptResult.PENDING, attempts.get(0).result(), name);
        assertEquals(category, attempts.get(0).errorCategory(), name);
        assertFalse(attempts.get(0).recoverable(), name);
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result(), name);
        assertTrue(retryFailure.getMessage().contains("reconciliacion remota"));
        Mockito.verify(providerPort, Mockito.times(1)).send(any(), any());
        assertEquals(fixture.seriesCurrentNumber(), queryLong(
                "SELECT current_number FROM billing_series WHERE id = ?",
                fixture.seriesId()
        ));
    }

    @Test
    @Timeout(30)
    void providerExceptionIsPersistedAsPendingBeforeRethrowAndCannotBeRetried() throws Exception {
        fixture = createFixture();
        when(providerPort.send(any(), any())).thenThrow(new RuntimeException("controlled communication failure"));

        RuntimeException failure = assertThrows(
                RuntimeException.class,
                () -> documentUseCase.send(fixture.documentId())
        );
        assertEquals("controlled communication failure", failure.getMessage());
        assertEquals("SENT", queryString(
                "SELECT status FROM electronic_documents WHERE id = ?",
                fixture.documentId()
        ));
        assertEquals("PENDING", queryString(
                "SELECT result FROM electronic_document_attempts "
                        + "WHERE electronic_document_id = ? ORDER BY attempt_number LIMIT 1",
                fixture.documentId()
        ));
        assertEquals("COMMUNICATION_ERROR", queryString(
                "SELECT error_category FROM electronic_document_attempts "
                        + "WHERE electronic_document_id = ? ORDER BY attempt_number LIMIT 1",
                fixture.documentId()
        ));
        assertEquals(0, queryLong(
                "SELECT CASE WHEN recoverable THEN 1 ELSE 0 END FROM electronic_document_attempts "
                        + "WHERE electronic_document_id = ? ORDER BY attempt_number LIMIT 1",
                fixture.documentId()
        ));
        assertThrows(BillingConflictException.class, () -> documentUseCase.retrySend(fixture.documentId()));
        Mockito.verify(providerPort, Mockito.times(1)).send(any(), any());
    }

    @Test
    @Timeout(30)
    void finalizationFailureAfterAcceptedResponseLeavesDurableSentStartedState() throws Exception {
        fixture = createFixture();
        when(providerPort.send(any(), any()))
                .thenReturn(ProviderSendResult.accepted("TX-REMOTE-ACCEPTED", "Accepted"));
        doThrow(new IllegalStateException("controlled finalize failure"))
                .when(evidenceRepositoryPort)
                .save(argThat(evidence -> evidence.evidenceType() == FiscalEvidenceType.PROVIDER_RESPONSE_METADATA));

        IllegalStateException failure = assertThrows(
                IllegalStateException.class,
                () -> documentUseCase.send(fixture.documentId())
        );

        assertEquals("controlled finalize failure", failure.getMessage());
        assertEquals("SENT", queryString(
                "SELECT status FROM electronic_documents WHERE id = ?",
                fixture.documentId()
        ));
        assertEquals("STARTED", queryString(
                "SELECT result FROM electronic_document_attempts "
                        + "WHERE electronic_document_id = ? ORDER BY attempt_number LIMIT 1",
                fixture.documentId()
        ));
        assertEquals(0, queryLong(
                "SELECT COUNT(*) FROM electronic_document_evidence "
                        + "WHERE electronic_document_id = ? AND evidence_type = 'PROVIDER_RESPONSE_METADATA'",
                fixture.documentId()
        ));
        assertEquals(1, queryLong(
                "SELECT COUNT(*) FROM electronic_document_status_history WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        assertThrows(BillingConflictException.class, () -> documentUseCase.retrySend(fixture.documentId()));
        assertEquals(1, queryLong(
                "SELECT COUNT(*) FROM electronic_document_attempts "
                        + "WHERE electronic_document_id = ? AND result = 'BLOCKED'",
                fixture.documentId()
        ));
        assertEquals(fixture.seriesCurrentNumber(), queryLong(
                "SELECT current_number FROM billing_series WHERE id = ?",
                fixture.seriesId()
        ));
        Mockito.verify(providerPort, Mockito.times(1)).send(any(), any());
    }

    @Test
    @Timeout(30)
    void prepareRollbackLeavesSignedDocumentWithoutAttemptOrProviderCall() throws Exception {
        fixture = createFixture();
        doThrow(new IllegalStateException("controlled prepare failure"))
                .when(historyRepositoryPort)
                .save(argThat(history -> history.previousStatus() == ElectronicDocumentStatus.SIGNED
                        && history.newStatus() == ElectronicDocumentStatus.SENT));

        assertThrows(IllegalStateException.class, () -> documentUseCase.send(fixture.documentId()));

        assertEquals("SIGNED", queryString(
                "SELECT status FROM electronic_documents WHERE id = ?",
                fixture.documentId()
        ));
        assertEquals(0, queryLong(
                "SELECT COUNT(*) FROM electronic_document_attempts WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        assertEquals(0, queryLong(
                "SELECT COUNT(*) FROM electronic_document_evidence WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        Mockito.verify(providerPort, Mockito.never()).send(any(), any());
    }

    @Test
    @Timeout(30)
    void ambientTransactionIsRejectedBeforePreparation() throws Exception {
        fixture = createFixture();
        TransactionTemplate template = new TransactionTemplate(transactionManager);

        IllegalStateException failure = assertThrows(IllegalStateException.class, () ->
                template.executeWithoutResult(status -> documentUseCase.send(fixture.documentId()))
        );

        assertTrue(failure.getMessage().contains("inactive transaction"));
        assertEquals("SIGNED", queryString(
                "SELECT status FROM electronic_documents WHERE id = ?",
                fixture.documentId()
        ));
        assertEquals(0, queryLong(
                "SELECT COUNT(*) FROM electronic_document_attempts WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        Mockito.verify(providerPort, Mockito.never()).send(any(), any());
    }

    @Test
    @Timeout(30)
    void ambientTransactionIsRejectedBeforeRetryAudit() throws Exception {
        fixture = createFixture();
        TransactionTemplate template = new TransactionTemplate(transactionManager);

        IllegalStateException failure = assertThrows(IllegalStateException.class, () ->
                template.executeWithoutResult(status -> documentUseCase.retrySend(fixture.documentId()))
        );

        assertTrue(failure.getMessage().contains("inactive transaction"));
        assertEquals("SIGNED", queryString(
                "SELECT status FROM electronic_documents WHERE id = ?",
                fixture.documentId()
        ));
        assertEquals(0, queryLong(
                "SELECT COUNT(*) FROM electronic_document_attempts WHERE electronic_document_id = ?",
                fixture.documentId()
        ));
        Mockito.verify(providerPort, Mockito.never()).send(any(), any());
    }

    @Test
    @Timeout(35)
    void smallPoolSupportsTwoConcurrentProvidersAndIndependentObserverConnection() throws Exception {
        fixture = createFixture();
        secondFixture = createFixture("RECEIPT");
        assertTrue(dataSource instanceof HikariDataSource);
        assertEquals(2, ((HikariDataSource) dataSource).getMaximumPoolSize());
        BlockingProvider provider = blockingProvider(ProviderSendResult.accepted("TX-POOL", "Accepted"), 2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Future<ElectronicDocument> first = executor.submit(() -> documentUseCase.send(fixture.documentId()));
        Future<ElectronicDocument> second = executor.submit(() -> documentUseCase.send(secondFixture.documentId()));
        try {
            assertTrue(provider.entered().await(WAIT.toMillis(), TimeUnit.MILLISECONDS));
            assertFalse(provider.transactionActive().get());
            try (Connection observer = dataSource.getConnection()) {
                assertNotNull(observer);
                assertEquals(2, queryLong(
                        observer,
                        "SELECT COUNT(*) FROM electronic_documents WHERE id IN (?, ?) AND status = 'SENT'",
                        fixture.documentId(),
                        secondFixture.documentId()
                ));
                assertEquals(2, queryLong(
                        observer,
                        "SELECT COUNT(*) FROM electronic_document_attempts "
                                + "WHERE electronic_document_id IN (?, ?) AND result = 'STARTED'",
                        fixture.documentId(),
                        secondFixture.documentId()
                ));
            }

            provider.release().countDown();
            assertEquals(ElectronicDocumentStatus.ACCEPTED, first.get(WAIT.toMillis(), TimeUnit.MILLISECONDS).status());
            assertEquals(ElectronicDocumentStatus.ACCEPTED, second.get(WAIT.toMillis(), TimeUnit.MILLISECONDS).status());
            assertEquals(2, provider.calls().get());
        } finally {
            provider.release().countDown();
            shutdown(executor);
        }
    }

    private static Stream<Arguments> definitiveAndPendingResults() {
        return Stream.of(
                Arguments.of(
                        "accepted",
                        ProviderSendResult.accepted("TX-A", "Accepted"),
                        ElectronicDocumentStatus.ACCEPTED,
                        FiscalAttemptResult.SUCCESS,
                        null
                ),
                Arguments.of(
                        "rejected",
                        ProviderSendResult.rejected("TX-R", "Rejected"),
                        ElectronicDocumentStatus.REJECTED,
                        FiscalAttemptResult.FAILED,
                        FiscalErrorCategory.PROVIDER_REJECTED
                ),
                Arguments.of(
                        "observed",
                        ProviderSendResult.observed("TX-O", "Observed"),
                        ElectronicDocumentStatus.ACCEPTED,
                        FiscalAttemptResult.SUCCESS,
                        FiscalErrorCategory.PROVIDER_OBSERVED
                ),
                Arguments.of(
                        "pending",
                        ProviderSendResult.pending("TX-P", "Pending"),
                        ElectronicDocumentStatus.SENT,
                        FiscalAttemptResult.PENDING,
                        FiscalErrorCategory.PROVIDER_PENDING
                )
        );
    }

    private static Stream<Arguments> ambiguousResults() {
        return Stream.of(
                Arguments.of(
                        "timeout",
                        ProviderSendResult.timeout("TX-TIMEOUT", "Timeout"),
                        FiscalErrorCategory.PROVIDER_TIMEOUT
                ),
                Arguments.of(
                        "unavailable",
                        ProviderSendResult.unavailable("TX-UNAVAILABLE", "Unavailable"),
                        FiscalErrorCategory.PROVIDER_UNAVAILABLE
                ),
                Arguments.of(
                        "communication",
                        ProviderSendResult.communicationError("TX-COMM", "Communication"),
                        FiscalErrorCategory.COMMUNICATION_ERROR
                )
        );
    }

    private BlockingProvider blockingProvider(ProviderSendResult result, int expectedCalls) {
        BlockingProvider control = new BlockingProvider(
                new CountDownLatch(expectedCalls),
                new CountDownLatch(1),
                new AtomicInteger(),
                new AtomicBoolean(false)
        );
        when(providerPort.send(any(), any())).thenAnswer(invocation -> {
            control.calls().incrementAndGet();
            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                control.transactionActive().set(true);
            }
            control.entered().countDown();
            if (!control.release().await(WAIT.toMillis(), TimeUnit.MILLISECONDS)) {
                throw new IllegalStateException("Provider release latch timed out");
            }
            return result;
        });
        return control;
    }

    private Fixture createFixture() throws SQLException {
        return createFixture("INVOICE");
    }

    private Fixture createFixture(String documentType) throws SQLException {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID userId = queryUuid(connection, "SELECT id FROM users ORDER BY id LIMIT 1");
                long warehouseId = queryLong(connection, "SELECT id FROM warehouses ORDER BY id LIMIT 1");
                long cashSessionId = returningLong(connection, """
                        INSERT INTO cash_register_sessions (
                            opened_by_user_id, opened_at, closed_at, opening_amount,
                            counted_amount, expected_cash_amount, difference_amount, status, notes
                        ) VALUES (?, NOW(), NOW(), 0, 0, 0, 0, 'CLOSED', '4D-1B synthetic fixture')
                        RETURNING id
                        """, statement -> statement.setObject(1, userId));
                long saleId = returningLong(connection, """
                        INSERT INTO sales (
                            cash_register_session_id, warehouse_id, sale_number, status,
                            subtotal_amount, discount_amount, total_amount, paid_amount,
                            change_amount, sold_at, created_by
                        ) VALUES (?, ?, ?, 'COMPLETED', 1, 0, 1, 1, 0, NOW(), '4d-1b-test')
                        RETURNING id
                        """, statement -> {
                    statement.setLong(1, cashSessionId);
                    statement.setLong(2, warehouseId);
                    statement.setString(3, "TX-" + suffix);
                });
                String series = ("INVOICE".equals(documentType) ? "F" : "B") + suffix;
                long seriesId = returningLong(connection, """
                        INSERT INTO billing_series (
                            document_type, series, current_number, environment, active,
                            created_by, updated_by
                        ) VALUES (?, ?, 2, 'LOCAL', TRUE, '4d-1b-test', '4d-1b-test')
                        RETURNING id
                        """, statement -> {
                    statement.setString(1, documentType);
                    statement.setString(2, series);
                });
                long documentId = returningLong(connection, """
                        INSERT INTO electronic_documents (
                            sale_id, billing_series_id, document_type, status, environment,
                            series, number, full_number, customer_name, customer_document,
                            currency_code, subtotal_amount, tax_amount, total_amount,
                            signed_at, created_by, updated_by
                        ) VALUES (?, ?, ?, 'SIGNED', 'LOCAL', ?, 1, ?,
                                  'Synthetic 4D-1B', '00000000000', 'PEN', 1, 0, 1,
                                  NOW(), '4d-1b-test', '4d-1b-test')
                        RETURNING id
                        """, statement -> {
                    statement.setLong(1, saleId);
                    statement.setLong(2, seriesId);
                    statement.setString(3, documentType);
                    statement.setString(4, series);
                    statement.setString(5, series + "-00000001");
                });
                try (PreparedStatement statement = connection.prepareStatement("""
                        INSERT INTO billing_xml_files (
                            electronic_document_id, file_type, file_name, content, mime_type, created_by
                        ) VALUES (?, 'SIGNED', ?, '<xml>synthetic-4d-1b</xml>', 'application/xml', '4d-1b-test')
                        """)) {
                    statement.setLong(1, documentId);
                    statement.setString(2, series + "-00000001-signed.xml");
                    statement.executeUpdate();
                }
                connection.commit();
                return new Fixture(documentId, seriesId, saleId, cashSessionId, 2L);
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    private void cleanupFixture(Fixture target) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                delete(connection, "DELETE FROM electronic_document_evidence WHERE electronic_document_id = ?", target.documentId());
                delete(connection, "DELETE FROM electronic_document_status_history WHERE electronic_document_id = ?", target.documentId());
                delete(connection, "DELETE FROM electronic_document_attempts WHERE electronic_document_id = ?", target.documentId());
                delete(connection, "DELETE FROM billing_xml_files WHERE electronic_document_id = ?", target.documentId());
                delete(connection, "DELETE FROM electronic_documents WHERE id = ?", target.documentId());
                delete(connection, "DELETE FROM billing_series WHERE id = ?", target.seriesId());
                delete(connection, "DELETE FROM sales WHERE id = ?", target.saleId());
                delete(connection, "DELETE FROM cash_register_sessions WHERE id = ?", target.cashSessionId());
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    private void assertDocumentLockIsAvailable(long documentId) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT id FROM electronic_documents WHERE id = ? FOR UPDATE NOWAIT"
            )) {
                statement.setLong(1, documentId);
                assertTrue(statement.executeQuery().next());
            } finally {
                connection.rollback();
            }
        }
    }

    private long queryLong(String sql, Object... values) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            return queryLong(connection, sql, values);
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

    private String queryString(String sql, Object... values) throws SQLException {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                return resultSet.getString(1);
            }
        }
    }

    private long returningLong(
            Connection connection,
            String sql,
            StatementBinder binder
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.accept(statement);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertTrue(resultSet.next());
                return resultSet.getLong(1);
            }
        }
    }

    private void delete(Connection connection, String sql, long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            statement.executeUpdate();
        }
    }

    private void bind(PreparedStatement statement, Object... values) throws SQLException {
        for (int index = 0; index < values.length; index++) {
            statement.setObject(index + 1, values[index]);
        }
    }

    private void shutdown(ExecutorService executor) throws InterruptedException {
        executor.shutdownNow();
        assertTrue(executor.awaitTermination(WAIT.toMillis(), TimeUnit.MILLISECONDS));
    }

    private record Fixture(
            long documentId,
            long seriesId,
            long saleId,
            long cashSessionId,
            long seriesCurrentNumber
    ) {
    }

    private record BlockingProvider(
            CountDownLatch entered,
            CountDownLatch release,
            AtomicInteger calls,
            AtomicBoolean transactionActive
    ) {
    }

    @FunctionalInterface
    private interface StatementBinder {
        void accept(PreparedStatement statement) throws SQLException;
    }
}
