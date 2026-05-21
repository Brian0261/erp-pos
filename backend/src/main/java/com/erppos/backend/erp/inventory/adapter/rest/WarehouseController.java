package com.erppos.backend.erp.inventory.adapter.rest;

import com.erppos.backend.erp.inventory.adapter.dto.WarehouseCreateRequest;
import com.erppos.backend.erp.inventory.adapter.dto.WarehouseResponse;
import com.erppos.backend.erp.inventory.adapter.dto.WarehouseUpdateRequest;
import com.erppos.backend.erp.inventory.adapter.dto.WarehouseStatusRequest;
import com.erppos.backend.erp.inventory.application.usecase.CreateWarehouseCommand;
import com.erppos.backend.erp.inventory.application.usecase.ChangeWarehouseStatusCommand;
import com.erppos.backend.erp.inventory.application.usecase.UpdateWarehouseCommand;
import com.erppos.backend.erp.inventory.application.usecase.WarehouseUseCase;
import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/warehouses")
public class WarehouseController {

    private final WarehouseUseCase warehouseUseCase;

    public WarehouseController(WarehouseUseCase warehouseUseCase) {
        this.warehouseUseCase = warehouseUseCase;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<WarehouseResponse> create(@Valid @RequestBody WarehouseCreateRequest request) {
        Warehouse warehouse = warehouseUseCase.create(new CreateWarehouseCommand(request.code(), request.name(), request.type()));
        return ResponseEntity.created(URI.create("/api/v1/warehouses/" + warehouse.id())).body(toResponse(warehouse));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<WarehouseResponse> changeStatus(@PathVariable Long id, @Valid @RequestBody WarehouseStatusRequest request) {
        Warehouse updated = warehouseUseCase.changeStatus(id, new ChangeWarehouseStatusCommand(Boolean.TRUE.equals(request.active())));
        return ResponseEntity.ok(toResponse(updated));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<WarehouseResponse> update(@PathVariable Long id, @Valid @RequestBody WarehouseUpdateRequest request) {
        Warehouse updated = warehouseUseCase.update(id, new UpdateWarehouseCommand(request.code(), request.name()));
        return ResponseEntity.ok(toResponse(updated));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<List<WarehouseResponse>> list(@RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(warehouseUseCase.list(active).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<WarehouseResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(warehouseUseCase.getById(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        warehouseUseCase.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    private WarehouseResponse toResponse(Warehouse warehouse) {
        return new WarehouseResponse(
                warehouse.id(),
                warehouse.code(),
                warehouse.name(),
                warehouse.type(),
                warehouse.active(),
                warehouse.createdAt(),
                warehouse.updatedAt()
        );
    }
}

