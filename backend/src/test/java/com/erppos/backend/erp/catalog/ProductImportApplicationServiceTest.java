package com.erppos.backend.erp.catalog;

import com.erppos.backend.erp.catalog.application.port.ProductImportWorkbookPort;
import com.erppos.backend.erp.catalog.application.service.AuditUserProvider;
import com.erppos.backend.erp.catalog.application.service.ProductApplicationService;
import com.erppos.backend.erp.catalog.application.service.ProductImportApplicationService;
import com.erppos.backend.erp.catalog.application.usecase.CreateProductCommand;
import com.erppos.backend.erp.catalog.application.usecase.ProductImportUseCase;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ProductImportApplicationServiceTest {
    private CatalogApplicationServiceTest.InMemoryCategoryRepository categoryRepository;
    private CatalogApplicationServiceTest.InMemoryUnitRepository unitRepository;
    private CatalogApplicationServiceTest.InMemoryProductRepository productRepository;
    private ProductImportApplicationService importService;

    @BeforeEach
    void setUp() {
        categoryRepository = new CatalogApplicationServiceTest.InMemoryCategoryRepository();
        unitRepository = new CatalogApplicationServiceTest.InMemoryUnitRepository();
        productRepository = new CatalogApplicationServiceTest.InMemoryProductRepository();
        ProductApplicationService productService = new ProductApplicationService(
                productRepository,
                categoryRepository,
                unitRepository,
                new AuditUserProvider()
        );
        importService = new ProductImportApplicationService(
                new FakeWorkbookPort(),
                productRepository,
                categoryRepository,
                unitRepository,
                productService
        );
    }

    @Test
    void shouldPreviewValidRowsWithoutCreatingProducts() {
        seedActiveCategoryAndUnit();

        ProductImportUseCase.PreviewResult preview = importService.preview("products.xlsx", new byte[]{1});

        assertEquals(1, preview.totalRows());
        assertEquals(1, preview.validRows());
        assertEquals(0, productRepository.findAll(org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
    }

    @Test
    void shouldReportErrorsPerRowInPreview() {
        seedInactiveCategoryAndUnit();

        ProductImportUseCase.PreviewResult preview = importService.preview("products.xlsx", new byte[]{2});

        assertEquals(0, preview.validRows());
        assertTrue(preview.rows().get(0).errors().contains("Category is inactive"));
        assertTrue(preview.rows().get(0).errors().contains("Unit is inactive"));
    }

    @Test
    void shouldCreateValidRowsOnConfirm() {
        seedActiveCategoryAndUnit();

        ProductImportUseCase.ConfirmResult confirm = importService.confirm(new ProductImportUseCase.ConfirmCommand(List.of(
                new ProductImportUseCase.ImportRowCommand(2, "SKU-IMPORT-1", null, "Producto Importado", null, "Utiles", "UND", "12.50", "true")
        )));

        assertEquals(1, confirm.createdRows());
        assertTrue(confirm.rows().get(0).created());
    }

    @Test
    void shouldCreateValidRowsOnConfirmFile() {
        seedActiveCategoryAndUnit();

        ProductImportUseCase.ConfirmResult confirm = importService.confirmFile("products.xlsx", new byte[]{1});

        assertEquals(1, confirm.createdRows());
        assertTrue(confirm.rows().get(0).created());
    }

    @Test
    void shouldRejectExistingSkuOnConfirmRevalidation() {
        Category category = categoryRepository.save(new Category(null, "Utiles", null, true, null, null, "system", "system"));
        Unit unit = unitRepository.save(new Unit(null, "UND", "Unidad", true, null, null, "system", "system"));
        productRepository.save(new Product(null, "SKU-IMPORT-1", null, "Previo", null, category.id(), unit.id(), BigDecimal.ONE, true, null, null, "system", "system"));

        ProductImportUseCase.ConfirmResult confirm = importService.confirm(new ProductImportUseCase.ConfirmCommand(List.of(
                new ProductImportUseCase.ImportRowCommand(2, "SKU-IMPORT-1", null, "Producto Importado", null, "Utiles", "UND", "12.50", "true")
        )));

        assertEquals(0, confirm.createdRows());
        assertTrue(confirm.rows().get(0).errors().contains("SKU already exists"));
    }

    @Test
    void shouldRejectNonXlsxPreview() {
        assertThrows(ResponseStatusException.class, () -> importService.preview("products.csv", new byte[]{1}));
    }

    @Test
    void shouldRejectNonXlsxConfirmFile() {
        assertThrows(ResponseStatusException.class, () -> importService.confirmFile("products.csv", new byte[]{1}));
    }

    private void seedActiveCategoryAndUnit() {
        categoryRepository.save(new Category(null, "Utiles", null, true, null, null, "system", "system"));
        unitRepository.save(new Unit(null, "UND", "Unidad", true, null, null, "system", "system"));
    }

    private void seedInactiveCategoryAndUnit() {
        categoryRepository.save(new Category(null, "Utiles", null, false, null, null, "system", "system"));
        unitRepository.save(new Unit(null, "UND", "Unidad", false, null, null, "system", "system"));
    }

    private static class FakeWorkbookPort implements ProductImportWorkbookPort {
        @Override
        public byte[] createTemplate() {
            return new byte[]{1, 2, 3};
        }

        @Override
        public List<ProductImportUseCase.ParsedRow> parse(byte[] content) {
            if (content[0] == 1) {
                return List.of(new ProductImportUseCase.ParsedRow(2, "SKU-IMPORT-1", null, "Producto Importado", null, "Utiles", "UND", "12.50", "true"));
            }
            return List.of(new ProductImportUseCase.ParsedRow(2, "SKU-IMPORT-2", null, "Producto Invalido", null, "Utiles", "UND", "10", "true"));
        }
    }
}
