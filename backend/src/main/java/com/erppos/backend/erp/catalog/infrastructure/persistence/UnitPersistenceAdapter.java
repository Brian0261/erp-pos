package com.erppos.backend.erp.catalog.infrastructure.persistence;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import com.erppos.backend.erp.catalog.domain.port.UnitRepositoryPort;
import com.erppos.backend.erp.catalog.infrastructure.mapper.UnitMapper;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;
@Component
public class UnitPersistenceAdapter implements UnitRepositoryPort {
    private final UnitJpaRepository unitJpaRepository;
    public UnitPersistenceAdapter(UnitJpaRepository unitJpaRepository) {
        this.unitJpaRepository = unitJpaRepository;
    }
    @Override
    public Unit save(Unit unit) {
        UnitEntity entity;
        if (unit.id() == null) {
            entity = UnitMapper.toEntity(unit);
        } else {
            entity = unitJpaRepository.findById(unit.id()).orElseGet(UnitEntity::new);
            UnitMapper.merge(entity, unit);
        }
        return UnitMapper.toDomain(unitJpaRepository.save(entity));
    }
    @Override
    public boolean existsByCodeIgnoreCase(String code) {
        return unitJpaRepository.existsByCodeIgnoreCase(code);
    }

    @Override
    public boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id) {
        return unitJpaRepository.existsByCodeIgnoreCaseAndIdNot(code, id);
    }

    @Override
    public List<Unit> findAll() {
        return unitJpaRepository.findAllByOrderByCodeAsc().stream().map(UnitMapper::toDomain).toList();
    }
    @Override
    public Optional<Unit> findById(Long id) {
        return unitJpaRepository.findById(id).map(UnitMapper::toDomain);
    }
}
