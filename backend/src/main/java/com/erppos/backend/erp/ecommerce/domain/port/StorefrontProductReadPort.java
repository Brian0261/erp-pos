package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface StorefrontProductReadPort {
    Page<StorefrontPublicProductProjection> findPublishedProducts(Pageable pageable);

    Page<StorefrontPublicCategoryProjection> findPublicCategories(Pageable pageable);

    Optional<StorefrontPublicProductDetailProjection> findPublishedProductDetailBySlug(String slug);
}
