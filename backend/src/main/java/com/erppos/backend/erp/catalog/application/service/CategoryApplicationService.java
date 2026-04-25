package com.erppos.backend.erp.catalog.application.service;
import com.erppos.backend.erp.catalog.application.usecase.CategoryUseCase;
import com.erppos.backend.erp.catalog.application.usecase.CreateCategoryCommand;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class CategoryApplicationService implements CategoryUseCase {
    private final CategoryRepositoryPort categoryRepositoryPort;
    private final AuditUserProvider auditUserProvider;
    public CategoryApplicationService(CategoryRepositoryPort categoryRepositoryPort, AuditUserProvider auditUserProvider) {
        this.categoryRepositoryPort = categoryRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }
    @Override
    public Category create(CreateCategoryCommand command) {
        String normalizedName = command.name().trim();
        if (categoryRepositoryPort.existsByNameIgnoreCase(normalizedName)) {
            throw new CatalogConflictException("Category name already exists");
        }
        String actor = auditUserProvider.currentUsername();
        Category category = new Category(
                null,
                normalizedName,
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
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
