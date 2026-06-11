package com.erppos.backend.erp.ecommerce.application.port;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportUseCase;

import java.util.List;

public interface EcommerceOnlineProfileImportWorkbookPort {
    byte[] createTemplate(EcommerceOnlineProfileImportUseCase.TemplateData data);

    List<EcommerceOnlineProfileImportUseCase.ParsedRow> parse(byte[] content);
}
