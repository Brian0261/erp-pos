package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface ProductOnlineProfileRepositoryPort {
    ProductOnlineProfile save(ProductOnlineProfile profile);
    Page<ProductOnlineProfile> findAll(Pageable pageable);
    Optional<ProductOnlineProfile> findById(Long id);
    Optional<ProductOnlineProfile> findByProductId(Long productId);
    boolean existsByProductId(Long productId);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
    boolean existsByBrandIdAndPublicationStatus(Long brandId, OnlinePublicationStatus publicationStatus);
    boolean existsByOnlineCategoryIdAndPublicationStatus(Long onlineCategoryId, OnlinePublicationStatus publicationStatus);
}
