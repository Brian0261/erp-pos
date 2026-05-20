package com.erppos.backend.erp.catalog.infrastructure.persistence;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import com.erppos.backend.erp.catalog.infrastructure.mapper.CategoryMapper;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;
@Component
public class CategoryPersistenceAdapter implements CategoryRepositoryPort {
    private final CategoryJpaRepository categoryJpaRepository;
    public CategoryPersistenceAdapter(CategoryJpaRepository categoryJpaRepository) {
        this.categoryJpaRepository = categoryJpaRepository;
    }
    @Override
    public Category save(Category category) {
        CategoryEntity entity;
        if (category.id() == null) {
            entity = CategoryMapper.toEntity(category);
        } else {
            entity = categoryJpaRepository.findById(category.id()).orElseGet(CategoryEntity::new);
            CategoryMapper.merge(entity, category);
        }
        return CategoryMapper.toDomain(categoryJpaRepository.save(entity));
    }
    @Override
    public boolean existsByNameIgnoreCase(String name) {
        return categoryJpaRepository.existsByNameIgnoreCase(name);
    }

    @Override
    public boolean existsByNameIgnoreCaseAndIdNot(String name, Long id) {
        return categoryJpaRepository.existsByNameIgnoreCaseAndIdNot(name, id);
    }

    @Override
    public List<Category> findAll() {
        return categoryJpaRepository.findAllByOrderByNameAsc().stream().map(CategoryMapper::toDomain).toList();
    }
    @Override
    public List<Category> findActive() {
        return categoryJpaRepository.findByActiveTrueOrderByNameAsc().stream().map(CategoryMapper::toDomain).toList();
    }
    @Override
    public Optional<Category> findById(Long id) {
        return categoryJpaRepository.findById(id).map(CategoryMapper::toDomain);
    }
}
