package com.erppos.backend.erp.purchases.application.usecase;

import com.erppos.backend.erp.purchases.domain.model.Supplier;

import java.util.List;

public interface SupplierUseCase {
    Supplier create(CreateSupplierCommand command);
    List<Supplier> list(String query);
    Supplier getById(Long id);
    Supplier update(Long id, UpdateSupplierCommand command);
    void deactivate(Long id);
}

