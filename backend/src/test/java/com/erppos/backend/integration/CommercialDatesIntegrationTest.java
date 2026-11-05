package com.erppos.backend.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** Synthetic records in the inherited PostgreSQL 16 Testcontainer; every fixture rolls back. */
@Transactional
class CommercialDatesIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    private long cash;
    private long product;
    private final List<Long> ids = new ArrayList<>();
    private final List<Instant> instants = new ArrayList<>();

    private void fixture() throws Exception {
        String admin=login(ADMIN_EMAIL,ADMIN_PASSWORD), suffix="F3"+System.nanoTime();
        product=createProduct(admin,createCategory(admin,suffix),createUnit(admin,suffix),suffix,new java.math.BigDecimal("10.00"));
        cash = jdbc.queryForObject("insert into cash_register_sessions(opened_by_user_id,opened_at,closed_at,opening_amount,status) select id,now(),now(),0,'CLOSED' from users where email=? returning id", Long.class, ADMIN_EMAIL);
        add("2032-12-31T04:59:59.999999Z", "COMPLETED", "f3.other");
        add("2032-12-31T05:00:00Z", "COMPLETED", "cajero");
        add("2033-01-01T04:59:59.999999Z", "COMPLETED", "f3.other");
        add("2033-01-01T05:00:00Z", "COMPLETED", "f3.other");
        add("2032-12-31T06:00:00Z", "VOIDED", "f3.other");
    }
    private void add(String at, String status, String owner) {
        Instant instant = Instant.parse(at);
        long id = jdbc.queryForObject("insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,total_amount,paid_amount,change_amount,sold_at,voided_at,created_by) values (?,(select min(id) from warehouses),?,?,10,0,10,14,4,?,?,?) returning id", Long.class,
                cash, "F3-" + UUID.randomUUID(), status, OffsetDateTime.parse(at), status.equals("VOIDED") ? OffsetDateTime.parse("2033-02-01T05:00:00Z") : null, owner);
        jdbc.update("insert into sale_items(sale_id,product_id,quantity,unit_price,discount_amount,line_total) values (?,?,1,10,0,10)", id, product);
        jdbc.update("insert into sale_payments(sale_id,payment_method,amount) values (?,'CASH',8),(?,'CARD',6)", id, id);
        ids.add(id); instants.add(instant);
    }
    private com.fasterxml.jackson.databind.JsonNode read(String route, String token, String... params) throws Exception {
        var request = get(route).header(HttpHeaders.AUTHORIZATION, bearer(token));
        for (int i=0;i<params.length;i+=2) request.param(params[i],params[i+1]);
        var result=mockMvc.perform(request).andReturn();
        assertEquals(200,result.getResponse().getStatus(),result.getResponse().getContentAsString());
        return readJson(result);
    }
    private List<Long> ids(com.fasterxml.jackson.databind.JsonNode rows) {
        List<Long> found=new ArrayList<>(); rows.forEach(row->found.add(row.path("id").asLong())); return found;
    }

    @ParameterizedTest @ValueSource(strings={"UTC","America/Lima","Asia/Tokyo"})
    void limaBoundariesReportsAndHistoryAreIndependentOfSessionZone(String zone) throws Exception {
        fixture(); jdbc.execute("set local time zone '"+zone+"'");
        String admin=login(ADMIN_EMAIL,ADMIN_PASSWORD);
        for(String route:List.of("/api/v1/sales","/api/v1/sales/list-items")) {
            assertEquals(List.of(ids.get(2),ids.get(4),ids.get(1)),ids(read(route,admin,"from","2032-12-31","to","2032-12-31","cashRegisterSessionId",""+cash)));
            assertEquals(List.of(ids.get(3)),ids(read(route,admin,"from","2033-01-01","to","2033-01-01","cashRegisterSessionId",""+cash)));
            assertEquals(List.of(ids.get(2),ids.get(1)),ids(read(route,admin,"from","2032-12-31","to","2032-12-31","status","COMPLETED","cashRegisterSessionId",""+cash)));
        }
        var report=read("/api/v1/reports/sales",admin,"from","2032-12-31","to","2032-12-31");
        assertEquals(20,report.path("totalSalesAmount").decimalValue().intValueExact());
        assertEquals(2,report.path("totalSalesCount").asInt()); assertEquals(1,report.path("voidedSalesCount").asInt());
        assertEquals(1,report.path("salesByDay").size()); assertEquals("2032-12-31",report.path("salesByDay").get(0).path("day").asText());
        assertEquals(2,report.path("salesByDay").get(0).path("salesCount").asInt());
        assertEquals(28,report.path("salesByPaymentMethod").findValues("amount").stream().mapToInt(n->n.decimalValue().intValueExact()).sum());
        var top=read("/api/v1/reports/top-products",admin,"from","2032-12-31","to","2032-12-31");
        assertEquals(1,top.size());assertEquals(2,top.get(0).path("quantitySold").asInt());assertEquals(20,top.get(0).path("totalAmount").asInt());
        for(int i=0;i<ids.size();i++) assertEquals(instants.get(i),jdbc.queryForObject("select sold_at from sales where id=?",OffsetDateTime.class,ids.get(i)).toInstant());
        assertEquals("timestamp with time zone",jdbc.queryForObject("select data_type from information_schema.columns where table_name='sales' and column_name='sold_at'",String.class));
        jdbc.execute("set local enable_seqscan=off");
        String plan=String.join("\n",jdbc.queryForList("explain select id from sales where sold_at >= ? and sold_at < ?",String.class,OffsetDateTime.parse("2032-12-31T05:00:00Z"),OffsetDateTime.parse("2033-01-01T05:00:00Z")));
        assertTrue(plan.contains("idx_sales_sold_at"),plan);
    }

    @Test void partialRangesActorFiltersAndPermissionsRemainIntact() throws Exception {
        fixture();String admin=login(ADMIN_EMAIL,ADMIN_PASSWORD),cashier=login(CAJERO_EMAIL,CAJERO_PASSWORD);
        assertEquals(5,read("/api/v1/sales",admin,"cashRegisterSessionId",""+cash).size());
        assertEquals(4,read("/api/v1/sales",admin,"from","2032-12-31","cashRegisterSessionId",""+cash).size());
        assertEquals(4,read("/api/v1/sales",admin,"to","2032-12-31","cashRegisterSessionId",""+cash).size());
        String username=jdbc.queryForObject("select username from users where email=?",String.class,CAJERO_EMAIL);
        jdbc.update("update sales set created_by=? where id=?",username,ids.get(1));
        assertEquals(List.of(ids.get(1)),ids(read("/api/v1/sales/list-items",cashier,"createdBy","f3.other","cashRegisterSessionId",""+cash)));
        assertEquals(List.of(ids.get(1)),ids(read("/api/v1/sales",admin,"createdBy",username,"cashRegisterSessionId",""+cash)));
        assertEquals(401,mockMvc.perform(get("/api/v1/sales")).andReturn().getResponse().getStatus());
        assertEquals(403,mockMvc.perform(get("/api/v1/reports/sales").header(HttpHeaders.AUTHORIZATION,bearer(cashier))).andReturn().getResponse().getStatus());
    }

    @Test void invalidDatesHaveSafe400AndInvertedRanges422() throws Exception {
        String admin=login(ADMIN_EMAIL,ADMIN_PASSWORD);
        for(String route:List.of("/api/v1/sales","/api/v1/sales/list-items","/api/v1/reports/sales","/api/v1/reports/top-products")) {
            for(String date:List.of("bad-date","2032-02-30")) {
                var result=mockMvc.perform(get(route).header(HttpHeaders.AUTHORIZATION,bearer(admin)).param("from",date)).andReturn();
                assertEquals(400,result.getResponse().getStatus(),route+" "+date);
                assertFalse(result.getResponse().getContentAsString().contains("java.time"));
            }
            assertEquals(422,mockMvc.perform(get(route).header(HttpHeaders.AUTHORIZATION,bearer(admin)).param("from","2033-01-02").param("to","2033-01-01")).andReturn().getResponse().getStatus());
        }
    }

    @Test void todayUsesServerDayWithNoStoreAndPreservesPermissions() throws Exception {
        fixture();String admin=login(ADMIN_EMAIL,ADMIN_PASSWORD),cashier=login(CAJERO_EMAIL,CAJERO_PASSWORD);
        var empty=read("/api/v1/sales/today",admin);
        assertEquals("America/Lima",empty.path("timeZone").asText());assertTrue(empty.path("sales").isEmpty());
        var day=java.time.LocalDate.parse(empty.path("businessDate").asText());
        String username=jdbc.queryForObject("select username from users where email=?",String.class,CAJERO_EMAIL);
        // Cover adjacent days too, so this fixture cannot race the real test-server midnight.
        for(int delta=-1;delta<=1;delta++) {
            String at=day.plusDays(delta).atTime(12,0).atZone(java.time.ZoneId.of("America/Lima")).toInstant().toString();
            add(at,"COMPLETED",username);add(at,"COMPLETED","f3.other");
        }
        for(String token:List.of(admin,cashier)) {
            var response=mockMvc.perform(get("/api/v1/sales/today").header(HttpHeaders.AUTHORIZATION,bearer(token))
                    .param("createdBy","f3.other").param("from","2000-01-01")).andReturn();
            assertEquals(200,response.getResponse().getStatus());assertEquals("no-store",response.getResponse().getHeader("Cache-Control"));
            var body=readJson(response);Instant reference=Instant.parse(body.path("referenceInstant").asText());
            var selected=reference.atZone(java.time.ZoneId.of("America/Lima")).toLocalDate();
            assertEquals(selected.toString(),body.path("businessDate").asText());
            assertEquals(selected.plusDays(1).atStartOfDay(java.time.ZoneId.of("America/Lima")).toInstant(),Instant.parse(body.path("nextDayStartsAt").asText()));
            assertEquals(token.equals(cashier)?1:2,body.path("sales").size());
            if(token.equals(cashier)) body.path("sales").forEach(sale->assertEquals(username,sale.path("createdBy").asText()));
        }
        assertEquals(401,mockMvc.perform(get("/api/v1/sales/today")).andReturn().getResponse().getStatus());
        String warehouseUser=login(ALMACENERO_EMAIL,ALMACENERO_PASSWORD);
        assertEquals(403,mockMvc.perform(get("/api/v1/sales/today").header(HttpHeaders.AUTHORIZATION,bearer(warehouseUser))).andReturn().getResponse().getStatus());
    }
}
