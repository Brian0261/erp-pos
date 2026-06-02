package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontSitemapEntryProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.List;

public interface StorefrontProductReadPort {
    Page<StorefrontPublicProductProjection> findPublishedProducts(Pageable pageable);

    Page<StorefrontPublicCategoryProjection> findPublicCategories(Pageable pageable);

    Optional<StorefrontPublicCategoryDetailProjection> findPublicCategoryDetailBySlug(String slug);

    List<StorefrontSitemapEntryProjection> findPublicSitemapEntries();

    Optional<StorefrontPublicProductDetailProjection> findPublishedProductDetailBySlug(String slug);
}
