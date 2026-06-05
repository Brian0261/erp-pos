package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileSearchCriteria;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.ProductOnlineProfileMapper;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

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
}
