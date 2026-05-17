package com.erppos.backend.erp.catalog.application.port;

import com.erppos.backend.erp.catalog.application.usecase.ProductImportUseCase;

import java.util.List;

public interface ProductImportWorkbookPort {
    byte[] createTemplate();

    List<ProductImportUseCase.ParsedRow> parse(byte[] content);
}
