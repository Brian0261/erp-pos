package com.erppos.backend.erp.catalog.domain.port;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import java.util.List;
import java.util.Optional;
public interface UnitRepositoryPort {
    Unit save(Unit unit);
    boolean existsByCodeIgnoreCase(String code);
    List<Unit> findAll();
    Optional<Unit> findById(Long id);
}
