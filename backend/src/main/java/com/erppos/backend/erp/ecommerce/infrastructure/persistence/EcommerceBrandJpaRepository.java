package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EcommerceBrandJpaRepository extends JpaRepository<EcommerceBrandEntity, Long> {
    List<EcommerceBrandEntity> findAllByOrderByNameAsc();
    Optional<EcommerceBrandEntity> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
    boolean existsByNameIgnoreCase(String name);
}
