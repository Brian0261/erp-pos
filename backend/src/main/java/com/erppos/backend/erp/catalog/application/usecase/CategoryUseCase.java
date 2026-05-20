package com.erppos.backend.erp.catalog.application.usecase;
import com.erppos.backend.erp.catalog.domain.model.Category;
import java.util.List;
public interface CategoryUseCase {
    Category create(CreateCategoryCommand command);
    List<Category> list(Boolean active);
    Category update(Long id, UpdateCategoryCommand command);
    Category changeStatus(Long id, ChangeCategoryStatusCommand command);
}
