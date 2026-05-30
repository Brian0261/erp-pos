package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;

import java.util.List;
import java.util.Optional;

public interface EcommerceOnlineCategoryRepositoryPort {
    EcommerceOnlineCategory save(EcommerceOnlineCategory category);
    List<EcommerceOnlineCategory> findAll();
    Optional<EcommerceOnlineCategory> findById(Long id);
    Optional<EcommerceOnlineCategory> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
