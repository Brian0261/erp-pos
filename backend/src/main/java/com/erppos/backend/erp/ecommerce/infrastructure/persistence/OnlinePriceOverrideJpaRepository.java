package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OnlinePriceOverrideJpaRepository extends JpaRepository<OnlinePriceOverrideEntity, Long> {
    Optional<OnlinePriceOverrideEntity> findFirstByProductOnlineProfileIdAndActiveTrue(Long productOnlineProfileId);
}
