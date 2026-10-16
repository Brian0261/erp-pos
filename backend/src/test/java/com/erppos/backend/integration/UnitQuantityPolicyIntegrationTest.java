package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import javax.sql.DataSource;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Timeout(45)
class UnitQuantityPolicyIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;

    @Test
    void creationAndClassificationContractsPreserveLegacyAndRbac() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        ObjectNode payload = objectMapper.createObjectNode().put("code", "UP" + suffix).put("name", "Synthetic unit");
        mockMvc.perform(post("/api/v1/units").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isBadRequest());
        payload.put("quantityPolicy", "UNKNOWN");
        mockMvc.perform(post("/api/v1/units").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isBadRequest());
        payload.put("quantityPolicy", "LEGACY_UNCLASSIFIED");
        mockMvc.perform(post("/api/v1/units").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isUnprocessableEntity());
        payload.put("quantityPolicy", "DECIMAL_2");
        MvcResult result = mockMvc.perform(post("/api/v1/units").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isCreated()).andReturn();
        long id = readJson(result).path("id").asLong();
        assertEquals("DECIMAL_2", readJson(result).path("quantityPolicy").asText());
        for (boolean explicitNull : new boolean[]{false, true}) {
            payload.remove("quantityPolicy");
            if (explicitNull) payload.putNull("quantityPolicy");
            mockMvc.perform(put("/api/v1/units/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isOk())
                    .andExpect(jsonPath("$.quantityPolicy").value("DECIMAL_2"));
        }
        payload.put("quantityPolicy", "LEGACY_UNCLASSIFIED");
        mockMvc.perform(put("/api/v1/units/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isUnprocessableEntity());
        assertEquals("DECIMAL_2", jdbc.queryForObject("SELECT quantity_policy FROM units WHERE id=?", String.class, id));
        String cashier = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        mockMvc.perform(put("/api/v1/units/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(cashier))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/units")).andExpect(status().isUnauthorized());
        jdbc.update("UPDATE units SET quantity_policy=NULL WHERE id=?", id);
        payload.remove("quantityPolicy");
        mockMvc.perform(put("/api/v1/units/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andExpect(status().isOk())
                .andExpect(jsonPath("$.quantityPolicy").value("LEGACY_UNCLASSIFIED"));
        assertNull(jdbc.queryForObject("SELECT quantity_policy FROM units WHERE id=?", String.class, id));
    }

    @Test
    void concurrentClassificationAndStatusBothLockBeforeReading() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        long id = createUnit(token, suffix);
        ObjectNode update = objectMapper.createObjectNode().put("code", "UIT" + suffix)
                .put("name", "Concurrent synthetic unit").put("quantityPolicy", "DECIMAL_2");
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch started = new CountDownLatch(2);
        try (var holder = dataSource.getConnection()) {
            holder.setAutoCommit(false);
            try (var statement = holder.prepareStatement("SELECT id FROM units WHERE id=? FOR UPDATE")) {
                statement.setLong(1, id); statement.executeQuery().close();
            }
            var classify = executor.submit(() -> {
                started.countDown();
                return mockMvc.perform(put("/api/v1/units/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(update.toString())).andReturn().getResponse().getStatus();
            });
            var deactivate = executor.submit(() -> {
                started.countDown();
                return mockMvc.perform(patch("/api/v1/units/{id}/status", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andReturn().getResponse().getStatus();
            });
            assertTrue(started.await(5, TimeUnit.SECONDS));
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
            int waiting;
            do {
                waiting = jdbc.queryForObject("SELECT COUNT(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%units%'", Integer.class);
                if (waiting < 2) Thread.sleep(10);
            } while (waiting < 2 && System.nanoTime() < deadline);
            assertEquals(2, waiting, "Both administrative mutations must block before reading the unit");
            holder.commit();
            assertEquals(200, classify.get(8, TimeUnit.SECONDS));
            assertEquals(200, deactivate.get(8, TimeUnit.SECONDS));
            assertEquals("DECIMAL_2", jdbc.queryForObject("SELECT quantity_policy FROM units WHERE id=?", String.class, id));
            assertEquals(Boolean.FALSE, jdbc.queryForObject("SELECT active FROM units WHERE id=?", Boolean.class, id));
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
        }
    }
}
