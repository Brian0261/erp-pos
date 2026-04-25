package com.erppos.backend.erp.purchases.infrastructure.mapper;

import com.erppos.backend.erp.purchases.domain.model.Supplier;
import com.erppos.backend.erp.purchases.infrastructure.persistence.SupplierEntity;

public final class SupplierMapper {
    private SupplierMapper() {
    }

    public static Supplier toDomain(SupplierEntity entity) {
        return new Supplier(
                entity.getId(),
                entity.getDocumentNumber(),
                entity.getName(),
                entity.getContactName(),
                entity.getPhone(),
                entity.getEmail(),
                entity.getAddress(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static SupplierEntity toEntity(Supplier supplier) {
        SupplierEntity entity = new SupplierEntity();
        merge(entity, supplier);
        return entity;
    }

    public static void merge(SupplierEntity entity, Supplier supplier) {
        entity.setDocumentNumber(supplier.documentNumber());
        entity.setName(supplier.name());
        entity.setContactName(supplier.contactName());
        entity.setPhone(supplier.phone());
        entity.setEmail(supplier.email());
        entity.setAddress(supplier.address());
        entity.setActive(supplier.active());
        entity.setCreatedBy(supplier.createdBy());
        entity.setUpdatedBy(supplier.updatedBy());
    }
}

