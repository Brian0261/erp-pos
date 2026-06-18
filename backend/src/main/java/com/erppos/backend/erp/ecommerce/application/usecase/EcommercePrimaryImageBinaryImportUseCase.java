package com.erppos.backend.erp.ecommerce.application.usecase;

import java.util.List;

public interface EcommercePrimaryImageBinaryImportUseCase {
    byte[] downloadTemplate();

    PreviewResult preview(String workbookFilename, byte[] workbookContent, String archiveFilename, byte[] archiveContent);

    ConfirmResult confirmFile(String workbookFilename, byte[] workbookContent, String archiveFilename, byte[] archiveContent);

    record TemplateData(
            List<TemplateRow> rows,
            List<String> instructions
    ) {
    }

    record TemplateRow(
            String sku,
            String imageFile,
            String altText,
            String source,
            String rightsConfirmed,
            String assetType,
            String displayOrder,
            String publishedUpdateConfirmed,
            String productName,
            String publicationStatus,
            String currentImageUrl
    ) {
    }

    record ParsedRow(
            int rowNumber,
            String sku,
            String imageFile,
            String altText,
            String source,
            String rightsConfirmed,
            String assetType,
            String displayOrder,
            String publishedUpdateConfirmed,
            String productName,
            String publicationStatus,
            String currentImageUrl
    ) {
    }

    record ArchiveImage(
            String normalizedPath,
            String originalPath,
            byte[] bytes
    ) {
    }

    record PreviewRow(
            int rowNumber,
            String sku,
            Long productId,
            Long profileId,
            String productName,
            String publicationStatus,
            String currentAssetUrl,
            String imageFile,
            String altText,
            String source,
            Boolean rightsConfirmed,
            String assetType,
            Integer displayOrder,
            String mimeType,
            Integer width,
            Integer height,
            Long sizeBytes,
            String checksumSha256,
            EcommercePrimaryImageUrlImportAction action,
            boolean valid,
            List<String> errors,
            List<String> warnings
    ) {
    }

    record PreviewResult(
            int totalRows,
            int createRows,
            int updateRows,
            int unchangedRows,
            int rejectedRows,
            int warningRows,
            List<PreviewRow> rows
    ) {
    }

    record ConfirmRowResult(
            int rowNumber,
            String sku,
            Long productId,
            Long profileId,
            EcommercePrimaryImageUrlImportAction action,
            boolean applied,
            String assetUrl,
            String storageKey,
            List<String> errors,
            List<String> warnings
    ) {
    }

    record ConfirmResult(
            int totalRows,
            int createdRows,
            int updatedRows,
            int unchangedRows,
            int rejectedRows,
            int warningRows,
            List<ConfirmRowResult> rows
    ) {
    }
}
