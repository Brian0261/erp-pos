package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EcommerceBrandJpaRepository extends JpaRepository<EcommerceBrandEntity, Long> {
    Optional<EcommerceBrandEntity> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsByNameIgnoreCase(String name);
}
