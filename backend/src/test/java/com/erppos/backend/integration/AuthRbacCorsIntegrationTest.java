package com.erppos.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthRbacCorsIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldReturnHealthAndHealthDbUp() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));

        mockMvc.perform(get("/api/v1/health/db"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void shouldLoginAndResolveCurrentUserWithToken() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        MvcResult meResult = mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(ADMIN_EMAIL))
                .andExpect(jsonPath("$.roles").isArray())
                .andReturn();

        assertNotNull(readJson(meResult).path("roles"));
        assertTrue(readJson(meResult).path("roles").toString().contains("ADMIN"));
    }

    @Test
    void shouldReturn401ForCurrentUserWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldEnforceRbacWithReal403Cases() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String cajeroToken = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        String almaceneroToken = login(ALMACENERO_EMAIL, ALMACENERO_PASSWORD);
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);

        mockMvc.perform(get("/api/v1/integrations/outbox-events")
                        .header(HttpHeaders.AUTHORIZATION, bearer(cajeroToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/quotes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(almaceneroToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/integrations/outbox-events")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/integrations/outbox-events")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test
    void shouldApplyCorsPolicyForAllowedAndBlockedOrigins() throws Exception {
        MvcResult localhostPreflight = preflight("http://localhost:4200");
        MvcResult loopbackPreflight = preflight("http://127.0.0.1:4200");
        MvcResult blockedPreflight = preflight("http://evil.local:4200");

        assertEquals(200, localhostPreflight.getResponse().getStatus());
        assertEquals("http://localhost:4200", localhostPreflight.getResponse().getHeader("Access-Control-Allow-Origin"));

        assertEquals(200, loopbackPreflight.getResponse().getStatus());
        assertEquals("http://127.0.0.1:4200", loopbackPreflight.getResponse().getHeader("Access-Control-Allow-Origin"));

        assertTrue(blockedPreflight.getResponse().getStatus() == 403 || blockedPreflight.getResponse().getStatus() == 200);
        String blockedOriginHeader = blockedPreflight.getResponse().getHeader("Access-Control-Allow-Origin");
        assertFalse("http://evil.local:4200".equals(blockedOriginHeader));
    }
}


