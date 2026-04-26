package com.erppos.backend.erp.sales.adapter.rest;

import com.erppos.backend.erp.sales.adapter.dto.CashRegisterResponse;
import com.erppos.backend.erp.sales.adapter.dto.CloseCashRegisterRequest;
import com.erppos.backend.erp.sales.adapter.dto.OpenCashRegisterRequest;
import com.erppos.backend.erp.sales.application.usecase.CashRegisterUseCase;
import com.erppos.backend.erp.sales.application.usecase.CloseCashRegisterCommand;
import com.erppos.backend.erp.sales.application.usecase.OpenCashRegisterCommand;
import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/cash-registers")
public class CashRegisterController {

    private final CashRegisterUseCase cashRegisterUseCase;

    public CashRegisterController(CashRegisterUseCase cashRegisterUseCase) {
        this.cashRegisterUseCase = cashRegisterUseCase;
    }

    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<CashRegisterResponse> open(@Valid @RequestBody OpenCashRegisterRequest request) {
        CashRegisterSession session = cashRegisterUseCase.open(new OpenCashRegisterCommand(request.openingAmount(), request.notes()));
        return ResponseEntity.created(URI.create("/api/v1/cash-registers/" + session.id())).body(toResponse(session));
    }

    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<CashRegisterResponse> current() {
        return ResponseEntity.ok(toResponse(cashRegisterUseCase.current()));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<CashRegisterResponse> close(@PathVariable Long id, @Valid @RequestBody CloseCashRegisterRequest request) {
        CashRegisterSession closed = cashRegisterUseCase.close(id, new CloseCashRegisterCommand(request.countedAmount(), request.notes()));
        return ResponseEntity.ok(toResponse(closed));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<CashRegisterResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(cashRegisterUseCase.getById(id)));
    }

    private CashRegisterResponse toResponse(CashRegisterSession session) {
        return new CashRegisterResponse(
                session.id(),
                session.openedByUserId(),
                session.openedAt(),
                session.closedAt(),
                session.openingAmount(),
                session.countedAmount(),
                session.expectedCashAmount(),
                session.differenceAmount(),
                session.status(),
                session.notes()
        );
    }
}

