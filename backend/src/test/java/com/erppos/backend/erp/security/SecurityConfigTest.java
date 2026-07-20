package com.erppos.backend.erp.security;

import com.erppos.backend.erp.security.adapter.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class SecurityConfigTest {

    @Test
    void shouldLoadAllowedOriginsFromConfigurationCsv() {
        SecurityConfig securityConfig = new SecurityConfig(
                null,
                null,
                null,
                "http://localhost:4200, http://127.0.0.1:4200"
        );

        CorsConfiguration corsConfiguration = resolveCorsConfiguration(securityConfig);

        assertEquals(List.of("http://localhost:4200", "http://127.0.0.1:4200"), corsConfiguration.getAllowedOrigins());
    }

    @Test
    void shouldConfigureCorsPoliciesForJwtApi() {
        SecurityConfig securityConfig = new SecurityConfig(
                null,
                null,
                null,
                "http://localhost:4200,http://127.0.0.1:4200"
        );

        CorsConfiguration corsConfiguration = resolveCorsConfiguration(securityConfig);

        assertEquals(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"), corsConfiguration.getAllowedMethods());
        assertEquals(
                List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Trace-Id", "If-Match"),
                corsConfiguration.getAllowedHeaders()
        );
        assertEquals(List.of("ETag"), corsConfiguration.getExposedHeaders());
        assertFalse(Boolean.TRUE.equals(corsConfiguration.getAllowCredentials()));
    }

    private CorsConfiguration resolveCorsConfiguration(SecurityConfig securityConfig) {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/v1/auth/login");
        request.setRequestURI("/api/v1/auth/login");
        return source.getCorsConfiguration(request);
    }
}

