package com.erppos.backend.erp.catalog.adapter.rest;
import com.erppos.backend.erp.catalog.adapter.dto.UnitCreateRequest;
import com.erppos.backend.erp.catalog.adapter.dto.UnitStatusRequest;
import com.erppos.backend.erp.catalog.adapter.dto.UnitUpdateRequest;
import com.erppos.backend.erp.catalog.adapter.dto.UnitResponse;
import com.erppos.backend.erp.catalog.application.usecase.ChangeUnitStatusCommand;
import com.erppos.backend.erp.catalog.application.usecase.CreateUnitCommand;
import com.erppos.backend.erp.catalog.application.usecase.UnitUseCase;
import com.erppos.backend.erp.catalog.application.usecase.UpdateUnitCommand;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;
@RestController
@RequestMapping("/api/v1/units")
public class UnitController {
    private final UnitUseCase unitUseCase;
    public UnitController(UnitUseCase unitUseCase) {
        this.unitUseCase = unitUseCase;
    }
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UnitResponse> create(@Valid @RequestBody UnitCreateRequest request) {
        Unit created = unitUseCase.create(new CreateUnitCommand(request.code(), request.name()));
        return ResponseEntity.created(URI.create("/api/v1/units/" + created.id())).body(toResponse(created));
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<List<UnitResponse>> list() {
        return ResponseEntity.ok(unitUseCase.list().stream().map(this::toResponse).toList());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UnitResponse> update(@PathVariable Long id, @Valid @RequestBody UnitUpdateRequest request) {
        Unit updated = unitUseCase.update(id, new UpdateUnitCommand(request.code(), request.name()));
        return ResponseEntity.ok(toResponse(updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UnitResponse> changeStatus(@PathVariable Long id, @Valid @RequestBody UnitStatusRequest request) {
        Unit updated = unitUseCase.changeStatus(id, new ChangeUnitStatusCommand(Boolean.TRUE.equals(request.active())));
        return ResponseEntity.ok(toResponse(updated));
    }

    private UnitResponse toResponse(Unit unit) {
        return new UnitResponse(unit.id(), unit.code(), unit.name(), unit.active(), unit.createdAt(), unit.updatedAt());
    }
}
