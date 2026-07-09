package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class ElectronicDocumentLifecyclePolicy {

    private static final Map<ElectronicDocumentStatus, Set<ElectronicDocumentStatus>> VALID_TRANSITIONS = Map.of(
            ElectronicDocumentStatus.DRAFT, Set.of(ElectronicDocumentStatus.GENERATED),
            ElectronicDocumentStatus.GENERATED, Set.of(ElectronicDocumentStatus.SIGNED),
            ElectronicDocumentStatus.SIGNED, Set.of(ElectronicDocumentStatus.SENT),
            ElectronicDocumentStatus.SENT, Set.of(
                    ElectronicDocumentStatus.ACCEPTED,
                    ElectronicDocumentStatus.REJECTED,
                    ElectronicDocumentStatus.ERROR
            ),
            ElectronicDocumentStatus.ACCEPTED, Set.of(),
            ElectronicDocumentStatus.REJECTED, Set.of(),
            ElectronicDocumentStatus.ERROR, Set.of(),
            ElectronicDocumentStatus.CANCELLED, Set.of()
    );

    private static final Set<ElectronicDocumentStatus> TERMINAL_STATUSES = Set.of(
            ElectronicDocumentStatus.ACCEPTED,
            ElectronicDocumentStatus.REJECTED,
            ElectronicDocumentStatus.ERROR,
            ElectronicDocumentStatus.CANCELLED
    );

    private static final Set<ElectronicDocumentStatus> ACTIVE_STATUSES = Set.of(
            ElectronicDocumentStatus.DRAFT,
            ElectronicDocumentStatus.GENERATED,
            ElectronicDocumentStatus.SIGNED,
            ElectronicDocumentStatus.SENT,
            ElectronicDocumentStatus.ACCEPTED
    );

    public void assertCanGenerateXml(ElectronicDocumentStatus currentStatus) {
        if (currentStatus != ElectronicDocumentStatus.DRAFT) {
            throw new BillingConflictException("El estado actual no permite generar XML.");
        }
    }

    public void assertCanSign(ElectronicDocumentStatus currentStatus) {
        if (currentStatus != ElectronicDocumentStatus.GENERATED) {
            throw new BillingConflictException("El estado actual no permite firmar el XML.");
        }
    }

    public void assertCanSend(ElectronicDocumentStatus currentStatus) {
        if (currentStatus == ElectronicDocumentStatus.SENT) {
            throw new BillingConflictException("El comprobante ya fue marcado como enviado. No se reenvia en esta fase.");
        }
        if (currentStatus != ElectronicDocumentStatus.SIGNED) {
            throw new BillingConflictException("El estado actual no permite enviar el comprobante.");
        }
    }

    public void assertCanRetrySend(ElectronicDocumentStatus currentStatus) {
        if (currentStatus == ElectronicDocumentStatus.SIGNED) {
            throw new BillingConflictException("El comprobante firmado debe enviarse con el envio normal, no con retry manual.");
        }
        if (currentStatus == ElectronicDocumentStatus.SENT) {
            throw new BillingConflictException("El retry manual no aplica a comprobantes SENT/PENDING; queda reservado para consulta o reconciliacion.");
        }
        if (currentStatus != ElectronicDocumentStatus.ERROR) {
            throw new BillingConflictException("El retry manual solo esta permitido para comprobantes en ERROR.");
        }
    }

    public void assertTransitionAllowed(ElectronicDocumentStatus currentStatus, ElectronicDocumentStatus nextStatus) {
        if (!VALID_TRANSITIONS.getOrDefault(currentStatus, Set.of()).contains(nextStatus)) {
            throw new BillingConflictException("Transicion fiscal no permitida para el estado actual.");
        }
    }

    public boolean isTerminal(ElectronicDocumentStatus status) {
        return TERMINAL_STATUSES.contains(status);
    }

    public boolean isActive(ElectronicDocumentStatus status) {
        return ACTIVE_STATUSES.contains(status);
    }
}
