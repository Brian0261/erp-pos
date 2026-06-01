package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StorefrontProductReadPort {
    Page<StorefrontPublicProductProjection> findPublishedProducts(Pageable pageable);
}
