package com.erppos.backend.erp.sales.application.service;

import com.erppos.backend.erp.security.domain.RoleName;
import com.erppos.backend.erp.sales.application.usecase.CashRegisterUseCase;
import com.erppos.backend.erp.sales.application.usecase.CloseCashRegisterCommand;
import com.erppos.backend.erp.sales.application.usecase.OpenCashRegisterCommand;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.sales.domain.exception.SalesNotFoundException;
import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;
import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import com.erppos.backend.erp.sales.domain.port.CashRegisterRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class CashRegisterApplicationService implements CashRegisterUseCase {

    private final CashRegisterRepositoryPort cashRegisterRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public CashRegisterApplicationService(CashRegisterRepositoryPort cashRegisterRepositoryPort, AuditUserProvider auditUserProvider) {
        this.cashRegisterRepositoryPort = cashRegisterRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public CashRegisterSession open(OpenCashRegisterCommand command) {
        BigDecimal openingAmount = command.openingAmount();
        if (openingAmount == null || openingAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new SalesBusinessRuleException("openingAmount must be >= 0");
        }

        UUID userId = auditUserProvider.currentUserId();
        if (cashRegisterRepositoryPort.findOpenByUserId(userId).isPresent()) {
            throw new SalesConflictException("User already has an OPEN cash register session");
        }

        CashRegisterSession session = new CashRegisterSession(
                null,
                userId,
                Instant.now(),
                null,
                openingAmount,
                null,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                CashRegisterStatus.OPEN,
                trimToNull(command.notes()),
                null,
                null
        );
        return cashRegisterRepositoryPort.save(session);
    }

    @Override
    public CashRegisterSession current() {
        UUID userId = auditUserProvider.currentUserId();
        return cashRegisterRepositoryPort.findOpenByUserId(userId)
                .orElseThrow(() -> new SalesNotFoundException("No OPEN cash register session for current user"));
    }

    @Override
    @Transactional
    public CashRegisterSession close(Long id, CloseCashRegisterCommand command) {
        BigDecimal counted = command.countedAmount();
        if (counted == null || counted.compareTo(BigDecimal.ZERO) < 0) {
            throw new SalesBusinessRuleException("countedAmount must be >= 0");
        }

        CashRegisterSession current = getById(id);
        if (current.status() != CashRegisterStatus.OPEN) {
            throw new SalesConflictException("Only OPEN cash register sessions can be closed");
        }

        if (auditUserProvider.hasRole(RoleName.CAJERO) && !auditUserProvider.currentUserId().equals(current.openedByUserId())) {
            throw new SalesBusinessRuleException("Cashier can only close own cash register session");
        }

        BigDecimal salesTotal = defaultZero(cashRegisterRepositoryPort.sumSalesTotal(current.id()));
        BigDecimal cashSales = defaultZero(cashRegisterRepositoryPort.sumSalesCashPaid(current.id()));
        BigDecimal expectedCash = defaultZero(current.openingAmount()).add(cashSales);
        BigDecimal difference = counted.subtract(expectedCash);

        CashRegisterSession closed = new CashRegisterSession(
                current.id(),
                current.openedByUserId(),
                current.openedAt(),
                Instant.now(),
                current.openingAmount(),
                counted,
                expectedCash,
                difference,
                CashRegisterStatus.CLOSED,
                trimToNull(command.notes()) == null ? current.notes() : trimToNull(command.notes()),
                current.createdAt(),
                current.updatedAt()
        );
        return cashRegisterRepositoryPort.save(closed);
    }

    @Override
    public CashRegisterSession getById(Long id) {
        return cashRegisterRepositoryPort.findById(id)
                .orElseThrow(() -> new SalesNotFoundException("Cash register session not found"));
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

