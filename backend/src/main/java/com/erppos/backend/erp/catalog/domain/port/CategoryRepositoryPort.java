package com.erppos.backend.erp.catalog.domain.port;
import com.erppos.backend.erp.catalog.domain.model.Category;
import java.util.List;
import java.util.Optional;
public interface CategoryRepositoryPort {
    Category save(Category category);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    List<Category> findAll();
    List<Category> findActive();
    Optional<Category> findById(Long id);
}
