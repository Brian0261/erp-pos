package com.erppos.backend.erp.shared.domain.policy;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class CommercialDatesTest {
    @Test void usesLimaDespiteClockZoneAndPreservesOpenBounds() {
        for(String zone:new String[]{"UTC","America/Lima","Asia/Tokyo"}) {
            Clock clock=Clock.fixed(Instant.parse("2033-01-01T03:00:00Z"),ZoneId.of(zone));
            assertEquals(LocalDate.of(2032,12,31),CommercialDates.today(clock));
        }
        assertNull(CommercialDates.start(null));assertNull(CommercialDates.endExclusive(null));
    }
    @Test void leapDayMonthAndYearBoundariesAreHalfOpen() {
        for(LocalDate day:new LocalDate[]{LocalDate.of(2032,2,29),LocalDate.of(2032,12,31),LocalDate.of(2033,1,31)}) {
            assertEquals(day.atTime(5,0).toInstant(ZoneOffset.UTC),CommercialDates.start(day));
            assertEquals(CommercialDates.start(day.plusDays(1)),CommercialDates.endExclusive(day));
            assertTrue(CommercialDates.endExclusive(day).minusNanos(1000).isBefore(CommercialDates.endExclusive(day)));
        }
    }
}
