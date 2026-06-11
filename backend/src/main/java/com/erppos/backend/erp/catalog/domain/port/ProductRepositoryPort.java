package com.erppos.backend.erp.catalog.domain.port;
import com.erppos.backend.erp.catalog.application.usecase.ProductBarcodeStatus;
import com.erppos.backend.erp.catalog.domain.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import java.util.Set;
public interface ProductRepositoryPort {
    Product save(Product product);
    Optional<Product> findById(Long id);
    List<Product> findByIds(List<Long> ids);
    List<Product> findBySkusIgnoreCase(Set<String> skus);
    Page<Product> findAll(Pageable pageable);
    Page<Product> findByFilters(String query, boolean applyQuery, Long categoryId, Boolean active, ProductBarcodeStatus barcodeStatus, Pageable pageable);
    List<Product> search(String query, int limit);
    List<Product> lookup(String query, Boolean active, int limit);
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);
    boolean existsByBarcode(String barcode);
    boolean existsByBarcodeAndIdNot(String barcode, Long id);
}
