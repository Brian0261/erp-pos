package com.erppos.backend.erp.sales.adapter.rest;

import com.erppos.backend.erp.sales.adapter.dto.CreateSaleItemRequest;
import com.erppos.backend.erp.sales.adapter.dto.CreateSalePaymentRequest;
import com.erppos.backend.erp.sales.adapter.dto.CreateSaleRequest;
import com.erppos.backend.erp.sales.adapter.dto.SaleItemResponse;
import com.erppos.backend.erp.sales.adapter.dto.SalePaymentResponse;
import com.erppos.backend.erp.sales.adapter.dto.SaleResponse;
import com.erppos.backend.erp.sales.adapter.dto.VoidSaleRequest;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleItemCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSalePaymentCommand;
import com.erppos.backend.erp.sales.application.usecase.SalesUseCase;
import com.erppos.backend.erp.sales.application.usecase.VoidSaleCommand;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleItem;
import com.erppos.backend.erp.sales.domain.model.SalePayment;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import com.erppos.backend.erp.sales.domain.port.CatalogReadPort;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesController {

    private final SalesUseCase salesUseCase;
    private final CatalogReadPort catalogReadPort;

    public SalesController(SalesUseCase salesUseCase, CatalogReadPort catalogReadPort) {
        this.salesUseCase = salesUseCase;
        this.catalogReadPort = catalogReadPort;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<SaleResponse> create(@Valid @RequestBody CreateSaleRequest request) {
        Sale created = salesUseCase.create(new CreateSaleCommand(
                request.warehouseId(),
                request.items().stream().map(this::toItemCommand).toList(),
                request.payments().stream().map(this::toPaymentCommand).toList()
        ));
        return ResponseEntity.created(URI.create("/api/v1/sales/" + created.id())).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<List<SaleResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long cashRegisterSessionId,
            @RequestParam(required = false) SaleStatus status,
            @RequestParam(required = false) String createdBy
    ) {
        return ResponseEntity.ok(salesUseCase.list(from, to, cashRegisterSessionId, status, createdBy).stream().map(sale -> toResponse(sale, false)).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<SaleResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(salesUseCase.getById(id), true));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<SaleResponse> voidSale(@PathVariable Long id, @Valid @RequestBody VoidSaleRequest request) {
        return ResponseEntity.ok(toResponse(salesUseCase.voidSale(id, new VoidSaleCommand(request.reason())), false));
    }

    private CreateSaleItemCommand toItemCommand(CreateSaleItemRequest request) {
        return new CreateSaleItemCommand(request.productId(), request.quantity(), request.discountAmount());
    }

    private CreateSalePaymentCommand toPaymentCommand(CreateSalePaymentRequest request) {
        return new CreateSalePaymentCommand(request.paymentMethod(), request.amount(), request.reference());
    }

    private SaleResponse toResponse(Sale sale) {
        return toResponse(sale, false);
    }

    private SaleResponse toResponse(Sale sale, boolean enrichItems) {
        return new SaleResponse(
                sale.id(),
                sale.cashRegisterSessionId(),
                sale.warehouseId(),
                sale.saleNumber(),
                sale.status(),
                sale.subtotalAmount(),
                sale.discountAmount(),
                sale.totalAmount(),
                sale.paidAmount(),
                sale.changeAmount(),
                sale.soldAt(),
                sale.voidedAt(),
                sale.voidedByUserId(),
                sale.voidReason(),
                sale.createdBy(),
                sale.items().stream().map(item -> toItemResponse(item, enrichItems)).toList(),
                sale.payments().stream().map(this::toPaymentResponse).toList()
        );
    }

    private SaleItemResponse toItemResponse(SaleItem item, boolean enrichProductData) {
        PosProductSnapshot product = enrichProductData
                ? catalogReadPort.findById(item.productId()).orElse(null)
                : null;

        return new SaleItemResponse(
                item.id(),
                item.productId(),
                product != null ? product.name() : null,
                product != null ? product.sku() : null,
                product != null ? product.barcode() : null,
                item.quantity(),
                item.unitPrice(),
                item.discountAmount(),
                item.lineTotal()
        );
    }

    private SalePaymentResponse toPaymentResponse(SalePayment payment) {
        return new SalePaymentResponse(
                payment.id(),
                payment.paymentMethod(),
                payment.amount(),
                payment.reference(),
                payment.createdAt()
        );
    }
}

