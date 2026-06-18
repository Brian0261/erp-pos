package com.erppos.backend.erp.ecommerce.application.port;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageBinaryImportUseCase;

import java.util.List;

public interface EcommercePrimaryImageBinaryImportWorkbookPort {
    byte[] createTemplate(EcommercePrimaryImageBinaryImportUseCase.TemplateData data);

    List<EcommercePrimaryImageBinaryImportUseCase.ParsedRow> parse(byte[] content);
}
