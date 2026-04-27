package com.erppos.backend.erp.shared;

import com.erppos.backend.erp.shared.adapter.rest.HealthController;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HealthControllerTest {

    @Test
    void shouldReturnHealthUp() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        HealthController controller = new HealthController(jdbcTemplate);

        ResponseEntity<Map<String, Object>> response = controller.health();
        assertEquals(200, response.getStatusCode().value());
        assertEquals("UP", response.getBody().get("status"));
    }

    @Test
    void shouldReturnDbHealthUp() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("select 1", Integer.class)).thenReturn(1);
        HealthController controller = new HealthController(jdbcTemplate);

        ResponseEntity<Map<String, Object>> response = controller.db();
        assertEquals(200, response.getStatusCode().value());
        assertEquals("UP", response.getBody().get("status"));
    }
}

