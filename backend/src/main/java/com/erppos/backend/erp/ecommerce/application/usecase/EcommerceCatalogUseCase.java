package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;

public interface EcommerceCatalogUseCase {
    ProductOnlineProfile createDraftProfile(CreateProductOnlineProfileCommand command);
    ProductOnlineProfile getProfileByProductId(Long productId);
    ProductOnlineProfile updateProfile(UpdateProductOnlineProfileCommand command);
    EcommerceSeoMetadata upsertSeoMetadata(UpsertProductSeoMetadataCommand command);
    ProductAsset upsertPrimaryProductAsset(UpsertProductAssetCommand command);
    OnlinePriceOverride upsertOnlinePriceOverride(UpsertOnlinePriceOverrideCommand command);
    EffectiveOnlinePriceResult calculateEffectiveOnlinePrice(Long productId);
    PublicationValidationResult validatePublication(Long productId);
    ProductOnlineProfile publish(Long productId);
    ProductOnlineProfile unpublish(Long productId);
}
