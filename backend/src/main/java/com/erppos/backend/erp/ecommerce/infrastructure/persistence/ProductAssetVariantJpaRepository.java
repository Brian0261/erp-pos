package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Modifying
    @Query("""
            update ProductAssetVariantEntity variant
            set variant.active = false,
                variant.preferred = false,
                variant.updatedAt = current_timestamp,
                variant.updatedBy = :actor
            where variant.productAssetId = :productAssetId
              and variant.variantKind = :variantKind
              and variant.active = true
            """)
    int deactivateActiveByProductAssetIdAndVariantKind(
            @Param("productAssetId") Long productAssetId,
            @Param("variantKind") ProductAssetVariantKind variantKind,
            @Param("actor") String actor
    );
}
