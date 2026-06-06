package com.erppos.backend.erp.ecommerce.adapter.rest;

import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminBrandRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminBrandResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminBrandStatusRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminEffectivePriceResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineCategoryRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineCategoryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineCategoryStatusRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineProfileDetailResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineProfileStatusResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminOnlineProfileSummaryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminPriceOverrideResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminPrimaryAssetResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminPublicationValidationResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminSeoMetadataResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpdateOnlineProfileRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpsertPriceOverrideRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpsertPrimaryAssetRequest;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceAdminUpsertSeoRequest;
import com.erppos.backend.erp.ecommerce.application.dto.OnlineProfileSummaryResult;
import com.erppos.backend.erp.ecommerce.application.usecase.ChangeEcommerceBrandStatusCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.ChangeEcommerceOnlineCategoryStatusCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.CreateEcommerceBrandCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.CreateEcommerceOnlineCategoryCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.EffectiveOnlinePriceResult;
import com.erppos.backend.erp.ecommerce.application.usecase.PublicationValidationResult;
import com.erppos.backend.erp.ecommerce.application.usecase.ReadinessStatus;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateEcommerceBrandCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateEcommerceOnlineCategoryCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertOnlinePriceOverrideCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileSearchCriteria;
import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import com.erppos.backend.erp.shared.adapter.dto.PageResponseMapper;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ecommerce-admin")
public class EcommerceAdminController {

    private final EcommerceCatalogUseCase ecommerceCatalogUseCase;

    public EcommerceAdminController(EcommerceCatalogUseCase ecommerceCatalogUseCase) {
        this.ecommerceCatalogUseCase = ecommerceCatalogUseCase;
    }

    @GetMapping("/brands")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<List<EcommerceAdminBrandResponse>> listBrands() {
        return ResponseEntity.ok(ecommerceCatalogUseCase.listBrands().stream().map(this::toBrandResponse).toList());
    }

    @GetMapping("/brands/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<EcommerceAdminBrandResponse> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(toBrandResponse(ecommerceCatalogUseCase.getBrandById(id)));
    }

    @PostMapping("/brands")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminBrandResponse> createBrand(@Valid @RequestBody EcommerceAdminBrandRequest request) {
        EcommerceBrand created = ecommerceCatalogUseCase.createBrand(new CreateEcommerceBrandCommand(
                request.name(),
                request.slug(),
                request.description()
        ));
        return ResponseEntity.created(URI.create("/api/v1/ecommerce-admin/brands/" + created.id())).body(toBrandResponse(created));
    }

    @PutMapping("/brands/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminBrandResponse> updateBrand(
            @PathVariable Long id,
            @Valid @RequestBody EcommerceAdminBrandRequest request
    ) {
        EcommerceBrand updated = ecommerceCatalogUseCase.updateBrand(id, new UpdateEcommerceBrandCommand(
                request.name(),
                request.slug(),
                request.description()
        ));
        return ResponseEntity.ok(toBrandResponse(updated));
    }

    @PatchMapping("/brands/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminBrandResponse> changeBrandStatus(
            @PathVariable Long id,
            @Valid @RequestBody EcommerceAdminBrandStatusRequest request
    ) {
        EcommerceBrand updated = ecommerceCatalogUseCase.changeBrandStatus(
                id,
                new ChangeEcommerceBrandStatusCommand(Boolean.TRUE.equals(request.active()))
        );
        return ResponseEntity.ok(toBrandResponse(updated));
    }

    @GetMapping("/online-categories")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<List<EcommerceAdminOnlineCategoryResponse>> listOnlineCategories() {
        return ResponseEntity.ok(ecommerceCatalogUseCase.listOnlineCategories().stream().map(this::toOnlineCategoryResponse).toList());
    }

    @GetMapping("/online-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<EcommerceAdminOnlineCategoryResponse> getOnlineCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(toOnlineCategoryResponse(ecommerceCatalogUseCase.getOnlineCategoryById(id)));
    }

