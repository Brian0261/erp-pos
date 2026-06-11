package com.erppos.backend.erp.ecommerce.application.usecase;

import java.util.List;

public interface EcommerceOnlineProfileImportUseCase {
    byte[] downloadTemplate();

    PreviewResult preview(String originalFilename, byte[] content);

    ConfirmResult confirmFile(String originalFilename, byte[] content);

    record TemplateData(
            List<TemplateProfileRow> profileRows,
            List<TemplateReferenceRow> onlineCategories,
            List<TemplateReferenceRow> brands,
            List<String> instructions
    ) {
    }

    record TemplateProfileRow(
            String sku,
            String productName,
            String publicationStatus,
            String onlineName,
            String slug,
            String onlineDescription,
            String onlineCategorySlug,
            String brandSlug,
            String brandAbsencePolicy
    ) {
    }

    record TemplateReferenceRow(String name, String slug, boolean active) {
    }

    record ParsedRow(
            int rowNumber,
            String sku,
            String productName,
            String publicationStatus,
            String onlineName,
            String slug,
            String onlineDescription,
            String onlineCategorySlug,
            String brandSlug,
            String brandAbsencePolicy
    ) {
    }

    record PreviewRow(
            int rowNumber,
            String sku,
            String productName,
            String publicationStatus,
            String onlineName,
            String slug,
            String onlineDescription,
            String onlineCategorySlug,
            String brandSlug,
            String brandAbsencePolicy,
            EcommerceOnlineProfileImportAction action,
            boolean valid,
            List<String> errors,
            List<String> generatedFields
    ) {
    }

    record PreviewResult(
            int totalRows,
            int createRows,
            int updateRows,
            int unchangedRows,
            int rejectedRows,
            List<PreviewRow> rows
    ) {
    }

    record ConfirmRowResult(
            int rowNumber,
            String sku,
            EcommerceOnlineProfileImportAction action,
            boolean applied,
            Long profileId,
            List<String> errors
    ) {
    }

    record ConfirmResult(
            int totalRows,
            int createdRows,
            int updatedRows,
            int unchangedRows,
            int rejectedRows,
            List<ConfirmRowResult> rows
    ) {
    }
}
