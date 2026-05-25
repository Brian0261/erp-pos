package com.erppos.backend.erp.billing.adapter.rest;

import com.erppos.backend.erp.billing.adapter.dto.BillingSeriesRequest;
import com.erppos.backend.erp.billing.adapter.dto.BillingSeriesResponse;
import com.erppos.backend.erp.billing.application.usecase.BillingSeriesUseCase;
import com.erppos.backend.erp.billing.application.usecase.CreateBillingSeriesCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateBillingSeriesCommand;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
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
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/billing/series")
public class BillingSeriesController {

    private final BillingSeriesUseCase seriesUseCase;

    public BillingSeriesController(BillingSeriesUseCase seriesUseCase) {
        this.seriesUseCase = seriesUseCase;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BillingSeriesResponse> create(@Valid @RequestBody BillingSeriesRequest request) {
        BillingSeries created = seriesUseCase.create(new CreateBillingSeriesCommand(
                request.documentType(),
                request.series(),
                request.currentNumber(),
                request.environment(),
                request.active()
        ));
        return ResponseEntity.created(URI.create("/api/v1/billing/series/" + created.id())).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<List<BillingSeriesResponse>> list() {
        return ResponseEntity.ok(seriesUseCase.list().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BillingSeriesResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(seriesUseCase.getById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BillingSeriesResponse> update(@PathVariable Long id, @Valid @RequestBody BillingSeriesRequest request) {
        BillingSeries updated = seriesUseCase.update(id, new UpdateBillingSeriesCommand(
                request.documentType(),
                request.series(),
                request.currentNumber(),
                request.environment(),
                request.active()
        ));
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        seriesUseCase.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    private BillingSeriesResponse toResponse(BillingSeries series) {
        return new BillingSeriesResponse(
                series.id(),
                series.documentType(),
                series.series(),
                series.currentNumber(),
                series.environment(),
                series.active(),
                series.createdAt(),
                series.updatedAt()
        );
    }
}

