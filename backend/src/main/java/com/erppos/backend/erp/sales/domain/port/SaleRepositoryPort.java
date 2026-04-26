package com.erppos.backend.erp.sales.domain.port;

import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SaleRepositoryPort {
    Sale save(Sale sale);
    Optional<Sale> findById(Long id);
    List<Sale> findByFilters(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdBy);
}