    @PostMapping("/online-categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineCategoryResponse> createOnlineCategory(
            @Valid @RequestBody EcommerceAdminOnlineCategoryRequest request
    ) {
        EcommerceOnlineCategory created = ecommerceCatalogUseCase.createOnlineCategory(new CreateEcommerceOnlineCategoryCommand(
                request.parentId(),
                request.name(),
                request.slug(),
                request.description()
        ));
        return ResponseEntity.created(URI.create("/api/v1/ecommerce-admin/online-categories/" + created.id())).body(toOnlineCategoryResponse(created));
    }

    @PutMapping("/online-categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineCategoryResponse> updateOnlineCategory(
            @PathVariable Long id,
            @Valid @RequestBody EcommerceAdminOnlineCategoryRequest request
    ) {
        EcommerceOnlineCategory updated = ecommerceCatalogUseCase.updateOnlineCategory(id, new UpdateEcommerceOnlineCategoryCommand(
                request.parentId(),
                request.name(),
                request.slug(),
                request.description()
        ));
        return ResponseEntity.ok(toOnlineCategoryResponse(updated));
    }

    @PatchMapping("/online-categories/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineCategoryResponse> changeOnlineCategoryStatus(
            @PathVariable Long id,
            @Valid @RequestBody EcommerceAdminOnlineCategoryStatusRequest request
    ) {
        EcommerceOnlineCategory updated = ecommerceCatalogUseCase.changeOnlineCategoryStatus(
                id,
                new ChangeEcommerceOnlineCategoryStatusCommand(Boolean.TRUE.equals(request.active()))
        );
        return ResponseEntity.ok(toOnlineCategoryResponse(updated));
    }

    @GetMapping("/products/online-profiles")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<PageResponse<EcommerceAdminOnlineProfileSummaryResponse>> listOnlineProfiles(
            @RequestParam(required = false) OnlinePublicationStatus status,
            @RequestParam(required = false) String readinessStatus,
            @RequestParam(required = false) Long brandId,
            @RequestParam(defaultValue = "false") boolean withoutBrand,
            @RequestParam(required = false) Long onlineCategoryId,
            @RequestParam(defaultValue = "false") boolean withoutOnlineCategory,
            @RequestParam(required = false) String q,
            Pageable pageable
    ) {
        ProductOnlineProfileSearchCriteria criteria = buildOnlineProfilesCriteria(
                status,
                readinessStatus,
                brandId,
                withoutBrand,
                onlineCategoryId,
                withoutOnlineCategory,
                q
        );
        Page<EcommerceAdminOnlineProfileSummaryResponse> page = ecommerceCatalogUseCase
                .listOnlineProfiles(criteria, pageable)
                .map(this::toSummaryResponse);
        return ResponseEntity.ok(PageResponseMapper.from(page));
    }

