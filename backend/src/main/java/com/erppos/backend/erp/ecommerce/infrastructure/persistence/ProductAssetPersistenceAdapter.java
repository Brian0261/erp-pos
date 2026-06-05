package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.ProductAssetMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class ProductAssetPersistenceAdapter implements ProductAssetRepositoryPort {
    private final ProductAssetJpaRepository assetJpaRepository;

    public ProductAssetPersistenceAdapter(ProductAssetJpaRepository assetJpaRepository) {
        this.assetJpaRepository = assetJpaRepository;
    }

    @Override
    @Transactional
    public ProductAsset save(ProductAsset asset) {
        ProductAssetEntity entity = asset.id() == null
                ? ProductAssetMapper.toEntity(asset)
                : assetJpaRepository.findById(asset.id()).orElseThrow(() -> new EcommerceNotFoundException("Product asset not found"));
        if (asset.id() != null) {
            ProductAssetMapper.merge(entity, asset);
        }
        return ProductAssetMapper.toDomain(assetJpaRepository.saveAndFlush(entity));
    }

    @Override
    public List<ProductAsset> findByProductOnlineProfileId(Long productOnlineProfileId) {
        return assetJpaRepository.findByProductOnlineProfileId(productOnlineProfileId).stream()
                .map(ProductAssetMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<ProductAsset> findPrimaryActiveByProductOnlineProfileId(Long productOnlineProfileId) {
        return assetJpaRepository.findFirstByProductOnlineProfileIdAndPrimaryTrueAndActiveTrue(productOnlineProfileId)
                .map(ProductAssetMapper::toDomain);
    }

    @Override
    public List<ProductAsset> findPrimaryActiveByProductOnlineProfileIds(List<Long> productOnlineProfileIds) {
        if (productOnlineProfileIds == null || productOnlineProfileIds.isEmpty()) {
            return List.of();
        }
        return assetJpaRepository.findByProductOnlineProfileIdInAndPrimaryTrueAndActiveTrue(productOnlineProfileIds).stream()
                .map(ProductAssetMapper::toDomain)
                .toList();
    }
}
