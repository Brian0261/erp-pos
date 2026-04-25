package com.erppos.backend.erp.catalog.application.service;
import com.erppos.backend.erp.catalog.application.usecase.CreateUnitCommand;
import com.erppos.backend.erp.catalog.application.usecase.UnitUseCase;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
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
        String normalizedCode = command.code().trim();
        if (unitRepositoryPort.existsByCodeIgnoreCase(normalizedCode)) {
            throw new CatalogConflictException("Unit code already exists");
        }
        String actor = auditUserProvider.currentUsername();
        Unit unit = new Unit(
                null,
                normalizedCode,
                command.name().trim(),
                true,
                null,
                null,
                actor,
                actor
        );
        return unitRepositoryPort.save(unit);
    }
    @Override
    public List<Unit> list() {
        return unitRepositoryPort.findAll();
    }
}
