package com.erppos.backend.integration;

import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceAvailabilityStatus;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceIntegrityStatus;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadiness;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessItem;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessReasonCode;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessUseCase;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BillingEvidenceReadinessIntegrationTest extends AbstractHttpIntegrationTest {

    private static final long DOCUMENT_ID = 7001L;
    private static final String ENDPOINT = "/api/v1/billing/documents/{documentId}/evidence-readiness";

    @MockitoBean
    private FiscalEvidenceReadinessUseCase evidenceReadinessUseCase;

    @BeforeEach
    void setUpReadiness() {
        when(evidenceReadinessUseCase.getByDocumentId(anyLong())).thenReturn(readiness());
    }

    @Test
    void adminShouldReadFiscalEvidenceReadiness() throws Exception {
        assertRoleCanRead(login(ADMIN_EMAIL, ADMIN_PASSWORD));
    }

    @Test
    void supervisorShouldReadFiscalEvidenceReadiness() throws Exception {
        assertRoleCanRead(login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD));
    }

    @Test
    void cajeroShouldReadFiscalEvidenceReadiness() throws Exception {
        assertRoleCanRead(login(CAJERO_EMAIL, CAJERO_PASSWORD));
    }

    @Test
    void almaceneroShouldNotReadFiscalEvidenceReadiness() throws Exception {
        String token = login(ALMACENERO_EMAIL, ALMACENERO_PASSWORD);

        mockMvc.perform(get(ENDPOINT, DOCUMENT_ID).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestShouldNotReadFiscalEvidenceReadiness() throws Exception {
        mockMvc.perform(get(ENDPOINT, DOCUMENT_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingDocumentShouldUseStandardNotFoundError() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        when(evidenceReadinessUseCase.getByDocumentId(999999L))
                .thenThrow(new BillingNotFoundException("Electronic document not found"));

        mockMvc.perform(get(ENDPOINT, 999999L).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Electronic document not found"))
                .andExpect(jsonPath("$.path").value("/api/v1/billing/documents/999999/evidence-readiness"))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    void readinessShouldExposeOnlyProviderAgnosticReadOnlyFields() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        MvcResult result = mockMvc.perform(get(ENDPOINT, DOCUMENT_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(DOCUMENT_ID))
                .andExpect(jsonPath("$.simulated").value(true))
                .andExpect(jsonPath("$.evidenceCount").value(1))
                .andExpect(jsonPath("$.evidence.length()").value(1))
                .andExpect(jsonPath("$.evidence[0].availabilityStatus").value("NOT_READY"))
                .andExpect(jsonPath("$.evidence[0].integrityStatus").value("NOT_APPLICABLE"))
                .andExpect(jsonPath("$.evidence[0].downloadAllowed").value(false))
                .andExpect(jsonPath("$.evidence[0].allowedActions").isEmpty())
                .andExpect(jsonPath("$.evidence[0].reasonCode").value("EVIDENCE_NOT_MATERIALIZED"))
                .andExpect(jsonPath("$.evidence[0].storageKey").doesNotExist())
                .andExpect(jsonPath("$.evidence[0].checksumSha256").doesNotExist())
                .andExpect(jsonPath("$.evidence[0].fileName").doesNotExist())
                .andExpect(jsonPath("$.evidence[0].mimeType").doesNotExist())
                .andExpect(jsonPath("$.evidence[0].storageProvider").doesNotExist())
                .andExpect(jsonPath("$.evidence[0].url").doesNotExist())
                .andReturn();

        String body = result.getResponse().getContentAsString().toLowerCase();
        assertFalse(body.contains("<?xml"));
        assertFalse(body.contains("<cdr"));
        assertFalse(body.contains("%pdf"));
        assertFalse(body.contains("\"ticket\""));
        assertFalse(body.contains("\"qr\""));
        assertFalse(body.contains("base64"));
        assertFalse(body.contains("payload"));
        assertFalse(body.contains("content"));
        assertFalse(body.contains("checksum"));
        assertFalse(body.contains("storagekey"));
        assertFalse(body.contains("filename"));
        assertFalse(body.contains("object key"));
        assertFalse(body.contains("presigned url"));
        assertFalse(body.contains("region"));
        assertFalse(body.contains("credential"));
        assertFalse(body.contains("access key"));
        assertFalse(body.contains("secret"));
        assertFalse(body.contains("certificate"));
        assertFalse(body.contains("bucket"));
        assertFalse(body.contains("objectkey"));
        assertFalse(body.contains("presigned"));
        assertFalse(body.contains("filesystem"));
        assertFalse(body.contains("db_legacy"));
    }

    @Test
    void documentWithoutEvidenceShouldReturnSafeEmptyCollection() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        when(evidenceReadinessUseCase.getByDocumentId(DOCUMENT_ID))
                .thenReturn(new FiscalEvidenceReadiness(DOCUMENT_ID, true, 0, null, List.of()));

        mockMvc.perform(get(ENDPOINT, DOCUMENT_ID).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evidenceCount").value(0))
                .andExpect(jsonPath("$.evidence").isEmpty())
                .andExpect(jsonPath("$.lastUpdatedAt").doesNotExist());
    }

    private void assertRoleCanRead(String token) throws Exception {
        mockMvc.perform(get(ENDPOINT, DOCUMENT_ID).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downloadAllowed").doesNotExist())
                .andExpect(jsonPath("$.evidence[0].downloadAllowed").value(false));
    }

    private FiscalEvidenceReadiness readiness() {
        return new FiscalEvidenceReadiness(
                DOCUMENT_ID,
                true,
                1,
                Instant.parse("2026-07-11T20:00:00Z"),
                List.of(new FiscalEvidenceReadinessItem(
                        9001L,
                        FiscalEvidenceType.PROVIDER_RESPONSE_METADATA,
                        FiscalEvidenceAvailabilityStatus.NOT_READY,
                        FiscalEvidenceIntegrityStatus.NOT_APPLICABLE,
                        false,
                        FiscalEvidenceReadinessReasonCode.EVIDENCE_NOT_MATERIALIZED,
                        List.of()
                ))
        );
    }
}