    @GetMapping("/products/online-profile-status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<List<EcommerceAdminOnlineProfileStatusResponse>> listOnlineProfileStatuses(
            @RequestParam(required = false) String productIds
    ) {
        List<Long> normalizedProductIds = parseProductIds(productIds);
        if (normalizedProductIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        Map<Long, ProductOnlineProfile> profilesByProductId = ecommerceCatalogUseCase
                .listProfilesByProductIds(normalizedProductIds)
                .stream()
                .collect(Collectors.toMap(ProductOnlineProfile::productId, profile -> profile));

        return ResponseEntity.ok(normalizedProductIds.stream()
                .map(productId -> toStatusResponse(productId, profilesByProductId.get(productId)))
                .toList());
    }

    @GetMapping("/products/{productId}/online-profile")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<EcommerceAdminOnlineProfileDetailResponse> getOnlineProfile(@PathVariable Long productId) {
        ProductOnlineProfile profile = ecommerceCatalogUseCase.getProfileByProductId(productId);
        return ResponseEntity.ok(buildDetail(profile));
    }

    @PostMapping("/products/{productId}/online-profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceAdminOnlineProfileDetailResponse> createOnlineProfile(@PathVariable Long productId) {
        ProductOnlineProfile created = ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        return ResponseEntity
                .created(URI.create("/api/v1/ecommerce-admin/products/" + productId + "/online-profile"))
                .body(buildDetail(created));
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
        EcommerceCatalogProductSnapshot productSnapshot = ecommerceCatalogUseCase.getProductSnapshotByProductId(profile.productId());
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
                productSnapshot.sku(),
                productSnapshot.name(),
                productSnapshot.active(),
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

    private EcommerceAdminOnlineProfileSummaryResponse toSummaryResponse(OnlineProfileSummaryResult result) {
        return new EcommerceAdminOnlineProfileSummaryResponse(
                result.profileId(),
                result.productId(),
                result.productSku(),
                result.productName(),
                result.productActive(),
                result.publicationStatus(),
                result.slug(),
                result.onlineName(),
                result.onlineCategoryId(),
                result.onlineCategoryName(),
                result.brandId(),
                result.brandName(),
                result.brandAbsencePolicy(),
                result.publishedAt(),
                result.updatedAt(),
                result.readinessStatus(),
                result.readinessCompleted(),
                result.readinessTotal(),
                result.missingRequirements()
        );
    }

    private EcommerceAdminOnlineProfileStatusResponse toStatusResponse(Long productId, ProductOnlineProfile profile) {
        if (profile == null) {
            return new EcommerceAdminOnlineProfileStatusResponse(productId, false, null, null, null);
        }

        return new EcommerceAdminOnlineProfileStatusResponse(
                profile.productId(),
                true,
                profile.publicationStatus(),
                profile.slug(),
                profile.onlineName()
        );
    }

    private List<Long> parseProductIds(String productIds) {
        if (productIds == null || productIds.isBlank()) {
            return List.of();
        }

        try {
            return List.of(productIds.split(",")).stream()
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .map(Long::valueOf)
                    .filter(productId -> productId > 0)
                    .distinct()
                    .toList();
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productIds must be numeric");
        }
    }

    private ProductOnlineProfileSearchCriteria buildOnlineProfilesCriteria(
            OnlinePublicationStatus status,
            String readinessStatus,
            Long brandId,
            boolean withoutBrand,
            Long onlineCategoryId,
            boolean withoutOnlineCategory,
            String q
    ) {
        if (brandId != null && brandId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "brandId must be positive");
        }
        if (onlineCategoryId != null && onlineCategoryId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "onlineCategoryId must be positive");
        }
        if (brandId != null && withoutBrand) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "brandId and withoutBrand cannot be combined");
        }
        if (onlineCategoryId != null && withoutOnlineCategory) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "onlineCategoryId and withoutOnlineCategory cannot be combined");
        }

        String normalizedQuery = q == null || q.isBlank() ? null : q.trim();
        return new ProductOnlineProfileSearchCriteria(
                status,
                parseReadinessStatus(readinessStatus),
                brandId,
                withoutBrand,
                onlineCategoryId,
                withoutOnlineCategory,
                normalizedQuery
        );
    }

    private ReadinessStatus parseReadinessStatus(String readinessStatus) {
        if (readinessStatus == null || readinessStatus.isBlank()) {
            return null;
        }
        try {
            return ReadinessStatus.valueOf(readinessStatus.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "readinessStatus is invalid");
        }
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
                validation.currency(),
                validation.missingRequirements()
        );
    }

    private EcommerceAdminBrandResponse toBrandResponse(EcommerceBrand brand) {
        return new EcommerceAdminBrandResponse(
                brand.id(),
                brand.name(),
                brand.slug(),
                brand.description(),
                brand.active(),
                brand.createdAt(),
                brand.updatedAt()
        );
    }

    private EcommerceAdminOnlineCategoryResponse toOnlineCategoryResponse(EcommerceOnlineCategory category) {
        return new EcommerceAdminOnlineCategoryResponse(
                category.id(),
                category.parentId(),
                category.name(),
                category.slug(),
                category.description(),
                category.active(),
                category.createdAt(),
                category.updatedAt()
        );
    }
}
