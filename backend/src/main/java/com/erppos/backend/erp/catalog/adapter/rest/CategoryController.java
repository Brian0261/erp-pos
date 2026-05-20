package com.erppos.backend.erp.catalog.adapter.rest;
import com.erppos.backend.erp.catalog.adapter.dto.CategoryStatusRequest;
import com.erppos.backend.erp.catalog.adapter.dto.CategoryCreateRequest;
import com.erppos.backend.erp.catalog.adapter.dto.CategoryUpdateRequest;
import com.erppos.backend.erp.catalog.adapter.dto.CategoryResponse;
import com.erppos.backend.erp.catalog.application.usecase.CategoryUseCase;
import com.erppos.backend.erp.catalog.application.usecase.ChangeCategoryStatusCommand;
import com.erppos.backend.erp.catalog.application.usecase.CreateCategoryCommand;
import com.erppos.backend.erp.catalog.application.usecase.UpdateCategoryCommand;
import com.erppos.backend.erp.catalog.domain.model.Category;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;
@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {
    private final CategoryUseCase categoryUseCase;
    public CategoryController(CategoryUseCase categoryUseCase) {
        this.categoryUseCase = categoryUseCase;
    }
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryCreateRequest request) {
        Category created = categoryUseCase.create(new CreateCategoryCommand(request.name(), request.description()));
        return ResponseEntity.created(URI.create("/api/v1/categories/" + created.id())).body(toResponse(created));
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<List<CategoryResponse>> list(@RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(categoryUseCase.list(active).stream().map(this::toResponse).toList());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> update(@PathVariable Long id, @Valid @RequestBody CategoryUpdateRequest request) {
        Category updated = categoryUseCase.update(id, new UpdateCategoryCommand(request.name(), request.description()));
        return ResponseEntity.ok(toResponse(updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> changeStatus(@PathVariable Long id, @Valid @RequestBody CategoryStatusRequest request) {
        Category updated = categoryUseCase.changeStatus(id, new ChangeCategoryStatusCommand(Boolean.TRUE.equals(request.active())));
        return ResponseEntity.ok(toResponse(updated));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.id(),
                category.name(),
                category.description(),
                category.active(),
                category.createdAt(),
                category.updatedAt()
        );
    }
}
