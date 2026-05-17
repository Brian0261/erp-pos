package com.erppos.backend.erp.catalog.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ProductImportConfirmRequest(
        @NotEmpty(message = "rows are required")
        List<@Valid ProductImportConfirmRowRequest> rows
) {
}
