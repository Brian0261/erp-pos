package com.erppos.backend.erp.catalog.application.usecase;
import com.erppos.backend.erp.catalog.domain.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
public interface ProductUseCase {
    Product create(CreateProductCommand command);
    Page<Product> list(String query, Long categoryId, Boolean active, ProductBarcodeStatus barcodeStatus, Pageable pageable);
    Product getById(Long id);
    Product update(Long id, UpdateProductCommand command);
    void deactivate(Long id);
    List<Product> search(String query);
}
