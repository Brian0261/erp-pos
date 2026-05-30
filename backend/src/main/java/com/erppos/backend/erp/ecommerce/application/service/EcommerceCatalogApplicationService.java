package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EffectiveOnlinePriceResult;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.PublicationValidationResult;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertOnlinePriceOverrideCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceConflictException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceBrandRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceCatalogProductReadPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceSeoMetadataRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.OnlinePriceOverrideRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class EcommerceCatalogApplicationService implements EcommerceCatalogUseCase {
    private static final String PEN_CURRENCY = "PEN";

    private final ProductOnlineProfileRepositoryPort profileRepositoryPort;
    private final EcommerceCatalogProductReadPort productReadPort;
    private final EcommerceBrandRepositoryPort brandRepositoryPort;
    private final EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;
    private final EcommerceSeoMetadataRepositoryPort seoMetadataRepositoryPort;
    private final ProductAssetRepositoryPort productAssetRepositoryPort;
    private final OnlinePriceOverrideRepositoryPort onlinePriceOverrideRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public EcommerceCatalogApplicationService(
            ProductOnlineProfileRepositoryPort profileRepositoryPort,
            EcommerceCatalogProductReadPort productReadPort,
            EcommerceBrandRepositoryPort brandRepositoryPort,
            EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort,
            EcommerceSeoMetadataRepositoryPort seoMetadataRepositoryPort,
            ProductAssetRepositoryPort productAssetRepositoryPort,
            OnlinePriceOverrideRepositoryPort onlinePriceOverrideRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.profileRepositoryPort = profileRepositoryPort;
        this.productReadPort = productReadPort;
        this.brandRepositoryPort = brandRepositoryPort;
        this.onlineCategoryRepositoryPort = onlineCategoryRepositoryPort;
        this.seoMetadataRepositoryPort = seoMetadataRepositoryPort;
        this.productAssetRepositoryPort = productAssetRepositoryPort;
        this.onlinePriceOverrideRepositoryPort = onlinePriceOverrideRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public ProductOnlineProfile createDraftProfile(CreateProductOnlineProfileCommand command) {
        if (command.productId() == null) {
            throw new EcommerceBusinessRuleException("Product id is required");
        }
        productReadPort.findById(command.productId())
                .orElseThrow(() -> new EcommerceNotFoundException("Product not found"));
        if (profileRepositoryPort.existsByProductId(command.productId())) {
            throw new EcommerceConflictException("Product online profile already exists");
        }
        String actor = auditUserProvider.currentUsername();
        ProductOnlineProfile profile = new ProductOnlineProfile(
                null,
                command.productId(),
                OnlinePublicationStatus.DRAFT,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0L,
                null,
                null,
                actor,
                actor
        );
        return profileRepositoryPort.save(profile);
    }

    @Override
    public ProductOnlineProfile getProfileByProductId(Long productId) {
        return profileRepositoryPort.findByProductId(productId)
                .orElseThrow(() -> new EcommerceNotFoundException("Product online profile not found"));
    }

    @Override
    public ProductOnlineProfile updateProfile(UpdateProductOnlineProfileCommand command) {
        if (command.productId() == null) {
            throw new EcommerceBusinessRuleException("Product id is required");
        }

        requireProductSnapshot(command.productId());
        ProductOnlineProfile current = getProfileByProductId(command.productId());

        String normalizedSlug = normalizeSlug(command.slug());
        if (current.publicationStatus() == OnlinePublicationStatus.PUBLISHED
                && hasSlugChanged(current.slug(), normalizedSlug)) {
            throw new EcommerceConflictException("Slug cannot be changed for published profile without slug history");
        }
        if (normalizedSlug != null && profileRepositoryPort.existsBySlugIgnoreCaseAndIdNot(normalizedSlug, current.id())) {
            throw new EcommerceConflictException("Slug already exists");
        }

        if (command.brandId() != null && command.brandAbsencePolicy() != null) {
            throw new EcommerceBusinessRuleException("Brand and brand absence policy cannot coexist");
        }
        if (command.brandId() != null) {
            brandRepositoryPort.findById(command.brandId())
                    .orElseThrow(() -> new EcommerceNotFoundException("Brand not found"));
        }
        if (command.onlineCategoryId() != null) {
            onlineCategoryRepositoryPort.findById(command.onlineCategoryId())
                    .orElseThrow(() -> new EcommerceNotFoundException("Online category not found"));
        }

        ProductOnlineProfile updated = new ProductOnlineProfile(
                current.id(),
                current.productId(),
                current.publicationStatus(),
                normalizedSlug,
                trimToNull(command.onlineName()),
                trimToNull(command.onlineDescription()),
                command.onlineCategoryId(),
                command.brandId(),
                command.brandAbsencePolicy(),
                current.publishedAt(),
                current.unpublishedAt(),
                current.version(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );

        if (current.publicationStatus() == OnlinePublicationStatus.PUBLISHED) {
            List<String> errors = collectPublicationErrorsWithoutPrice(updated, requireProductSnapshot(updated.productId()));
            try {
                EffectiveOnlinePriceResult result = calculateEffectiveOnlinePrice(updated.productId());
                if (result.amount().compareTo(BigDecimal.ZERO) <= 0) {
                    errors.add("Effective online price must be greater than zero");
                }
            } catch (EcommerceBusinessRuleException | EcommerceNotFoundException ex) {
                errors.add(ex.getMessage());
            }
            if (!errors.isEmpty()) {
                throw new EcommerceBusinessRuleException("Published profile update blocked: " + String.join("; ", errors));
            }
        }

        return profileRepositoryPort.save(updated);
    }

    @Override
    public EcommerceSeoMetadata upsertSeoMetadata(UpsertProductSeoMetadataCommand command) {
        ProductOnlineProfile profile = getProfileByProductId(requireProductId(command.productId()));

        String seoTitle = trimToNull(command.seoTitle());
        String seoDescription = trimToNull(command.seoDescription());
        String canonicalPath = trimToNull(command.canonicalPath());
        RobotsPolicy robotsPolicy = command.robotsPolicy() == null ? RobotsPolicy.NOINDEX_FOLLOW : command.robotsPolicy();

        if (command.indexable() && robotsPolicy != RobotsPolicy.INDEX_FOLLOW) {
            throw new EcommerceBusinessRuleException("Indexable metadata requires INDEX_FOLLOW robots policy");
        }
        if (command.indexable() && (seoTitle == null || seoDescription == null)) {
            throw new EcommerceBusinessRuleException("Indexable metadata requires SEO title and SEO description");
        }

        EcommerceSeoMetadata current = seoMetadataRepositoryPort.findByProductOnlineProfileId(profile.id()).orElse(null);
        String actor = auditUserProvider.currentUsername();
        EcommerceSeoMetadata metadata = new EcommerceSeoMetadata(
                current == null ? null : current.id(),
                profile.id(),
                null,
                null,
                seoTitle,
                seoDescription,
                canonicalPath,
                robotsPolicy,
                command.indexable(),
                trimToNull(command.ogTitle()),
                trimToNull(command.ogDescription()),
                trimToNull(command.ogImageUrl()),
                current == null ? null : current.createdAt(),
                current == null ? null : current.updatedAt(),
                current == null ? actor : current.createdBy(),
                actor
        );
        return seoMetadataRepositoryPort.save(metadata);
    }

    @Override
    public ProductAsset upsertPrimaryProductAsset(UpsertProductAssetCommand command) {
        ProductOnlineProfile profile = getProfileByProductId(requireProductId(command.productId()));

        if (command.assetType() != AssetType.PRODUCT_IMAGE) {
            throw new EcommerceBusinessRuleException("Only PRODUCT_IMAGE assets are supported for product profile");
        }
        String assetUrl = trimToNull(command.assetUrl());
        if (assetUrl == null) {
            throw new EcommerceBusinessRuleException("Asset URL is required");
        }
        if (command.source() == null) {
            throw new EcommerceBusinessRuleException("Asset source is required");
        }

        ProductAsset currentPrimary = productAssetRepositoryPort.findPrimaryActiveByProductOnlineProfileId(profile.id()).orElse(null);
        String actor = auditUserProvider.currentUsername();
        ProductAsset asset = new ProductAsset(
                currentPrimary == null ? null : currentPrimary.id(),
                profile.id(),
                command.assetType(),
                assetUrl,
                trimToNull(command.altText()),
                command.source(),
                command.rightsConfirmed(),
                true,
                true,
                Math.max(command.displayOrder(), 0),
                currentPrimary == null ? null : currentPrimary.createdAt(),
                currentPrimary == null ? null : currentPrimary.updatedAt(),
                currentPrimary == null ? actor : currentPrimary.createdBy(),
                actor
        );
        return productAssetRepositoryPort.save(asset);
    }

    @Override
    public OnlinePriceOverride upsertOnlinePriceOverride(UpsertOnlinePriceOverrideCommand command) {
        ProductOnlineProfile profile = getProfileByProductId(requireProductId(command.productId()));

        if (command.amount() == null || command.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new EcommerceBusinessRuleException("Online override amount must be greater than zero");
        }

        String currency = normalizeCurrency(command.currency());
        if (!PEN_CURRENCY.equals(currency)) {
            throw new EcommerceBusinessRuleException("Only PEN currency is supported");
        }

        if (command.validFrom() != null && command.validTo() != null && !command.validTo().isAfter(command.validFrom())) {
            throw new EcommerceBusinessRuleException("Override validity range is invalid");
        }

        OnlinePriceOverride currentActive = onlinePriceOverrideRepositoryPort.findActiveByProductOnlineProfileId(profile.id()).orElse(null);
        String actor = auditUserProvider.currentUsername();
        OnlinePriceOverride override = new OnlinePriceOverride(
                currentActive == null ? null : currentActive.id(),
                profile.id(),
                command.amount(),
                currency,
                command.active(),
                command.validFrom(),
                command.validTo(),
                trimToNull(command.reason()),
                currentActive == null ? null : currentActive.createdAt(),
                currentActive == null ? null : currentActive.updatedAt(),
                currentActive == null ? actor : currentActive.createdBy(),
                actor
        );
        return onlinePriceOverrideRepositoryPort.save(override);
    }

    @Override
    public EffectiveOnlinePriceResult calculateEffectiveOnlinePrice(Long productId) {
        ProductOnlineProfile profile = getProfileByProductId(requireProductId(productId));
        EcommerceCatalogProductSnapshot productSnapshot = requireProductSnapshot(profile.productId());

        Instant now = Instant.now();
        OnlinePriceOverride activeOverride = onlinePriceOverrideRepositoryPort
                .findActiveByProductOnlineProfileId(profile.id())
                .orElse(null);

        if (isUsableOverride(activeOverride, now)) {
            return new EffectiveOnlinePriceResult(activeOverride.amount(), PEN_CURRENCY, true);
        }

        BigDecimal fallbackPrice = productSnapshot.salePrice();
        if (fallbackPrice == null || fallbackPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new EcommerceBusinessRuleException("Effective online price must be greater than zero");
        }
        return new EffectiveOnlinePriceResult(fallbackPrice, PEN_CURRENCY, false);
    }

    @Override
    public PublicationValidationResult validatePublication(Long productId) {
        ProductOnlineProfile profile = getProfileByProductId(requireProductId(productId));
        EcommerceCatalogProductSnapshot productSnapshot = requireProductSnapshot(profile.productId());

        List<String> errors = collectPublicationErrorsWithoutPrice(profile, productSnapshot);

        BigDecimal effectivePrice = null;
        String currency = PEN_CURRENCY;
        try {
            EffectiveOnlinePriceResult result = calculateEffectiveOnlinePrice(productId);
            effectivePrice = result.amount();
            currency = result.currency();
            if (effectivePrice.compareTo(BigDecimal.ZERO) <= 0) {
                errors.add("Effective online price must be greater than zero");
            }
        } catch (EcommerceBusinessRuleException | EcommerceNotFoundException ex) {
            errors.add(ex.getMessage());
        }

        return new PublicationValidationResult(errors.isEmpty(), List.copyOf(errors), effectivePrice, currency);
    }

    @Override
    public ProductOnlineProfile publish(Long productId) {
        ProductOnlineProfile current = getProfileByProductId(requireProductId(productId));
        PublicationValidationResult validation = validatePublication(productId);
        if (!validation.publishable()) {
            throw new EcommerceBusinessRuleException("Publication blocked: " + String.join("; ", validation.errors()));
        }

        String actor = auditUserProvider.currentUsername();
        ProductOnlineProfile published = new ProductOnlineProfile(
                current.id(),
                current.productId(),
                OnlinePublicationStatus.PUBLISHED,
                normalizeSlug(current.slug()),
                current.onlineName(),
                current.onlineDescription(),
                current.onlineCategoryId(),
                current.brandId(),
                current.brandAbsencePolicy(),
                Instant.now(),
                current.unpublishedAt(),
                current.version(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return profileRepositoryPort.save(published);
    }

    @Override
    public ProductOnlineProfile unpublish(Long productId) {
        ProductOnlineProfile current = getProfileByProductId(requireProductId(productId));

        String actor = auditUserProvider.currentUsername();
        ProductOnlineProfile unpublished = new ProductOnlineProfile(
                current.id(),
                current.productId(),
                OnlinePublicationStatus.UNPUBLISHED,
                current.slug(),
                current.onlineName(),
                current.onlineDescription(),
                current.onlineCategoryId(),
                current.brandId(),
                current.brandAbsencePolicy(),
                current.publishedAt(),
                Instant.now(),
                current.version(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return profileRepositoryPort.save(unpublished);
    }

    private List<String> collectPublicationErrorsWithoutPrice(
            ProductOnlineProfile profile,
            EcommerceCatalogProductSnapshot productSnapshot
    ) {
        List<String> errors = new ArrayList<>();

        if (!productSnapshot.active()) {
            errors.add("Internal product must be active");
        }
        if (trimToNull(productSnapshot.sku()) == null) {
            errors.add("Internal product SKU is required");
        }
        if (trimToNull(profile.onlineName()) == null) {
            errors.add("onlineName is required for publication");
        }
        if (trimToNull(profile.onlineDescription()) == null) {
            errors.add("onlineDescription is required for publication");
        }

        String normalizedSlug = normalizeSlug(profile.slug());
        if (normalizedSlug == null) {
            errors.add("Slug is required for publication");
        } else {
            if (!normalizedSlug.equals(profile.slug())) {
                errors.add("Slug must be normalized");
            }
            if (profileRepositoryPort.existsBySlugIgnoreCaseAndIdNot(normalizedSlug, profile.id())) {
                errors.add("Slug must be unique");
            }
        }

        if (profile.onlineCategoryId() == null) {
            errors.add("Online category is required for publication");
        } else {
            EcommerceOnlineCategory category = onlineCategoryRepositoryPort.findById(profile.onlineCategoryId()).orElse(null);
            if (category == null) {
                errors.add("Online category must exist");
            } else if (!category.active()) {
                errors.add("Online category must be active");
            }
        }

        if (profile.brandId() != null) {
            EcommerceBrand brand = brandRepositoryPort.findById(profile.brandId()).orElse(null);
            if (brand == null) {
                errors.add("Brand must exist");
            } else if (!brand.active()) {
                errors.add("Brand must be active");
            }
        } else {
            BrandAbsencePolicy policy = profile.brandAbsencePolicy();
            if (policy == null) {
                errors.add("Brand is required or explicit brand absence policy must be set");
            }
        }

        ProductAsset primaryAsset = productAssetRepositoryPort.findPrimaryActiveByProductOnlineProfileId(profile.id()).orElse(null);
        if (primaryAsset == null) {
            errors.add("Active primary asset is required for publication");
        } else {
            if (primaryAsset.assetType() != AssetType.PRODUCT_IMAGE) {
                errors.add("Primary asset type for product publication must be PRODUCT_IMAGE");
            }
            if (trimToNull(primaryAsset.altText()) == null) {
                errors.add("Primary asset altText is required for publication");
            }
            if (!primaryAsset.rightsConfirmed()) {
                errors.add("Primary asset rights must be confirmed");
            }
        }

        EcommerceSeoMetadata seoMetadata = seoMetadataRepositoryPort.findByProductOnlineProfileId(profile.id()).orElse(null);
        if (seoMetadata == null) {
            errors.add("SEO metadata is required for publication");
        } else {
            if (trimToNull(seoMetadata.seoTitle()) == null) {
                errors.add("SEO title is required for publication");
            }
            if (trimToNull(seoMetadata.seoDescription()) == null) {
                errors.add("SEO description is required for publication");
            }
            if (seoMetadata.indexable() && seoMetadata.robotsPolicy() != RobotsPolicy.INDEX_FOLLOW) {
                errors.add("Indexable SEO metadata requires INDEX_FOLLOW robots policy");
            }
        }

        return errors;
    }

    private boolean isUsableOverride(OnlinePriceOverride override, Instant now) {
        if (override == null) {
            return false;
        }
        if (!override.active()) {
            return false;
        }
        if (override.amount() == null || override.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        if (!PEN_CURRENCY.equalsIgnoreCase(override.currency())) {
            return false;
        }
        if (override.validFrom() != null && now.isBefore(override.validFrom())) {
            return false;
        }
        if (override.validTo() != null && !now.isBefore(override.validTo())) {
            return false;
        }
        return true;
    }

    private EcommerceCatalogProductSnapshot requireProductSnapshot(Long productId) {
        return productReadPort.findById(productId)
                .orElseThrow(() -> new EcommerceNotFoundException("Product not found"));
    }

    private Long requireProductId(Long productId) {
        if (productId == null) {
            throw new EcommerceBusinessRuleException("Product id is required");
        }
        return productId;
    }

    private boolean hasSlugChanged(String currentSlug, String newSlug) {
        if (currentSlug == null && newSlug == null) {
            return false;
        }
        if (currentSlug == null) {
            return true;
        }
        return !currentSlug.equals(newSlug);
    }

    private String normalizeCurrency(String currency) {
        String value = trimToNull(currency);
        if (value == null) {
            return PEN_CURRENCY;
        }
        return value.toUpperCase(Locale.ROOT);
    }

    private String normalizeSlug(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }

        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "")
                .replaceAll("-{2,}", "-");
        return normalized.isBlank() ? null : normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
