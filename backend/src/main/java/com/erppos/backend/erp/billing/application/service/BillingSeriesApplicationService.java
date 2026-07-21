package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.application.usecase.BillingSeriesUseCase;
import com.erppos.backend.erp.billing.application.usecase.CreateBillingSeriesCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateBillingSeriesCommand;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFailedException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionRequiredException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class BillingSeriesApplicationService implements BillingSeriesUseCase {

    private final BillingSeriesRepositoryPort seriesRepositoryPort;
    private final ElectronicDocumentRepositoryPort documentRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public BillingSeriesApplicationService(
            BillingSeriesRepositoryPort seriesRepositoryPort,
            ElectronicDocumentRepositoryPort documentRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.seriesRepositoryPort = seriesRepositoryPort;
        this.documentRepositoryPort = documentRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public BillingSeries create(CreateBillingSeriesCommand command) {
        validate(command.documentType(), command.series(), command.currentNumber(), command.environment());
        String normalizedSeries = normalizeSeries(command.series());
        if (seriesRepositoryPort.existsByDocumentTypeAndSeriesAndEnvironment(
                command.documentType(), normalizedSeries, command.environment(), null
        )) {
            throw new BillingConflictException("Billing series already exists for type and environment");
        }

        boolean active = command.active() == null || command.active();
        validateSingleActiveSeries(command.documentType(), command.environment(), active, null);

        String actor = auditUserProvider.currentUsername();
        return seriesRepositoryPort.save(new BillingSeries(
                null,
                null,
                command.documentType(),
                normalizedSeries,
                command.currentNumber(),
                command.environment(),
                active,
                null,
                null,
                actor,
                actor
        ));
    }

    @Override
    public List<BillingSeries> list() {
        return seriesRepositoryPort.findAll();
    }

    @Override
    public BillingSeries getById(Long id) {
        return seriesRepositoryPort.findById(id).orElseThrow(() -> new BillingNotFoundException("Billing series not found"));
    }

    @Override
    @Transactional
    public BillingSeries update(Long id, UpdateBillingSeriesCommand command) {
        BillingSeries current = seriesRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new BillingNotFoundException("Billing series not found"));
        validateExpectedVersion(current, command.expectedVersion());
        validate(command.documentType(), command.series(), command.currentNumber(), command.environment());
        String normalizedSeries = normalizeSeries(command.series());

        if (seriesRepositoryPort.existsByDocumentTypeAndSeriesAndEnvironment(
                command.documentType(), normalizedSeries, command.environment(), id
        )) {
            throw new BillingConflictException("Billing series already exists for type and environment");
        }

        if (isCorrelativeNotGreaterThanIssued(current.id(), command.currentNumber())) {
            throw new BillingConflictException("El proximo correlativo debe ser mayor al ultimo comprobante emitido para esta serie.");
        }

        boolean nextActive = command.active() == null ? current.active() : command.active();
        validateSingleActiveSeries(command.documentType(), command.environment(), nextActive, current.id());

        return seriesRepositoryPort.save(new BillingSeries(
                current.id(),
                current.version(),
                command.documentType(),
                normalizedSeries,
                command.currentNumber(),
                command.environment(),
                nextActive,
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        ));
    }

    @Override
    @Transactional
    public BillingSeries deactivate(Long id, Long expectedVersion) {
        BillingSeries current = seriesRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new BillingNotFoundException("Billing series not found"));
        validateExpectedVersion(current, expectedVersion);
        if (!current.active()) {
            return current;
        }
        return seriesRepositoryPort.save(new BillingSeries(
                current.id(),
                current.version(),
                current.documentType(),
                current.series(),
                current.currentNumber(),
                current.environment(),
                false,
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        ));
    }

    private void validateExpectedVersion(BillingSeries current, Long expectedVersion) {
        if (expectedVersion == null) {
            throw new BillingPreconditionRequiredException(
                    "El header If-Match es obligatorio para modificar una serie. Recarga la serie y vuelve a intentarlo con su versión vigente."
            );
        }
        if (!expectedVersion.equals(current.version())) {
            throw new BillingPreconditionFailedException(
                    "La serie fue modificada desde que se consulto. Recarga su estado antes de intentar nuevamente."
            );
        }
    }

    private void validate(ElectronicDocumentType type, String series, Long currentNumber, Object environment) {
        if (type == null) {
            throw new BillingBusinessRuleException("documentType is required");
        }
        if (environment == null) {
            throw new BillingBusinessRuleException("environment is required");
        }
        if (series == null || series.trim().isEmpty()) {
            throw new BillingBusinessRuleException("series is required");
        }
        String normalizedSeries = normalizeSeries(series);
        if (type == ElectronicDocumentType.INVOICE && !normalizedSeries.matches("^F[0-9]{3}$")) {
            throw new BillingBusinessRuleException("INVOICE series must match F###");
        }
        if (type == ElectronicDocumentType.RECEIPT && !normalizedSeries.matches("^B[0-9]{3}$")) {
            throw new BillingBusinessRuleException("RECEIPT series must match B###");
        }
        if (currentNumber == null || currentNumber < 1) {
            throw new BillingBusinessRuleException("currentNumber must be >= 1");
        }
    }

    private String normalizeSeries(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private void validateSingleActiveSeries(
            ElectronicDocumentType documentType,
            BillingEnvironment environment,
            boolean shouldBeActive,
            Long excludeId
    ) {
        if (!shouldBeActive) {
            return;
        }
        if (seriesRepositoryPort.existsActiveByDocumentTypeAndEnvironment(documentType, environment, excludeId)) {
            throw new BillingConflictException("Ya existe una serie activa para este tipo de comprobante y ambiente.");
        }
    }

    private boolean isCorrelativeNotGreaterThanIssued(Long seriesId, Long proposedCurrentNumber) {
        return documentRepositoryPort.findMaxIssuedNumberByBillingSeriesId(seriesId)
                .map(lastIssuedNumber -> proposedCurrentNumber <= lastIssuedNumber)
                .orElse(false);
    }
}

