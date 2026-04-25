package com.erppos.backend.erp.catalog.infrastructure.mapper;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import com.erppos.backend.erp.catalog.infrastructure.persistence.UnitEntity;
public final class UnitMapper {
    private UnitMapper() {
    }
    public static Unit toDomain(UnitEntity entity) {
        return new Unit(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }
    public static UnitEntity toEntity(Unit unit) {
        UnitEntity entity = new UnitEntity();
        merge(entity, unit);
        return entity;
    }
    public static void merge(UnitEntity entity, Unit unit) {
        entity.setCode(unit.code());
        entity.setName(unit.name());
        entity.setActive(unit.active());
        entity.setCreatedBy(unit.createdBy());
        entity.setUpdatedBy(unit.updatedBy());
    }
}
