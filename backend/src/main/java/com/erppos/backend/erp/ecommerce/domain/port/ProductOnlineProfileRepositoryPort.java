package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;

import java.util.Optional;

public interface ProductOnlineProfileRepositoryPort {
    ProductOnlineProfile save(ProductOnlineProfile profile);
    Optional<ProductOnlineProfile> findById(Long id);
    Optional<ProductOnlineProfile> findByProductId(Long productId);
    boolean existsByProductId(Long productId);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
