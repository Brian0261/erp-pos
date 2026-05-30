package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EcommerceOnlineCategoryJpaRepository extends JpaRepository<EcommerceOnlineCategoryEntity, Long> {
    List<EcommerceOnlineCategoryEntity> findAllByOrderByNameAsc();
    Optional<EcommerceOnlineCategoryEntity> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
