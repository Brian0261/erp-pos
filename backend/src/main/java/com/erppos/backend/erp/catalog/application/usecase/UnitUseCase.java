package com.erppos.backend.erp.catalog.application.usecase;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import java.util.List;
public interface UnitUseCase {
    Unit create(CreateUnitCommand command);
    List<Unit> list();
}
