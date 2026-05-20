package com.erppos.backend.erp.catalog.application.service;
import com.erppos.backend.erp.catalog.application.usecase.CategoryUseCase;
import com.erppos.backend.erp.catalog.application.usecase.ChangeCategoryStatusCommand;
import com.erppos.backend.erp.catalog.application.usecase.CreateCategoryCommand;
import com.erppos.backend.erp.catalog.application.usecase.UpdateCategoryCommand;
import com.erppos.backend.erp.catalog.domain.exception.CatalogBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class CategoryApplicationService implements CategoryUseCase {
    private static final String RESERVED_CATEGORY_NAME = "por clasificar";
    private final CategoryRepositoryPort categoryRepositoryPort;
    private final AuditUserProvider auditUserProvider;
    public CategoryApplicationService(CategoryRepositoryPort categoryRepositoryPort, AuditUserProvider auditUserProvider) {
        this.categoryRepositoryPort = categoryRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }
    @Override
    public Category create(CreateCategoryCommand command) {
        String normalizedName = normalizeLookup(command.name());
        String name = trimToNull(command.name());
        if (name == null) {
            throw new CatalogBusinessRuleException("Category name is required");
        }
        if (categoryRepositoryPort.existsByNameIgnoreCase(normalizedName)) {
            throw new CatalogConflictException("Category name already exists");
        }
        String actor = auditUserProvider.currentUsername();
        Category category = new Category(
                null,
                name,
                trimToNull(command.description()),
                true,
                null,
                null,
                actor,
                actor
        );
        return categoryRepositoryPort.save(category);
    }
    @Override
    public List<Category> list(Boolean active) {
        if (Boolean.TRUE.equals(active)) {
            return categoryRepositoryPort.findActive();
        }
        return categoryRepositoryPort.findAll();
    }

    @Override
    public Category update(Long id, UpdateCategoryCommand command) {
        Category current = getById(id);
        ensureMutableCategory(current);

        String normalizedName = normalizeLookup(command.name());
        String name = trimToNull(command.name());
        if (name == null) {
            throw new CatalogBusinessRuleException("Category name is required");
        }
        if (isReservedCategory(name)) {
            throw new CatalogBusinessRuleException("Category is reserved");
        }
        if (categoryRepositoryPort.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            throw new CatalogConflictException("Category name already exists");
        }

        String actor = auditUserProvider.currentUsername();
        Category updated = new Category(
                current.id(),
                name,
                trimToNull(command.description()),
                current.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return categoryRepositoryPort.save(updated);
    }

    @Override
    public Category changeStatus(Long id, ChangeCategoryStatusCommand command) {
        Category current = getById(id);
        ensureMutableCategory(current);

        String actor = auditUserProvider.currentUsername();
        Category updated = new Category(
                current.id(),
                current.name(),
                current.description(),
                command.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return categoryRepositoryPort.save(updated);
    }

    private Category getById(Long id) {
        return categoryRepositoryPort.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Category not found"));
    }

    private void ensureMutableCategory(Category category) {
        if (isReservedCategory(category.name())) {
            throw new CatalogBusinessRuleException("Category is reserved");
        }
    }

    private boolean isReservedCategory(String value) {
        String normalized = normalizeLookup(value);
        return RESERVED_CATEGORY_NAME.equals(normalized);
    }

    private String normalizeLookup(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(java.util.Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
