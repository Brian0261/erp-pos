package com.erppos.backend.erp.shared.adapter.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "backend",
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/db")
    public ResponseEntity<Map<String, Object>> db() {
        Integer result = jdbcTemplate.queryForObject("select 1", Integer.class);
        String status = (result != null && result == 1) ? "UP" : "DOWN";
        return ResponseEntity.ok(Map.of(
                "status", status,
                "database", "postgresql",
                "timestamp", Instant.now().toString()
        ));
    }
}

