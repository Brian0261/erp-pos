package com.erppos.backend.erp.ecommerce.adapter.rest;

import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminEffectivePriceResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineProfileDetailResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineProfileSummaryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminPriceOverrideResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminPrimaryAssetResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminPublicationValidationResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminSeoMetadataResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpdateOnlineProfileRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpsertPriceOverrideRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpsertPrimaryAssetRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpsertSeoRequest;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.EffectiveOnlinePriceResult;
import com.erppos.backend.erp.ecommerce.application.usecase.PublicationValidationResult;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertOnlinePriceOverrideCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import com.erppos.backend.erp.shared.adapter.dto.PageResponseMapper;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/ecommerce-admin")
public class EcommerceAdminController {

    private final EcommerceCatalogUseCase ecommerceCatalogUseCase;

    public EcommerceAdminController(EcommerceCatalogUseCase ecommerceCatalogUseCase) {
        this.ecommerceCatalogUseCase = ecommerceCatalogUseCase;
    }

    @GetMapping("/products/online-profiles")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<PageResponse<EcommerceAdminOnlineProfileSummaryResponse>> listOnlineProfiles(Pageable pageable) {
        Page<EcommerceAdminOnlineProfileSummaryResponse> page = ecommerceCatalogUseCase
                .listOnlineProfiles(pageable)
                .map(this::toSummaryResponse);
        return ResponseEntity.ok(PageResponseMapper.from(page));
    }

    @GetMapping("/products/{productId}/online-profile")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<EcommerceAdminOnlineProfileDetailResponse> getOnlineProfile(@PathVariable Long productId) {
        ProductOnlineProfile profile = ecommerceCatalogUseCase.getProfileByProductId(productId);
        return ResponseEntity.ok(buildDetail(profile));
    }

    @PutMapping("/products/{productId}/online-profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineProfileDetailResponse> updateOnlineProfile(
            @PathVariable Long productId,
            @Valid @RequestBody EcommerceAdminUpdateOnlineProfileRequest request
    ) {
        ProductOnlineProfile updated = ecommerceCatalogUseCase.updateProfile(new UpdateProductOnlineProfileCommand(
                productId,
                request.slug(),
                request.onlineName(),
                request.onlineDescription(),
                request.onlineCategoryId(),
                request.brandId(),
                request.brandAbsencePolicy()
        ));
        return ResponseEntity.ok(buildDetail(updated));
    }

    @PutMapping("/products/{productId}/seo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminSeoMetadataResponse> upsertSeo(
            @PathVariable Long productId,
            @Valid @RequestBody EcommerceAdminUpsertSeoRequest request
    ) {
        EcommerceSeoMetadata updated = ecommerceCatalogUseCase.upsertSeoMetadata(new UpsertProductSeoMetadataCommand(
                productId,
                request.seoTitle(),
                request.seoDescription(),
                request.canonicalPath(),
                request.robotsPolicy(),
                Boolean.TRUE.equals(request.indexable()),
                request.ogTitle(),
                request.ogDescription(),
                request.ogImageUrl()
        ));
        return ResponseEntity.ok(toSeoResponse(updated));
    }

    @PutMapping("/products/{productId}/primary-asset")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminPrimaryAssetResponse> upsertPrimaryAsset(
            @PathVariable Long productId,
            @Valid @RequestBody EcommerceAdminUpsertPrimaryAssetRequest request
    ) {
        ProductAsset updated = ecommerceCatalogUseCase.upsertPrimaryProductAsset(new UpsertProductAssetCommand(
                productId,
                request.assetType(),
                request.assetUrl(),
                request.altText(),
                request.source(),
                Boolean.TRUE.equals(request.rightsConfirmed()),
                request.displayOrder() == null ? 0 : request.displayOrder()
        ));
        return ResponseEntity.ok(toPrimaryAssetResponse(updated));
    }

    @PutMapping("/products/{productId}/price-override")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminPriceOverrideResponse> upsertPriceOverride(
            @PathVariable Long productId,
            @Valid @RequestBody EcommerceAdminUpsertPriceOverrideRequest request
    ) {
        OnlinePriceOverride updated = ecommerceCatalogUseCase.upsertOnlinePriceOverride(new UpsertOnlinePriceOverrideCommand(
                productId,
                request.amount(),
                request.currency(),
                Boolean.TRUE.equals(request.active()),
                request.validFrom(),
                request.validTo(),
                request.reason()
        ));
        return ResponseEntity.ok(toPriceOverrideResponse(updated));
    }

