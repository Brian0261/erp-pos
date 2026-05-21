package com.erppos.backend.erp.inventory.application.service;

import com.erppos.backend.erp.inventory.application.usecase.CreateWarehouseCommand;
import com.erppos.backend.erp.inventory.application.usecase.ChangeWarehouseStatusCommand;
import com.erppos.backend.erp.inventory.application.usecase.UpdateWarehouseCommand;
import com.erppos.backend.erp.inventory.application.usecase.WarehouseUseCase;
import com.erppos.backend.erp.inventory.domain.exception.InventoryBusinessRuleException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryConflictException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryNotFoundException;
import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.inventory.domain.port.WarehouseRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WarehouseApplicationService implements WarehouseUseCase {

    private final WarehouseRepositoryPort warehouseRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public WarehouseApplicationService(WarehouseRepositoryPort warehouseRepositoryPort, AuditUserProvider auditUserProvider) {
        this.warehouseRepositoryPort = warehouseRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public Warehouse create(CreateWarehouseCommand command) {
        String code = trimToNull(command.code());
        String name = trimToNull(command.name());
        if (code == null) {
            throw new InventoryBusinessRuleException("Warehouse code is required");
        }
        if (name == null) {
            throw new InventoryBusinessRuleException("Warehouse name is required");
        }
        if (warehouseRepositoryPort.existsByCodeIgnoreCase(code)) {
            throw new InventoryConflictException("Warehouse code already exists");
        }
        String actor = auditUserProvider.currentUsername();
        Warehouse warehouse = new Warehouse(
                null,
                code,
                name,
                command.type(),
                true,
                null,
                null,
                actor,
                actor
        );
        return warehouseRepositoryPort.save(warehouse);
    }

    @Override
    public Warehouse update(Long id, UpdateWarehouseCommand command) {
        Warehouse current = getById(id);
        String code = trimToNull(command.code());
        String name = trimToNull(command.name());
        if (code == null) {
            throw new InventoryBusinessRuleException("Warehouse code is required");
        }
        if (name == null) {
            throw new InventoryBusinessRuleException("Warehouse name is required");
        }
        if (warehouseRepositoryPort.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new InventoryConflictException("Warehouse code already exists");
        }

        String actor = auditUserProvider.currentUsername();
        Warehouse updated = new Warehouse(
                current.id(),
                code,
                name,
                current.type(),
                current.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return warehouseRepositoryPort.save(updated);
    }

    @Override
    public List<Warehouse> list(Boolean active) {
        if (Boolean.TRUE.equals(active)) {
            return warehouseRepositoryPort.findActive();
        }
        return warehouseRepositoryPort.findAll();
    }

    @Override
    public Warehouse getById(Long id) {
        return warehouseRepositoryPort.findById(id)
                .orElseThrow(() -> new InventoryNotFoundException("Warehouse not found"));
    }

    @Override
    public void deactivate(Long id) {
        changeStatus(id, new ChangeWarehouseStatusCommand(false));
    }

    @Override
    public Warehouse changeStatus(Long id, ChangeWarehouseStatusCommand command) {
        Warehouse warehouse = getById(id);
        String actor = auditUserProvider.currentUsername();
        Warehouse updated = new Warehouse(
                warehouse.id(),
                warehouse.code(),
                warehouse.name(),
                warehouse.type(),
                command.active(),
                warehouse.createdAt(),
                warehouse.updatedAt(),
                warehouse.createdBy(),
                actor
        );
        return warehouseRepositoryPort.save(updated);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

