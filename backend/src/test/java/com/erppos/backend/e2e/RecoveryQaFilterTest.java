package com.erppos.backend.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;

class RecoveryQaFilterTest {
    @Test void diagnosticNeverEmitsIdentifiersUnknownSegmentsOrQueryData() {
        assertEquals("/api/v1/users/{segment}", RecoveryQaFilter.routeTemplate("/api/v1/users/private-customer@example.test?token=private"));
        assertEquals("/api/v1/sales/operations/{uuid}/cancel", RecoveryQaFilter.routeTemplate("/api/v1/sales/operations/12345678-1234-1234-1234-123456789012/cancel"));
        assertEquals("/api/v1/billing/documents/{id}/send", RecoveryQaFilter.routeTemplate("/api/v1/billing/documents/987654/send"));
        assertEquals("/{truncated}", RecoveryQaFilter.routeTemplate("/private".repeat(40)));
    }
    @Test void diagnosticsAreBoundedAndDoNotPermitAnyRejectedRequest() throws Exception {
        var id = new E2eQaConfiguration.Identity("synthetic", "", "", "", "", "", "", "", "");
        var filter = new RecoveryQaFilter(id, null, new AtomicBoolean(true), new ObjectMapper());
        for (int n=0;n<40;n++) {
            var request = new MockHttpServletRequest("POST", "/api/v1/billing/documents/"+n+"/send");
            var response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, (a,b) -> fail("Denied requests must never reach the application"));
            assertEquals(405, response.getStatus());
        }
        assertEquals(32, filter.denialRecords().size());
        assertEquals(40, ((java.util.concurrent.atomic.AtomicInteger)org.springframework.test.util.ReflectionTestUtils.getField(filter,"denied")).get());
        assertEquals(1, filter.denialRecords().get(0).get("sequence"));
        assertFalse(RecoveryQaFilter.allowed("POST", "/api/v1/billing/documents/1/send"));
        assertTrue(RecoveryQaFilter.allowed("POST", "/api/v1/sales/operations"));
    }
}
