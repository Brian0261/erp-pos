package com.erppos.backend.erp.inventory.adapter.rest;

import com.erppos.backend.erp.inventory.adapter.dto.AdjustmentRequest;
import com.erppos.backend.erp.inventory.adapter.dto.AdjustmentType;
import com.erppos.backend.erp.inventory.adapter.dto.InitialStockRequest;
import com.erppos.backend.erp.inventory.adapter.dto.InventoryMovementResponse;
import com.erppos.backend.erp.inventory.adapter.dto.StockResponse;
import com.erppos.backend.erp.inventory.adapter.dto.StockTransferResponse;
import com.erppos.backend.erp.inventory.adapter.dto.TransferItemRequest;
import com.erppos.backend.erp.inventory.adapter.dto.TransferRequest;
import com.erppos.backend.erp.inventory.application.usecase.InventoryUseCase;
import com.erppos.backend.erp.inventory.application.usecase.RegisterAdjustmentCommand;
import com.erppos.backend.erp.inventory.application.usecase.RegisterInitialStockCommand;
import com.erppos.backend.erp.inventory.application.usecase.TransferStockCommand;
import com.erppos.backend.erp.inventory.application.usecase.TransferStockItemCommand;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryUseCase inventoryUseCase;

    public InventoryController(InventoryUseCase inventoryUseCase) {
        this.inventoryUseCase = inventoryUseCase;
    }

    @GetMapping("/stocks")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<Page<StockResponse>> listStocks(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long warehouseId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(inventoryUseCase.listStocks(productId, warehouseId, pageable).map(this::toStockResponse));
    }

    @PostMapping("/initial-stock")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<InventoryMovementResponse> registerInitialStock(@Valid @RequestBody InitialStockRequest request) {
        InventoryMovement movement = inventoryUseCase.registerInitialStock(new RegisterInitialStockCommand(
                request.productId(),
                request.warehouseId(),
                request.quantity(),
                request.reason()
        ));
        return ResponseEntity.created(URI.create("/api/v1/inventory/kardex?productId=" + movement.productId()))
                .body(toMovementResponse(movement));
    }

    @PostMapping("/adjustments")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<InventoryMovementResponse> registerAdjustment(@Valid @RequestBody AdjustmentRequest request) {
        InventoryMovement movement = inventoryUseCase.registerAdjustment(new RegisterAdjustmentCommand(
                request.productId(),
                request.warehouseId(),
                request.quantity(),
                request.type() == AdjustmentType.IN,
                request.reason()
        ));
        return ResponseEntity.created(URI.create("/api/v1/inventory/kardex?productId=" + movement.productId()))
                .body(toMovementResponse(movement));
    }

    @PostMapping("/transfers")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<StockTransferResponse> transfer(@Valid @RequestBody TransferRequest request) {
        StockTransfer transfer = inventoryUseCase.transfer(new TransferStockCommand(
                request.sourceWarehouseId(),
                request.targetWarehouseId(),
                request.reason(),
                request.items().stream().map(this::toTransferItemCommand).toList()
        ));
        return ResponseEntity.created(URI.create("/api/v1/inventory/transfers/" + transfer.id())).body(toTransferResponse(transfer));
    }

    @GetMapping("/kardex")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<List<InventoryMovementResponse>> kardex(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(inventoryUseCase.kardex(productId, warehouseId, from, to).stream().map(this::toMovementResponse).toList());
    }

    private TransferStockItemCommand toTransferItemCommand(TransferItemRequest item) {
        return new TransferStockItemCommand(item.productId(), item.quantity());
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

    private InventoryMovementResponse toMovementResponse(InventoryMovement movement) {
        return new InventoryMovementResponse(
                movement.id(),
                movement.productId(),
                movement.warehouseId(),
                movement.movementType(),
                movement.quantity(),
                movement.previousStock(),
                movement.newStock(),
                movement.reason(),
                movement.referenceType(),
                movement.referenceId(),
                movement.createdAt(),
                movement.createdBy()
        );
    }

    private StockTransferResponse toTransferResponse(StockTransfer transfer) {
        return new StockTransferResponse(
                transfer.id(),
                transfer.sourceWarehouseId(),
                transfer.targetWarehouseId(),
                transfer.status(),
                transfer.reason(),
                transfer.createdAt(),
                transfer.createdBy()
        );
    }
}

