package com.erppos.backend.erp.catalog.infrastructure.persistence;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.catalog.infrastructure.mapper.ProductMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import java.util.List;
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
    public List<Product> search(String query, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return productJpaRepository.search(query, pageable).stream().map(ProductMapper::toDomain).toList();
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
}
