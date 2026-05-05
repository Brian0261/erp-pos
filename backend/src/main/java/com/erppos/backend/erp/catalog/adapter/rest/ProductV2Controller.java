package com.erppos.backend.erp.catalog.adapter.rest;

import com.erppos.backend.erp.catalog.adapter.dto.ProductResponse;
import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import com.erppos.backend.erp.shared.adapter.dto.PageResponseMapper;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/products")
public class ProductV2Controller {

    private final ProductUseCase productUseCase;

    public ProductV2Controller(ProductUseCase productUseCase) {
        this.productUseCase = productUseCase;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<PageResponse<ProductResponse>> list(Pageable pageable) {
        PageResponse<ProductResponse> response = PageResponseMapper.from(
                productUseCase.list(pageable).map(this::toResponse)
        );
        return ResponseEntity.ok(response);
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.id(),
                product.sku(),
                product.barcode(),
                product.name(),
                product.description(),
                product.categoryId(),
                product.unitId(),
                product.salePrice(),
                product.active(),
                product.createdAt(),
                product.updatedAt()
        );
    }
}

