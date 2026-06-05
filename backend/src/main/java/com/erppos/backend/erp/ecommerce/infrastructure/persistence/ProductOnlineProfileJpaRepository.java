package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductOnlineProfileJpaRepository extends JpaRepository<ProductOnlineProfileEntity, Long> {
    Optional<ProductOnlineProfileEntity> findByProductId(Long productId);
    List<ProductOnlineProfileEntity> findByProductIdIn(Collection<Long> productIds);
    boolean existsByProductId(Long productId);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
    boolean existsByBrandIdAndPublicationStatus(Long brandId, OnlinePublicationStatus publicationStatus);
    boolean existsByOnlineCategoryIdAndPublicationStatus(Long onlineCategoryId, OnlinePublicationStatus publicationStatus);
}
