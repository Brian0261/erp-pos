package com.erppos.backend.erp.catalog.adapter.rest;
import com.erppos.backend.erp.catalog.adapter.dto.ProductCreateRequest;
import com.erppos.backend.erp.catalog.adapter.dto.ProductResponse;
import com.erppos.backend.erp.catalog.adapter.dto.ProductUpdateRequest;
import com.erppos.backend.erp.catalog.application.usecase.CreateProductCommand;
import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.application.usecase.UpdateProductCommand;
import com.erppos.backend.erp.catalog.domain.model.Product;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    private final ProductUseCase productUseCase;
    public ProductController(ProductUseCase productUseCase) {
        this.productUseCase = productUseCase;
    }
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductCreateRequest request) {
        Product created = productUseCase.create(toCreateCommand(request));
        return ResponseEntity.created(URI.create("/api/v1/products/" + created.id())).body(toResponse(created));
    }
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<List<ProductResponse>> search(@RequestParam("q") String query) {
        return ResponseEntity.ok(productUseCase.search(query).stream().map(this::toResponse).toList());
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<Page<ProductResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(productUseCase.list(pageable).map(this::toResponse));
    }
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','ALMACENERO','CAJERO')")
    public ResponseEntity<ProductResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(productUseCase.getById(id)));
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody ProductUpdateRequest request) {
        Product updated = productUseCase.update(id, toUpdateCommand(request));
        return ResponseEntity.ok(toResponse(updated));
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        productUseCase.deactivate(id);
        return ResponseEntity.noContent().build();
    }
    private CreateProductCommand toCreateCommand(ProductCreateRequest request) {
        return new CreateProductCommand(
                request.sku(),
                request.barcode(),
                request.name(),
                request.description(),
                request.categoryId(),
                request.unitId(),
                request.salePrice()
        );
    }
    private UpdateProductCommand toUpdateCommand(ProductUpdateRequest request) {
        return new UpdateProductCommand(
                request.sku(),
                request.barcode(),
                request.name(),
                request.description(),
                request.categoryId(),
                request.unitId(),
                request.salePrice(),
                request.active()
        );
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
