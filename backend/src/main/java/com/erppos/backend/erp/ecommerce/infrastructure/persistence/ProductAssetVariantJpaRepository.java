package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductAssetVariantJpaRepository extends JpaRepository<ProductAssetVariantEntity, Long> {
    Optional<ProductAssetVariantEntity> findFirstByProductAssetIdAndVariantKindAndActiveTrue(
            Long productAssetId,
            ProductAssetVariantKind variantKind
    );

    Optional<ProductAssetVariantEntity> findFirstByProductAssetIdAndVariantKindAndActiveTrueAndPreferredTrue(
            Long productAssetId,
            ProductAssetVariantKind variantKind
    );
}
