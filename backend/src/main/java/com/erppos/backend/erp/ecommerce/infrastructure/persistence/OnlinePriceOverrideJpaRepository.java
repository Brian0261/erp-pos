package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OnlinePriceOverrideJpaRepository extends JpaRepository<OnlinePriceOverrideEntity, Long> {
    Optional<OnlinePriceOverrideEntity> findFirstByProductOnlineProfileIdAndActiveTrue(Long productOnlineProfileId);
    List<OnlinePriceOverrideEntity> findByProductOnlineProfileIdInAndActiveTrue(List<Long> productOnlineProfileIds);
}
