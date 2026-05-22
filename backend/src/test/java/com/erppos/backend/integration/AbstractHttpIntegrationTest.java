package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.cors.allowed-origins=http://localhost:4200,http://127.0.0.1:4200",
        "spring.flyway.placeholders.harden_default_seed_users=false",
        "spring.flyway.placeholders.harden_default_seed_users_include_admin=false"
})
abstract class AbstractHttpIntegrationTest {

    protected static final String ADMIN_EMAIL = "admin@erp.local";
    protected static final String ADMIN_PASSWORD = "Admin123!";
    protected static final String CAJERO_EMAIL = "cajero@erp.local";
    protected static final String CAJERO_PASSWORD = "Admin123*";
    protected static final String ALMACENERO_EMAIL = "almacenero@erp.local";
    protected static final String ALMACENERO_PASSWORD = "Admin123*";
    protected static final String SUPERVISOR_EMAIL = "supervisor@erp.local";
    protected static final String SUPERVISOR_PASSWORD = "Admin123*";

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void cleanupOpenCashSessionsForSharedSeedUsers() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String cajeroToken = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        ensureNoOpenCash(adminToken);
        ensureNoOpenCash(cajeroToken);
    }

    protected String login(String usernameOrEmail, String password) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("usernameOrEmail", usernameOrEmail);
        payload.put("password", password);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk())
                .andReturn();

        return readJson(result).path("accessToken").asText();
    }

    protected String bearer(String token) {
        return "Bearer " + token;
    }

    protected JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    protected long createCategory(String token, String suffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("name", "CAT-IT-" + suffix);
        payload.put("description", "Categoria IT BT-009 " + suffix);

        MvcResult result = mockMvc.perform(post("/api/v1/categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    protected long createUnit(String token, String suffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("code", "UIT" + suffix);
        payload.put("name", "Unidad IT " + suffix);

        MvcResult result = mockMvc.perform(post("/api/v1/units")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    protected long createWarehouse(String token, String suffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("code", "WIT" + suffix);
        payload.put("name", "Warehouse IT " + suffix);
        payload.put("type", "MAIN_WAREHOUSE");

        MvcResult result = mockMvc.perform(post("/api/v1/warehouses")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    protected long createProduct(String token, long categoryId, long unitId, String suffix, BigDecimal salePrice) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sku", "SKU-IT-" + suffix);
        payload.put("barcode", "BC-IT-" + suffix);
        payload.put("name", "Producto IT " + suffix);
        payload.put("description", "Producto controlado BT-009");
        payload.put("categoryId", categoryId);
        payload.put("unitId", unitId);
        payload.put("salePrice", salePrice);

        MvcResult result = mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    protected long openCash(String token, BigDecimal openingAmount, String noteSuffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("openingAmount", openingAmount);
        payload.put("notes", "Open IT " + noteSuffix);

        MvcResult result = mockMvc.perform(post("/api/v1/cash-registers/open")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    protected void closeCash(String token, long cashId, BigDecimal countedAmount, String noteSuffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("countedAmount", countedAmount);
        payload.put("notes", "Close IT " + noteSuffix);

        mockMvc.perform(post("/api/v1/cash-registers/{id}/close", cashId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    protected void registerInitialStock(String token, long productId, long warehouseId, BigDecimal quantity, String reason) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("productId", productId);
        payload.put("warehouseId", warehouseId);
        payload.put("quantity", quantity.stripTrailingZeros());
        payload.put("reason", reason);

        mockMvc.perform(post("/api/v1/inventory/initial-stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated());
    }

    protected long createQuote(String token, long productId, BigDecimal quantity, LocalDate expiresAt, String suffix) throws Exception {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("productId", productId);
        item.put("quantity", quantity);
        item.put("discountAmount", BigDecimal.ZERO);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("customerName", "Cliente IT " + suffix);
        payload.put("customerDocument", "DOC-IT-" + suffix);
        payload.put("customerPhone", "999000111");
        payload.put("customerEmail", "it+" + suffix + "@qa.local");
        payload.put("expiresAt", expiresAt.toString());
        payload.put("notes", "Quote IT BT-009");
        payload.putArray("items").add(item);

        MvcResult result = mockMvc.perform(post("/api/v1/quotes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    protected MvcResult convertQuoteToSale(String token, long quoteId, long warehouseId, BigDecimal paymentAmount, String suffix) throws Exception {
        ObjectNode payment = objectMapper.createObjectNode();
        payment.put("paymentMethod", "CASH");
        payment.put("amount", paymentAmount);
        payment.put("reference", "PAY-IT-" + suffix);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("warehouseId", warehouseId);
        payload.put("comment", "Convert IT " + suffix);
        payload.putArray("payments").add(payment);

        return mockMvc.perform(post("/api/v1/quotes/{id}/convert-to-sale", quoteId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andReturn();
    }

    protected void ensureNoOpenCash(String token) throws Exception {
        MvcResult current = mockMvc.perform(get("/api/v1/cash-registers/current")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andReturn();

        if (current.getResponse().getStatus() == 200) {
            long cashId = readJson(current).path("id").asLong();
            closeCash(token, cashId, BigDecimal.ZERO, "cleanup");
        }
    }

    protected MvcResult preflight(String origin) throws Exception {
        return mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, origin)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andReturn();
    }
}


