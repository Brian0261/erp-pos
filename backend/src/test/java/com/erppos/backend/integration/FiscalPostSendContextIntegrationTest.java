package com.erppos.backend.integration;

import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.application.service.FiscalFinalizationTestAccess;
import com.erppos.backend.erp.billing.application.service.FiscalSendTransactionService;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import com.erppos.backend.erp.security.domain.RoleName;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** H1: no outer transaction, real PostgreSQL commits, synthetic provider and actors only. */
class FiscalPostSendContextIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource datasource;
    @Autowired ElectronicDocumentUseCase documents;
    @Autowired FiscalSendTransactionService sends;
    @Autowired ElectronicDocumentRepositoryPort documentRepository;
    @MockitoBean ElectronicBillingProviderPort provider;

    private record Actor(UUID id, String name, Set<RoleName> roles) {}
    private record Prepared(long attempt, String hash, String actor) {}
    private Actor original, replacementCashier, replacementAdmin;
    private Long cashSessionId;
    private long documentId;

    @BeforeEach
    void syntheticSignedDocument() {
        original = actor(Set.of(RoleName.ADMIN, RoleName.CAJERO));
        replacementCashier = actor(Set.of(RoleName.CAJERO));
        replacementAdmin = actor(Set.of(RoleName.ADMIN));
        cashSessionId = jdbc.queryForObject("""
                insert into cash_register_sessions(opened_by_user_id, opened_at, opening_amount, status)
                values(?, now(), 0, 'OPEN') returning id
                """, Long.class, original.id());
        documentId = signedDocument();
        clearInvocations(provider);
    }

    @AfterEach
    void closeFixtureCashSession() {
        if (cashSessionId == null) {
            return;
        }
        // Release the fixture's open session after the fiscal assertions observe real commits.
        int closed = jdbc.update("""
                update cash_register_sessions
                set status = 'CLOSED', closed_at = now(), updated_at = now()
                where id = ? and opened_by_user_id = ? and status = 'OPEN'
                """, cashSessionId, original.id());
        assertEquals(1, closed, "The fixture's cash session must be closed");
    }

    private long signedDocument() {
        long warehouse = jdbc.queryForObject("select min(id) from warehouses", Long.class);
        long sale = jdbc.queryForObject("""
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                    total_amount,paid_amount,change_amount,sold_at,created_by)
                values(?,?,?,'COMPLETED',10,0,10,10,0,now(),?) returning id
                """, Long.class, cashSessionId, warehouse, "H1-" + UUID.randomUUID(), original.name());
        String seriesName = "H" + UUID.randomUUID().toString().substring(0, 7);
        long series = jdbc.queryForObject("insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by) values('RECEIPT',?,1,'LOCAL',false,'H1','H1') returning id", Long.class, seriesName);
        long created = jdbc.queryForObject("""
                insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,number,
                    full_number,subtotal_amount,tax_amount,total_amount,xml_generated_at,signed_at,created_by,updated_by)
                values(?,?,'RECEIPT','SIGNED','LOCAL',?,1,?,10,0,10,now(),now(),'H1','H1') returning id
                """, Long.class, sale, series, seriesName, seriesName + "-1");
        for (String type : List.of("GENERATED", "SIGNED")) jdbc.update("insert into billing_xml_files(electronic_document_id,file_type,file_name,content,mime_type,created_by) values(?,?,?,'<h1>synthetic signed</h1>','application/xml','H1')", created, type, "H1-" + type + ".xml");
        return created;
    }

    @ParameterizedTest
    @ValueSource(strings = {"clear", "cashier", "admin"})
    void acceptedResultSurvivesContextLossOrReplacementAndKeepsOriginalAudit(String context) {
        var prepared = new AtomicReference<Prepared>();
        when(provider.send(any(), any())).thenAnswer(call -> {
            prepared.set(observeCommittedPreparation());
            replaceContext(context);
            return ProviderSendResult.accepted("H1-SYNTHETIC-ACCEPTED", "Synthetic accepted");
        });
        ElectronicDocument result = null;
        RuntimeException failure = null;
        try { result = asOriginal(() -> documents.send(documentId)); }
        catch (RuntimeException ex) { failure = ex; }
        var state = state();
        System.out.println("H1_ACCEPTED context=" + context + " observed=" + summary(state)
                + " failure=" + (failure == null ? "none" : failure.getClass().getSimpleName()));
        assertNotNull(prepared.get(), "The provider must observe committed SENT/STARTED first");
        assertNull(failure, "An authorized, durably prepared send must finalize without the requester context");
        assertNotNull(result);
        assertEquals("ACCEPTED", result.status().name());
        assertEquals("ACCEPTED", state.get("status"));
        assertEquals("SUCCESS", state.get("result"));
        assertEquals(2, state.get("history"));
        assertEquals(2, state.get("evidence"));
        assertAuditUsesOriginalActor();
        verify(provider, times(1)).send(any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"clear", "cashier", "admin"})
    void ambiguousFailureIsRecordedWithoutRequesterContextAndKeepsOriginalAudit(String context) {
        var prepared = new AtomicReference<Prepared>();
        when(provider.send(any(), any())).thenAnswer(call -> {
            prepared.set(observeCommittedPreparation());
            replaceContext(context);
            throw new IllegalStateException("Synthetic provider timeout");
        });
        var failure = assertThrows(IllegalStateException.class, () -> asOriginal(() -> documents.send(documentId)));
        var state = state();
        System.out.println("H1_AMBIGUOUS context=" + context + " observed=" + summary(state)
                + " suppressed=" + failure.getSuppressed().length);
        assertNotNull(prepared.get());
        assertEquals("Synthetic provider timeout", failure.getMessage());
        assertEquals("SENT", state.get("status"));
        assertEquals("PENDING", state.get("result"));
        assertEquals(1, state.get("history"));
        assertEquals(1, state.get("evidence"));
        assertEquals(0, failure.getSuppressed().length);
        assertAuditUsesOriginalActor();
        verify(provider, times(1)).send(any(), any());
    }

    private Prepared observeCommittedPreparation() throws SQLException {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        try (var connection = datasource.getConnection(); var statement = connection.prepareStatement("""
                select d.status,a.id,a.request_hash,a.actor,a.result from electronic_documents d
                join electronic_document_attempts a on a.electronic_document_id=d.id where d.id=?
                """)) {
            assertTrue(connection.getAutoCommit());
            statement.setLong(1, documentId);
            try (var row = statement.executeQuery()) {
                assertTrue(row.next());
                assertEquals("SENT", row.getString("status"));
                assertEquals("STARTED", row.getString("result"));
                assertEquals(original.name(), row.getString("actor"));
                return new Prepared(row.getLong("id"), row.getString("request_hash"), row.getString("actor"));
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"document", "attempt", "missing-attempt", "hash", "payload", "operation", "actor", "state"})
    void invalidOrForeignPreparationCannotChangeAnyCommittedRecord(String fault) {
        var preparation = asOriginal(() -> FiscalFinalizationTestAccess.prepare(sends, documentId));
        long other = signedDocument();
        var otherPreparation = asOriginal(() -> FiscalFinalizationTestAccess.prepare(sends, other));
        var forged = FiscalFinalizationTestAccess.changed(preparation,
                fault.equals("document") ? documentRepository.findById(other).orElseThrow() : null,
                fault.equals("attempt") ? otherPreparation.attemptId() : fault.equals("missing-attempt") ? Long.MAX_VALUE : preparation.attemptId(),
                fault.equals("hash") ? "0".repeat(64) : preparation.hash(),
                fault.equals("payload") ? preparation.payload() + "altered" : preparation.payload());
        if (fault.equals("operation")) jdbc.update("update electronic_document_attempts set operation='SIGN_XML' where id=?", preparation.attemptId());
        if (fault.equals("actor")) jdbc.update("update electronic_document_attempts set actor='' where id=?", preparation.attemptId());
        if (fault.equals("state")) jdbc.update("update electronic_documents set status='SIGNED' where id=?", documentId);
        var before = persistedRows(documentId);
        var otherBefore = persistedRows(other);
        clearInvocations(provider);
        var error = assertThrows(RuntimeException.class, () -> FiscalFinalizationTestAccess.complete(sends, forged,
                ProviderSendResult.accepted("H1-FORGED", "Synthetic forged result")));
        assertTrue(error instanceof BillingConflictException || error instanceof BillingNotFoundException);
        assertEquals(before, persistedRows(documentId));
        assertEquals(otherBefore, persistedRows(other));
        verifyNoInteractions(provider);
    }

    @Test
    void identicalCompletionIsReadOnlyAndContradictoryCompletionCannotOverwriteIt() {
        var preparation = asOriginal(() -> FiscalFinalizationTestAccess.prepare(sends, documentId));
        var accepted = ProviderSendResult.accepted("H1-IDEMPOTENT", "Synthetic accepted");
        FiscalFinalizationTestAccess.complete(sends, preparation, accepted);
        var after = persistedRows(documentId);
        FiscalFinalizationTestAccess.complete(sends, preparation, accepted);
        assertEquals(after, persistedRows(documentId));
        assertThrows(BillingConflictException.class, () -> FiscalFinalizationTestAccess.complete(sends, preparation,
                ProviderSendResult.rejected("H1-CONTRADICTORY", "Synthetic rejected")));
        assertEquals(after, persistedRows(documentId));
        assertAuditUsesOriginalActor();
        verifyNoInteractions(provider);
    }

    @Test
    @Timeout(30)
    void concurrentInternalCompletionsWithoutSecurityContextProduceOneResult() throws Exception {
        var preparation = asOriginal(() -> FiscalFinalizationTestAccess.prepare(sends, documentId));
        var accepted = ProviderSendResult.accepted("H1-CONCURRENT", "Synthetic accepted");
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            java.util.concurrent.Callable<ElectronicDocument> completion = () -> {
                assertNull(SecurityContextHolder.getContext().getAuthentication());
                assertTrue(start.await(5, TimeUnit.SECONDS));
                return FiscalFinalizationTestAccess.complete(sends, preparation, accepted);
            };
            var first = executor.submit(completion); var second = executor.submit(completion); start.countDown();
            assertEquals("ACCEPTED", first.get(10, TimeUnit.SECONDS).status().name());
            assertEquals("ACCEPTED", second.get(10, TimeUnit.SECONDS).status().name());
        } finally {
            executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
        }
        assertEquals(Map.of("status", "ACCEPTED", "result", "SUCCESS", "history", 2, "evidence", 2), state());
        // Direct preparation/finalization does not invoke the provider or add a second SEND attempt.
        assertEquals(1, jdbc.queryForObject("select count(*) from electronic_document_attempts where electronic_document_id=?", Integer.class, documentId));
        assertAuditUsesOriginalActor();
        verifyNoInteractions(provider);
    }

    @Test
    void untrustedMissingProviderResultStaysPendingForReconciliation() {
        var preparation = asOriginal(() -> FiscalFinalizationTestAccess.prepare(sends, documentId));
        FiscalFinalizationTestAccess.complete(sends, preparation, null);
        assertEquals("SENT", state().get("status"));
        assertEquals("PENDING", state().get("result"));
        assertEquals(false, jdbc.queryForObject("select recoverable from electronic_document_attempts where id=?", Boolean.class, preparation.attemptId()));
        assertAuditUsesOriginalActor();
        verifyNoInteractions(provider);
    }

    private Map<String, Object> persistedRows(long document) {
        var rows = new HashMap<String, Object>();
        rows.put("document", jdbc.queryForMap("select d.*,xmin::text as row_version from electronic_documents d where id=?", document));
        for (String table : List.of("billing_xml_files", "electronic_document_attempts", "electronic_document_status_history", "electronic_document_evidence"))
            rows.put(table, jdbc.queryForList("select t.*,xmin::text as row_version from " + table + " t where electronic_document_id=? order by id", document));
        return rows;
    }

    private Map<String, Object> state() {
        return Map.of("status", jdbc.queryForObject("select status from electronic_documents where id=?", String.class, documentId),
                "result", jdbc.queryForObject("select result from electronic_document_attempts where electronic_document_id=?", String.class, documentId),
                "history", jdbc.queryForObject("select count(*) from electronic_document_status_history where electronic_document_id=?", Integer.class, documentId),
                "evidence", jdbc.queryForObject("select count(*) from electronic_document_evidence where electronic_document_id=?", Integer.class, documentId));
    }

    private String summary(Map<String, Object> state) {
        return state.get("status") + "/" + state.get("result") + ",history=" + state.get("history") + ",evidence=" + state.get("evidence");
    }

    private void assertAuditUsesOriginalActor() {
        assertEquals(original.name(), jdbc.queryForObject("select updated_by from electronic_documents where id=?", String.class, documentId));
        assertEquals(original.name(), jdbc.queryForObject("select actor from electronic_document_attempts where electronic_document_id=?", String.class, documentId));
        for (String table : List.of("electronic_document_status_history", "electronic_document_evidence")) {
            String column = table.endsWith("history") ? "changed_by" : "created_by";
            assertEquals(0, jdbc.queryForObject("select count(*) from " + table + " where electronic_document_id=? and " + column + "<>?", Integer.class, documentId, original.name()));
        }
    }

    private Actor actor(Set<RoleName> roles) {
        var id = UUID.randomUUID(); var name = "h1_" + id.toString().replace("-", "");
        jdbc.update("insert into users(id,username,email,password_hash,active) values(?,?,?,'synthetic-not-used-for-login',true)", id, name, name + "@synthetic.invalid");
        for (var role : roles) jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name=?", id, role.name());
        return new Actor(id, name, roles);
    }

    private void replaceContext(String mode) {
        var context = SecurityContextHolder.createEmptyContext();
        if (!mode.equals("clear")) {
            var actor = mode.equals("cashier") ? replacementCashier : replacementAdmin;
            var user = new ErpUserDetails(actor.id(), actor.name(), "synthetic@invalid.test", "unused", true, actor.roles());
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
        }
        SecurityContextHolder.setContext(context);
    }

    private <T> T asOriginal(Supplier<T> action) {
        var previous = SecurityContextHolder.getContext();
        try {
            var context = SecurityContextHolder.createEmptyContext();
            var user = new ErpUserDetails(original.id(), original.name(), "synthetic@invalid.test", "unused", true, original.roles());
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
            SecurityContextHolder.setContext(context);
            return action.get();
        } finally { SecurityContextHolder.setContext(previous); }
    }
}
