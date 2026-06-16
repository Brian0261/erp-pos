package com.erppos.backend.erp.ecommerce.application.port;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportUseCase;

import java.util.List;

public interface EcommercePrimaryImageUrlImportWorkbookPort {
    byte[] createTemplate(EcommercePrimaryImageUrlImportUseCase.TemplateData data);

    List<EcommercePrimaryImageUrlImportUseCase.ParsedRow> parse(byte[] content);
}
