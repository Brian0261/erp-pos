package com.erppos.backend.erp.billing.adapter.rest;

import com.erppos.backend.erp.billing.adapter.dto.BillingSeriesRequest;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFormatException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionRequiredException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BillingSeriesEtagTest {

    @Test
    void shouldBuildAndParseStrongSeriesEtag() {
        BillingSeries series = new BillingSeries(
                41L,
                7L,
                ElectronicDocumentType.RECEIPT,
                "B041",
                12L,
                BillingEnvironment.BETA,
                true,
                null,
                null,
                "tester",
                "tester"
        );

        String etag = BillingSeriesEtag.from(series);

        assertEquals("\"billing-series-41-v7\"", etag);
        assertEquals(7L, BillingSeriesEtag.parseRequired(etag, 41L));
    }

    @Test
    void shouldRequireIfMatchForAdministrativeMutations() {
        assertThrows(
                BillingPreconditionRequiredException.class,
                () -> BillingSeriesEtag.parseRequired(null, 41L)
        );
    }

    @Test
    void shouldRejectUnsupportedOrMalformedIfMatchValues() {
        assertMalformed("");
        assertMalformed("W/\"billing-series-41-v7\"");
        assertMalformed("*");
        assertMalformed("\"billing-series-41-v7\", \"billing-series-41-v8\"");
        assertMalformed("billing-series-41-v7");
        assertMalformed("\"billing-series-0-v7\"");
        assertMalformed("\"billing-series-41-v-1\"");
        assertMalformed("\"billing-series-41-v999999999999999999999999999999999999\"");
    }

    @Test
    void shouldRejectEtagForDifferentPathId() {
        assertThrows(
                BillingPreconditionFormatException.class,
                () -> BillingSeriesEtag.parseRequired("\"billing-series-42-v7\"", 41L)
        );
    }

    @Test
    void writeRequestShouldNotExposeAClientAssignableVersion() {
        assertFalse(Arrays.stream(BillingSeriesRequest.class.getRecordComponents())
                .anyMatch(component -> component.getName().equals("version")));
    }

    private void assertMalformed(String value) {
        assertThrows(
                BillingPreconditionFormatException.class,
                () -> BillingSeriesEtag.parseRequired(value, 41L)
        );
    }
}
