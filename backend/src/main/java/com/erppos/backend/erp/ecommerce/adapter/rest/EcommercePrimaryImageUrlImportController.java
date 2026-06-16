package com.erppos.backend.erp.ecommerce.adapter.rest;

import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageUrlImportConfirmResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageUrlImportConfirmRowResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageUrlImportPreviewResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommercePrimaryImageUrlImportPreviewRowResponse;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportUseCase;
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
@RequestMapping("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import")
public class EcommercePrimaryImageUrlImportController {
    private static final String XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final EcommercePrimaryImageUrlImportUseCase importUseCase;

    public EcommercePrimaryImageUrlImportController(EcommercePrimaryImageUrlImportUseCase importUseCase) {
        this.importUseCase = importUseCase;
    }

    @GetMapping("/template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] content = importUseCase.downloadTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("ecommerce-primary-images-url-import-template.xlsx").build().toString())
                .body(content);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommercePrimaryImageUrlImportPreviewResponse> preview(@RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(toPreviewResponse(importUseCase.preview(file.getOriginalFilename(), file.getBytes())));
    }

    @PostMapping(value = "/confirm-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommercePrimaryImageUrlImportConfirmResponse> confirmFile(@RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(toConfirmResponse(importUseCase.confirmFile(file.getOriginalFilename(), file.getBytes())));
    }

    private EcommercePrimaryImageUrlImportPreviewResponse toPreviewResponse(EcommercePrimaryImageUrlImportUseCase.PreviewResult result) {
        return new EcommercePrimaryImageUrlImportPreviewResponse(
                result.totalRows(),
                result.createRows(),
                result.updateRows(),
                result.unchangedRows(),
                result.rejectedRows(),
                result.warningRows(),
                result.rows().stream().map(row -> new EcommercePrimaryImageUrlImportPreviewRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.productId(),
                        row.profileId(),
                        row.productName(),
                        row.publicationStatus(),
                        row.currentAssetUrl(),
                        row.imageUrl(),
                        row.altText(),
                        row.source(),
                        row.rightsConfirmed(),
                        row.assetType(),
                        row.displayOrder(),
                        row.action(),
                        row.valid(),
                        row.errors(),
                        row.warnings()
                )).toList()
        );
    }

    private EcommercePrimaryImageUrlImportConfirmResponse toConfirmResponse(EcommercePrimaryImageUrlImportUseCase.ConfirmResult result) {
        return new EcommercePrimaryImageUrlImportConfirmResponse(
                result.totalRows(),
                result.createdRows(),
                result.updatedRows(),
                result.unchangedRows(),
                result.rejectedRows(),
                result.warningRows(),
                result.rows().stream().map(row -> new EcommercePrimaryImageUrlImportConfirmRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.productId(),
                        row.profileId(),
                        row.action(),
                        row.applied(),
                        row.errors(),
                        row.warnings()
                )).toList()
        );
    }
}
