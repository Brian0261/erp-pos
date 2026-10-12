package com.erppos.backend.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.sql.DataSource;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** Mandatory before Spring Security and controllers, only registered by the test launcher. */
public final class E2eQaReadOnlyFilter extends OncePerRequestFilter {
    public static final String DIAGNOSTIC = "/api/v1/health/e2e-identity";
    public static final Set<String> READS = Set.of("/api/v1/auth/me", "/api/v1/warehouses", "/api/v1/billing/series",
            "/api/v1/cash-registers/current", "/api/v1/pos/products/search", "/api/v1/pos/products/lookup",
            "/api/v1/sales", "/api/v1/quotes", "/api/v1/billing/documents", "/api/v1/inventory/stocks",
            "/api/v2/inventory/stocks");
    private final E2eQaConfiguration.Identity identity;
    private final DataSource datasource;
    private final AtomicBoolean ready;
    private final ObjectMapper mapper;
    private final AtomicInteger violations = new AtomicInteger();

    public E2eQaReadOnlyFilter(E2eQaConfiguration.Identity identity, DataSource datasource, AtomicBoolean ready, ObjectMapper mapper) {
        this.identity = identity; this.datasource = datasource; this.ready = ready; this.mapper = mapper;
    }

    public static boolean allowed(String method, String path) {
        return ("POST".equals(method) && "/api/v1/auth/login".equals(path))
                || ("GET".equals(method) && READS.contains(path));
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("X-QA-Run-Id", identity.runId());
        response.setHeader("X-QA-No-Write", "enforced");
        if ("GET".equals(request.getMethod()) && DIAGNOSTIC.equals(request.getRequestURI())) {
            try {
                try (var connection = datasource.getConnection()) { identity.verifyConnection(connection); }
                var jdbc = new JdbcTemplate(datasource);
                response.setStatus(ready.get() ? 200 : 503);
                response.setContentType("application/json");
                var diagnostic = new java.util.LinkedHashMap<String, Object>(Map.of(
                        "runId", identity.runId(), "profile", "e2e-qa", "database", identity.database(),
                        "dbUser", identity.dbUser(), "systemId", identity.systemId(), "markerMatched", true,
                        "filter", "enforced", "violations", violations.get(), "ready", ready.get(),
                        "commercialRows", ready.get() ? jdbc.queryForObject("select (select count(*) from sales) + "
                                + "(select count(*) from cash_register_sessions) + (select count(*) from electronic_documents) + "
                                + "(select count(*) from inventory_movements)", Long.class) : -1));
                diagnostic.put("pid", ProcessHandle.current().pid());
                diagnostic.put("proxyRunId", java.util.Objects.toString(request.getHeader("X-QA-Proxy-Run"), ""));
                diagnostic.put("stock", ready.get() ? jdbc.queryForObject("select quantity from stock_balances sb join products p on p.id=sb.product_id where p.sku=?", java.math.BigDecimal.class, "QA-" + identity.runId()) : null);
                mapper.writeValue(response.getOutputStream(), diagnostic);
            } catch (Exception ignored) { response.setStatus(503); }
            return;
        }
        if (!ready.get()) { response.setStatus(503); return; }
        if (!allowed(request.getMethod(), request.getRequestURI())) {
            violations.incrementAndGet(); response.setStatus(405);
            response.setContentType("application/json"); response.getWriter().write("{\"code\":\"QA_NO_WRITE_DENIED\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
