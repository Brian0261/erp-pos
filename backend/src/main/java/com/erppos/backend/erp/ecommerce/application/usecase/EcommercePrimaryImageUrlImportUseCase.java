package com.erppos.backend.erp.ecommerce.application.usecase;

import java.util.List;

public interface EcommercePrimaryImageUrlImportUseCase {
    byte[] downloadTemplate();

    PreviewResult preview(String originalFilename, byte[] content);

    ConfirmResult confirmFile(String originalFilename, byte[] content);

    record TemplateData(
            List<TemplateRow> rows,
            List<String> instructions
    ) {
    }

    record TemplateRow(
            String sku,
            String imageUrl,
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
            String imageUrl,
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

    record PreviewRow(
            int rowNumber,
            String sku,
            Long productId,
            Long profileId,
            String productName,
            String publicationStatus,
            String currentAssetUrl,
            String imageUrl,
            String altText,
            String source,
            Boolean rightsConfirmed,
            String assetType,
            Integer displayOrder,
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
