package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.application.usecase.BillingSeriesUseCase;
import com.erppos.backend.erp.billing.application.usecase.CreateBillingSeriesCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateBillingSeriesCommand;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class BillingSeriesApplicationService implements BillingSeriesUseCase {

    private final BillingSeriesRepositoryPort seriesRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public BillingSeriesApplicationService(
            BillingSeriesRepositoryPort seriesRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.seriesRepositoryPort = seriesRepositoryPort;
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

        String actor = auditUserProvider.currentUsername();
        return seriesRepositoryPort.save(new BillingSeries(
                null,
                command.documentType(),
                normalizedSeries,
                command.currentNumber(),
                command.environment(),
                true,
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
        validate(command.documentType(), command.series(), command.currentNumber(), command.environment());

        BillingSeries current = getById(id);
        String normalizedSeries = normalizeSeries(command.series());

        if (seriesRepositoryPort.existsByDocumentTypeAndSeriesAndEnvironment(
                command.documentType(), normalizedSeries, command.environment(), id
        )) {
            throw new BillingConflictException("Billing series already exists for type and environment");
        }

        return seriesRepositoryPort.save(new BillingSeries(
                current.id(),
                command.documentType(),
                normalizedSeries,
                command.currentNumber(),
                command.environment(),
                command.active() == null || command.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        ));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        BillingSeries current = getById(id);
        if (!current.active()) {
            return;
        }
        seriesRepositoryPort.save(new BillingSeries(
                current.id(),
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
}

