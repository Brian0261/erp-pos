package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.application.usecase.ReadinessStatus;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileSearchCriteria;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.ProductOnlineProfileMapper;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class ProductOnlineProfilePersistenceAdapter implements ProductOnlineProfileRepositoryPort {
    private final ProductOnlineProfileJpaRepository profileJpaRepository;

    public ProductOnlineProfilePersistenceAdapter(ProductOnlineProfileJpaRepository profileJpaRepository) {
        this.profileJpaRepository = profileJpaRepository;
    }

    @Override
    @Transactional
    public ProductOnlineProfile save(ProductOnlineProfile profile) {
        ProductOnlineProfileEntity entity = profile.id() == null
                ? ProductOnlineProfileMapper.toEntity(profile)
                : profileJpaRepository.findById(profile.id()).orElseThrow(() -> new EcommerceNotFoundException("Product online profile not found"));
        if (profile.id() != null) {
            ProductOnlineProfileMapper.merge(entity, profile);
        }
        return ProductOnlineProfileMapper.toDomain(profileJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Page<ProductOnlineProfile> findAll(Pageable pageable) {
        return profileJpaRepository.findAll(pageable).map(ProductOnlineProfileMapper::toDomain);
    }

    @Override
    public Page<ProductOnlineProfile> findAll(ProductOnlineProfileSearchCriteria criteria, Pageable pageable) {
        return profileJpaRepository.findAll(toSpecification(criteria), pageable)
                .map(ProductOnlineProfileMapper::toDomain);
    }

    @Override
    public List<ProductOnlineProfile> findByProductIds(List<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return List.of();
        }

        return profileJpaRepository.findByProductIdIn(productIds).stream()
                .map(ProductOnlineProfileMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<ProductOnlineProfile> findById(Long id) {
        return profileJpaRepository.findById(id).map(ProductOnlineProfileMapper::toDomain);
    }

    @Override
    public Optional<ProductOnlineProfile> findByProductId(Long productId) {
        return profileJpaRepository.findByProductId(productId).map(ProductOnlineProfileMapper::toDomain);
    }

    @Override
    public boolean existsByProductId(Long productId) {
        return profileJpaRepository.existsByProductId(productId);
    }

    @Override
    public boolean existsBySlugIgnoreCase(String slug) {
        return profileJpaRepository.existsBySlugIgnoreCase(slug);
    }

    @Override
    public boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id) {
        return profileJpaRepository.existsBySlugIgnoreCaseAndIdNot(slug, id);
    }

    @Override
    public boolean existsByBrandIdAndPublicationStatus(Long brandId, OnlinePublicationStatus publicationStatus) {
        return profileJpaRepository.existsByBrandIdAndPublicationStatus(brandId, publicationStatus);
    }

    @Override
    public boolean existsByOnlineCategoryIdAndPublicationStatus(Long onlineCategoryId, OnlinePublicationStatus publicationStatus) {
        return profileJpaRepository.existsByOnlineCategoryIdAndPublicationStatus(onlineCategoryId, publicationStatus);
    }

    private Specification<ProductOnlineProfileEntity> toSpecification(ProductOnlineProfileSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            if (criteria == null) {
                return criteriaBuilder.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();
            if (criteria.status() != null) {
                predicates.add(criteriaBuilder.equal(root.get("publicationStatus"), criteria.status()));
            }
            if (criteria.readinessStatus() != null) {
                predicates.add(readinessPredicate(root, query, criteriaBuilder, criteria.readinessStatus()));
            }
            if (criteria.brandId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("brandId"), criteria.brandId()));
            } else if (criteria.withoutBrand()) {
                predicates.add(criteriaBuilder.isNull(root.get("brandId")));
            }
            if (criteria.onlineCategoryId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("onlineCategoryId"), criteria.onlineCategoryId()));
            } else if (criteria.withoutOnlineCategory()) {
                predicates.add(criteriaBuilder.isNull(root.get("onlineCategoryId")));
            }

            String normalizedQuery = criteria.query() == null ? null : criteria.query().trim().toLowerCase(Locale.ROOT);
            if (normalizedQuery != null && !normalizedQuery.isBlank()) {
                String pattern = "%" + normalizedQuery + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("onlineName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("slug")), pattern)
                ));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Predicate readinessPredicate(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            ReadinessStatus readinessStatus
    ) {
        if (readinessStatus == ReadinessStatus.PUBLISHED) {
            return criteriaBuilder.equal(root.get("publicationStatus"), OnlinePublicationStatus.PUBLISHED);
        }
        if (readinessStatus == ReadinessStatus.UNPUBLISHED) {
            return criteriaBuilder.equal(root.get("publicationStatus"), OnlinePublicationStatus.UNPUBLISHED);
        }

        Predicate notTerminalPublicationStatus = root.get("publicationStatus").in(
                OnlinePublicationStatus.PUBLISHED,
                OnlinePublicationStatus.UNPUBLISHED
        ).not();
        Expression<Integer> missingCount = missingRequirementCount(root, query, criteriaBuilder);

        return switch (readinessStatus) {
            case READY -> criteriaBuilder.and(
                    notTerminalPublicationStatus,
                    criteriaBuilder.equal(missingCount, 0)
            );
            case INCOMPLETE -> criteriaBuilder.and(
                    notTerminalPublicationStatus,
                    criteriaBuilder.between(missingCount, 1, 3)
            );
            case NEEDS_ATTENTION -> criteriaBuilder.and(
                    notTerminalPublicationStatus,
                    criteriaBuilder.greaterThan(missingCount, 3)
            );
            default -> criteriaBuilder.conjunction();
        };
    }

    private Expression<Integer> missingRequirementCount(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        List<Predicate> missingPredicates = List.of(
                criteriaBuilder.not(existsActiveProduct(root, query, criteriaBuilder)),
                existsProductWithMissingSku(root, query, criteriaBuilder),
                isBlank(root.get("onlineName"), criteriaBuilder),
                isBlank(root.get("onlineDescription"), criteriaBuilder),
                slugMissingOrDuplicated(root, query, criteriaBuilder),
                categoryMissing(root, query, criteriaBuilder),
                brandMissing(root, query, criteriaBuilder),
                criteriaBuilder.not(existsValidPrimaryAsset(root, query, criteriaBuilder)),
                criteriaBuilder.not(existsCompleteSeo(root, query, criteriaBuilder)),
                criteriaBuilder.not(hasValidPrice(root, query, criteriaBuilder))
        );

        Expression<Integer> count = criteriaBuilder.literal(0);
        for (Predicate predicate : missingPredicates) {
            count = criteriaBuilder.sum(
                    count,
                    criteriaBuilder.<Integer>selectCase().when(predicate, 1).otherwise(0)
            );
        }
        return count;
    }

    private Predicate existsActiveProduct(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<ProductEntity> product = subquery.from(ProductEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.equal(product.get("id"), root.get("productId")),
                criteriaBuilder.isTrue(product.get("active"))
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate existsProductWithMissingSku(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<ProductEntity> product = subquery.from(ProductEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.equal(product.get("id"), root.get("productId")),
                isBlank(product.get("sku"), criteriaBuilder)
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate slugMissingOrDuplicated(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Predicate slugMissing = criteriaBuilder.or(
                isBlank(root.get("slug"), criteriaBuilder),
                criteriaBuilder.notEqual(criteriaBuilder.lower(root.get("slug")), root.get("slug"))
        );
        return criteriaBuilder.or(slugMissing, existsDuplicatedSlug(root, query, criteriaBuilder));
    }

    private Predicate existsDuplicatedSlug(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<ProductOnlineProfileEntity> duplicate = subquery.from(ProductOnlineProfileEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.isNotNull(root.get("slug")),
                criteriaBuilder.notEqual(duplicate.get("id"), root.get("id")),
                criteriaBuilder.equal(
                        criteriaBuilder.lower(duplicate.get("slug")),
                        criteriaBuilder.lower(root.get("slug"))
                )
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate categoryMissing(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        return criteriaBuilder.or(
                criteriaBuilder.isNull(root.get("onlineCategoryId")),
                criteriaBuilder.not(existsOnlineCategory(root, query, criteriaBuilder))
        );
    }

    private Predicate existsOnlineCategory(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<EcommerceOnlineCategoryEntity> category = subquery.from(EcommerceOnlineCategoryEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(criteriaBuilder.equal(category.get("id"), root.get("onlineCategoryId")));
        return criteriaBuilder.exists(subquery);
    }

    private Predicate brandMissing(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        return criteriaBuilder.or(
                criteriaBuilder.and(
                        criteriaBuilder.isNull(root.get("brandId")),
                        criteriaBuilder.isNull(root.get("brandAbsencePolicy"))
                ),
                criteriaBuilder.and(
                        criteriaBuilder.isNotNull(root.get("brandId")),
                        criteriaBuilder.not(existsBrand(root, query, criteriaBuilder))
                )
        );
    }

    private Predicate existsBrand(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<EcommerceBrandEntity> brand = subquery.from(EcommerceBrandEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(criteriaBuilder.equal(brand.get("id"), root.get("brandId")));
        return criteriaBuilder.exists(subquery);
    }

    private Predicate existsValidPrimaryAsset(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<ProductAssetEntity> asset = subquery.from(ProductAssetEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.equal(asset.get("productOnlineProfileId"), root.get("id")),
                criteriaBuilder.isTrue(asset.get("active")),
                criteriaBuilder.isTrue(asset.get("primary")),
                criteriaBuilder.equal(asset.get("assetType"), AssetType.PRODUCT_IMAGE),
                criteriaBuilder.isTrue(asset.get("rightsConfirmed")),
                criteriaBuilder.not(isBlank(asset.get("altText"), criteriaBuilder))
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate existsCompleteSeo(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<EcommerceSeoMetadataEntity> seo = subquery.from(EcommerceSeoMetadataEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.equal(seo.get("productOnlineProfileId"), root.get("id")),
                criteriaBuilder.not(isBlank(seo.get("seoTitle"), criteriaBuilder)),
                criteriaBuilder.not(isBlank(seo.get("seoDescription"), criteriaBuilder)),
                criteriaBuilder.or(
                        criteriaBuilder.isFalse(seo.get("indexable")),
                        criteriaBuilder.equal(seo.get("robotsPolicy"), RobotsPolicy.INDEX_FOLLOW)
                )
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate hasValidPrice(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        return criteriaBuilder.or(
                existsUsablePriceOverride(root, query, criteriaBuilder),
                existsProductWithValidPrice(root, query, criteriaBuilder)
        );
    }

    private Predicate existsUsablePriceOverride(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Instant now = Instant.now();
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<OnlinePriceOverrideEntity> override = subquery.from(OnlinePriceOverrideEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.equal(override.get("productOnlineProfileId"), root.get("id")),
                criteriaBuilder.isTrue(override.get("active")),
                criteriaBuilder.greaterThan(override.get("amount"), BigDecimal.ZERO),
                criteriaBuilder.equal(criteriaBuilder.lower(override.get("currency")), "pen"),
                criteriaBuilder.or(
                        criteriaBuilder.isNull(override.get("validFrom")),
                        criteriaBuilder.lessThanOrEqualTo(override.get("validFrom"), now)
                ),
                criteriaBuilder.or(
                        criteriaBuilder.isNull(override.get("validTo")),
                        criteriaBuilder.greaterThan(override.get("validTo"), now)
                )
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate existsProductWithValidPrice(
            Root<ProductOnlineProfileEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<ProductEntity> product = subquery.from(ProductEntity.class);
        subquery.select(criteriaBuilder.literal(1));
        subquery.where(
                criteriaBuilder.equal(product.get("id"), root.get("productId")),
                criteriaBuilder.greaterThan(product.get("salePrice"), BigDecimal.ZERO)
        );
        return criteriaBuilder.exists(subquery);
    }

    private Predicate isBlank(Expression<String> value, CriteriaBuilder criteriaBuilder) {
        return criteriaBuilder.or(
                criteriaBuilder.isNull(value),
                criteriaBuilder.equal(criteriaBuilder.trim(value), "")
        );
    }
}
