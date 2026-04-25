package com.erppos.backend.erp.purchases.adapter.rest;

import com.erppos.backend.erp.purchases.adapter.dto.SupplierCreateRequest;
import com.erppos.backend.erp.purchases.adapter.dto.SupplierResponse;
import com.erppos.backend.erp.purchases.adapter.dto.SupplierUpdateRequest;
import com.erppos.backend.erp.purchases.application.usecase.CreateSupplierCommand;
import com.erppos.backend.erp.purchases.application.usecase.SupplierUseCase;
import com.erppos.backend.erp.purchases.application.usecase.UpdateSupplierCommand;
import com.erppos.backend.erp.purchases.domain.model.Supplier;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/suppliers")
public class SupplierController {

    private final SupplierUseCase supplierUseCase;

    public SupplierController(SupplierUseCase supplierUseCase) {
        this.supplierUseCase = supplierUseCase;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierCreateRequest request) {
        Supplier created = supplierUseCase.create(new CreateSupplierCommand(
                request.documentNumber(),
                request.name(),
                request.contactName(),
                request.phone(),
                request.email(),
                request.address()
        ));
        return ResponseEntity.created(URI.create("/api/v1/suppliers/" + created.id())).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<List<SupplierResponse>> list(@RequestParam(required = false, name = "q") String query) {
        return ResponseEntity.ok(supplierUseCase.list(query).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<SupplierResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(supplierUseCase.getById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<SupplierResponse> update(@PathVariable Long id, @Valid @RequestBody SupplierUpdateRequest request) {
        Supplier updated = supplierUseCase.update(id, new UpdateSupplierCommand(
                request.documentNumber(),
                request.name(),
                request.contactName(),
                request.phone(),
                request.email(),
                request.address(),
                request.active()
        ));
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        supplierUseCase.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    private SupplierResponse toResponse(Supplier supplier) {
        return new SupplierResponse(
                supplier.id(),
                supplier.documentNumber(),
                supplier.name(),
                supplier.contactName(),
                supplier.phone(),
                supplier.email(),
                supplier.address(),
                supplier.active(),
                supplier.createdAt(),
                supplier.updatedAt()
        );
    }
}

