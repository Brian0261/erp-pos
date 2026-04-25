package com.erppos.backend.erp.catalog.infrastructure.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CategoryJpaRepository extends JpaRepository<CategoryEntity, Long> {
    boolean existsByNameIgnoreCase(String name);
    List<CategoryEntity> findAllByOrderByNameAsc();
    List<CategoryEntity> findByActiveTrueOrderByNameAsc();
}
