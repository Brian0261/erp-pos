package com.erppos.backend.erp.catalog;
import com.erppos.backend.erp.catalog.application.service.AuditUserProvider;
import com.erppos.backend.erp.catalog.application.service.CategoryApplicationService;
import com.erppos.backend.erp.catalog.application.service.ProductApplicationService;
import com.erppos.backend.erp.catalog.application.service.UnitApplicationService;
import com.erppos.backend.erp.catalog.application.usecase.CreateCategoryCommand;
import com.erppos.backend.erp.catalog.application.usecase.CreateProductCommand;
import com.erppos.backend.erp.catalog.application.usecase.CreateUnitCommand;
import com.erppos.backend.erp.catalog.domain.exception.CatalogBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.catalog.domain.port.UnitRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.jupiter.api.Assertions.*;
class CatalogApplicationServiceTest {
    private InMemoryCategoryRepository categoryRepository;
    private InMemoryUnitRepository unitRepository;
    private InMemoryProductRepository productRepository;
    private CategoryApplicationService categoryService;
    private UnitApplicationService unitService;
    private ProductApplicationService productService;
    @BeforeEach
    void setUp() {
        categoryRepository = new InMemoryCategoryRepository();
        unitRepository = new InMemoryUnitRepository();
        productRepository = new InMemoryProductRepository();
        AuditUserProvider auditUserProvider = new AuditUserProvider();
        categoryService = new CategoryApplicationService(categoryRepository, auditUserProvider);
        unitService = new UnitApplicationService(unitRepository, auditUserProvider);
        productService = new ProductApplicationService(productRepository, categoryRepository, unitRepository, auditUserProvider);
    }
    @Test
    void shouldCreateCategorySuccessfully() {
        Category category = categoryService.create(new CreateCategoryCommand("Cuadernos", "Escolares"));
        assertNotNull(category.id());
        assertEquals("Cuadernos", category.name());
        assertTrue(category.active());
    }
    @Test
    void shouldRejectDuplicatedCategoryName() {
        categoryService.create(new CreateCategoryCommand("Papeles", null));
        assertThrows(CatalogConflictException.class,
                () -> categoryService.create(new CreateCategoryCommand("PAPELES", null)));
    }
    @Test
    void shouldCreateUnitSuccessfully() {
        Unit unit = unitService.create(new CreateUnitCommand("UND", "Unidad"));
        assertNotNull(unit.id());
        assertEquals("UND", unit.code());
    }
    @Test
    void shouldRejectDuplicatedUnitCode() {
        unitService.create(new CreateUnitCommand("CJA", "Caja"));
        assertThrows(CatalogConflictException.class,
                () -> unitService.create(new CreateUnitCommand("cja", "Caja duplicada")));
    }
    @Test
    void shouldCreateProductWithRequiredSku() {
        Long[] ids = seedActiveCategoryAndUnit();
        Product product = productService.create(new CreateProductCommand(
                "SKU-001", null, "Lapiz HB", "Lapiz escolar", ids[0], ids[1], BigDecimal.TEN
        ));
        assertNotNull(product.id());
        assertEquals("SKU-001", product.sku());
    }
    @Test
    void shouldCreateProductWithoutBarcode() {
        Long[] ids = seedActiveCategoryAndUnit();
        Product product = productService.create(new CreateProductCommand(
                "SKU-002", null, "Borrador", null, ids[0], ids[1], BigDecimal.valueOf(2.50)
        ));
        assertNull(product.barcode());
    }
    @Test
    void shouldCreateProductWithUniqueBarcode() {
        Long[] ids = seedActiveCategoryAndUnit();
        Product product = productService.create(new CreateProductCommand(
                "SKU-003", "123456789012", "Regla", null, ids[0], ids[1], BigDecimal.valueOf(5)
        ));
        assertEquals("123456789012", product.barcode());
    }
    @Test
    void shouldRejectDuplicatedSku() {
        Long[] ids = seedActiveCategoryAndUnit();
        productService.create(new CreateProductCommand("SKU-004", null, "A", null, ids[0], ids[1], BigDecimal.ONE));
        assertThrows(CatalogConflictException.class, () ->
                productService.create(new CreateProductCommand("sku-004", null, "B", null, ids[0], ids[1], BigDecimal.ONE))
        );
    }
    @Test
    void shouldRejectDuplicatedBarcode() {
        Long[] ids = seedActiveCategoryAndUnit();
        productService.create(new CreateProductCommand("SKU-005", "777", "A", null, ids[0], ids[1], BigDecimal.ONE));
        assertThrows(CatalogConflictException.class, () ->
                productService.create(new CreateProductCommand("SKU-006", "777", "B", null, ids[0], ids[1], BigDecimal.ONE))
        );
    }
    @Test
    void shouldSearchByName() {
        Long[] ids = seedActiveCategoryAndUnit();
        productService.create(new CreateProductCommand("SKU-007", null, "Mochila Azul", null, ids[0], ids[1], BigDecimal.ONE));
        List<Product> results = productService.search("Mochila");
        assertEquals(1, results.size());
    }
    @Test
    void shouldSearchBySku() {
        Long[] ids = seedActiveCategoryAndUnit();
        productService.create(new CreateProductCommand("SKU-008", null, "Tempera", null, ids[0], ids[1], BigDecimal.ONE));
        List<Product> results = productService.search("sku-008");
        assertEquals(1, results.size());
    }
    @Test
    void shouldSearchByBarcode() {
        Long[] ids = seedActiveCategoryAndUnit();
        productService.create(new CreateProductCommand("SKU-009", "EAN-100", "Crayones", null, ids[0], ids[1], BigDecimal.ONE));
        List<Product> results = productService.search("EAN-100");
        assertEquals(1, results.size());
    }
    @Test
    void shouldDeactivateProduct() {
        Long[] ids = seedActiveCategoryAndUnit();
        Product product = productService.create(new CreateProductCommand("SKU-010", null, "Goma", null, ids[0], ids[1], BigDecimal.ONE));
        productService.deactivate(product.id());
        Product disabled = productService.getById(product.id());
        assertFalse(disabled.active());
    }
    @Test
    void shouldPreventCreateWithInactiveCategory() {
        Category inactiveCategory = categoryRepository.save(new Category(
                null, "Inactiva", null, false, null, null, "system", "system"
        ));
        Unit activeUnit = unitRepository.save(new Unit(
                null, "UND", "Unidad", true, null, null, "system", "system"
        ));
        assertThrows(CatalogBusinessRuleException.class, () ->
                productService.create(new CreateProductCommand(
                        "SKU-011", null, "Pincel", null, inactiveCategory.id(), activeUnit.id(), BigDecimal.ONE
                ))
        );
    }
    @Test
    void shouldPreventCreateWithInactiveUnit() {
        Category activeCategory = categoryRepository.save(new Category(
                null, "Activa", null, true, null, null, "system", "system"
        ));
        Unit inactiveUnit = unitRepository.save(new Unit(
                null, "PKT", "Paquete", false, null, null, "system", "system"
        ));
        assertThrows(CatalogBusinessRuleException.class, () ->
                productService.create(new CreateProductCommand(
                        "SKU-012", null, "Pincel", null, activeCategory.id(), inactiveUnit.id(), BigDecimal.ONE
                ))
        );
    }
    private Long[] seedActiveCategoryAndUnit() {
        Category category = categoryRepository.save(new Category(
                null, "Utiles", null, true, null, null, "system", "system"
        ));
        Unit unit = unitRepository.save(new Unit(
                null, "UND", "Unidad", true, null, null, "system", "system"
        ));
        return new Long[]{category.id(), unit.id()};
    }
    static class InMemoryCategoryRepository implements CategoryRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, Category> storage = new HashMap<>();
        @Override
        public Category save(Category category) {
            Long id = category.id() == null ? sequence.getAndIncrement() : category.id();
            Instant now = Instant.now();
            Category stored = new Category(
                    id, category.name(), category.description(), category.active(),
                    category.createdAt() == null ? now : category.createdAt(),
                    now, category.createdBy(), category.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }
        @Override
        public boolean existsByNameIgnoreCase(String name) {
            return storage.values().stream().anyMatch(c -> c.name().equalsIgnoreCase(name));
        }
        @Override
        public List<Category> findAll() {
            return storage.values().stream().toList();
        }
        @Override
        public List<Category> findActive() {
            return storage.values().stream().filter(Category::active).toList();
        }
        @Override
        public Optional<Category> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }
    }
    static class InMemoryUnitRepository implements UnitRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, Unit> storage = new HashMap<>();
        @Override
        public Unit save(Unit unit) {
            Long id = unit.id() == null ? sequence.getAndIncrement() : unit.id();
            Instant now = Instant.now();
            Unit stored = new Unit(
                    id, unit.code(), unit.name(), unit.active(),
                    unit.createdAt() == null ? now : unit.createdAt(),
                    now, unit.createdBy(), unit.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }
        @Override
        public boolean existsByCodeIgnoreCase(String code) {
            return storage.values().stream().anyMatch(u -> u.code().equalsIgnoreCase(code));
        }
        @Override
        public List<Unit> findAll() {
            return storage.values().stream().toList();
        }
        @Override
        public Optional<Unit> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }
    }
    static class InMemoryProductRepository implements ProductRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, Product> storage = new HashMap<>();
        @Override
        public Product save(Product product) {
            Long id = product.id() == null ? sequence.getAndIncrement() : product.id();
            Instant now = Instant.now();
            Product stored = new Product(
                    id,
                    product.sku(),
                    product.barcode(),
                    product.name(),
                    product.description(),
                    product.categoryId(),
                    product.unitId(),
                    product.salePrice(),
                    product.active(),
                    product.createdAt() == null ? now : product.createdAt(),
                    now,
                    product.createdBy(),
                    product.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }
        @Override
        public Optional<Product> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }
        @Override
        public Page<Product> findAll(Pageable pageable) {
            return new PageImpl<>(storage.values().stream().toList(), pageable, storage.size());
        }
        @Override
        public List<Product> search(String query, int limit) {
            String normalized = query.toLowerCase(Locale.ROOT);
            return storage.values().stream()
                    .filter(p -> p.name().toLowerCase(Locale.ROOT).contains(normalized)
                            || p.sku().toLowerCase(Locale.ROOT).contains(normalized)
                            || (p.barcode() != null && p.barcode().toLowerCase(Locale.ROOT).contains(normalized)))
                    .limit(limit)
                    .toList();
        }
        @Override
        public boolean existsBySkuIgnoreCase(String sku) {
            return storage.values().stream().anyMatch(p -> p.sku().equalsIgnoreCase(sku));
        }
        @Override
        public boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id) {
            return storage.values().stream().anyMatch(p -> p.sku().equalsIgnoreCase(sku) && !p.id().equals(id));
        }
        @Override
        public boolean existsByBarcode(String barcode) {
            return storage.values().stream().anyMatch(p -> Objects.equals(p.barcode(), barcode));
        }
        @Override
        public boolean existsByBarcodeAndIdNot(String barcode, Long id) {
            return storage.values().stream().anyMatch(p -> Objects.equals(p.barcode(), barcode) && !p.id().equals(id));
        }
    }
}
