package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.purchases.domain.model.Supplier;
import com.erppos.backend.erp.purchases.domain.port.SupplierRepositoryPort;
import com.erppos.backend.erp.purchases.infrastructure.mapper.SupplierMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SupplierPersistenceAdapter implements SupplierRepositoryPort {

    private final SupplierJpaRepository supplierJpaRepository;

    public SupplierPersistenceAdapter(SupplierJpaRepository supplierJpaRepository) {
        this.supplierJpaRepository = supplierJpaRepository;
    }

    @Override
    public Supplier save(Supplier supplier) {
        SupplierEntity entity;
        if (supplier.id() == null) {
            entity = SupplierMapper.toEntity(supplier);
        } else {
            entity = supplierJpaRepository.findById(supplier.id()).orElseGet(SupplierEntity::new);
            SupplierMapper.merge(entity, supplier);
        }
        return SupplierMapper.toDomain(supplierJpaRepository.save(entity));
    }

    @Override
    public Optional<Supplier> findById(Long id) {
        return supplierJpaRepository.findById(id).map(SupplierMapper::toDomain);
    }

    @Override
    public List<Supplier> findAll(String query) {
        return supplierJpaRepository.findByQuery(query).stream().map(SupplierMapper::toDomain).toList();
    }

    @Override
    public boolean existsByDocumentNumber(String documentNumber) {
        return supplierJpaRepository.existsByDocumentNumber(documentNumber);
    }

    @Override
    public boolean existsByDocumentNumberAndIdNot(String documentNumber, Long id) {
        return supplierJpaRepository.existsByDocumentNumberAndIdNot(documentNumber, id);
    }
}

