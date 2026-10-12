package com.erppos.backend.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.DriverManager;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@TestConfiguration(proxyBeanMethods = false)
public class E2eQaConfiguration {
    public record Identity(String runId, String marker, String systemId, String database, String dbUser,
                           String dbPassword, String username, String password, String jwtSecret) {
        private static final Set<String> KEYS = Set.of("QA_RUN_ID", "QA_MARKER", "QA_SYSTEM_ID", "QA_DB_NAME",
                "QA_DB_USER", "QA_DB_PASSWORD", "E2E_QA_USER", "E2E_QA_PASSWORD", "QA_JWT_SECRET");

        public static Identity from(Map<String, String> env) {
            for (var key : env.keySet()) {
                if ((key.startsWith("QA_") || key.startsWith("E2E_") || key.startsWith("SPRING_")
                        || key.startsWith("DB_") || key.startsWith("JWT_") || key.startsWith("BILLING_")
                        || key.equals("JAVA_TOOL_OPTIONS") || key.equals("_JAVA_OPTIONS")) && !KEYS.contains(key)) {
                    throw new IllegalStateException("QA_INHERITED_CONFIGURATION_REJECTED");
                }
            }
            for (var key : KEYS) if (env.getOrDefault(key, "").isBlank())
                throw new IllegalStateException("QA_IDENTITY_MISSING");
            var id = new Identity(env.get("QA_RUN_ID"), env.get("QA_MARKER"), env.get("QA_SYSTEM_ID"),
                    env.get("QA_DB_NAME"), env.get("QA_DB_USER"), env.get("QA_DB_PASSWORD"),
                    env.get("E2E_QA_USER"), env.get("E2E_QA_PASSWORD"), env.get("QA_JWT_SECRET"));
            if (!id.runId.matches("[a-f0-9]{24}") || !id.marker.matches("[a-f0-9]{64}")
                    || !id.systemId.matches("[0-9]+") || !id.database.equals("qa_" + id.runId)
                    || !id.dbUser.equals("qa_" + id.runId) || !id.username.equals("qa_" + id.runId)
                    || id.dbPassword.length() < 40 || id.password.length() < 40 || id.jwtSecret.length() < 64)
                throw new IllegalStateException("QA_IDENTITY_INVALID");
            return id;
        }

        public String jdbcUrl() { return "jdbc:postgresql://127.0.0.1:5432/" + database; }
        @Override public String toString() { return "QaIdentity[" + runId + "]"; }

        public void verifyDatabase() throws Exception {
            try (var connection = DriverManager.getConnection(jdbcUrl(), dbUser, dbPassword)) {
                verifyConnection(connection);
            }
        }

        public void verifyConnection(java.sql.Connection connection) throws Exception {
                if (!jdbcUrl().equals(connection.getMetaData().getURL()))
                    throw new IllegalStateException("QA_DATASOURCE_REJECTED");
                connection.setReadOnly(true);
                try (var statement = connection.createStatement(); var result = statement.executeQuery(
                        "select current_database(), current_user, current_setting('inktoy.qa_marker', true), "
                                + "current_setting('inktoy.qa_run_id', true), system_identifier::text, "
                                + "host(inet_server_addr()), inet_server_port() from pg_control_system()")) {
                    if (!result.next() || !database.equals(result.getString(1)) || !dbUser.equals(result.getString(2))
                            || !marker.equals(result.getString(3)) || !runId.equals(result.getString(4))
                            || !systemId.equals(result.getString(5)) || !"127.0.0.1".equals(result.getString(6))
                            || result.getInt(7) != 5432) throw new IllegalStateException("QA_DATABASE_IDENTITY_REJECTED");
                }
        }

        public Map<String, Object> properties() {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("server.address", "127.0.0.1"); p.put("server.port", 8080);
            p.put("spring.datasource.url", jdbcUrl()); p.put("spring.datasource.username", dbUser);
            p.put("spring.datasource.password", dbPassword); p.put("spring.flyway.url", jdbcUrl());
            p.put("spring.flyway.user", dbUser); p.put("spring.flyway.password", dbPassword);
            p.put("spring.jpa.hibernate.ddl-auto", "validate"); p.put("spring.flyway.enabled", true);
            p.put("app.security.jwt.secret", jwtSecret); p.put("app.security.jwt.expiration-ms", 3600000);
            p.put("app.security.cors.allowed-origins", "http://127.0.0.1:4201");
            p.put("billing.secrets.production-enabled", false); p.put("billing.electronic.provider", "MOCK");
            p.put("billing.signer.provider", "NOOP"); p.put("app.ecommerce.image-storage.provider", "none");
            p.put("spring.main.banner-mode", "off"); p.put("logging.level.root", "OFF");
            p.put("spring.devtools.restart.enabled", false);
            return p;
        }
    }

