package com.erppos.backend.erp.sales.adapter.rest;

import com.erppos.backend.erp.sales.adapter.dto.*;
import com.erppos.backend.erp.sales.application.usecase.*;
import com.erppos.backend.erp.quotes.application.usecase.*;
import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/operations")
@PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
@org.springframework.validation.annotation.Validated
public class SaleOperationController {
    private final SaleOperationUseCase useCase;
    public SaleOperationController(SaleOperationUseCase useCase){this.useCase=useCase;}
    @PostMapping public ResponseEntity<?> prepare(@Valid @RequestBody PrepareSaleOperationRequest r){
        var c=r.command(); var q=r.quoteCommand();
        var command=c==null?null:new CreateSaleCommand(c.warehouseId(),
                c.items().stream().map(i->new CreateSaleItemCommand(i.productId(),i.quantity(),i.discountAmount(),i.confirmedUnitPrice())).toList(),
                c.payments().stream().map(p->new CreateSalePaymentCommand(p.paymentMethod(),p.amount(),p.reference())).toList(),c.operationId(),c.confirmedTotal(),"POS");
        var quote=q==null?null:new ConvertQuoteToSaleCommand(q.warehouseId(),q.comment(),
                q.payments().stream().map(p->new QuotePaymentCommand(p.paymentMethod(),p.amount(),p.reference())).toList(),q.operationId(),q.confirmedTotal(),
                q.items().stream().map(i->new QuoteConfirmedItemCommand(i.quoteItemId(),i.quantity(),i.discountAmount(),i.confirmedUnitPrice())).toList());
        // The Spring transaction proxy completes before a NOT_STORED certificate can reach the caller.
        var outcome = useCase.prepare(new PrepareSaleOperationCommand(r.protocolVersion(),
                r.origin(),r.operationId(),command,r.quoteId(),quote,r.receiptIntent()));
        if (outcome instanceof SaleOperationPreparationResult.Rejected rejected)
            return ResponseEntity.unprocessableEntity().header("Cache-Control", "no-store")
                    .body(SalePreparationRejectedResponse.from(rejected));
        var durable = (SaleOperationPreparationResult.Durable) outcome;
        return ResponseEntity.created(java.net.URI.create("/api/v1/sales/operations/"+r.operationId()))
                .body(SaleOperationResponse.from(durable.operation()));
    }
    @GetMapping public ResponseEntity<PageResponse<SaleOperationResponse>> list(@RequestParam(defaultValue="0") @jakarta.validation.constraints.Min(0) @jakarta.validation.constraints.Max(100000) int page,
            @RequestParam(defaultValue="20") @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(100) int size,@RequestParam(required=false) String state,
            @RequestParam(defaultValue="false") boolean attention){
        var result=useCase.list(page,size,state,attention);
        return ResponseEntity.ok(new PageResponse<>(result.items().stream().map(SaleOperationResponse::from).toList(),
                result.page(),result.size(),result.totalItems(),result.totalPages()));
    }
    @GetMapping("/{operationId}") public ResponseEntity<SaleOperationResponse> get(@PathVariable UUID operationId){
        return ResponseEntity.ok(SaleOperationResponse.from(useCase.get(operationId)));
    }
    @PostMapping("/{operationId}/cancel") public ResponseEntity<SaleOperationResponse> cancel(@PathVariable UUID operationId){
        return ResponseEntity.ok(SaleOperationResponse.from(useCase.cancel(operationId)));
    }
}
