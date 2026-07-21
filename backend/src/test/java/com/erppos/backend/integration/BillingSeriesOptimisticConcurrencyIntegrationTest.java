package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.erppos.backend.erp.billing.infrastructure.persistence.BillingSeriesEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.OptimisticLockException;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BillingSeriesOptimisticConcurrencyIntegrationTest extends AbstractHttpIntegrationTest {

    private static final String ENDPOINT = "/api/v1/billing/series";
    private static final AtomicInteger SERIES_SEQUENCE = new AtomicInteger(800);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @PersistenceContext
    private EntityManager entityManager;

    private final List<Long> createdSeriesIds = Collections.synchronizedList(new ArrayList<>());

    @AfterEach
    void cleanupSeries() {
        for (int index = createdSeriesIds.size() - 1; index >= 0; index--) {
            jdbcTemplate.update("DELETE FROM billing_series WHERE id = ?", createdSeriesIds.get(index));
        }
        createdSeriesIds.clear();
    }

    @Test
    void shouldExposePersistedVersionAndStrongEtagAcrossRestMutations() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        assertEquals(0L, created.body().path("version").asLong());
        assertEquals(etag(created.id(), 0L), created.etag());

        MvcResult getResult = mockMvc.perform(get(ENDPOINT + "/{id}", created.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(0))
                .andReturn();
        assertEquals(created.etag(), getResult.getResponse().getHeader(HttpHeaders.ETAG));

        MvcResult listResult = mockMvc.perform(get(ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertNull(listResult.getResponse().getHeader(HttpHeaders.ETAG));
        assertTrue(readJson(listResult).valueStream()
                .anyMatch(item -> item.path("id").asLong() == created.id()
                        && item.path("version").asLong() == 0L));

        MvcResult update = update(
                token,
                created.id(),
                created.series(),
                11L,
                true,
                created.etag()
        );
        assertEquals(200, update.getResponse().getStatus());
        assertEquals(1L, readJson(update).path("version").asLong());
        assertEquals(etag(created.id(), 1L), update.getResponse().getHeader(HttpHeaders.ETAG));

        MvcResult deactivate = deactivate(
                token,
                created.id(),
                update.getResponse().getHeader(HttpHeaders.ETAG)
        );
        assertEquals(204, deactivate.getResponse().getStatus());
        assertEquals(etag(created.id(), 2L), deactivate.getResponse().getHeader(HttpHeaders.ETAG));
        assertEquals(2L, row(created.id()).version());
        assertFalse(row(created.id()).active());
    }

    @Test
    void putWithoutIfMatchShouldReturn428WithoutChangingTheSeries() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);
        SeriesRow before = row(created.id());

        MvcResult result = update(token, created.id(), created.series(), 11L, false, null);

        assertPreconditionRequired(result);
        assertEquals(before, row(created.id()));
    }

    @Test
    void reactivationWithoutIfMatchShouldReturn428WithoutChangingTheSeries() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);
        SeriesRow before = row(created.id());

        MvcResult result = update(token, created.id(), created.series(), 10L, true, null);

        assertPreconditionRequired(result);
        assertEquals(before, row(created.id()));
    }

    @Test
    void deleteWithoutIfMatchShouldReturn428WithoutChangingTheSeries() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, true);
        SeriesRow before = row(created.id());

        MvcResult result = deactivate(token, created.id(), null);

        assertPreconditionRequired(result);
        assertEquals(before, row(created.id()));
    }

    @Test
    void stalePutShouldReturn412WithoutChangingBusinessOrAuditFields() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        MvcResult accepted = update(
                token,
                created.id(),
                created.series(),
                11L,
                false,
                created.etag()
        );
        assertEquals(200, accepted.getResponse().getStatus());
        SeriesRow beforeStale = row(created.id());

        MvcResult stale = update(
                token,
                created.id(),
                created.series(),
                99L,
                true,
                created.etag()
        );

        assertEquals(412, stale.getResponse().getStatus());
        assertEquals(412, readJson(stale).path("status").asInt());
        assertEquals(beforeStale, row(created.id()));
    }

    @Test
    void reactivateAndDeactivateShouldUseTheSameVersionPrecondition() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        MvcResult reactivated = update(
                token,
                created.id(),
                created.series(),
                10L,
                true,
                created.etag()
        );
        String activeEtag = reactivated.getResponse().getHeader(HttpHeaders.ETAG);
        assertEquals(200, reactivated.getResponse().getStatus());
        assertEquals(etag(created.id(), 1L), activeEtag);

        MvcResult staleReactivate = update(
                token,
                created.id(),
                created.series(),
                12L,
                true,
                created.etag()
        );
        assertEquals(412, staleReactivate.getResponse().getStatus());
        assertEquals(10L, row(created.id()).currentNumber());
        assertTrue(row(created.id()).active());

        MvcResult deactivated = deactivate(token, created.id(), activeEtag);
        assertEquals(204, deactivated.getResponse().getStatus());
        assertEquals(etag(created.id(), 2L), deactivated.getResponse().getHeader(HttpHeaders.ETAG));
        SeriesRow afterDeactivate = row(created.id());

        MvcResult staleDeactivate = deactivate(token, created.id(), activeEtag);
        assertEquals(412, staleDeactivate.getResponse().getStatus());
        assertEquals(afterDeactivate, row(created.id()));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "W/\"billing-series-1-v0\"",
            "*",
            "\"billing-series-1-v0\", \"billing-series-1-v1\"",
            "billing-series-1-v0",
            "\"billing-series-other-v0\"",
            "\"billing-series-1-v999999999999999999999999999999999999\""
    })
    void invalidIfMatchShouldReturn400(String ifMatch) throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);
        String candidate = ifMatch.replace("billing-series-1-", "billing-series-" + created.id() + "-");

        MvcResult result = update(
                token,
                created.id(),
                created.series(),
                11L,
                false,
                candidate
        );

        assertEquals(400, result.getResponse().getStatus());
        assertEquals(0L, row(created.id()).version());
        assertEquals(10L, row(created.id()).currentNumber());
    }

    @Test
    void ifMatchForAnotherSeriesAndMissingSeriesShouldUse400And404Respectively() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        MvcResult wrongId = update(
                token,
                created.id(),
                created.series(),
                11L,
                false,
                etag(created.id() + 1, 0L)
        );
        assertEquals(400, wrongId.getResponse().getStatus());

        long missingId = 9_999_991L;
        MvcResult missing = update(
                token,
                missingId,
                "B999",
                11L,
                false,
                etag(missingId, 0L)
        );
        assertEquals(404, missing.getResponse().getStatus());

        MvcResult missingDelete = deactivate(token, missingId, etag(missingId, 0L));
        assertEquals(404, missingDelete.getResponse().getStatus());
    }

    @Test
    void corsShouldAllowIfMatchAndExposeEtagWithoutChangingOriginPolicy() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        MvcResult preflight = mockMvc.perform(options(ENDPOINT + "/{id}", created.id())
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PUT")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type,If-Match"))
                .andReturn();
        assertEquals(200, preflight.getResponse().getStatus());
        assertTrue(preflight.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS)
                .toLowerCase()
                .contains("if-match"));

        MvcResult response = mockMvc.perform(get(ENDPOINT + "/{id}", created.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200"))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals("http://localhost:4200", response.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
        assertTrue(response.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS)
                .toLowerCase()
                .contains("etag"));
    }

    @Test
    @Timeout(30)
    void twoUpdatesFromTheSameVersionShouldConfirmExactlyOneMutation() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        List<MvcResult> results = race(
                () -> update(token, created.id(), created.series(), 21L, false, created.etag()),
                () -> update(token, created.id(), created.series(), 22L, false, created.etag())
        );

        assertStatuses(results, 200, 412);
        SeriesRow persisted = row(created.id());
        assertEquals(1L, persisted.version());
        assertTrue(Set.of(21L, 22L).contains(persisted.currentNumber()));
    }

    @Test
    @Timeout(30)
    void updateRacingDeactivateShouldConfirmExactlyOneMutation() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, true);

        List<MvcResult> results = race(
                () -> update(token, created.id(), created.series(), 21L, true, created.etag()),
                () -> deactivate(token, created.id(), created.etag())
        );

        assertOneOfStatusesAndStale(results, Set.of(200, 204));
        SeriesRow persisted = row(created.id());
        assertEquals(1L, persisted.version());
        assertTrue(
                (persisted.currentNumber() == 21L && persisted.active())
                        || (persisted.currentNumber() == 10L && !persisted.active())
        );
    }

    @Test
    @Timeout(30)
    void updateRacingReactivateShouldConfirmExactlyOneMutation() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        List<MvcResult> results = race(
                () -> update(token, created.id(), created.series(), 21L, false, created.etag()),
                () -> update(token, created.id(), created.series(), 10L, true, created.etag())
        );

        assertStatuses(results, 200, 412);
        SeriesRow persisted = row(created.id());
        assertEquals(1L, persisted.version());
        assertTrue(
                (persisted.currentNumber() == 21L && !persisted.active())
                        || (persisted.currentNumber() == 10L && persisted.active())
        );
    }

    @Test
    void optimisticConflictDuringFlushShouldRollbackTheOuterBusinessMutation() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        CreatedSeries created = createSeries(token, false);

        TransactionTemplate outer = new TransactionTemplate(transactionManager);
        TransactionTemplate concurrent = new TransactionTemplate(transactionManager);
        concurrent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        RuntimeException conflict = assertThrows(RuntimeException.class, () ->
                outer.executeWithoutResult(status -> {
                    BillingSeriesEntity entity = entityManager.find(BillingSeriesEntity.class, created.id());
                    entity.setCurrentNumber(77L);
                    entity.setUpdatedBy("outer-4d-2b-1");

                    concurrent.executeWithoutResult(innerStatus -> jdbcTemplate.update(
                            """
                                    UPDATE billing_series
                                    SET version = version + 1,
                                        updated_at = NOW(),
                                        updated_by = 'concurrent-4d-2b-1'
                                    WHERE id = ?
                                    """,
                            created.id()
                    ));

                    entityManager.flush();
                })
        );

        assertTrue(hasOptimisticConflict(conflict));
        SeriesRow persisted = row(created.id());
        assertEquals(10L, persisted.currentNumber());
        assertEquals(1L, persisted.version());
        assertEquals("concurrent-4d-2b-1", persisted.updatedBy());
    }

    private CreatedSeries createSeries(String token, boolean active) throws Exception {
        String series = nextSeries();
        MvcResult result = mockMvc.perform(post(ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(series, 10L, active).toString()))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode body = readJson(result);
        long id = body.path("id").asLong();
        createdSeriesIds.add(id);
        String etag = result.getResponse().getHeader(HttpHeaders.ETAG);
        assertNotNull(etag);
        return new CreatedSeries(id, series, etag, body);
    }

    private MvcResult update(
            String token,
            long id,
            String series,
            long currentNumber,
            boolean active,
            String ifMatch
    ) throws Exception {
        var request = put(ENDPOINT + "/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload(series, currentNumber, active).toString());
        if (ifMatch != null) {
            request.header(HttpHeaders.IF_MATCH, ifMatch);
        }
        return mockMvc.perform(request).andReturn();
    }

    private MvcResult deactivate(String token, long id, String ifMatch) throws Exception {
        var request = delete(ENDPOINT + "/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token));
        if (ifMatch != null) {
            request.header(HttpHeaders.IF_MATCH, ifMatch);
        }
        return mockMvc.perform(request).andReturn();
    }

    private ObjectNode payload(String series, long currentNumber, boolean active) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("documentType", "RECEIPT");
        payload.put("series", series);
        payload.put("currentNumber", currentNumber);
        payload.put("environment", "BETA");
        payload.put("active", active);
        return payload;
    }

    private SeriesRow row(long id) {
        return jdbcTemplate.queryForObject(
                """
                        SELECT current_number, active, version, updated_at, updated_by
                        FROM billing_series
                        WHERE id = ?
                        """,
                (resultSet, rowNumber) -> new SeriesRow(
                        resultSet.getLong("current_number"),
                        resultSet.getBoolean("active"),
                        resultSet.getLong("version"),
                        resultSet.getTimestamp("updated_at").toInstant(),
                        resultSet.getString("updated_by")
                ),
                id
        );
    }

    private List<MvcResult> race(Callable<MvcResult> first, Callable<MvcResult> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<MvcResult> firstResult = executor.submit(() -> awaitAndCall(ready, start, first));
            Future<MvcResult> secondResult = executor.submit(() -> awaitAndCall(ready, start, second));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            return List.of(
                    firstResult.get(15, TimeUnit.SECONDS),
                    secondResult.get(15, TimeUnit.SECONDS)
            );
        } finally {
            start.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
        }
    }

    private MvcResult awaitAndCall(
            CountDownLatch ready,
            CountDownLatch start,
            Callable<MvcResult> operation
    ) throws Exception {
        ready.countDown();
        assertTrue(start.await(5, TimeUnit.SECONDS));
        return operation.call();
    }

    private void assertStatuses(List<MvcResult> results, int firstStatus, int secondStatus) {
        List<Integer> statuses = results.stream()
                .map(result -> result.getResponse().getStatus())
                .sorted()
                .toList();
        assertEquals(List.of(Math.min(firstStatus, secondStatus), Math.max(firstStatus, secondStatus)), statuses);
    }

    private void assertOneOfStatusesAndStale(List<MvcResult> results, Set<Integer> successfulStatuses) {
        List<Integer> statuses = results.stream()
                .map(result -> result.getResponse().getStatus())
                .toList();
        assertEquals(1L, statuses.stream().filter(status -> status == 412).count());
        assertEquals(1L, statuses.stream().filter(successfulStatuses::contains).count());
    }

    private void assertPreconditionRequired(MvcResult result) throws Exception {
        assertEquals(428, result.getResponse().getStatus());
        assertEquals("no-store", result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL));
        JsonNode body = readJson(result);
        assertEquals(428, body.path("status").asInt());
        assertEquals(
                "El header If-Match es obligatorio para modificar una serie. "
                        + "Recarga la serie y vuelve a intentarlo con su versión vigente.",
                body.path("message").asText()
        );
    }

    private boolean hasOptimisticConflict(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof OptimisticLockException
                    || current.getClass().getSimpleName().contains("OptimisticLock")
                    || current.getClass().getSimpleName().contains("StaleObject")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String nextSeries() {
        int value = SERIES_SEQUENCE.getAndUpdate(current -> current >= 998 ? 800 : current + 1);
        return "B" + value;
    }

    private String etag(long id, long version) {
        return "\"billing-series-" + id + "-v" + version + "\"";
    }

    private record CreatedSeries(long id, String series, String etag, JsonNode body) {
    }

    private record SeriesRow(
            long currentNumber,
            boolean active,
            long version,
            Instant updatedAt,
            String updatedBy
    ) {
    }
}
