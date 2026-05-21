package com.erppos.backend.erp.catalog.infrastructure.persistence;

import com.erppos.backend.erp.catalog.application.usecase.ProductBarcodeStatus;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.catalog.infrastructure.mapper.ProductMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
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
        return productJpaRepository.findByFilters(
                query,
                applyQuery,
                categoryId,
                active,
                barcodeStatus == null ? null : barcodeStatus.name(),
                pageable
        ).map(ProductMapper::toDomain);
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
}
