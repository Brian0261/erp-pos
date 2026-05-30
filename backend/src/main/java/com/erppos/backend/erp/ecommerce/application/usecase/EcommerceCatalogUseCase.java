package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;

public interface EcommerceCatalogUseCase {
    ProductOnlineProfile createDraftProfile(CreateProductOnlineProfileCommand command);
    ProductOnlineProfile getProfileByProductId(Long productId);
}
