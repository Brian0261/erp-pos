package com.erppos.backend.erp.purchases.application.service;

import com.erppos.backend.erp.purchases.application.usecase.CreateSupplierCommand;
import com.erppos.backend.erp.purchases.application.usecase.SupplierUseCase;
import com.erppos.backend.erp.purchases.application.usecase.UpdateSupplierCommand;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseConflictException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseNotFoundException;
import com.erppos.backend.erp.purchases.domain.model.Supplier;
import com.erppos.backend.erp.purchases.domain.port.SupplierRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SupplierApplicationService implements SupplierUseCase {

    private final SupplierRepositoryPort supplierRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public SupplierApplicationService(SupplierRepositoryPort supplierRepositoryPort, AuditUserProvider auditUserProvider) {
        this.supplierRepositoryPort = supplierRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public Supplier create(CreateSupplierCommand command) {
        String documentNumber = normalizeDocument(command.documentNumber());
        if (documentNumber != null && supplierRepositoryPort.existsByDocumentNumber(documentNumber)) {
            throw new PurchaseConflictException("Supplier document number already exists");
        }

        String actor = auditUserProvider.currentUsername();
        Supplier supplier = new Supplier(
                null,
                documentNumber,
                command.name().trim(),
                trimToNull(command.contactName()),
                trimToNull(command.phone()),
                trimToNull(command.email()),
                trimToNull(command.address()),
                true,
                null,
                null,
                actor,
                actor
        );
        return supplierRepositoryPort.save(supplier);
    }

    @Override
    public List<Supplier> list(String query) {
        return supplierRepositoryPort.findAll(query == null ? null : query.trim());
    }

    @Override
    public Supplier getById(Long id) {
        return supplierRepositoryPort.findById(id)
                .orElseThrow(() -> new PurchaseNotFoundException("Supplier not found"));
    }

    @Override
    public Supplier update(Long id, UpdateSupplierCommand command) {
        Supplier current = getById(id);
        String documentNumber = normalizeDocument(command.documentNumber());
        if (documentNumber != null && supplierRepositoryPort.existsByDocumentNumberAndIdNot(documentNumber, id)) {
            throw new PurchaseConflictException("Supplier document number already exists");
        }

        Supplier supplier = new Supplier(
                current.id(),
                documentNumber,
                command.name().trim(),
                trimToNull(command.contactName()),
                trimToNull(command.phone()),
                trimToNull(command.email()),
                trimToNull(command.address()),
                command.active() == null ? current.active() : command.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );
        return supplierRepositoryPort.save(supplier);
    }

    @Override
    public void deactivate(Long id) {
        Supplier supplier = getById(id);
        Supplier disabled = new Supplier(
                supplier.id(),
                supplier.documentNumber(),
                supplier.name(),
                supplier.contactName(),
                supplier.phone(),
                supplier.email(),
                supplier.address(),
                false,
                supplier.createdAt(),
                supplier.updatedAt(),
                supplier.createdBy(),
                auditUserProvider.currentUsername()
        );
        supplierRepositoryPort.save(disabled);
    }

    private String normalizeDocument(String document) {
        if (document == null) {
            return null;
        }
        String trimmed = document.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

