package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EcommerceOnlineCategoryJpaRepository extends JpaRepository<EcommerceOnlineCategoryEntity, Long> {
    Optional<EcommerceOnlineCategoryEntity> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
}
