package com.erppos.backend.erp.catalog.infrastructure.persistence;

import com.erppos.backend.erp.catalog.application.usecase.ProductBarcodeStatus;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.catalog.infrastructure.mapper.ProductMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class ProductPersistenceAdapter implements ProductRepositoryPort {
    private final ProductJpaRepository productJpaRepository;
    private final CategoryJpaRepository categoryJpaRepository;
    private final UnitJpaRepository unitJpaRepository;

    public ProductPersistenceAdapter(
            ProductJpaRepository productJpaRepository,
            CategoryJpaRepository categoryJpaRepository,
            UnitJpaRepository unitJpaRepository
    ) {
        this.productJpaRepository = productJpaRepository;
        this.categoryJpaRepository = categoryJpaRepository;
        this.unitJpaRepository = unitJpaRepository;
    }

    @Override
    @Transactional
    public Product save(Product product) {
        CategoryEntity categoryEntity = categoryJpaRepository.findById(product.categoryId())
                .orElseThrow(() -> new CatalogNotFoundException("Category not found"));
        UnitEntity unitEntity = unitJpaRepository.findById(product.unitId())
                .orElseThrow(() -> new CatalogNotFoundException("Unit not found"));
        ProductEntity entity;
        if (product.id() == null) {
            entity = ProductMapper.toEntity(product, categoryEntity, unitEntity);
        } else {
            entity = productJpaRepository.findById(product.id()).orElseGet(ProductEntity::new);
            ProductMapper.merge(entity, product, categoryEntity, unitEntity);
        }
        return ProductMapper.toDomain(productJpaRepository.save(entity));
    }

    @Override
    public Optional<Product> findById(Long id) {
        return productJpaRepository.findById(id).map(ProductMapper::toDomain);
    }

    @Override
    public Page<Product> findAll(Pageable pageable) {
        return productJpaRepository.findAll(pageable).map(ProductMapper::toDomain);
    }

    @Override
    public Page<Product> findByFilters(String query, boolean applyQuery, Long categoryId, Boolean active, ProductBarcodeStatus barcodeStatus, Pageable pageable) {
        Pageable resolvedPageable = ensureStableSort(pageable);
        Specification<ProductEntity> specification = buildFiltersSpecification(
                query,
                applyQuery,
                categoryId,
                active,
                barcodeStatus
        );

        return productJpaRepository.findAll(specification, resolvedPageable).map(ProductMapper::toDomain);
    }

    @Override
    public List<Product> search(String query, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return productJpaRepository.search(query, pageable).stream().map(ProductMapper::toDomain).toList();
    }

    @Override
    public List<Product> lookup(String query, Boolean active, int limit) {
        String normalizedQuery = normalizeQuery(query);
        List<String> tokens = tokenize(normalizedQuery);
        if (normalizedQuery.length() < 2 || tokens.isEmpty()) {
            return List.of();
        }

        boolean resolvedActive = active == null || active;
        return productJpaRepository.findByActive(resolvedActive).stream()
                .map(ProductMapper::toDomain)
                .filter(product -> matchesTokens(product, tokens))
                .sorted(Comparator
                        .comparingInt((Product product) -> ranking(product, normalizedQuery, tokens))
                        .thenComparing(Product::name, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Product::sku, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Product::id, Comparator.nullsLast(Long::compareTo)))
                .limit(limit)
                .toList();
    }

    @Override
    public boolean existsBySkuIgnoreCase(String sku) {
        return productJpaRepository.existsBySkuIgnoreCase(sku);
    }

    @Override
    public boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id) {
        return productJpaRepository.existsBySkuIgnoreCaseAndIdNot(sku, id);
    }

    @Override
    public boolean existsByBarcode(String barcode) {
        return productJpaRepository.existsByBarcode(barcode);
    }

    @Override
    public boolean existsByBarcodeAndIdNot(String barcode, Long id) {
        return productJpaRepository.existsByBarcodeAndIdNot(barcode, id);
    }

    private String normalizeQuery(String query) {
        if (query == null) {
            return "";
        }

        return query.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private List<String> tokenize(String query) {
        if (query.isBlank()) {
            return List.of();
        }

        return Arrays.stream(query.split(" "))
                .filter(token -> !token.isBlank())
                .toList();
    }

    private boolean matchesTokens(Product product, List<String> tokens) {
        String name = normalized(product.name());
        String sku = normalized(product.sku());
        String barcode = normalized(product.barcode());

        for (String token : tokens) {
            if (!name.contains(token) && !sku.contains(token) && !barcode.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private int ranking(Product product, String query, List<String> tokens) {
        String name = normalized(product.name());
        String sku = normalized(product.sku());
        String barcode = normalized(product.barcode());

        if (sku.equals(query) || (!barcode.isBlank() && barcode.equals(query))) {
            return 0;
        }
        if (sku.startsWith(query) || (!barcode.isBlank() && barcode.startsWith(query))) {
            return 1;
        }
        if (name.startsWith(query)) {
            return 2;
        }
        if (containsAllTokens(name, tokens)) {
            return 3;
        }
        return 4;
    }

    private boolean containsAllTokens(String text, List<String> tokens) {
        for (String token : tokens) {
            if (!text.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private String normalized(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private Pageable ensureStableSort(Pageable pageable) {
        if (pageable.getSort().isSorted()) {
            return pageable;
        }

        return PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Order.asc("name"), Sort.Order.asc("sku"), Sort.Order.asc("id"))
        );
    }

    private Specification<ProductEntity> buildFiltersSpecification(
            String query,
            boolean applyQuery,
            Long categoryId,
            Boolean active,
            ProductBarcodeStatus barcodeStatus
    ) {
        String normalizedQuery = normalizeQuery(query);
        List<String> tokens = applyQuery ? tokenize(normalizedQuery) : List.of();

        return (root, cq, cb) -> {
            if (!Long.class.equals(cq.getResultType()) && !long.class.equals(cq.getResultType())) {
                root.fetch("category", JoinType.LEFT);
                root.fetch("unit", JoinType.LEFT);
                cq.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            if (applyQuery && !tokens.isEmpty()) {
                predicates.add(allTokensPredicate(root, cb, tokens));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }

            if (barcodeStatus != null && barcodeStatus != ProductBarcodeStatus.ALL) {
                Predicate hasBarcode = cb.and(
                        cb.isNotNull(root.get("barcode")),
                        cb.notEqual(cb.trim(root.get("barcode")), "")
                );
                Predicate withoutBarcode = cb.or(
                        cb.isNull(root.get("barcode")),
                        cb.equal(cb.trim(root.get("barcode")), "")
                );

                predicates.add(barcodeStatus == ProductBarcodeStatus.WITH_BARCODE ? hasBarcode : withoutBarcode);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate allTokensPredicate(
            jakarta.persistence.criteria.Root<ProductEntity> root,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            List<String> tokens
    ) {
        List<Predicate> tokenPredicates = new ArrayList<>();
        for (String token : tokens) {
            String pattern = "%" + token + "%";
            tokenPredicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("sku")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("barcode"), "")), pattern)
            ));
        }

        return cb.and(tokenPredicates.toArray(new Predicate[0]));
    }
}
