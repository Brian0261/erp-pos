package com.erppos.backend.erp.sales.adapter.rest;

import com.erppos.backend.erp.sales.adapter.dto.PosProductResponse;
import com.erppos.backend.erp.sales.application.usecase.PosUseCase;
import com.erppos.backend.erp.sales.domain.model.PosProductView;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pos/products")
public class PosController {

    private final PosUseCase posUseCase;

    public PosController(PosUseCase posUseCase) {
        this.posUseCase = posUseCase;
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<PosProductResponse> lookup(@RequestParam("code") String code,
                                                     @RequestParam(required = false) Long warehouseId) {
        return ResponseEntity.ok(toResponse(posUseCase.lookupByCode(code, warehouseId)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<List<PosProductResponse>> search(@RequestParam("q") String query,
                                                           @RequestParam(required = false) Long warehouseId) {
        return ResponseEntity.ok(posUseCase.search(query, warehouseId).stream().map(this::toResponse).toList());
    }

    private PosProductResponse toResponse(PosProductView view) {
        return new PosProductResponse(
                view.productId(),
                view.sku(),
                view.barcode(),
                view.name(),
                view.salePrice(),
                view.stockAvailable()
        );
    }
}

