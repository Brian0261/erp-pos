package com.erppos.backend.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class E2eQaSafetyTest {
    private Map<String, String> environment() {
        String id = "a".repeat(24);
        return new HashMap<>(Map.of("QA_RUN_ID", id, "QA_MARKER", "b".repeat(64), "QA_SYSTEM_ID", "12345",
                "QA_DB_NAME", "qa_" + id, "QA_DB_USER", "qa_" + id, "QA_DB_PASSWORD", "c".repeat(48),
                "E2E_QA_USER", "qa_" + id, "E2E_QA_PASSWORD", "d".repeat(48), "QA_JWT_SECRET", "e".repeat(64)));
    }
    @Test void inheritedConfigurationCannotRedirectStartup() {
        for (String key : new String[]{"SPRING_DATASOURCE_URL", "DB_HOST", "E2E_ALLOW_WRITES", "E2E_ALLOW_STAGING",
                "QA_DATASOURCE_URL", "JAVA_TOOL_OPTIONS", "SPRING_PROFILES_ACTIVE"}) {
            var env = environment(); env.put(key, "unsafe");
            assertThrows(IllegalStateException.class, () -> E2eQaConfiguration.Identity.from(env));
        }
    }
    @Test void missingIdentityCannotStart() {
        var env = environment(); env.remove("QA_MARKER");
        assertThrows(IllegalStateException.class, () -> E2eQaConfiguration.Identity.from(env));
    }
    @Test void databaseAndUserMustBelongToRun() {
        for (String key : new String[]{"QA_DB_NAME", "QA_DB_USER", "E2E_QA_USER"}) {
            var env = environment(); env.put(key, "unowned");
            assertThrows(IllegalStateException.class, () -> E2eQaConfiguration.Identity.from(env));
        }
    }
    @Test void effectiveDatasourceIsCheckedBeforeAnyStatement() throws Exception {
        var id = E2eQaConfiguration.Identity.from(environment());
        var connection = mock(Connection.class); var metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata); when(metadata.getURL()).thenReturn("jdbc:postgresql://decoy/db");
        assertThrows(IllegalStateException.class, () -> id.verifyConnection(connection));
        verify(connection, never()).createStatement();
    }
    @Test void wrongDatabaseMarkerCannotPass() throws Exception {
        var id = E2eQaConfiguration.Identity.from(environment());
        var connection = mock(Connection.class); var metadata = mock(DatabaseMetaData.class);
        var statement = mock(Statement.class); var result = mock(ResultSet.class);
        when(connection.getMetaData()).thenReturn(metadata); when(metadata.getURL()).thenReturn(id.jdbcUrl());
        when(connection.createStatement()).thenReturn(statement); when(statement.executeQuery(anyString())).thenReturn(result);
        when(result.next()).thenReturn(true); when(result.getString(1)).thenReturn(id.database());
        when(result.getString(2)).thenReturn(id.dbUser()); when(result.getString(3)).thenReturn("wrong");
        assertThrows(IllegalStateException.class, () -> id.verifyConnection(connection));
        verify(connection).setReadOnly(true); verify(statement, never()).executeUpdate(anyString());
    }
    @Test void mutationsNeverReachBusinessChain() throws Exception {
        var filter = new E2eQaReadOnlyFilter(E2eQaConfiguration.Identity.from(environment()), mock(DataSource.class),
                new AtomicBoolean(true), new ObjectMapper());
        for (String method : new String[]{"POST", "PUT", "PATCH", "DELETE", "TRACE"}) {
            var request = new MockHttpServletRequest(method, "/api/v1/sales");
            var response = new MockHttpServletResponse(); var chain = mock(jakarta.servlet.FilterChain.class);
            filter.doFilter(request, response, chain);
            assertEquals(405, response.getStatus()); assertEquals("enforced", response.getHeader("X-QA-No-Write"));
            verifyNoInteractions(chain);
        }
    }
    @Test void loginStillTraversesRealSecurityChain() throws Exception {
        var filter = new E2eQaReadOnlyFilter(E2eQaConfiguration.Identity.from(environment()), mock(DataSource.class),
                new AtomicBoolean(true), new ObjectMapper());
        var request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        var response = new MockHttpServletResponse(); var chain = mock(jakarta.servlet.FilterChain.class);
        filter.doFilter(request, response, chain); verify(chain).doFilter(request, response);
    }
    @Test void unknownReadsAndStartupRequestsAreDenied() throws Exception {
        assertFalse(E2eQaReadOnlyFilter.allowed("GET", "/api/v1/billing/documents/1/xml"));
        var filter = new E2eQaReadOnlyFilter(E2eQaConfiguration.Identity.from(environment()), mock(DataSource.class),
                new AtomicBoolean(false), new ObjectMapper());
        var response = new MockHttpServletResponse(); var chain = mock(jakarta.servlet.FilterChain.class);
        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/auth/login"), response, chain);
        assertEquals(503, response.getStatus()); verifyNoInteractions(chain);
    }
}
