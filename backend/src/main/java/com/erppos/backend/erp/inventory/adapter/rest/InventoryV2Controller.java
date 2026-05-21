package com.erppos.backend.erp.inventory.adapter.rest;

import com.erppos.backend.erp.inventory.adapter.dto.StockResponse;
import com.erppos.backend.erp.inventory.application.usecase.InventoryUseCase;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import com.erppos.backend.erp.shared.adapter.dto.PageResponseMapper;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/inventory")
public class InventoryV2Controller {

    private final InventoryUseCase inventoryUseCase;

    public InventoryV2Controller(InventoryUseCase inventoryUseCase) {
        this.inventoryUseCase = inventoryUseCase;
    }

    @GetMapping("/stocks")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<PageResponse<StockResponse>> listStocks(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long warehouseId,
            Pageable pageable
    ) {
        PageResponse<StockResponse> response = PageResponseMapper.from(
                inventoryUseCase.listStocks(productId, warehouseId, pageable).map(this::toStockResponse)
        );
        return ResponseEntity.ok(response);
    }

    private StockResponse toStockResponse(StockBalance stockBalance) {
        return new StockResponse(
                stockBalance.id(),
                stockBalance.productId(),
                stockBalance.warehouseId(),
                stockBalance.warehouseCode(),
                stockBalance.warehouseName(),
                stockBalance.quantity(),
                stockBalance.version(),
                stockBalance.updatedAt()
        );
    }
}

