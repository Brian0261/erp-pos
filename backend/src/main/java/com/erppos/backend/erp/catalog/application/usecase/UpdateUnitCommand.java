package com.erppos.backend.erp.catalog.application.usecase;

public record UpdateUnitCommand(
        String code,
        String name
) {
}
