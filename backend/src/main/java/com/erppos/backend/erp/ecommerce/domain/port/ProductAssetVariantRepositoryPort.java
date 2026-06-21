package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariant;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;

import java.util.Optional;

public interface ProductAssetVariantRepositoryPort {
    ProductAssetVariant save(ProductAssetVariant variant);

    Optional<ProductAssetVariant> findActiveByProductAssetIdAndVariantKind(Long productAssetId, ProductAssetVariantKind variantKind);

    void deactivateActiveByProductAssetIdAndVariantKind(Long productAssetId, ProductAssetVariantKind variantKind, String actor);
}
