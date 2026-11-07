package com.erppos.backend.integration;

import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessUseCase;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import com.erppos.backend.erp.security.domain.RoleName;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** VENTAS-RD-0B: real services, JWT/RBAC and synthetic rows in disposable PostgreSQL; no fiscal sends. */
@Transactional
class VentasRd0DocumentReadAuthorizationIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @Autowired ElectronicDocumentUseCase documents;
    @Autowired FiscalEvidenceReadinessUseCase readiness;

    private record Actor(UUID id, String username, String token, Set<RoleName> roles) {}
    private record Document(long id, long sale, String customer, String xml) {}
    private Actor cashierA, cashierB, admin, supervisor, mixedAdmin, mixedSupervisor;
    private Document a, b, combinedAdmin, combinedSupervisor;
    private static final String BASE = "/api/v1/billing/documents";

    @BeforeEach
    void syntheticFixtures() throws Exception {
        cashierA = actor(Set.of(RoleName.CAJERO));
        cashierB = actor(Set.of(RoleName.CAJERO));
        admin = actor(Set.of(RoleName.ADMIN));
        supervisor = actor(Set.of(RoleName.SUPERVISOR));
        mixedAdmin = actor(Set.of(RoleName.ADMIN, RoleName.CAJERO));
        mixedSupervisor = actor(Set.of(RoleName.SUPERVISOR, RoleName.CAJERO));
        a = document(cashierA);
        b = document(cashierB);
        combinedAdmin = document(mixedAdmin);
        combinedSupervisor = document(mixedSupervisor);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "/xml", "/history", "/evidence-readiness"})
    void everyReadAllowsOwnersAndPrivilegedRolesAndRejectsForeignIds(String suffix) throws Exception {
        assertAllowed(cashierA, a, suffix);
        assertAllowed(cashierB, b, suffix);
        assertDenied(cashierA, b, suffix);
        assertDenied(cashierB, a, suffix);
        for (var actor : List.of(admin, supervisor)) {
            assertAllowed(actor, a, suffix);
            assertAllowed(actor, b, suffix);
        }
        assertAllowed(mixedAdmin, combinedAdmin, suffix);
        assertAllowed(mixedSupervisor, combinedSupervisor, suffix);
        assertDenied(mixedAdmin, a, suffix);
        assertDenied(mixedSupervisor, b, suffix);
        var missing = read(cashierA.token(), BASE + "/" + Long.MAX_VALUE + suffix);
        assertEquals(404, missing.getResponse().getStatus());
        assertNoForeignData(missing, b);
    }

    @Test
    void listsAreScopedBySaleOwnerBeforeResponseMappingWithOrWithoutSaleId() throws Exception {
        for (var pair : List.of(new Object[]{cashierA, a}, new Object[]{cashierB, b},
                new Object[]{mixedAdmin, combinedAdmin}, new Object[]{mixedSupervisor, combinedSupervisor})) {
            var actor = (Actor) pair[0]; var own = (Document) pair[1];
            assertEquals(Set.of(own.id()), ids(read(actor.token(), BASE)));
            assertEquals(Set.of(own.id()), ids(read(actor.token(), BASE + "?saleId=" + own.sale())));
            assertEquals(Set.of(), ids(read(actor.token(), BASE + "?saleId=" + (own == a ? b.sale() : a.sale()))));
            assertEquals(Set.of(), ids(read(actor.token(), BASE + "?saleId=" + Long.MAX_VALUE)));
            assertEquals(Set.of(own.id()), ids(read(actor.token(), BASE + "?status=DRAFT&type=RECEIPT&from=2031-01-01&to=2031-01-01")));
            assertEquals(Set.of(), ids(read(actor.token(), BASE + "?status=ACCEPTED")));
            // Neither a spoofed user parameter nor another person's document ID broadens sale ownership.
            assertEquals(Set.of(own.id()), ids(read(actor.token(), BASE + "?createdBy=" + admin.username() + "&documentId=" + b.id())));
        }
        for (var actor : List.of(admin, supervisor)) {
            assertTrue(ids(read(actor.token(), BASE)).containsAll(Set.of(a.id(), b.id(), combinedAdmin.id(), combinedSupervisor.id())));
            assertEquals(Set.of(b.id()), ids(read(actor.token(), BASE + "?saleId=" + b.sale())));
        }
    }

    @Test
    void applicationReadsAndReadinessCannotBypassResourceChecksThroughAnotherEntryPoint() {
        var previous = SecurityContextHolder.getContext();
        try {
            var context = SecurityContextHolder.createEmptyContext();
            var user = new ErpUserDetails(cashierA.id(), cashierA.username(), "synthetic@invalid.test", "unused", true, cashierA.roles());
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
            SecurityContextHolder.setContext(context);
            assertEquals(a.id(), documents.getById(a.id()).id());
            assertEquals(1, documents.evidence(a.id()).size());
            assertEquals(1, documents.history(a.id()).size());
            assertEquals(1, readiness.getByDocumentId(a.id()).evidenceCount());
            assertEquals(Set.of(a.id()), documents.list(null, null, null, null, null).stream().map(d -> d.id()).collect(java.util.stream.Collectors.toSet()));
            for (Runnable read : List.<Runnable>of(() -> documents.getById(b.id()), () -> documents.items(b.id()),
                    () -> documents.getXml(b.id()), () -> documents.history(b.id()), () -> documents.evidence(b.id()),
                    () -> readiness.getByDocumentId(b.id()))) {
                assertThrows(SalesBusinessRuleException.class, read::run);
            }
        } finally { SecurityContextHolder.setContext(previous); }
    }

    @Test
    void checksRunBeforeReadingXmlOrEvidenceEvenWhenThoseChildrenAreAbsent() throws Exception {
        jdbc.update("delete from billing_xml_files where electronic_document_id=?", b.id());
        jdbc.update("delete from electronic_document_evidence where electronic_document_id=?", b.id());
        assertDenied(cashierA, b, "/xml");
        assertDenied(cashierA, b, "/evidence-readiness");
        assertEquals(404, read(cashierB.token(), BASE + "/" + b.id() + "/xml").getResponse().getStatus());
        var own = read(cashierB.token(), BASE + "/" + b.id() + "/evidence-readiness");
        assertEquals(200, own.getResponse().getStatus());
        assertEquals(0, readJson(own).path("evidenceCount").asInt());
    }

    @Test
    void jwtAndEndpointRolesStillRejectUnauthenticatedAndWarehouseActors() throws Exception {
        var warehouse = actor(Set.of(RoleName.ALMACENERO));
        for (var path : List.of(BASE, BASE + "/" + a.id(), BASE + "/" + a.id() + "/xml",
                BASE + "/" + a.id() + "/history", BASE + "/" + a.id() + "/evidence-readiness")) {
            var unauthenticated = mockMvc.perform(get(path)).andReturn();
            assertEquals(401, unauthenticated.getResponse().getStatus());
            assertNoForeignData(unauthenticated, a);
            var rejected = read(warehouse.token(), path);
            assertEquals(403, rejected.getResponse().getStatus());
            assertNoForeignData(rejected, a);
        }
    }

    private void assertAllowed(Actor actor, Document document, String suffix) throws Exception {
        var result = read(actor.token(), BASE + "/" + document.id() + suffix);
        assertEquals(200, result.getResponse().getStatus());
        JsonNode json = readJson(result);
        switch (suffix) {
            case "" -> {
                assertEquals(document.id(), json.path("id").asLong());
                assertEquals(document.sale(), json.path("saleId").asLong());
                assertEquals(document.customer(), json.path("customerName").asText());
                assertTrue(json.path("items").isArray());
            }
            case "/xml" -> assertEquals(document.xml(), json.path("content").asText());
            case "/history" -> assertEquals("Synthetic RD0 history", json.get(0).path("message").asText());
            case "/evidence-readiness" -> {
                assertEquals(document.id(), json.path("documentId").asLong());
                assertEquals(1, json.path("evidenceCount").asInt());
                assertFalse(json.path("evidence").get(0).path("downloadAllowed").asBoolean());
                assertFalse(json.path("evidence").get(0).has("storageKey"));
            }
            default -> fail("Unexpected read surface");
        }
    }

    private void assertDenied(Actor actor, Document document, String suffix) throws Exception {
        var result = read(actor.token(), BASE + "/" + document.id() + suffix);
        // Reuse the existing sale-owner policy's safe, compatible 422 business error.
        assertEquals(422, result.getResponse().getStatus());
        assertNoForeignData(result, document);
    }

    private void assertNoForeignData(MvcResult result, Document document) throws Exception {
        var json = readJson(result);
        assertEquals(Set.of("timestamp", "status", "error", "message", "path", "traceId"), fieldNames(json));
        var body = result.getResponse().getContentAsString();
        assertFalse(body.contains(document.customer()));
        assertFalse(body.contains(document.xml()));
        assertFalse(body.contains("Synthetic RD0 history"));
    }

    private Set<String> fieldNames(JsonNode node) {
        var fields = new HashSet<String>(); node.fieldNames().forEachRemaining(fields::add); return fields;
    }

    private Set<Long> ids(MvcResult result) throws Exception {
        assertEquals(200, result.getResponse().getStatus());
        var json = readJson(result); assertTrue(json.isArray());
        var ids = new HashSet<Long>(); json.forEach(row -> ids.add(row.path("id").asLong())); return ids;
    }

    private MvcResult read(String token, String path) throws Exception {
        return mockMvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer(token))).andReturn();
    }

    private Actor actor(Set<RoleName> roles) throws Exception {
        var id = UUID.randomUUID(); var name = "rd0_" + id.toString().replace("-", "");
        var password = "Synthetic-RD0-only!";
        jdbc.update("insert into users(id,username,email,password_hash,active) values(?,?,?,?,true)",
                id, name, name + "@synthetic.invalid", passwords.encode(password));
        for (var role : roles) jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name=?", id, role.name());
        return new Actor(id, name, login(name, password), roles);
    }

    private Document document(Actor owner) {
        long warehouse = jdbc.queryForObject("select min(id) from warehouses", Long.class);
        long cash = jdbc.queryForObject("insert into cash_register_sessions(opened_by_user_id,opened_at,opening_amount,status) values(?,now(),0,'OPEN') returning id", Long.class, owner.id());
        long sale = jdbc.queryForObject("""
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                    total_amount,paid_amount,change_amount,sold_at,created_by)
                values(?,?,?,'COMPLETED',10,0,10,10,0,timestamptz '2031-01-01 12:00:00+00',?) returning id
                """, Long.class, cash, warehouse, "RD0-" + UUID.randomUUID(), owner.username());
        var seriesName = "R" + UUID.randomUUID().toString().substring(0, 7);
        long series = jdbc.queryForObject("insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by) values('RECEIPT',?,1,'LOCAL',false,'RD0','RD0') returning id", Long.class, seriesName);
        var customer = "Synthetic customer " + sale;
        // Deliberately different document creator: ownership must come from the sale, never the document creator.
        long doc = jdbc.queryForObject("""
                insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,number,
                    full_number,customer_name,customer_document,subtotal_amount,tax_amount,total_amount,created_by,updated_by,created_at)
                values(?,?,'RECEIPT','DRAFT','LOCAL',?,1,?,?,'SYNTHETIC',10,0,10,?,'RD0',timestamptz '2031-01-01 12:00:00+00') returning id
                """, Long.class, sale, series, seriesName, seriesName + "-1", customer, admin.username());
        var xml = "<rd0>synthetic-" + doc + "</rd0>";
        jdbc.update("insert into billing_xml_files(electronic_document_id,file_type,file_name,content,mime_type,created_by) values(?,'GENERATED',?,?, 'application/xml','RD0')", doc, "RD0-" + doc + ".xml", xml);
        jdbc.update("insert into electronic_document_status_history(electronic_document_id,new_status,message,changed_by) values(?,'DRAFT','Synthetic RD0 history','RD0')", doc);
        jdbc.update("insert into electronic_document_evidence(electronic_document_id,evidence_type,environment,created_by) values(?,'PROVIDER_RESPONSE_METADATA','LOCAL','RD0')", doc);
        return new Document(doc, sale, customer, xml);
    }
}
