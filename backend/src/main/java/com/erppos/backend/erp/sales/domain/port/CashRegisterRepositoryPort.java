package com.erppos.backend.erp.sales.domain.port;

import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface CashRegisterRepositoryPort {
    CashRegisterSession save(CashRegisterSession session);
    Optional<CashRegisterSession> findById(Long id);
    Optional<CashRegisterSession> findOpenByUserId(UUID userId);
    Optional<CashRegisterSession> findLatestByUserId(UUID userId);
    Instant findFirstSaleAt(Long cashRegisterSessionId);
    Instant findLastSaleAt(Long cashRegisterSessionId);
    java.math.BigDecimal sumSalesTotal(Long cashRegisterSessionId);
    java.math.BigDecimal sumSalesCashPaid(Long cashRegisterSessionId);
}