    @Bean Identity qaIdentity() { return Identity.from(System.getenv()); }

    @Bean DataSource qaDataSource(Identity identity) throws Exception {
        identity.verifyDatabase();
        var ds = new HikariDataSource();
        ds.setJdbcUrl(identity.jdbcUrl()); ds.setUsername(identity.dbUser()); ds.setPassword(identity.dbPassword());
        ds.setMaximumPoolSize(4); ds.setPoolName("qa-" + identity.runId());
        return ds;
    }

    @Bean AtomicBoolean qaReady() { return new AtomicBoolean(false); }

    @Bean FilterRegistrationBean<E2eQaReadOnlyFilter> qaFilter(Identity identity, DataSource ds,
            AtomicBoolean qaReady, ObjectMapper mapper) {
        var registration = new FilterRegistrationBean<>(new E2eQaReadOnlyFilter(identity, ds, qaReady, mapper));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE); registration.addUrlPatterns("/*");
        registration.setName("mandatory-qa-no-write");
        return registration;
    }

    @Bean ApplicationRunner qaFixtures(Identity id, DataSource ds, PasswordEncoder encoder, AtomicBoolean ready,
                                      org.springframework.core.env.Environment environment) {
        return args -> {
            if (!java.util.Arrays.equals(environment.getActiveProfiles(), new String[]{"e2e-qa"})
                    || !"127.0.0.1".equals(environment.getProperty("server.address"))
                    || !"8080".equals(environment.getProperty("server.port"))
                    || !id.jdbcUrl().equals(environment.getProperty("spring.datasource.url")))
                throw new IllegalStateException("QA_EFFECTIVE_CONFIGURATION_REJECTED");
            try (var connection = ds.getConnection()) { id.verifyConnection(connection); }
            var jdbc = new JdbcTemplate(ds);
            // Only the fresh, attested database is reachable from this network namespace.
            jdbc.update("update users set active=false");
            var user = UUID.randomUUID();
            jdbc.update("insert into users(id, username, email, password_hash, active) values (?,?,?,?,true)",
                    user, id.username(), id.username() + "@qa.invalid", encoder.encode(id.password()));
            jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name='CAJERO'", user);
            // A second synthetic user supports the real wrong-role negative test.
            var denied = UUID.randomUUID();
            jdbc.update("insert into users(id, username, email, password_hash, active) values (?,?,?,?,true)",
                    denied, "denied_" + id.runId(), "denied_" + id.runId() + "@qa.invalid", encoder.encode(id.password()));
            jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name='ALMACENERO'", denied);
            Long category = jdbc.queryForObject("insert into categories(name) values (?) returning id", Long.class, "QA-" + id.runId());
            Long unit = jdbc.queryForObject("insert into units(code,name) values (?,?) returning id", Long.class, "QAUNIT", "Unidad QA");
            jdbc.update("update warehouses set active=false");
            Long warehouse = jdbc.queryForObject("insert into warehouses(code,name,type) values (?,?,?) returning id", Long.class,
                    "QA-" + id.runId(), "Almacén QA", "STORE");
            Long product = jdbc.queryForObject("insert into products(sku,name,category_id,unit_id,sale_price) values (?,?,?,?,?) returning id",
                    Long.class, "QA-" + id.runId(), "Cartulina QA " + id.runId(), category, unit, 10);
            jdbc.update("insert into stock_balances(product_id,warehouse_id,quantity) values (?,?,10)", product, warehouse);
            ready.set(true);
            System.out.println("QA_BACKEND_READY " + id.runId());
        };
    }
}
