package com.erppos.backend.erp.inventory.application.service;

import com.erppos.backend.erp.inventory.application.usecase.CreateWarehouseCommand;
import com.erppos.backend.erp.inventory.application.usecase.ChangeWarehouseStatusCommand;
import com.erppos.backend.erp.inventory.application.usecase.WarehouseUseCase;
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
        String normalizedCode = command.code().trim();
        if (warehouseRepositoryPort.existsByCodeIgnoreCase(normalizedCode)) {
            throw new InventoryConflictException("Warehouse code already exists");
        }
        String actor = auditUserProvider.currentUsername();
        Warehouse warehouse = new Warehouse(
                null,
                normalizedCode,
                command.name().trim(),
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
}

