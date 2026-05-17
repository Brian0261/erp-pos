package com.erppos.backend.erp.catalog.adapter.rest;

import com.erppos.backend.erp.catalog.adapter.dto.*;
import com.erppos.backend.erp.catalog.application.usecase.ProductImportUseCase;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/v1/products/import")
public class ProductImportController {
    private static final String XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ProductImportUseCase productImportUseCase;

    public ProductImportController(ProductImportUseCase productImportUseCase) {
        this.productImportUseCase = productImportUseCase;
    }

    @GetMapping("/template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] content = productImportUseCase.downloadTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("products-import-template.xlsx").build().toString())
                .body(content);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductImportPreviewResponse> preview(@RequestParam("file") MultipartFile file) throws Exception {
        ProductImportUseCase.PreviewResult result = productImportUseCase.preview(file.getOriginalFilename(), file.getBytes());
        return ResponseEntity.ok(new ProductImportPreviewResponse(
                result.totalRows(),
                result.validRows(),
                result.invalidRows(),
                result.rows().stream().map(row -> new ProductImportPreviewRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.barcode(),
                        row.name(),
                        row.description(),
                        row.category(),
                        row.unit(),
                        row.salePrice(),
                        row.active(),
                        row.valid(),
                        row.errors()
                )).toList()
        ));
    }

    @PostMapping(value = "/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductImportConfirmResponse> confirm(@Valid @RequestBody ProductImportConfirmRequest request) {
        ProductImportUseCase.ConfirmResult result = productImportUseCase.confirm(new ProductImportUseCase.ConfirmCommand(
                request.rows().stream().map(row -> new ProductImportUseCase.ImportRowCommand(
                        row.rowNumber(),
                        row.sku(),
                        row.barcode(),
                        row.name(),
                        row.description(),
                        row.category(),
                        row.unit(),
                        row.salePrice(),
                        row.active()
                )).toList()
        ));
        return ResponseEntity.ok(new ProductImportConfirmResponse(
                result.totalRows(),
                result.createdRows(),
                result.rejectedRows(),
                result.rows().stream().map(row -> new ProductImportConfirmRowResponse(
                        row.rowNumber(),
                        row.sku(),
                        row.created(),
                        row.productId(),
                        row.errors()
                )).toList()
        ));
    }
}
