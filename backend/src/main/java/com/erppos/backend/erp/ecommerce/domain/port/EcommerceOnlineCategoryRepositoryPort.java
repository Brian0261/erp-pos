package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;

import java.util.Optional;

public interface EcommerceOnlineCategoryRepositoryPort {
    EcommerceOnlineCategory save(EcommerceOnlineCategory category);
    Optional<EcommerceOnlineCategory> findById(Long id);
    Optional<EcommerceOnlineCategory> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
}
