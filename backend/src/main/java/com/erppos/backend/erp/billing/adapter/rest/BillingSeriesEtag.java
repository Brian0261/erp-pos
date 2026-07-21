package com.erppos.backend.erp.billing.adapter.rest;

import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFormatException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionRequiredException;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class BillingSeriesEtag {

    private static final Pattern STRONG_ETAG_PATTERN =
            Pattern.compile("^\"billing-series-([1-9][0-9]*)-v(0|[1-9][0-9]*)\"$");

    private BillingSeriesEtag() {
    }

    public static String from(BillingSeries series) {
        if (series.id() == null || series.version() == null) {
            throw new IllegalArgumentException("Persisted billing series id and version are required");
        }
        return "\"billing-series-" + series.id() + "-v" + series.version() + "\"";
    }

    public static Long parseRequired(String ifMatch, Long expectedSeriesId) {
        if (ifMatch == null) {
            throw new BillingPreconditionRequiredException(
                    "El header If-Match es obligatorio para modificar una serie. Recarga la serie y vuelve a intentarlo con su versión vigente."
            );
        }
        String value = ifMatch.trim();
        Matcher matcher = STRONG_ETAG_PATTERN.matcher(value);
        if (!matcher.matches()) {
            throw malformed();
        }

        try {
            long seriesId = Long.parseLong(matcher.group(1));
            long version = Long.parseLong(matcher.group(2));
            if (!expectedSeriesId.equals(seriesId)) {
                throw new BillingPreconditionFormatException(
                        "If-Match does not identify the billing series requested by the path"
                );
            }
            return version;
        } catch (NumberFormatException ex) {
            throw malformed();
        }
    }

    private static BillingPreconditionFormatException malformed() {
        return new BillingPreconditionFormatException(
                "If-Match must contain one strong billing-series ETag; weak tags, wildcard and lists are not supported"
        );
    }
}
