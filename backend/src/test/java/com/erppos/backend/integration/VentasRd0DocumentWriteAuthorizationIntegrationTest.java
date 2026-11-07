package com.erppos.backend.integration;

import com.erppos.backend.erp.billing.application.service.FiscalProviderResultClassifier;
import com.erppos.backend.erp.billing.application.service.FiscalSendTransactionService;
import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.UblXmlGeneratorPort;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import com.erppos.backend.erp.security.domain.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** No outer test transaction: a late rejection cannot hide a committed unauthorized write. */
class VentasRd0DocumentWriteAuthorizationIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @Autowired ElectronicDocumentUseCase documents;
    @Autowired FiscalSendTransactionService sends;
    @Autowired FiscalProviderResultClassifier classifier;
    @MockitoSpyBean UblXmlGeneratorPort generator;
    @MockitoSpyBean XmlSignerPort signer;
    @MockitoBean ElectronicBillingProviderPort provider;

    private record Actor(UUID id, String name, String token, Set<RoleName> roles) {}
    private record Document(long id, long sale, long attempt) {}
    private Actor cashierA, cashierB, admin, supervisor, combinedAdmin, combinedSupervisor, warehouse;
    private final Map<UUID, Long> cashSessions = new HashMap<>();
    private static final String HASH = "b".repeat(64);

    @BeforeEach
    void syntheticActorsAndLocalOnlyProvider() throws Exception {
        cashierA = actor(Set.of(RoleName.CAJERO));
        cashierB = actor(Set.of(RoleName.CAJERO));
        admin = actor(Set.of(RoleName.ADMIN));
        supervisor = actor(Set.of(RoleName.SUPERVISOR));
        combinedAdmin = actor(Set.of(RoleName.ADMIN, RoleName.CAJERO));
        combinedSupervisor = actor(Set.of(RoleName.SUPERVISOR, RoleName.CAJERO));
        warehouse = actor(Set.of(RoleName.ALMACENERO));
        jdbc.update("""
                insert into company_billing_profile(ruc,legal_name,fiscal_address,environment,created_by,updated_by)
                select '20123456789','Synthetic RD0','Synthetic test address','LOCAL','RD0','RD0'
                where not exists(select 1 from company_billing_profile where environment='LOCAL' and active=true)
                """);
        when(provider.send(any(), any())).thenAnswer(call -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive(), "Provider I/O must stay outside the transaction");
            return ProviderSendResult.accepted("SYNTHETIC-RD0", "Synthetic accepted");
        });
        clearInvocations(generator, signer, provider);
    }

    @ParameterizedTest
    @ValueSource(strings = {"generate-xml", "sign", "send"})
    void legitimateHttpWritesKeepRolesTransitionsAndIdempotentShortcuts(String operation) throws Exception {
        var actors = operation.equals("generate-xml")
                ? List.of(cashierA, cashierB, admin, supervisor, combinedAdmin, combinedSupervisor)
                : List.of(admin, supervisor, combinedAdmin, combinedSupervisor);
        for (var actor : actors) {
            // ADMIN/SUPERVISOR keep cross-owner access; combined roles must own the sale.
            var doc = document(actor.roles().contains(RoleName.CAJERO) ? actor : cashierB, initialState(operation));
            clearInvocations(generator, signer, provider);
            var result = write(actor, doc, operation);
            assertEquals(200, result.getResponse().getStatus());
            var expected = switch (operation) { case "generate-xml" -> "GENERATED"; case "sign" -> "SIGNED"; default -> "ACCEPTED"; };
            assertEquals(expected, readJson(result).path("status").asText());
            assertEquals(expected, jdbc.queryForObject("select status from electronic_documents where id=?", String.class, doc.id()));
            if (operation.equals("generate-xml")) verify(generator).generate(any(), any(), any());
            if (operation.equals("sign")) {
                verify(signer).signXml(any(), any());
                assertEquals(1, count("electronic_document_evidence", doc));
            }
            if (operation.equals("send")) verify(provider).send(any(), any());
            else {
                var after = snapshot(doc);
                clearInvocations(generator, signer, provider);
                assertEquals(200, write(actor, doc, operation).getResponse().getStatus());
                assertEquals(after, snapshot(doc));
                verifyNoInteractions(generator, signer, provider);
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"generate-xml", "sign", "send"})
    void foreignIdsAndMissingRolesAreRejectedBeforeAnyPersistentOrExternalEffect(String operation) throws Exception {
        var doc = document(cashierB, initialState(operation));
        for (var actor : List.of(cashierA, combinedAdmin, combinedSupervisor, warehouse)) {
            var expected = actor == warehouse || (actor == cashierA && !operation.equals("generate-xml")) ? 403 : 422;
            assertHttpDeniedWithoutEffects(actor, doc, operation, expected);
        }
        if (!operation.equals("generate-xml")) assertHttpDeniedWithoutEffects(cashierB, doc, operation, 403);
        assertHttpDeniedWithoutEffects(null, doc, operation, 401);
    }

    @ParameterizedTest
    @ValueSource(strings = {"generate-xml", "sign", "send", "retry-send", "prepare-send", "block-retry"})
    void directApplicationAndTransactionalEntryPointsCannotBypassResourceOrOperationChecks(String operation) {
        var doc = document(cashierB, initialState(operation));
        for (var actor : List.of(combinedAdmin, combinedSupervisor)) {
            assertDirectDeniedWithoutEffects(actor, doc, operation, SalesBusinessRuleException.class);
        }
        assertDirectDeniedWithoutEffects(warehouse, doc, operation, AccessDeniedException.class);
        if (!operation.equals("generate-xml")) assertDirectDeniedWithoutEffects(cashierB, doc, operation, AccessDeniedException.class);
        else assertDirectDeniedWithoutEffects(cashierA, doc, operation, SalesBusinessRuleException.class);
        assertDirectDeniedWithoutEffects(null, doc, operation, AuthenticationCredentialsNotFoundException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"prepare-send", "block-retry", "retry-send"})
    void equivalentPathsPreserveAuthorizedPreparationFinalizationAndBlockedRetryAudit(String operation) {
        for (var actor : List.of(admin, supervisor, combinedAdmin, combinedSupervisor)) {
            var doc = document(actor.roles().contains(RoleName.CAJERO) ? actor : cashierB, initialState(operation));
            clearInvocations(generator, signer, provider);
            if (operation.equals("retry-send")) {
                assertThrows(BillingConflictException.class, () -> as(actor, () -> invoke(operation, doc)));
            } else {
                var result = as(actor, () -> invoke(operation, doc));
                if (operation.equals("prepare-send")) {
                    assertNotNull(result);
                    assertEquals("SENT", jdbc.queryForObject("select status from electronic_documents where id=?", String.class, doc.id()));
                    assertEquals("STARTED", jdbc.queryForObject("select result from electronic_document_attempts where electronic_document_id=?", String.class, doc.id()));
                }
            }
            verifyNoInteractions(generator, signer, provider);
            assertEquals(1, count("electronic_document_attempts", doc));
            if (operation.equals("block-retry") || operation.equals("retry-send")) {
                assertEquals("BLOCKED", jdbc.queryForObject("select result from electronic_document_attempts where electronic_document_id=?", String.class, doc.id()));
                assertEquals("SIGNED", jdbc.queryForObject("select status from electronic_documents where id=?", String.class, doc.id()));
            }
        }
    }

    @Test
    void finalizationIsPackageLocalAndAbsentFromThePublicUseCase() {
        assertTrue(java.util.Arrays.stream(FiscalSendTransactionService.class.getMethods())
                .noneMatch(method -> method.getName().equals("finalizeSend") || method.getName().equals("finalizeAmbiguousFailure")));
        assertTrue(java.util.Arrays.stream(ElectronicDocumentUseCase.class.getMethods())
                .noneMatch(method -> method.getName().startsWith("finalize")));
        var internal = java.util.Arrays.stream(FiscalSendTransactionService.class.getDeclaredMethods())
                .filter(method -> method.getName().equals("finalizeSend") || method.getName().equals("finalizeAmbiguousFailure")).toList();
        assertEquals(2, internal.size());
        for (var method : internal) {
            assertFalse(java.lang.reflect.Modifier.isPublic(method.getModifiers()));
            assertFalse(java.lang.reflect.Modifier.isPublic(method.getParameterTypes()[0].getModifiers()));
        }
    }

    @Test
    void foreignDocumentsCannotUseAlreadyGeneratedSignedOrSentShortcuts() throws Exception {
        for (var pair : List.of(new String[]{"generate-xml", "GENERATED"}, new String[]{"sign", "SIGNED"}, new String[]{"send", "SENT"})) {
            var doc = document(cashierB, pair[1]);
            assertHttpDeniedWithoutEffects(combinedAdmin, doc, pair[0], 422);
        }
    }

    private void assertHttpDeniedWithoutEffects(Actor actor, Document doc, String operation, int expected) throws Exception {
        var before = snapshot(doc);
        clearInvocations(generator, signer, provider);
        var result = write(actor, doc, operation);
        assertEquals(expected, result.getResponse().getStatus());
        assertEquals(before, snapshot(doc), "A rejected HTTP response must not conceal a committed write");
        verifyNoInteractions(generator, signer, provider);
        var json = readJson(result);
        assertFalse(json.has("customerName")); assertFalse(json.has("items")); assertFalse(json.has("content"));
        assertFalse(json.has("providerTicket"));
    }

    private void assertDirectDeniedWithoutEffects(Actor actor, Document doc, String operation, Class<? extends RuntimeException> error) {
        var before = snapshot(doc);
        clearInvocations(generator, signer, provider);
        assertThrows(error, () -> as(actor, () -> invoke(operation, doc)));
        assertEquals(before, snapshot(doc));
        verifyNoInteractions(generator, signer, provider);
    }

    private Object invoke(String operation, Document doc) {
        return switch (operation) {
            case "generate-xml" -> documents.generateXml(doc.id());
            case "sign" -> documents.sign(doc.id());
            case "send" -> documents.send(doc.id());
            case "retry-send" -> documents.retrySend(doc.id());
            case "prepare-send" -> sends.prepareSend(doc.id());
            case "block-retry" -> sends.blockRetry(doc.id());
            default -> throw new IllegalArgumentException(operation);
        };
    }

    private Object as(Actor actor, Supplier<Object> work) {
        var previous = SecurityContextHolder.getContext();
        try {
            var context = SecurityContextHolder.createEmptyContext();
            if (actor != null) {
                var user = new ErpUserDetails(actor.id(), actor.name(), "synthetic@invalid.test", "unused", true, actor.roles());
                context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
            }
            SecurityContextHolder.setContext(context);
            return work.get();
        } finally { SecurityContextHolder.setContext(previous); }
    }

    private MvcResult write(Actor actor, Document doc, String operation) throws Exception {
        var request = post("/api/v1/billing/documents/{id}/{operation}", doc.id(), operation);
        if (actor != null) request.header(HttpHeaders.AUTHORIZATION, bearer(actor.token()));
        return mockMvc.perform(request).andReturn();
    }

    private Map<String, Object> snapshot(Document doc) {
        var state = new HashMap<String, Object>();
        state.put("document", jdbc.queryForMap("select d.*,xmin::text as row_version from electronic_documents d where id=?", doc.id()));
        for (var table : List.of("electronic_document_items", "billing_xml_files", "electronic_document_status_history",
                "electronic_document_evidence", "electronic_document_attempts")) {
            state.put(table, jdbc.queryForList("select t.*,xmin::text as row_version from " + table + " t where electronic_document_id=? order by id", doc.id()));
        }
        state.put("sale", jdbc.queryForMap("select s.*,xmin::text as row_version from sales s where id=?", doc.sale()));
        return state;
    }

    private int count(String table, Document doc) {
        return jdbc.queryForObject("select count(*) from " + table + " where electronic_document_id=?", Integer.class, doc.id());
    }

    private String initialState(String operation) {
        return switch (operation) {
            case "generate-xml" -> "DRAFT";
            case "sign" -> "GENERATED";
            case "finalize-send", "finalize-failure" -> "SENT";
            default -> "SIGNED";
        };
    }

    private Actor actor(Set<RoleName> roles) throws Exception {
        var id = UUID.randomUUID(); var name = "rd0w_" + id.toString().replace("-", "");
        var password = "Synthetic-RD0-only!";
        jdbc.update("insert into users(id,username,email,password_hash,active) values(?,?,?,?,true)",
                id, name, name + "@synthetic.invalid", passwords.encode(password));
        for (var role : roles) jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name=?", id, role.name());
        return new Actor(id, name, login(name, password), roles);
    }

    private Document document(Actor owner, String status) {
        long cash = cashSessions.computeIfAbsent(owner.id(), id -> jdbc.queryForObject("insert into cash_register_sessions(opened_by_user_id,opened_at,opening_amount,status) values(?,now(),0,'OPEN') returning id", Long.class, id));
        long warehouseId = jdbc.queryForObject("select min(id) from warehouses", Long.class);
        long sale = jdbc.queryForObject("""
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                    total_amount,paid_amount,change_amount,sold_at,created_by)
                values(?,?,?,'COMPLETED',10,0,10,10,0,now(),?) returning id
                """, Long.class, cash, warehouseId, "RW0-" + UUID.randomUUID(), owner.name());
        var seriesName = "R" + UUID.randomUUID().toString().substring(0, 7);
        long series = jdbc.queryForObject("insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by) values('RECEIPT',?,1,'LOCAL',false,'RD0','RD0') returning id", Long.class, seriesName);
        long doc = jdbc.queryForObject("""
                insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,number,
                    full_number,customer_name,subtotal_amount,tax_amount,total_amount,created_by,updated_by)
                values(?,?,'RECEIPT',?,'LOCAL',?,1,?,'Synthetic RD0 customer',10,0,10,'RD0','RD0') returning id
                """, Long.class, sale, series, status, seriesName, seriesName + "-1");
        if (!status.equals("DRAFT")) {
            jdbc.update("insert into billing_xml_files(electronic_document_id,file_type,file_name,content,mime_type,created_by) values(?,'GENERATED',?,'<rd0>synthetic</rd0>','application/xml','RD0')", doc, "RD0-" + doc + ".xml");
            jdbc.update("update electronic_documents set xml_generated_at=now() where id=?", doc);
        }
        if (status.equals("SIGNED") || status.equals("SENT")) {
            jdbc.update("insert into billing_xml_files(electronic_document_id,file_type,file_name,content,mime_type,created_by) values(?,'SIGNED',?,'<rd0>synthetic signed</rd0>','application/xml','RD0')", doc, "RD0-" + doc + "-signed.xml");
            jdbc.update("update electronic_documents set signed_at=now() where id=?", doc);
        }
        long attempt = 0;
        if (status.equals("SENT")) {
            jdbc.update("update electronic_documents set sent_at=now() where id=?", doc);
            attempt = jdbc.queryForObject("insert into electronic_document_attempts(electronic_document_id,operation,attempt_number,result,request_hash,started_at,actor,simulated) values(?,'SEND',1,'STARTED',?,now(),?,true) returning id", Long.class, doc, HASH, owner.name());
        }
        return new Document(doc, sale, attempt);
    }
}
