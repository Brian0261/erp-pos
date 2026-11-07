package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mockingDetails;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SalesListV2IntegrationTest {
    private static final String URL = "/api/v2/sales";
    private static final String COUNT = "SELECT count(*) FROM sales s";
    private static final String CONTENT = "SELECT s.id, s.sale_number";
    private static final String BULK_PREFIX = "RD1-BULK";
    private static final String START = "2031-02-01T05:00:00Z";
    private static final String NEXT_DAY = "2031-02-02T05:00:00Z";

    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        // A per-class test instance can initialize Spring before the container extension's beforeAll.
        POSTGRES.start();
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @Autowired EntityManagerFactory entities;
    @MockitoSpyBean NamedParameterJdbcTemplate salesSql;

    private Actor cashierA;
    private Actor cashierB;
    private Actor admin;
    private Actor supervisor;
    private Actor mixedAdmin;
    private Actor mixedSupervisor;
    private Actor warehouseUser;
    private long warehouse;
    private long series;
    private long historical;
    private long literal;
    private long noDocument;
    private long cashierBSale;
    private long latestCancelled;
    private long beforeDay;
    private long afterDay;
    private long mixedAdminSale;
    private long mixedSupervisorSale;
    private List<Long> orderedBulk;

    @BeforeAll
    void seedSyntheticData() throws Exception {
        warehouse = jdbc.queryForObject("select min(id) from warehouses", Long.class);
        cashierA = actor("a", "CAJERO");
        cashierB = actor("b", "CAJERO");
        admin = actor("admin", "ADMIN");
        supervisor = actor("super", "SUPERVISOR");
        mixedAdmin = actor("mixed_admin", "CAJERO", "ADMIN");
        mixedSupervisor = actor("mixed_super", "CAJERO", "SUPERVISOR");
        warehouseUser = actor("warehouse", "ALMACENERO");
        series = jdbc.queryForObject("""
                insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by)
                values('RECEIPT','RD1',1,'LOCAL',false,'fixture','fixture') returning id
                """, Long.class);
        bulk(cashierA, BULK_PREFIX, 105);
        orderedBulk = jdbc.queryForList("select id from sales where sale_number like 'RD1-BULK%' order by id desc", Long.class);

        beforeDay = sale(cashierA, "RD1-BEFORE", "2031-02-01T04:59:59.999999Z", "COMPLETED");
        historical = sale(cashierA, "S-12", START, "COMPLETED");
        literal = sale(cashierA, "S-12%_!literal", "2031-02-01T05:01:00Z", "COMPLETED");
        noDocument = sale(cashierA, "S-12XYliteral", "2031-02-02T04:59:59.999999Z", "VOIDED");
        afterDay = sale(cashierA, "RD1-AFTER", NEXT_DAY, "COMPLETED");
        cashierBSale = sale(cashierB, "S-1", START, "COMPLETED");
        mixedAdminSale = sale(mixedAdmin, "RD1-MIXED-ADMIN", START, "COMPLETED");
        mixedSupervisorSale = sale(mixedSupervisor, "RD1-MIXED-SUPER", START, "COMPLETED");
        document(historical, 1, "ACCEPTED", START);
        latestCancelled = document(historical, 2, "CANCELLED", START);
        document(literal, 3, "ACCEPTED", START);
        document(cashierBSale, 4, "REJECTED", START);
    }

    @Test
    void defaultPageIsTwentyWithStableTieBreak() throws Exception {
        JsonNode response = page(cashierA, "saleNumberPrefix", BULK_PREFIX);
        assertPage(response, 0, 20, 105, 6, orderedBulk.subList(0, 20));
        assertPage(page(cashierA, "saleNumberPrefix", BULK_PREFIX, "page", "1"),
                1, 20, 105, 6, orderedBulk.subList(20, 40));
    }

    @ParameterizedTest
    @ValueSource(ints = {20, 50, 100})
    void lastPageAndOutOfRangeUseExactMetadata(int size) throws Exception {
        int last = 104 / size;
        assertPage(page(cashierA, "saleNumberPrefix", BULK_PREFIX, "page", "" + last, "size", "" + size),
                last, size, 105, last + 1, orderedBulk.subList(last * size, 105));
        clearInvocations(salesSql);
        assertPage(page(cashierA, "saleNumberPrefix", BULK_PREFIX, "page", "100000", "size", "" + size),
                100000, size, 105, last + 1, List.of());
        assertEquals(1, listQueries().size());
    }

    @Test
    void commercialReferenceIsLiteralCaseSensitiveAndIndependentOfInternalId() throws Exception {
        assertEquals(List.of(historical), ids(page(cashierA, "saleNumber", "  S-12  ")));
        assertEquals(List.of(cashierBSale), ids(page(cashierB, "saleNumber", "S-1")));
        assertEquals(List.of(cashierBSale), ids(page(cashierB, "saleNumberPrefix", "S-1")));
        assertEquals(List.of(literal), ids(page(cashierA, "saleNumberPrefix", "S-12%_!")));
        assertEquals(List.of(literal), ids(page(cashierA, "saleNumber", "S-12%_!literal")));
        assertEquals(List.of(), ids(page(cashierA, "saleNumber", "" + historical)));
        assertEquals(List.of(), ids(page(cashierA, "saleNumberPrefix", "s-12")));
        assertEquals(List.of(), ids(page(cashierA, "saleNumberPrefix", "S-' OR 1=1 --")));
    }

    @Test
    void limaBoundsAndCommercialFiltersCompose() throws Exception {
        JsonNode day = page(admin, "from", "2031-02-01", "to", "2031-02-01",
                "createdBy", cashierA.username(), "cashRegisterSessionId", "" + cashierA.cash());
        assertEquals(List.of(noDocument, literal, historical), ids(day));
        assertEquals("2031-02-01T05:00:00Z", day.path("items").get(2).path("soldAt").asText());
        assertEquals(List.of(literal, historical), ids(page(cashierA, "from", "2031-02-01", "to", "2031-02-01",
                "status", "COMPLETED")));
        assertEquals(List.of(beforeDay), ids(page(cashierA, "to", "2031-01-31")));
        assertEquals(List.of(afterDay), ids(page(cashierA, "from", "2031-02-02", "saleNumber", "RD1-AFTER")));
    }

    @Test
    void filterUsesExactlyTheLatestDocumentIncludingCancelled() throws Exception {
        JsonNode cancelled = page(admin, "saleNumberPrefix", "S-12", "documentStatus", "CANCELLED");
        assertPage(cancelled, 0, 20, 1, 1, List.of(historical));
        JsonNode summary = cancelled.path("items").get(0).path("billingSummary");
        assertTrue(summary.path("hasElectronicDocument").asBoolean());
        assertEquals(latestCancelled, summary.path("documentId").asLong());
        assertEquals("CANCELLED", summary.path("status").asText());
        assertEquals("RECEIPT", summary.path("documentType").asText());
        assertEquals("RD1-2", summary.path("fullNumber").asText());
        assertEquals("LOCAL", summary.path("environment").asText());

        assertPage(page(admin, "saleNumberPrefix", "S-12", "hasElectronicDocument", "true",
                "documentStatus", "ACCEPTED"), 0, 20, 1, 1, List.of(literal));
        assertPage(page(admin, "saleNumberPrefix", "S-12", "hasElectronicDocument", "true"),
                0, 20, 2, 1, List.of(literal, historical));
        JsonNode missing = page(admin, "saleNumberPrefix", "S-12", "hasElectronicDocument", "false");
        assertPage(missing, 0, 20, 1, 1, List.of(noDocument));
        JsonNode empty = missing.path("items").get(0).path("billingSummary");
        assertFalse(empty.path("hasElectronicDocument").asBoolean());
        for (String key : List.of("documentId", "documentType", "fullNumber", "status", "environment")) {
            assertTrue(empty.path(key).isNull());
        }

        // A higher ID with an older creation date must lose before applying the ID tie-break.
        long older = document(historical, 5, "CANCELLED", "2031-02-01T04:00:00Z");
        try {
            assertTrue(older > latestCancelled);
            JsonNode after = page(admin, "saleNumberPrefix", "S-12", "documentStatus", "CANCELLED");
            assertEquals(cancelled, after);
        } finally {
            jdbc.update("delete from electronic_documents where id = ?", older);
        }
    }

    @Test
    void roleAndOwnerScopeRestrictBothRowsAndTotals() throws Exception {
        assertPage(page(cashierA, "saleNumberPrefix", "S-1", "createdBy", cashierB.username()),
                0, 20, 3, 1, List.of(noDocument, literal, historical));
        assertPage(page(cashierB, "saleNumberPrefix", "S-1", "createdBy", cashierA.username()),
                0, 20, 1, 1, List.of(cashierBSale));
        assertPage(page(mixedAdmin, "saleNumberPrefix", "RD1-MIXED", "createdBy", mixedSupervisor.username()),
                0, 20, 1, 1, List.of(mixedAdminSale));
        assertPage(page(mixedSupervisor, "saleNumberPrefix", "RD1-MIXED", "createdBy", mixedAdmin.username()),
                0, 20, 1, 1, List.of(mixedSupervisorSale));
        assertPage(page(admin, "saleNumberPrefix", "RD1-MIXED"),
                0, 20, 2, 1, List.of(mixedSupervisorSale, mixedAdminSale));
        assertPage(page(supervisor, "createdBy", cashierB.username()), 0, 20, 1, 1, List.of(cashierBSale));

        JsonNode absent = page(cashierA, "saleNumber", "DOES-NOT-EXIST");
        assertPage(absent, 0, 20, 0, 0, List.of());
        assertEquals(absent, page(cashierA, "saleNumber", "S-1"));
        assertEquals(absent, page(cashierA, "cashRegisterSessionId", "" + cashierB.cash()));
        assertEquals(absent, page(cashierA, "documentStatus", "REJECTED"));
    }

    @Test
    void unauthorizedRequestsAndLegacyDetailNeverReturnForeignData() throws Exception {
        clearInvocations(salesSql);
        http.perform(get(URL)).andExpect(status().isUnauthorized());
        http.perform(request(warehouseUser, URL)).andExpect(status().isForbidden());
        http.perform(get(URL).with(user("unresolved").roles("ADMIN"))).andExpect(status().isForbidden());
        assertTrue(listQueries().isEmpty());
        http.perform(request(cashierA, "/api/v1/sales/" + cashierBSale)).andExpect(status().isUnprocessableEntity());
    }

    @ParameterizedTest
    @CsvSource({
            "page,-1", "page,100001", "page,99999999999999", "size,21", "size,abc",
            "from,2031-02-30", "to,2031-2-01", "status,INVALID", "documentStatus,INVALID",
            "hasElectronicDocument,1", "cashRegisterSessionId,0",
            "saleNumberPrefix,S-", "saleNumber,abcdefghijklmnopqrstuvwxyz0123456789xxxxx"
    })
    void invalidParameterGivesSafeBadRequest(String key, String value) throws Exception {
        clearInvocations(salesSql);
        var response = http.perform(request(cashierA, URL).param(key, value)).andExpect(status().isBadRequest())
                .andReturn().getResponse();
        JsonNode error = json.readTree(response.getContentAsString());
        assertEquals("Invalid parameter: " + key, error.path("message").asText());
        assertEquals(400, error.path("status").asInt());
        assertTrue(listQueries().isEmpty());
    }

    @Test
    void conflictingParametersReturnDefinedStatusWithoutSql() throws Exception {
        clearInvocations(salesSql);
        http.perform(request(admin, URL).param("saleNumber", "S-12").param("saleNumberPrefix", "S-1"))
                .andExpect(status().isBadRequest());
        http.perform(request(admin, URL).param("page", "0", "1")).andExpect(status().isBadRequest());
        http.perform(request(admin, URL).param("from", "2031-02-02").param("to", "2031-02-01"))
                .andExpect(status().isUnprocessableEntity());
        http.perform(request(admin, URL).param("hasElectronicDocument", "false").param("documentStatus", "SENT"))
                .andExpect(status().isUnprocessableEntity());
        assertTrue(listQueries().isEmpty());
    }

    @Test
    void v1ContractsKeepArraysDetailAndTodayShape() throws Exception {
        String path = "/api/v1/sales";
        JsonNode legacy = body(http.perform(request(cashierA, path)
                .param("from", "2031-02-01").param("to", "2031-02-01"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(legacy.isArray());
        assertEquals(List.of(noDocument, literal, historical), itemIds(legacy));
        assertTrue(legacy.get(0).path("items").isArray());
        assertTrue(legacy.get(0).path("payments").isArray());
        JsonNode list = body(http.perform(request(cashierA, path + "/list-items")
                .param("from", "2031-02-01").param("to", "2031-02-01"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(list.isArray());
        assertEquals(body("""
                {"id":%d,"saleNumber":"S-12","soldAt":"2031-02-01T05:00:00Z","status":"COMPLETED",
                 "totalAmount":10.00,"createdBy":"%s","cashRegisterSessionId":%d,
                 "billingSummary":{"hasElectronicDocument":true,"documentId":%d,"documentType":"RECEIPT",
                                   "fullNumber":"RD1-2","status":"CANCELLED","environment":"LOCAL"}}
                """.formatted(historical, cashierA.username(), cashierA.cash(), latestCancelled)), list.get(2));
        assertEquals(body("""
                {"hasElectronicDocument":false,"documentId":null,"documentType":null,
                 "fullNumber":null,"status":null,"environment":null}
                """), list.get(0).path("billingSummary"));
        assertEquals(page(cashierA, "from", "2031-02-01", "to", "2031-02-01").path("items"), list);
        JsonNode detail = body(http.perform(request(cashierA, path + "/" + historical))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("S-12", detail.path("saleNumber").asText());
        assertTrue(detail.path("payments").isArray());
        JsonNode today = body(http.perform(request(cashierA, path + "/today"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("America/Lima", today.path("timeZone").asText());
        assertTrue(today.path("sales").isArray());
    }

    @Test
    void twoSqlReadsRegardlessOfPageSizeAndNoCommercialWrites() throws Exception {
        List<Map<String, Object>> before = salesSnapshot();
        var statistics = entities.unwrap(SessionFactory.class).getStatistics();
        boolean wasEnabled = statistics.isStatisticsEnabled();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            for (int size : List.of(20, 100)) {
                clearInvocations(salesSql);
                assertEquals(size, page(cashierA, "saleNumberPrefix", BULK_PREFIX, "size", "" + size).path("items").size());
                List<SqlCall> calls = listQueries();
                assertEquals(2, calls.size());
                assertFalse(calls.get(0).sql().contains("electronic_documents"));
                assertTrue(calls.get(1).sql().contains("LEFT JOIN LATERAL"));
                assertTrue(calls.get(1).sql().contains("LIMIT :size OFFSET :offset"));
                assertTrue(calls.stream().noneMatch(call -> call.sql().contains("sale_items") || call.sql().contains("sale_payments")));
            }
            String saleEntity = "com.erppos.backend.erp.sales.infrastructure.persistence.SaleEntity";
            assertEquals(0, statistics.getEntityStatistics(saleEntity).getLoadCount());
            assertEquals(0, statistics.getCollectionStatistics(saleEntity + ".items").getLoadCount());
            assertEquals(0, statistics.getCollectionStatistics(saleEntity + ".payments").getLoadCount());
        } finally {
            statistics.setStatisticsEnabled(wasEnabled);
        }
        assertEquals(before, salesSnapshot());
    }

    @Test
    void countAndPageUseOneReadOnlySnapshotWhileAnotherConnectionCommits() throws Exception {
        String newNumber = "RD1-BULK-NEW";
        doAnswer(invocation -> {
            Long total = (Long) invocation.callRealMethod();
            assertEquals("on", jdbc.queryForObject("show transaction_read_only", String.class));
            assertEquals("repeatable read", jdbc.queryForObject("show transaction_isolation", String.class));
            var snapshotPid = jdbc.queryForObject("select pg_backend_pid()", Integer.class);
            CompletableFuture.runAsync(() -> {
                assertNotEquals(snapshotPid, jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                sale(cashierA, newNumber, NEXT_DAY, "COMPLETED");
            }).get(4, TimeUnit.SECONDS);
            return total;
        }).when(salesSql).queryForObject(startsWith(COUNT), any(SqlParameterSource.class), eq(Long.class));
        try {
            try {
                JsonNode snapshot = page(cashierA, "saleNumberPrefix", BULK_PREFIX);
                assertPage(snapshot, 0, 20, 105, 6, orderedBulk.subList(0, 20));
            } finally {
                org.mockito.Mockito.reset(salesSql);
            }
            JsonNode next = page(cashierA, "saleNumberPrefix", BULK_PREFIX);
            assertEquals(106, next.path("totalItems").asLong());
            assertEquals(newNumber, next.path("items").get(0).path("saleNumber").asText());
            List<Long> previousSecondPage = orderedBulk.subList(20, 40);
            assertNotEquals(previousSecondPage,
                    ids(page(cashierA, "saleNumberPrefix", BULK_PREFIX, "page", "1")));
        } finally {
            jdbc.update("delete from sales where sale_number = ?", newNumber);
        }
    }

    @Test
    void explainsActualCountAndPageQueriesOnSyntheticPostgres() throws Exception {
        String prefix = "RD1-PLAN";
        bulk(cashierA, prefix, 20_000);
        try {
            jdbc.update("""
                    insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,
                        number,full_number,subtotal_amount,tax_amount,total_amount,created_by,updated_by)
                    select id,?,'RECEIPT','ACCEPTED','LOCAL','RD1',id,'RD1-PLAN-DOC-' || id,10,0,10,'fixture','fixture'
                    from sales where sale_number like 'RD1-PLAN%' and id % 20 = 0
                    """, series);
            jdbc.execute("analyze sales");
            jdbc.execute("analyze electronic_documents");
            explain("first", admin);
            explain("deep-owner-prefix", cashierA, "saleNumberPrefix", prefix, "page", "500", "size", "20");
            explain("document-filter", cashierA, "saleNumberPrefix", prefix, "documentStatus", "ACCEPTED");
            explain("exact", cashierA, "saleNumber", prefix + "-1");
        } finally {
            jdbc.update("delete from electronic_documents where sale_id in (select id from sales where sale_number like 'RD1-PLAN%')");
            jdbc.update("delete from sales where sale_number like 'RD1-PLAN%'");
        }
    }

    private void explain(String scenario, Actor actor, String... params) throws Exception {
        clearInvocations(salesSql);
        assertFalse(page(actor, params).path("items").isEmpty());
        List<SqlCall> calls = listQueries();
        assertEquals(2, calls.size());
        var explainJdbc = new NamedParameterJdbcTemplate(jdbc);
        for (SqlCall call : calls) {
            String plan = explainJdbc.queryForObject("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + call.sql(),
                    call.parameters(), String.class);
            JsonNode result = json.readTree(plan).get(0);
            JsonNode root = result.path("Plan");
            assertTrue(result.has("Execution Time"));
            System.out.printf("RD1 EXPLAIN %-17s %-5s %8.3f ms | rows=%d | shared hit/read=%d/%d | %s%n",
                    scenario, call.sql().startsWith(COUNT) ? "count" : "page", result.path("Execution Time").asDouble(),
                    root.path("Actual Rows").asInt(), root.path("Shared Hit Blocks").asInt(),
                    root.path("Shared Read Blocks").asInt(), root.path("Node Type").asText());
        }
    }

    private List<SqlCall> listQueries() {
        return mockingDetails(salesSql).getInvocations().stream()
                .filter(invocation -> invocation.getArguments().length == 3)
                .filter(invocation -> invocation.getArgument(0) instanceof String sql
                        && ((sql.startsWith(COUNT) && invocation.getArgument(2) == Long.class)
                        || (sql.startsWith(CONTENT) && invocation.getMethod().getName().equals("query"))))
                .map(invocation -> new SqlCall(invocation.getArgument(0),
                        Map.copyOf(invocation.<MapSqlParameterSource>getArgument(1).getValues())))
                .toList();
    }

    private List<Map<String, Object>> salesSnapshot() {
        return jdbc.queryForList("""
                select s.id, s.xmin::text as version, s.status, s.total_amount, c.xmin::text as cash_version
                from sales s join cash_register_sessions c on c.id=s.cash_register_session_id
                where s.created_by=? order by s.id
                """, cashierA.username());
    }

    private JsonNode page(Actor actor, String... params) throws Exception {
        var get = request(actor, URL);
        for (int i = 0; i < params.length; i += 2) {
            get.param(params[i], params[i + 1]);
        }
        return body(http.perform(get).andExpect(status().isOk()).andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn().getResponse().getContentAsString());
    }

    private JsonNode body(String content) throws Exception {
        return json.readTree(content);
    }

    private static MockHttpServletRequestBuilder request(Actor actor, String path) {
        return get(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + actor.token());
    }

    private static void assertPage(JsonNode response, int page, int size, long total, int pages, List<Long> expected) {
        assertEquals(page, response.path("page").asInt());
        assertEquals(size, response.path("size").asInt());
        assertEquals(total, response.path("totalItems").asLong());
        assertEquals(pages, response.path("totalPages").asInt());
        assertEquals(expected, ids(response));
    }

    private static List<Long> ids(JsonNode response) {
        return itemIds(response.path("items"));
    }

    private static List<Long> itemIds(JsonNode items) {
        List<Long> ids = new ArrayList<>();
        items.forEach(item -> ids.add(item.path("id").asLong()));
        return ids;
    }

    private Actor actor(String name, String... roles) throws Exception {
        UUID id = UUID.randomUUID();
        String username = "rd1_" + name;
        String email = username + "@synthetic.invalid";
        String secret = "Rd1!" + UUID.randomUUID();
        jdbc.update("insert into users(id,username,email,password_hash,active) values(?,?,?,?,true)",
                id, username, email, passwords.encode(secret));
        for (String role : roles) {
            assertEquals(1, jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name=?", id, role));
        }
        long cash = jdbc.queryForObject("""
                insert into cash_register_sessions(opened_by_user_id,opened_at,closed_at,opening_amount,status)
                values(?,now(),now(),0,'CLOSED') returning id
                """, Long.class, id);
        var payload = json.createObjectNode().put("usernameOrEmail", email).put("password", secret);
        var login = http.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString())).andExpect(status().isOk()).andReturn();
        return new Actor(username, cash, body(login.getResponse().getContentAsString()).path("accessToken").asText());
    }

    private long sale(Actor owner, String number, String soldAt, String saleStatus) {
        return jdbc.queryForObject("""
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                    total_amount,paid_amount,change_amount,sold_at,created_by)
                values(?,?,?,?,10,0,10,10,0,?,?) returning id
                """, Long.class, owner.cash(), warehouse, number, saleStatus, OffsetDateTime.parse(soldAt), owner.username());
    }

    private void bulk(Actor owner, String prefix, int count) {
        assertEquals(count, jdbc.update("""
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                    total_amount,paid_amount,change_amount,sold_at,created_by)
                select ?,?,? || '-' || g,'COMPLETED',10,0,10,10,0,?,?
                from generate_series(1,?) g
                """, owner.cash(), warehouse, prefix, OffsetDateTime.parse(NEXT_DAY), owner.username(), count));
    }

    private long document(long sale, int number, String state, String createdAt) {
        return jdbc.queryForObject("""
                insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,
                    number,full_number,subtotal_amount,tax_amount,total_amount,created_by,updated_by,created_at)
                values(?,?,'RECEIPT',?,'LOCAL','RD1',?,?,10,0,10,'another_operator','fixture',?) returning id
                """, Long.class, sale, series, state, number, "RD1-" + number, OffsetDateTime.parse(createdAt));
    }

    private record Actor(String username, long cash, String token) {}
    private record SqlCall(String sql, Map<String, Object> parameters) {}
}
