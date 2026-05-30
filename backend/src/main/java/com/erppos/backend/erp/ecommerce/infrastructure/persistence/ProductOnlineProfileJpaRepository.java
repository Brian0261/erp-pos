package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductOnlineProfileJpaRepository extends JpaRepository<ProductOnlineProfileEntity, Long> {
    Optional<ProductOnlineProfileEntity> findByProductId(Long productId);
    boolean existsByProductId(Long productId);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
