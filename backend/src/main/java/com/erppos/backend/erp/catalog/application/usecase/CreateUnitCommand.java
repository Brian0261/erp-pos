package com.erppos.backend.erp.catalog.application.usecase;
public record CreateUnitCommand(
        String code,
        String name
) {
}
