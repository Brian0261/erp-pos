package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariant;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetVariantRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.ProductAssetVariantMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class ProductAssetVariantPersistenceAdapter implements ProductAssetVariantRepositoryPort {
    private final ProductAssetVariantJpaRepository variantJpaRepository;

    public ProductAssetVariantPersistenceAdapter(ProductAssetVariantJpaRepository variantJpaRepository) {
        this.variantJpaRepository = variantJpaRepository;
    }

    @Override
    @Transactional
    public ProductAssetVariant save(ProductAssetVariant variant) {
        ProductAssetVariantEntity entity = ProductAssetVariantMapper.toEntity(variant);
        return ProductAssetVariantMapper.toDomain(variantJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Optional<ProductAssetVariant> findActiveByProductAssetIdAndVariantKind(Long productAssetId, ProductAssetVariantKind variantKind) {
        return variantJpaRepository.findFirstByProductAssetIdAndVariantKindAndActiveTrue(productAssetId, variantKind)
                .map(ProductAssetVariantMapper::toDomain);
    }

    @Override
    @Transactional
    public void deactivateActiveByProductAssetIdAndVariantKind(Long productAssetId, ProductAssetVariantKind variantKind, String actor) {
        variantJpaRepository.deactivateActiveByProductAssetIdAndVariantKind(productAssetId, variantKind, actor);
    }
}
