package com.erppos.backend.erp.catalog.application.service;
import com.erppos.backend.erp.catalog.application.usecase.CreateProductCommand;
import com.erppos.backend.erp.catalog.application.usecase.ProductBarcodeStatus;
import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.application.usecase.UpdateProductCommand;
import com.erppos.backend.erp.catalog.domain.exception.CatalogBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.catalog.domain.port.UnitRepositoryPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.Locale;
import java.util.List;
@Service
public class ProductApplicationService implements ProductUseCase {
    private final ProductRepositoryPort productRepositoryPort;
    private final CategoryRepositoryPort categoryRepositoryPort;
    private final UnitRepositoryPort unitRepositoryPort;
    private final AuditUserProvider auditUserProvider;
    public ProductApplicationService(
            ProductRepositoryPort productRepositoryPort,
            CategoryRepositoryPort categoryRepositoryPort,
            UnitRepositoryPort unitRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.productRepositoryPort = productRepositoryPort;
        this.categoryRepositoryPort = categoryRepositoryPort;
        this.unitRepositoryPort = unitRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }
    @Override
    public Product create(CreateProductCommand command) {
        validateCreateConstraints(command.sku(), command.barcode());
        ensureCategoryAndUnitActive(command.categoryId(), command.unitId());
        String actor = auditUserProvider.currentUsername();
        Product product = new Product(
                null,
                command.sku().trim(),
                normalizeBarcode(command.barcode()),
                command.name().trim(),
                trimToNull(command.description()),
                command.categoryId(),
                command.unitId(),
                command.salePrice(),
                true,
                null,
                null,
                actor,
                actor
        );
        return productRepositoryPort.save(product);
    }
    @Override
    public Page<Product> list(String query, Long categoryId, Boolean active, ProductBarcodeStatus barcodeStatus, Pageable pageable) {
        String normalizedQuery = normalizeQuery(query);
        ProductBarcodeStatus normalizedBarcodeStatus = barcodeStatus == ProductBarcodeStatus.ALL ? null : barcodeStatus;
        return productRepositoryPort.findByFilters(
                normalizedQuery == null ? "" : normalizedQuery,
                normalizedQuery != null,
                categoryId,
                active,
                normalizedBarcodeStatus,
                pageable
        );
    }
    @Override
    public Product getById(Long id) {
        return productRepositoryPort.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Product not found"));
    }
    @Override
    public Product update(Long id, UpdateProductCommand command) {
        Product current = getById(id);
        String sku = command.sku().trim();
        String barcode = normalizeBarcode(command.barcode());
        if (productRepositoryPort.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new CatalogConflictException("SKU already exists");
        }
        if (barcode != null && productRepositoryPort.existsByBarcodeAndIdNot(barcode, id)) {
            throw new CatalogConflictException("Barcode already exists");
        }
        ensureCategoryAndUnitActive(command.categoryId(), command.unitId());
        Product toUpdate = new Product(
                current.id(),
                sku,
                barcode,
                command.name().trim(),
                trimToNull(command.description()),
                command.categoryId(),
                command.unitId(),
                command.salePrice(),
                command.active() == null ? current.active() : command.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );
        return productRepositoryPort.save(toUpdate);
    }
    @Override
    public void deactivate(Long id) {
        Product current = getById(id);
        Product disabled = new Product(
                current.id(),
                current.sku(),
                current.barcode(),
                current.name(),
                current.description(),
                current.categoryId(),
                current.unitId(),
                current.salePrice(),
                false,
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );
        productRepositoryPort.save(disabled);
    }
    @Override
    public List<Product> search(String query) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isEmpty()) {
            return List.of();
        }
        return productRepositoryPort.search(normalizedQuery, 50);
    }
    private void validateCreateConstraints(String sku, String barcode) {
        if (productRepositoryPort.existsBySkuIgnoreCase(sku.trim())) {
            throw new CatalogConflictException("SKU already exists");
        }
        String normalizedBarcode = normalizeBarcode(barcode);
        if (normalizedBarcode != null && productRepositoryPort.existsByBarcode(normalizedBarcode)) {
            throw new CatalogConflictException("Barcode already exists");
        }
    }
    private void ensureCategoryAndUnitActive(Long categoryId, Long unitId) {
        Category category = categoryRepositoryPort.findById(categoryId)
                .orElseThrow(() -> new CatalogNotFoundException("Category not found"));
        if (!category.active()) {
            throw new CatalogBusinessRuleException("Category is inactive");
        }
        Unit unit = unitRepositoryPort.findById(unitId)
                .orElseThrow(() -> new CatalogNotFoundException("Unit not found"));
        if (!unit.active()) {
            throw new CatalogBusinessRuleException("Unit is inactive");
        }
    }
    private String normalizeBarcode(String barcode) {
        if (barcode == null) {
            return null;
        }
        String trimmed = barcode.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
    private String normalizeQuery(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }
}
