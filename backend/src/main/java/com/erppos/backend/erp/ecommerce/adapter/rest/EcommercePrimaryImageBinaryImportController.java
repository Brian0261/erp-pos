package com.erppos.backend.erp.ecommerce.adapter.rest;

import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageBinaryImportConfirmResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageBinaryImportConfirmRowResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageBinaryImportPreviewResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageBinaryImportPreviewRowResponse;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageBinaryImportUseCase;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import")
public class EcommercePrimaryImageBinaryImportController {
    private static final String XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final EcommercePrimaryImageBinaryImportUseCase importUseCase;

    public EcommercePrimaryImageBinaryImportController(EcommercePrimaryImageBinaryImportUseCase importUseCase) {
        this.importUseCase = importUseCase;
    }

    @GetMapping("/template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] content = importUseCase.downloadTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("ecommerce-primary-images-binary-import-template.xlsx").build().toString())
                .body(content);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommercePrimaryImageBinaryImportPreviewResponse> preview(
            @RequestParam("workbook") MultipartFile workbook,
            @RequestParam("archive") MultipartFile archive
    ) throws Exception {
        return ResponseEntity.ok(toPreviewResponse(importUseCase.preview(
                workbook.getOriginalFilename(),
                workbook.getBytes(),
                archive.getOriginalFilename(),
                archive.getBytes()
        )));
    }

    @PostMapping(value = "/confirm-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommercePrimaryImageBinaryImportConfirmResponse> confirmFile(
            @RequestParam("workbook") MultipartFile workbook,
            @RequestParam("archive") MultipartFile archive
    ) throws Exception {
        return ResponseEntity.ok(toConfirmResponse(importUseCase.confirmFile(
                workbook.getOriginalFilename(),
                workbook.getBytes(),
                archive.getOriginalFilename(),
                archive.getBytes()
        )));
    }

    private EcommercePrimaryImageBinaryImportPreviewResponse toPreviewResponse(EcommercePrimaryImageBinaryImportUseCase.PreviewResult result) {
        return new EcommercePrimaryImageBinaryImportPreviewResponse(
                result.totalRows(),
                result.createRows(),
                result.updateRows(),
                result.unchangedRows(),
                result.rejectedRows(),
                result.warningRows(),
                result.rows().stream().map(row -> new EcommercePrimaryImageBinaryImportPreviewRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.productId(),
                        row.profileId(),
                        row.productName(),
                        row.publicationStatus(),
                        row.currentAssetUrl(),
                        row.imageFile(),
                        row.altText(),
                        row.source(),
                        row.rightsConfirmed(),
                        row.assetType(),
                        row.displayOrder(),
                        row.mimeType(),
                        row.width(),
                        row.height(),
                        row.sizeBytes(),
                        row.checksumSha256(),
                        row.action(),
                        row.valid(),
                        row.errors(),
                        row.warnings()
                )).toList()
        );
    }

    private EcommercePrimaryImageBinaryImportConfirmResponse toConfirmResponse(EcommercePrimaryImageBinaryImportUseCase.ConfirmResult result) {
        return new EcommercePrimaryImageBinaryImportConfirmResponse(
                result.totalRows(),
                result.createdRows(),
                result.updatedRows(),
                result.unchangedRows(),
                result.rejectedRows(),
                result.warningRows(),
                result.rows().stream().map(row -> new EcommercePrimaryImageBinaryImportConfirmRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.productId(),
                        row.profileId(),
                        row.action(),
                        row.applied(),
                        row.assetUrl(),
                        row.storageKey(),
                        row.errors(),
                        row.warnings()
                )).toList()
        );
    }
}
