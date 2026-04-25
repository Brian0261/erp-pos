package com.erppos.backend.erp.purchases.domain.port;

import com.erppos.backend.erp.purchases.domain.model.Supplier;

import java.util.List;
import java.util.Optional;

public interface SupplierRepositoryPort {
    Supplier save(Supplier supplier);
    Optional<Supplier> findById(Long id);
    List<Supplier> findAll(String query);
    boolean existsByDocumentNumber(String documentNumber);
    boolean existsByDocumentNumberAndIdNot(String documentNumber, Long id);
}

