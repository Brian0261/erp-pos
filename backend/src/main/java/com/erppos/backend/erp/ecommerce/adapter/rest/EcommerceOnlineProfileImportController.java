package com.erppos.backend.erp.ecommerce.adapter.rest;

import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceOnlineProfileImportConfirmResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceOnlineProfileImportConfirmRowResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceOnlineProfileImportPreviewResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.EcommerceOnlineProfileImportPreviewRowResponse;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportUseCase;
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
@RequestMapping("/api/v1/ecommerce-admin/products/online-profiles/import")
public class EcommerceOnlineProfileImportController {
    private static final String XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final EcommerceOnlineProfileImportUseCase importUseCase;

    public EcommerceOnlineProfileImportController(EcommerceOnlineProfileImportUseCase importUseCase) {
        this.importUseCase = importUseCase;
    }

    @GetMapping("/template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] content = importUseCase.downloadTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("ecommerce-online-profiles-import-template.xlsx").build().toString())
                .body(content);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceOnlineProfileImportPreviewResponse> preview(@RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(toPreviewResponse(importUseCase.preview(file.getOriginalFilename(), file.getBytes())));
    }

    @PostMapping(value = "/confirm-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EcommerceOnlineProfileImportConfirmResponse> confirmFile(@RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(toConfirmResponse(importUseCase.confirmFile(file.getOriginalFilename(), file.getBytes())));
    }

    private EcommerceOnlineProfileImportPreviewResponse toPreviewResponse(EcommerceOnlineProfileImportUseCase.PreviewResult result) {
        return new EcommerceOnlineProfileImportPreviewResponse(
                result.totalRows(),
                result.createRows(),
                result.updateRows(),
                result.unchangedRows(),
                result.rejectedRows(),
                result.rows().stream().map(row -> new EcommerceOnlineProfileImportPreviewRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.productName(),
                        row.publicationStatus(),
                        row.onlineName(),
                        row.slug(),
                        row.onlineDescription(),
                        row.onlineCategorySlug(),
                        row.brandSlug(),
                        row.brandAbsencePolicy(),
                        row.action(),
                        row.valid(),
                        row.errors(),
                        row.generatedFields()
                )).toList()
        );
    }

    private EcommerceOnlineProfileImportConfirmResponse toConfirmResponse(EcommerceOnlineProfileImportUseCase.ConfirmResult result) {
        return new EcommerceOnlineProfileImportConfirmResponse(
                result.totalRows(),
                result.createdRows(),
                result.updatedRows(),
                result.unchangedRows(),
                result.rejectedRows(),
                result.rows().stream().map(row -> new EcommerceOnlineProfileImportConfirmRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.action(),
                        row.applied(),
                        row.profileId(),
                        row.errors()
                )).toList()
        );
    }
}
