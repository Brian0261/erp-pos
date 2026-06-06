package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.application.dto.OnlineProfileSummaryResult;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileSearchCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface EcommerceCatalogUseCase {
    List<EcommerceBrand> listBrands();
    EcommerceBrand getBrandById(Long id);
    EcommerceBrand createBrand(CreateEcommerceBrandCommand command);
    EcommerceBrand updateBrand(Long id, UpdateEcommerceBrandCommand command);
    EcommerceBrand changeBrandStatus(Long id, ChangeEcommerceBrandStatusCommand command);
    List<EcommerceOnlineCategory> listOnlineCategories();
    EcommerceOnlineCategory getOnlineCategoryById(Long id);
    EcommerceOnlineCategory createOnlineCategory(CreateEcommerceOnlineCategoryCommand command);
    EcommerceOnlineCategory updateOnlineCategory(Long id, UpdateEcommerceOnlineCategoryCommand command);
    EcommerceOnlineCategory changeOnlineCategoryStatus(Long id, ChangeEcommerceOnlineCategoryStatusCommand command);
    ProductOnlineProfile createDraftProfile(CreateProductOnlineProfileCommand command);
    Page<OnlineProfileSummaryResult> listOnlineProfiles(Pageable pageable);
    Page<OnlineProfileSummaryResult> listOnlineProfiles(ProductOnlineProfileSearchCriteria criteria, Pageable pageable);
    List<ProductOnlineProfile> listProfilesByProductIds(List<Long> productIds);
    ProductOnlineProfile getProfileByProductId(Long productId);
    EcommerceCatalogProductSnapshot getProductSnapshotByProductId(Long productId);
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
