package com.erppos.backend.erp.catalog.application.service;
import com.erppos.backend.erp.catalog.application.usecase.CreateUnitCommand;
import com.erppos.backend.erp.catalog.application.usecase.ChangeUnitStatusCommand;
import com.erppos.backend.erp.catalog.application.usecase.UnitUseCase;
import com.erppos.backend.erp.catalog.application.usecase.UpdateUnitCommand;
import com.erppos.backend.erp.catalog.domain.exception.CatalogBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import com.erppos.backend.erp.catalog.domain.port.UnitRepositoryPort;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class UnitApplicationService implements UnitUseCase {
    private final UnitRepositoryPort unitRepositoryPort;
    private final AuditUserProvider auditUserProvider;
    public UnitApplicationService(UnitRepositoryPort unitRepositoryPort, AuditUserProvider auditUserProvider) {
        this.unitRepositoryPort = unitRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }
    @Override
    public Unit create(CreateUnitCommand command) {
        String code = trimToNull(command.code());
        String name = trimToNull(command.name());
        if (code == null) {
            throw new CatalogBusinessRuleException("Unit code is required");
        }
        if (name == null) {
            throw new CatalogBusinessRuleException("Unit name is required");
        }
        if (unitRepositoryPort.existsByCodeIgnoreCase(code)) {
            throw new CatalogConflictException("Unit code already exists");
        }
        String actor = auditUserProvider.currentUsername();
        Unit unit = new Unit(
                null,
                code,
                name,
                true,
                null,
                null,
                actor,
                actor
        );
        return unitRepositoryPort.save(unit);
    }

    @Override
    public Unit update(Long id, UpdateUnitCommand command) {
        Unit current = getById(id);
        String code = trimToNull(command.code());
        String name = trimToNull(command.name());
        if (code == null) {
            throw new CatalogBusinessRuleException("Unit code is required");
        }
        if (name == null) {
            throw new CatalogBusinessRuleException("Unit name is required");
        }
        if (unitRepositoryPort.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new CatalogConflictException("Unit code already exists");
        }

        String actor = auditUserProvider.currentUsername();
        Unit updated = new Unit(
                current.id(),
                code,
                name,
                current.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return unitRepositoryPort.save(updated);
    }

    @Override
    public Unit changeStatus(Long id, ChangeUnitStatusCommand command) {
        Unit current = getById(id);
        String actor = auditUserProvider.currentUsername();
        Unit updated = new Unit(
                current.id(),
                current.code(),
                current.name(),
                command.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                actor
        );
        return unitRepositoryPort.save(updated);
    }
    @Override
    public List<Unit> list() {
        return unitRepositoryPort.findAll();
    }

    private Unit getById(Long id) {
        return unitRepositoryPort.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Unit not found"));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