    @GetMapping("/products/{productId}/publication-validation")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<EcommerceAdminPublicationValidationResponse> validatePublication(@PathVariable Long productId) {
        PublicationValidationResult validation = ecommerceCatalogUseCase.validatePublication(productId);
        return ResponseEntity.ok(toPublicationValidationResponse(validation));
    }

    @PostMapping("/products/{productId}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineProfileDetailResponse> publish(@PathVariable Long productId) {
        ProductOnlineProfile published = ecommerceCatalogUseCase.publish(productId);
        return ResponseEntity.ok(buildDetail(published));
    }

    @PostMapping("/products/{productId}/unpublish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineProfileDetailResponse> unpublish(@PathVariable Long productId) {
        ProductOnlineProfile unpublished = ecommerceCatalogUseCase.unpublish(productId);
        return ResponseEntity.ok(buildDetail(unpublished));
    }

    private EcommerceAdminOnlineProfileDetailResponse buildDetail(ProductOnlineProfile profile) {
        Optional<EcommerceSeoMetadata> seo = ecommerceCatalogUseCase.getSeoMetadataByProductId(profile.productId());
        Optional<ProductAsset> primaryAsset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(profile.productId());
        Optional<OnlinePriceOverride> activeOverride = ecommerceCatalogUseCase.getActivePriceOverrideByProductId(profile.productId());

        EcommerceAdminEffectivePriceResponse effectivePrice = null;
        try {
            EffectiveOnlinePriceResult result = ecommerceCatalogUseCase.calculateEffectiveOnlinePrice(profile.productId());
            effectivePrice = new EcommerceAdminEffectivePriceResponse(result.amount(), result.currency(), result.overrideApplied());
        } catch (EcommerceBusinessRuleException | EcommerceNotFoundException ignored) {
        }

        PublicationValidationResult publicationValidation = ecommerceCatalogUseCase.validatePublication(profile.productId());
        return new EcommerceAdminOnlineProfileDetailResponse(
                profile.id(),
                profile.productId(),
                profile.publicationStatus(),
                profile.slug(),
                profile.onlineName(),
                profile.onlineDescription(),
                profile.onlineCategoryId(),
                profile.brandId(),
                profile.brandAbsencePolicy(),
                profile.publishedAt(),
                profile.unpublishedAt(),
                profile.createdAt(),
                profile.updatedAt(),
                seo.map(this::toSeoResponse).orElse(null),
                primaryAsset.map(this::toPrimaryAssetResponse).orElse(null),
                activeOverride.map(this::toPriceOverrideResponse).orElse(null),
                effectivePrice,
                toPublicationValidationResponse(publicationValidation)
        );
    }

    private EcommerceAdminOnlineProfileSummaryResponse toSummaryResponse(ProductOnlineProfile profile) {
        return new EcommerceAdminOnlineProfileSummaryResponse(
                profile.id(),
                profile.productId(),
                profile.publicationStatus(),
                profile.slug(),
                profile.onlineName(),
                profile.onlineCategoryId(),
                profile.brandId(),
                profile.brandAbsencePolicy(),
                profile.publishedAt(),
                profile.updatedAt()
        );
    }

    private EcommerceAdminSeoMetadataResponse toSeoResponse(EcommerceSeoMetadata metadata) {
        return new EcommerceAdminSeoMetadataResponse(
                metadata.id(),
                metadata.seoTitle(),
                metadata.seoDescription(),
                metadata.canonicalPath(),
                metadata.robotsPolicy(),
                metadata.indexable(),
                metadata.ogTitle(),
                metadata.ogDescription(),
                metadata.ogImageUrl(),
                metadata.updatedAt()
        );
    }

    private EcommerceAdminPrimaryAssetResponse toPrimaryAssetResponse(ProductAsset asset) {
        return new EcommerceAdminPrimaryAssetResponse(
                asset.id(),
                asset.assetType(),
                asset.assetUrl(),
                asset.altText(),
                asset.source(),
                asset.rightsConfirmed(),
                asset.displayOrder(),
                asset.active(),
                asset.updatedAt()
        );
    }

    private EcommerceAdminPriceOverrideResponse toPriceOverrideResponse(OnlinePriceOverride override) {
        return new EcommerceAdminPriceOverrideResponse(
                override.id(),
                override.amount(),
                override.currency(),
                override.active(),
                override.validFrom(),
                override.validTo(),
                override.reason(),
                override.updatedAt()
        );
    }

    private EcommerceAdminPublicationValidationResponse toPublicationValidationResponse(PublicationValidationResult validation) {
        return new EcommerceAdminPublicationValidationResponse(
                validation.publishable(),
                validation.errors(),
                validation.effectivePrice(),
                validation.currency()
        );
    }
}
