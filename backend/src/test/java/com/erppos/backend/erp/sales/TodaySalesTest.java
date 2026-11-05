package com.erppos.backend.erp.sales;

import com.erppos.backend.erp.sales.application.service.AuditUserProvider;
import com.erppos.backend.erp.sales.application.service.SalesApplicationService;
import com.erppos.backend.erp.sales.domain.port.*;
import com.erppos.backend.erp.security.domain.RoleName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TodaySalesTest {
    @ParameterizedTest
    @ValueSource(strings={"2033-01-01T04:59:59.999999Z","2033-01-01T05:00:00Z"})
    void selectsOneServerClockReferenceAndReusesOwnerFiltering(String timestamp) {
        var repo=mock(SaleRepositoryPort.class);var actor=mock(AuditUserProvider.class);var clock=mock(Clock.class);
        Instant instant=Instant.parse(timestamp);LocalDate day=instant.atZone(ZoneId.of("America/Lima")).toLocalDate();
        when(clock.instant()).thenReturn(instant,instant.plusSeconds(86400));
        when(actor.hasRole(RoleName.CAJERO)).thenReturn(true);when(actor.currentUsername()).thenReturn("synthetic-cashier");
        when(repo.findByFilters(day,day,null,null,"synthetic-cashier")).thenReturn(List.of());
        var service=new SalesApplicationService(repo,mock(CashRegisterRepositoryPort.class),mock(CatalogReadPort.class),
                mock(WarehouseReadPort.class),mock(InventorySalesPort.class),mock(SalesBillingSummaryReadPort.class),
                actor,mock(CheckoutReadPort.class),mock(SaleOperationPort.class),clock);
        var result=service.today();
        assertEquals(day,result.businessDate());assertEquals(instant,result.referenceInstant());assertEquals("America/Lima",result.timeZone());
        assertEquals(day.plusDays(1).atStartOfDay(ZoneId.of("America/Lima")).toInstant(),result.nextDayStartsAt());
        assertTrue(result.sales().isEmpty());verify(clock,times(1)).instant();
        verify(repo).findByFilters(day,day,null,null,"synthetic-cashier");verifyNoMoreInteractions(repo);
    }
}
