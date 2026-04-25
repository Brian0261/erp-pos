package com.erppos.backend.erp.catalog.infrastructure.mapper;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.infrastructure.persistence.CategoryEntity;
public final class CategoryMapper {
    private CategoryMapper() {
    }
    public static Category toDomain(CategoryEntity entity) {
        return new Category(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }
    public static CategoryEntity toEntity(Category category) {
        CategoryEntity entity = new CategoryEntity();
        merge(entity, category);
        return entity;
    }
    public static void merge(CategoryEntity entity, Category category) {
        entity.setName(category.name());
        entity.setDescription(category.description());
        entity.setActive(category.active());
        entity.setCreatedBy(category.createdBy());
        entity.setUpdatedBy(category.updatedBy());
    }
}
