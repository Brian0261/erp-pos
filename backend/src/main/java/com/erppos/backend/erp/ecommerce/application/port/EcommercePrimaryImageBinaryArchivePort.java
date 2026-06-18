package com.erppos.backend.erp.ecommerce.application.port;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageBinaryImportUseCase;

import java.util.Map;

public interface EcommercePrimaryImageBinaryArchivePort {
    Map<String, EcommercePrimaryImageBinaryImportUseCase.ArchiveImage> parse(String originalFilename, byte[] content);
}
