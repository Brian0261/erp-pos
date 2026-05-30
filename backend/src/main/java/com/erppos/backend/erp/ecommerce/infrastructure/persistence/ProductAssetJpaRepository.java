package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductAssetJpaRepository extends JpaRepository<ProductAssetEntity, Long> {
    List<ProductAssetEntity> findByProductOnlineProfileId(Long productOnlineProfileId);
    Optional<ProductAssetEntity> findFirstByProductOnlineProfileIdAndPrimaryTrueAndActiveTrue(Long productOnlineProfileId);
}
