package com.erppos.backend.erp.billing.adapter.rest;

import com.erppos.backend.erp.billing.adapter.dto.BillingXmlResponse;
import com.erppos.backend.erp.billing.adapter.dto.CreateElectronicDocumentFromSaleRequest;
import com.erppos.backend.erp.billing.adapter.dto.ElectronicDocumentHistoryResponse;
import com.erppos.backend.erp.billing.adapter.dto.ElectronicDocumentItemResponse;
import com.erppos.backend.erp.billing.adapter.dto.ElectronicDocumentResponse;
import com.erppos.backend.erp.billing.application.usecase.CreateElectronicDocumentFromSaleCommand;
import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
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
@RequestMapping("/api/v1/billing/documents")
public class ElectronicDocumentController {

    private final ElectronicDocumentUseCase documentUseCase;

    public ElectronicDocumentController(ElectronicDocumentUseCase documentUseCase) {
        this.documentUseCase = documentUseCase;
    }

    @PostMapping("/from-sale/{saleId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<ElectronicDocumentResponse> createFromSale(
            @PathVariable Long saleId,
            @Valid @RequestBody CreateElectronicDocumentFromSaleRequest request
    ) {
        ElectronicDocument created = documentUseCase.createFromSale(saleId, new CreateElectronicDocumentFromSaleCommand(
                request.documentType(),
                request.billingSeriesId(),
                request.customerName(),
                request.customerDocument()
        ));
        return ResponseEntity.created(URI.create("/api/v1/billing/documents/" + created.id())).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<List<ElectronicDocumentResponse>> list(
            @RequestParam(required = false) ElectronicDocumentStatus status,
            @RequestParam(required = false) ElectronicDocumentType type,
            @RequestParam(required = false) Long saleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(documentUseCase.list(status, type, saleId, from, to).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<ElectronicDocumentResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(documentUseCase.getById(id)));
    }

    @PostMapping("/{id}/generate-xml")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<ElectronicDocumentResponse> generateXml(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(documentUseCase.generateXml(id)));
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ElectronicDocumentResponse> sign(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(documentUseCase.sign(id)));
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ElectronicDocumentResponse> send(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(documentUseCase.send(id)));
    }

    @GetMapping("/{id}/xml")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<BillingXmlResponse> getXml(@PathVariable Long id) {
        BillingXmlFile xmlFile = documentUseCase.getXml(id);
        return ResponseEntity.ok(new BillingXmlResponse(
                xmlFile.id(),
                xmlFile.fileType(),
                xmlFile.fileName(),
                xmlFile.mimeType(),
                xmlFile.content(),
                xmlFile.createdAt()
        ));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','CAJERO')")
    public ResponseEntity<List<ElectronicDocumentHistoryResponse>> history(@PathVariable Long id) {
        return ResponseEntity.ok(documentUseCase.history(id).stream().map(this::toHistory).toList());
    }

    private ElectronicDocumentResponse toResponse(ElectronicDocument document) {
        List<ElectronicDocumentItemResponse> itemResponses = documentUseCase.items(document.id()).stream().map(this::toItem).toList();
        return new ElectronicDocumentResponse(
                document.id(),
                document.saleId(),
                document.billingSeriesId(),
                document.documentType(),
                document.status(),
                document.environment(),
                document.series(),
                document.number(),
                document.fullNumber(),
                document.customerName(),
                document.customerDocument(),
                document.subtotalAmount(),
                document.taxAmount(),
                document.totalAmount(),
                document.xmlGeneratedAt(),
                document.signedAt(),
                document.sentAt(),
                document.providerTicket(),
                document.providerMessage(),
                document.createdAt(),
                document.updatedAt(),
                itemResponses
        );
    }

    private ElectronicDocumentItemResponse toItem(ElectronicDocumentItem item) {
        return new ElectronicDocumentItemResponse(
                item.id(),
                item.productId(),
                item.description(),
                item.quantity(),
                item.unitPrice(),
                item.discountAmount(),
                item.lineTotal()
        );
    }

    private ElectronicDocumentHistoryResponse toHistory(ElectronicDocumentStatusHistory history) {
        return new ElectronicDocumentHistoryResponse(
                history.id(),
                history.previousStatus(),
                history.newStatus(),
                history.message(),
                history.changedAt(),
                history.changedBy()
        );
    }
}

