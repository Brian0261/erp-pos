package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface EcommerceCatalogUseCase {
    ProductOnlineProfile createDraftProfile(CreateProductOnlineProfileCommand command);
    Page<ProductOnlineProfile> listOnlineProfiles(Pageable pageable);
    ProductOnlineProfile getProfileByProductId(Long productId);
    Optional<EcommerceSeoMetadata> getSeoMetadataByProductId(Long productId);
    Optional<ProductAsset> getPrimaryAssetByProductId(Long productId);
    Optional<OnlinePriceOverride> getActivePriceOverrideByProductId(Long productId);
    ProductOnlineProfile updateProfile(UpdateProductOnlineProfileCommand command);
    EcommerceSeoMetadata upsertSeoMetadata(UpsertProductSeoMetadataCommand command);
    ProductAsset upsertPrimaryProductAsset(UpsertProductAssetCommand command);
    OnlinePriceOverride upsertOnlinePriceOverride(UpsertOnlinePriceOverrideCommand command);
    EffectiveOnlinePriceResult calculateEffectiveOnlinePrice(Long productId);
    PublicationValidationResult validatePublication(Long productId);
    ProductOnlineProfile publish(Long productId);
    ProductOnlineProfile unpublish(Long productId);
}
