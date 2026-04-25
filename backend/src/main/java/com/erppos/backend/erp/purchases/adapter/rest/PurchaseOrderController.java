package com.erppos.backend.erp.purchases.adapter.rest;

import com.erppos.backend.erp.purchases.adapter.dto.PurchaseOrderCreateRequest;
import com.erppos.backend.erp.purchases.adapter.dto.PurchaseOrderItemRequest;
import com.erppos.backend.erp.purchases.adapter.dto.PurchaseOrderItemResponse;
import com.erppos.backend.erp.purchases.adapter.dto.PurchaseOrderResponse;
import com.erppos.backend.erp.purchases.adapter.dto.PurchaseOrderUpdateRequest;
import com.erppos.backend.erp.purchases.adapter.dto.ReceivePurchaseItemRequest;
import com.erppos.backend.erp.purchases.adapter.dto.ReceivePurchaseOrderRequest;
import com.erppos.backend.erp.purchases.application.usecase.CreatePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.application.usecase.PurchaseOrderItemCommand;
import com.erppos.backend.erp.purchases.application.usecase.PurchaseOrderUseCase;
import com.erppos.backend.erp.purchases.application.usecase.ReceivePurchaseItemCommand;
import com.erppos.backend.erp.purchases.application.usecase.ReceivePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.application.usecase.UpdatePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderItem;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderUseCase purchaseOrderUseCase;

    public PurchaseOrderController(PurchaseOrderUseCase purchaseOrderUseCase) {
        this.purchaseOrderUseCase = purchaseOrderUseCase;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<PurchaseOrderResponse> create(@Valid @RequestBody PurchaseOrderCreateRequest request) {
        PurchaseOrder created = purchaseOrderUseCase.create(new CreatePurchaseOrderCommand(
                request.supplierId(),
                request.warehouseId(),
                request.orderDate(),
                request.expectedDate(),
                request.notes(),
                request.items().stream().map(this::toItemCommand).toList()
        ));
        return ResponseEntity.created(URI.create("/api/v1/purchase-orders/" + created.id())).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<List<PurchaseOrderResponse>> list(
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to
    ) {
        return ResponseEntity.ok(purchaseOrderUseCase.list(status, supplierId, from, to).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO')")
    public ResponseEntity<PurchaseOrderResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(purchaseOrderUseCase.getById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<PurchaseOrderResponse> update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderUpdateRequest request) {
        PurchaseOrder updated = purchaseOrderUseCase.update(id, new UpdatePurchaseOrderCommand(
                request.supplierId(),
                request.warehouseId(),
                request.expectedDate(),
                request.notes(),
                request.items().stream().map(this::toItemCommand).toList()
        ));
        return ResponseEntity.ok(toResponse(updated));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<PurchaseOrderResponse> approve(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(purchaseOrderUseCase.approve(id)));
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<PurchaseOrderResponse> receive(@PathVariable Long id, @Valid @RequestBody ReceivePurchaseOrderRequest request) {
        PurchaseOrder received = purchaseOrderUseCase.receive(id, new ReceivePurchaseOrderCommand(
                request.receiptDate(),
                request.notes(),
                request.items().stream().map(this::toReceiveItemCommand).toList()
        ));
        return ResponseEntity.ok(toResponse(received));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','ALMACENERO')")
    public ResponseEntity<PurchaseOrderResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(purchaseOrderUseCase.cancel(id)));
    }

    private PurchaseOrderItemCommand toItemCommand(PurchaseOrderItemRequest request) {
        return new PurchaseOrderItemCommand(request.productId(), request.quantityOrdered(), request.unitCost());
    }

    private ReceivePurchaseItemCommand toReceiveItemCommand(ReceivePurchaseItemRequest request) {
        return new ReceivePurchaseItemCommand(request.purchaseOrderItemId(), request.quantityReceived());
    }

    private PurchaseOrderResponse toResponse(PurchaseOrder order) {
        return new PurchaseOrderResponse(
                order.id(),
                order.supplierId(),
                order.warehouseId(),
                order.status(),
                order.orderDate(),
                order.expectedDate(),
                order.totalAmount(),
                order.notes(),
                order.createdAt(),
                order.updatedAt(),
                order.items().stream().map(this::toItemResponse).toList()
        );
    }

    private PurchaseOrderItemResponse toItemResponse(PurchaseOrderItem item) {
        return new PurchaseOrderItemResponse(
                item.id(),
                item.productId(),
                item.quantityOrdered(),
                item.quantityReceived(),
                item.unitCost(),
                item.lineTotal()
        );
    }
}

