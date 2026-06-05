package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;

import java.util.List;
import java.util.Optional;

public interface EcommerceSeoMetadataRepositoryPort {
    EcommerceSeoMetadata save(EcommerceSeoMetadata metadata);
    Optional<EcommerceSeoMetadata> findByProductOnlineProfileId(Long productOnlineProfileId);
    Optional<EcommerceSeoMetadata> findByOnlineCategoryId(Long onlineCategoryId);
    Optional<EcommerceSeoMetadata> findByBrandId(Long brandId);
    List<EcommerceSeoMetadata> findAllByProductOnlineProfileIds(List<Long> productOnlineProfileIds);
}
