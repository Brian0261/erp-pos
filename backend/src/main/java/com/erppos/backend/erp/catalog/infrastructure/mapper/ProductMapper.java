package com.erppos.backend.erp.catalog.infrastructure.mapper;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.infrastructure.persistence.CategoryEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.UnitEntity;
public final class ProductMapper {
    private ProductMapper() {
    }
    public static Product toDomain(ProductEntity entity) {
        return new Product(
                entity.getId(),
                entity.getSku(),
                entity.getBarcode(),
                entity.getName(),
                entity.getDescription(),
                entity.getCategory().getId(),
                entity.getUnit().getId(),
                entity.getSalePrice(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }
    public static ProductEntity toEntity(Product product, CategoryEntity category, UnitEntity unit) {
        ProductEntity entity = new ProductEntity();
        merge(entity, product, category, unit);
        return entity;
    }
    public static void merge(ProductEntity entity, Product product, CategoryEntity category, UnitEntity unit) {
        entity.setSku(product.sku());
        entity.setBarcode(product.barcode());
        entity.setName(product.name());
        entity.setDescription(product.description());
        entity.setCategory(category);
        entity.setUnit(unit);
        entity.setSalePrice(product.salePrice());
        entity.setActive(product.active());
        entity.setCreatedBy(product.createdBy());
        entity.setUpdatedBy(product.updatedBy());
    }
}
