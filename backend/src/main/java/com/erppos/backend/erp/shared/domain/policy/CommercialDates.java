package com.erppos.backend.erp.shared.domain.policy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Calendar for commercial reads. Persisted instants are never shifted. */
public final class CommercialDates {
    public static final ZoneId ZONE = ZoneId.of("America/Lima");
    private CommercialDates() {}
    public static LocalDate today(Clock clock) { return LocalDate.now(clock.withZone(ZONE)); }
    public static Instant start(LocalDate day) { return day == null ? null : day.atStartOfDay(ZONE).toInstant(); }
    public static Instant endExclusive(LocalDate day) { return day == null ? null : day.plusDays(1).atStartOfDay(ZONE).toInstant(); }
}
