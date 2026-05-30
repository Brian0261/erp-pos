package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;

import java.util.Optional;

public interface EcommerceBrandRepositoryPort {
    EcommerceBrand save(EcommerceBrand brand);
    Optional<EcommerceBrand> findById(Long id);
    Optional<EcommerceBrand> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsByNameIgnoreCase(String name);
}
