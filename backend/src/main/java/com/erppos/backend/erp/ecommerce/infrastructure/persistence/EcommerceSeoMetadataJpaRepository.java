package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EcommerceSeoMetadataJpaRepository extends JpaRepository<EcommerceSeoMetadataEntity, Long> {
    Optional<EcommerceSeoMetadataEntity> findByProductOnlineProfileId(Long productOnlineProfileId);
    Optional<EcommerceSeoMetadataEntity> findByOnlineCategoryId(Long onlineCategoryId);
    Optional<EcommerceSeoMetadataEntity> findByBrandId(Long brandId);
}
