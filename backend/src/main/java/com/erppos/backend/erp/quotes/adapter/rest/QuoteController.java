package com.erppos.backend.erp.quotes.adapter.rest;

import com.erppos.backend.erp.quotes.adapter.dto.CancelQuoteRequest;
import com.erppos.backend.erp.quotes.adapter.dto.ConvertQuoteToSaleRequest;
import com.erppos.backend.erp.quotes.adapter.dto.CreateQuoteRequest;
import com.erppos.backend.erp.quotes.adapter.dto.QuoteHistoryResponse;
import com.erppos.backend.erp.quotes.adapter.dto.QuoteItemRequest;
import com.erppos.backend.erp.quotes.adapter.dto.QuoteItemResponse;
import com.erppos.backend.erp.quotes.adapter.dto.QuoteResponse;
import com.erppos.backend.erp.quotes.adapter.dto.SendQuoteRequest;
import com.erppos.backend.erp.quotes.adapter.dto.UpdateQuoteRequest;
import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import com.erppos.backend.erp.quotes.application.usecase.CreateQuoteCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuoteItemCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuotePaymentCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuoteUseCase;
import com.erppos.backend.erp.quotes.application.usecase.UpdateQuoteCommand;
import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/v1/quotes")
public class QuoteController {

    private final QuoteUseCase quoteUseCase;

    public QuoteController(QuoteUseCase quoteUseCase) {
        this.quoteUseCase = quoteUseCase;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<QuoteResponse> create(@Valid @RequestBody CreateQuoteRequest request) {
        Quote created = quoteUseCase.create(new CreateQuoteCommand(
                request.customerName(),
                request.customerDocument(),
                request.customerPhone(),
                request.customerEmail(),
                request.issueDate(),
                request.expiresAt(),
                request.notes(),
                request.items().stream().map(this::toItemCommand).toList()
        ));
        return ResponseEntity.created(URI.create("/api/v1/quotes/" + created.id())).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<List<QuoteResponse>> list(
            @RequestParam(required = false) QuoteStatus status,
            @RequestParam(required = false) String customerQuery,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(quoteUseCase.list(status, customerQuery, from, to).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<QuoteResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(quoteUseCase.getById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<QuoteResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateQuoteRequest request) {
        Quote updated = quoteUseCase.update(id, new UpdateQuoteCommand(
                request.customerName(),
                request.customerDocument(),
                request.customerPhone(),
                request.customerEmail(),
                request.expiresAt(),
                request.notes(),
                request.items().stream().map(this::toItemCommand).toList()
        ));
        return ResponseEntity.ok(toResponse(updated));
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<QuoteResponse> send(@PathVariable Long id, @RequestBody(required = false) SendQuoteRequest request) {
        String comment = request == null ? null : request.comment();
        return ResponseEntity.ok(toResponse(quoteUseCase.send(id, comment)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<QuoteResponse> cancel(@PathVariable Long id, @RequestBody(required = false) CancelQuoteRequest request) {
        String comment = request == null ? null : request.comment();
        return ResponseEntity.ok(toResponse(quoteUseCase.cancel(id, comment)));
    }

    @PostMapping("/{id}/convert-to-sale")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<QuoteResponse> convertToSale(@PathVariable Long id, @Valid @RequestBody ConvertQuoteToSaleRequest request) {
        Quote converted = quoteUseCase.convertToSale(id, new ConvertQuoteToSaleCommand(
                request.warehouseId(),
                request.comment(),
                request.payments().stream().map(p -> new QuotePaymentCommand(p.paymentMethod(), p.amount(), p.reference())).toList()
        ));
        return ResponseEntity.ok(toResponse(converted));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<List<QuoteHistoryResponse>> history(@PathVariable Long id) {
        return ResponseEntity.ok(quoteUseCase.history(id).stream().map(this::toHistoryResponse).toList());
    }

    private QuoteItemCommand toItemCommand(QuoteItemRequest request) {
        return new QuoteItemCommand(request.productId(), request.quantity(), request.discountAmount());
    }

    private QuoteResponse toResponse(Quote quote) {
        return new QuoteResponse(
                quote.id(),
                quote.quoteNumber(),
                quote.customerName(),
                quote.customerDocument(),
                quote.customerPhone(),
                quote.customerEmail(),
                quote.status(),
                quote.issueDate(),
                quote.expiresAt(),
                quote.sentAt(),
                quote.convertedSaleId(),
                quote.subtotalAmount(),
                quote.discountAmount(),
                quote.totalAmount(),
                quote.notes(),
                quote.createdBy(),
                quote.items().stream().map(this::toItemResponse).toList()
        );
    }

    private QuoteItemResponse toItemResponse(QuoteItem item) {
        return new QuoteItemResponse(
                item.id(),
                item.productId(),
                item.quantity(),
                item.unitPrice(),
                item.discountAmount(),
                item.lineTotal()
        );
    }

    private QuoteHistoryResponse toHistoryResponse(QuoteStatusHistory history) {
        return new QuoteHistoryResponse(
                history.id(),
                history.previousStatus(),
                history.newStatus(),
                history.comment(),
                history.changedAt(),
                history.changedBy()
        );
    }
}

