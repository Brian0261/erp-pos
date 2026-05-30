package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;

import java.util.Optional;

public interface EcommerceCatalogProductReadPort {
    Optional<EcommerceCatalogProductSnapshot> findById(Long productId);
}
