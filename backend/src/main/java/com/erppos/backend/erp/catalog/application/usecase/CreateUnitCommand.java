package com.erppos.backend.erp.catalog.application.usecase;
import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
public record CreateUnitCommand(
        String code,
        String name,
        QuantityPolicy quantityPolicy
) {
}
