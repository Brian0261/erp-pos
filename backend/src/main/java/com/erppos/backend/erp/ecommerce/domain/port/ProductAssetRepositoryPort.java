package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;

import java.util.List;
import java.util.Optional;

public interface ProductAssetRepositoryPort {
    ProductAsset save(ProductAsset asset);
    List<ProductAsset> findByProductOnlineProfileId(Long productOnlineProfileId);
    Optional<ProductAsset> findPrimaryActiveByProductOnlineProfileId(Long productOnlineProfileId);
    List<ProductAsset> findPrimaryActiveByProductOnlineProfileIds(List<Long> productOnlineProfileIds);
}
