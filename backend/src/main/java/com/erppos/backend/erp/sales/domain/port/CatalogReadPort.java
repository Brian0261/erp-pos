package com.erppos.backend.erp.sales.domain.port;

import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;

import java.util.List;
import java.util.Optional;

public interface CatalogReadPort {
    Optional<PosProductSnapshot> findById(Long productId);
    Optional<PosProductSnapshot> lookupByCode(String code);
    List<PosProductSnapshot> searchByNameOrCode(String query, int limit);
}

