package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;

import java.util.List;
import java.util.Optional;

public interface EcommerceBrandRepositoryPort {
    EcommerceBrand save(EcommerceBrand brand);
    List<EcommerceBrand> findAll();
    Optional<EcommerceBrand> findById(Long id);
    Optional<EcommerceBrand> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
    boolean existsByNameIgnoreCase(String name);
}
