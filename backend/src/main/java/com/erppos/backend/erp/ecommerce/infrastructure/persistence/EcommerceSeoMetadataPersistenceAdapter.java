package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceSeoMetadataRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.EcommerceSeoMetadataMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class EcommerceSeoMetadataPersistenceAdapter implements EcommerceSeoMetadataRepositoryPort {
    private final EcommerceSeoMetadataJpaRepository seoMetadataJpaRepository;

    public EcommerceSeoMetadataPersistenceAdapter(EcommerceSeoMetadataJpaRepository seoMetadataJpaRepository) {
        this.seoMetadataJpaRepository = seoMetadataJpaRepository;
    }

    @Override
    @Transactional
    public EcommerceSeoMetadata save(EcommerceSeoMetadata metadata) {
        EcommerceSeoMetadataEntity entity = metadata.id() == null
                ? EcommerceSeoMetadataMapper.toEntity(metadata)
                : seoMetadataJpaRepository.findById(metadata.id()).orElseThrow(() -> new EcommerceNotFoundException("SEO metadata not found"));
        if (metadata.id() != null) {
            EcommerceSeoMetadataMapper.merge(entity, metadata);
        }
        return EcommerceSeoMetadataMapper.toDomain(seoMetadataJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Optional<EcommerceSeoMetadata> findByProductOnlineProfileId(Long productOnlineProfileId) {
        return seoMetadataJpaRepository.findByProductOnlineProfileId(productOnlineProfileId).map(EcommerceSeoMetadataMapper::toDomain);
    }

    @Override
    public Optional<EcommerceSeoMetadata> findByOnlineCategoryId(Long onlineCategoryId) {
        return seoMetadataJpaRepository.findByOnlineCategoryId(onlineCategoryId).map(EcommerceSeoMetadataMapper::toDomain);
    }

    @Override
    public Optional<EcommerceSeoMetadata> findByBrandId(Long brandId) {
        return seoMetadataJpaRepository.findByBrandId(brandId).map(EcommerceSeoMetadataMapper::toDomain);
    }

    @Override
    public List<EcommerceSeoMetadata> findAllByProductOnlineProfileIds(List<Long> productOnlineProfileIds) {
        if (productOnlineProfileIds == null || productOnlineProfileIds.isEmpty()) {
            return List.of();
        }
        return seoMetadataJpaRepository.findByProductOnlineProfileIdIn(productOnlineProfileIds).stream()
                .map(EcommerceSeoMetadataMapper::toDomain)
                .toList();
    }
}
