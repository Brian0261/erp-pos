package com.erppos.backend.erp.catalog.infrastructure.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface UnitJpaRepository extends JpaRepository<UnitEntity, Long> {
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    List<UnitEntity> findAllByOrderByCodeAsc();
}
