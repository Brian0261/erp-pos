package com.erppos.backend.erp.inventory;

import com.erppos.backend.erp.inventory.application.service.AuditUserProvider;
import com.erppos.backend.erp.inventory.application.service.InventoryApplicationService;
import com.erppos.backend.erp.inventory.application.service.WarehouseApplicationService;
import com.erppos.backend.erp.inventory.application.usecase.CreateWarehouseCommand;
import com.erppos.backend.erp.inventory.application.usecase.RegisterAdjustmentCommand;
import com.erppos.backend.erp.inventory.application.usecase.RegisterInitialStockCommand;
import com.erppos.backend.erp.inventory.application.usecase.TransferStockCommand;
import com.erppos.backend.erp.inventory.application.usecase.TransferStockItemCommand;
import com.erppos.backend.erp.inventory.domain.exception.InventoryBusinessRuleException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryConflictException;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovementType;
import com.erppos.backend.erp.inventory.domain.model.InventoryProductSnapshot;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import com.erppos.backend.erp.inventory.domain.model.StockTransferItem;
import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.inventory.domain.model.WarehouseType;
import com.erppos.backend.erp.inventory.domain.port.InventoryMovementRepositoryPort;
import com.erppos.backend.erp.inventory.domain.port.InventoryProductReadPort;
import com.erppos.backend.erp.inventory.domain.port.StockBalanceRepositoryPort;
import com.erppos.backend.erp.inventory.domain.port.StockTransferRepositoryPort;
import com.erppos.backend.erp.inventory.domain.port.WarehouseRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class InventoryApplicationServiceTest {

    private InMemoryWarehouseRepository warehouseRepository;
    private InMemoryStockBalanceRepository stockBalanceRepository;
    private InMemoryInventoryMovementRepository movementRepository;
    private InMemoryStockTransferRepository transferRepository;
    private InMemoryProductReadPort productReadPort;
    private WarehouseApplicationService warehouseService;
    private InventoryApplicationService inventoryService;

    @BeforeEach
    void setUp() {
        warehouseRepository = new InMemoryWarehouseRepository();
        stockBalanceRepository = new InMemoryStockBalanceRepository();
        movementRepository = new InMemoryInventoryMovementRepository();
        transferRepository = new InMemoryStockTransferRepository();
        productReadPort = new InMemoryProductReadPort();

        AuditUserProvider auditUserProvider = new AuditUserProvider();
        warehouseService = new WarehouseApplicationService(warehouseRepository, auditUserProvider);
        inventoryService = new InventoryApplicationService(
                stockBalanceRepository,
                movementRepository,
                warehouseRepository,
                productReadPort,
                transferRepository,
                auditUserProvider
        );
    }

    @Test
    void shouldCreateWarehouseSuccessfully() {
        Warehouse warehouse = warehouseService.create(new CreateWarehouseCommand("WH-01", "Almacen Principal", WarehouseType.MAIN_WAREHOUSE));
        assertNotNull(warehouse.id());
        assertEquals("WH-01", warehouse.code());
        assertTrue(warehouse.active());
    }

    @Test
    void shouldRejectDuplicatedWarehouseCode() {
        warehouseService.create(new CreateWarehouseCommand("WH-01", "Almacen Principal", WarehouseType.MAIN_WAREHOUSE));
        assertThrows(InventoryConflictException.class,
                () -> warehouseService.create(new CreateWarehouseCommand("wh-01", "Otro", WarehouseType.STORE)));
    }

    @Test
    void shouldRegisterInitialStockSuccessfully() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");

        InventoryMovement movement = inventoryService.registerInitialStock(new RegisterInitialStockCommand(
                productId,
                warehouseId,
                BigDecimal.TEN,
                "Carga inicial"
        ));

        assertEquals(InventoryMovementType.INITIAL_STOCK, movement.movementType());
        assertEquals(0, movement.previousStock().compareTo(BigDecimal.ZERO));
        assertEquals(0, movement.newStock().compareTo(BigDecimal.TEN));
    }

    @Test
    void shouldRejectSecondInitialStockForSameProductAndWarehouse() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");
        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, warehouseId, BigDecimal.ONE, "Carga inicial"));

        assertThrows(InventoryBusinessRuleException.class,
                () -> inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, warehouseId, BigDecimal.ONE, "Reintento")));
    }

    @Test
    void shouldQueryStockByProductAndWarehouse() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");
        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, warehouseId, BigDecimal.valueOf(15), "Carga inicial"));

        Page<StockBalance> page = inventoryService.listStocks(productId, warehouseId, Pageable.unpaged());
        assertEquals(1, page.getTotalElements());
        assertEquals(0, page.getContent().get(0).quantity().compareTo(BigDecimal.valueOf(15)));
    }

    @Test
    void shouldIncreaseStockWithPositiveAdjustment() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");
        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, warehouseId, BigDecimal.TEN, "Carga inicial"));

        InventoryMovement movement = inventoryService.registerAdjustment(new RegisterAdjustmentCommand(
                productId,
                warehouseId,
                BigDecimal.valueOf(5),
                true,
                "Ajuste positivo"
        ));

        assertEquals(InventoryMovementType.ADJUSTMENT_IN, movement.movementType());
        assertEquals(0, movement.newStock().compareTo(BigDecimal.valueOf(15)));
    }

    @Test
    void shouldDecreaseStockWithNegativeAdjustment() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");
        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, warehouseId, BigDecimal.TEN, "Carga inicial"));

        InventoryMovement movement = inventoryService.registerAdjustment(new RegisterAdjustmentCommand(
                productId,
                warehouseId,
                BigDecimal.valueOf(4),
                false,
                "Ajuste negativo"
        ));

        assertEquals(InventoryMovementType.ADJUSTMENT_OUT, movement.movementType());
        assertEquals(0, movement.newStock().compareTo(BigDecimal.valueOf(6)));
    }

    @Test
    void shouldNotAllowNegativeStockWithAdjustmentOut() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");

        assertThrows(InventoryBusinessRuleException.class,
                () -> inventoryService.registerAdjustment(new RegisterAdjustmentCommand(
                        productId,
                        warehouseId,
                        BigDecimal.ONE,
                        false,
                        "Ajuste invalido"
                )));
    }

    @Test
    void shouldTransferStockSuccessfully() {
        Long sourceWarehouseId = seedWarehouse("WH-A");
        Long targetWarehouseId = seedWarehouse("WH-B");
        Long productId = seedActiveProduct("SKU-1");
        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, sourceWarehouseId, BigDecimal.TEN, "Carga inicial"));

        StockTransfer transfer = inventoryService.transfer(new TransferStockCommand(
                sourceWarehouseId,
                targetWarehouseId,
                "Transferencia interna",
                List.of(new TransferStockItemCommand(productId, BigDecimal.valueOf(3)))
        ));

        assertNotNull(transfer.id());
        assertEquals("COMPLETED", transfer.status());

        StockBalance source = inventoryService.listStocks(productId, sourceWarehouseId, Pageable.unpaged()).getContent().get(0);
        StockBalance target = inventoryService.listStocks(productId, targetWarehouseId, Pageable.unpaged()).getContent().get(0);
        assertEquals(0, source.quantity().compareTo(BigDecimal.valueOf(7)));
        assertEquals(0, target.quantity().compareTo(BigDecimal.valueOf(3)));
    }

    @Test
    void shouldFailTransferWhenInsufficientStock() {
        Long sourceWarehouseId = seedWarehouse("WH-A");
        Long targetWarehouseId = seedWarehouse("WH-B");
        Long productId = seedActiveProduct("SKU-1");
        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, sourceWarehouseId, BigDecimal.ONE, "Carga inicial"));

        assertThrows(InventoryConflictException.class,
                () -> inventoryService.transfer(new TransferStockCommand(
                        sourceWarehouseId,
                        targetWarehouseId,
                        "Transferencia interna",
                        List.of(new TransferStockItemCommand(productId, BigDecimal.valueOf(3)))
                )));
    }

    @Test
    void shouldFailTransferWhenSourceAndTargetAreEqual() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");

        assertThrows(InventoryBusinessRuleException.class,
                () -> inventoryService.transfer(new TransferStockCommand(
                        warehouseId,
                        warehouseId,
                        "Transferencia invalida",
                        List.of(new TransferStockItemCommand(productId, BigDecimal.ONE))
                )));
    }

    @Test
    void shouldRegisterKardexWithPreviousAndNewStock() {
        Long warehouseId = seedWarehouse("WH-A");
        Long productId = seedActiveProduct("SKU-1");

        inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, warehouseId, BigDecimal.TEN, "Carga inicial"));
        inventoryService.registerAdjustment(new RegisterAdjustmentCommand(productId, warehouseId, BigDecimal.valueOf(2), false, "Salida"));

        List<InventoryMovement> kardex = inventoryService.kardex(productId, warehouseId, LocalDate.now(ZoneOffset.UTC).minusDays(1), LocalDate.now(ZoneOffset.UTC).plusDays(1));

        assertEquals(2, kardex.size());
        InventoryMovement lastMovement = kardex.stream()
                .filter(m -> m.movementType() == InventoryMovementType.ADJUSTMENT_OUT)
                .findFirst()
                .orElseThrow();
        assertEquals(0, lastMovement.previousStock().compareTo(BigDecimal.TEN));
        assertEquals(0, lastMovement.newStock().compareTo(BigDecimal.valueOf(8)));
    }

    @Test
    void shouldPreventCreateInitialStockWithInactiveWarehouse() {
        Warehouse inactive = warehouseRepository.save(new Warehouse(
                null, "WH-I", "Inactivo", WarehouseType.STORE, false, null, null, "system", "system"
        ));
        Long productId = seedActiveProduct("SKU-1");

        assertThrows(InventoryBusinessRuleException.class,
                () -> inventoryService.registerInitialStock(new RegisterInitialStockCommand(productId, inactive.id(), BigDecimal.ONE, "Carga")));
    }

    private Long seedWarehouse(String code) {
        return warehouseService.create(new CreateWarehouseCommand(code, "Warehouse " + code, WarehouseType.MAIN_WAREHOUSE)).id();
    }

    private Long seedActiveProduct(String sku) {
        return productReadPort.save(new InventoryProductSnapshot(null, "Product " + sku, true)).id();
    }

    static class InMemoryWarehouseRepository implements WarehouseRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, Warehouse> storage = new HashMap<>();

        @Override
        public Warehouse save(Warehouse warehouse) {
            Long id = warehouse.id() == null ? sequence.getAndIncrement() : warehouse.id();
            Instant now = Instant.now();
            Warehouse stored = new Warehouse(
                    id,
                    warehouse.code(),
                    warehouse.name(),
                    warehouse.type(),
                    warehouse.active(),
                    warehouse.createdAt() == null ? now : warehouse.createdAt(),
                    now,
                    warehouse.createdBy(),
                    warehouse.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public boolean existsByCodeIgnoreCase(String code) {
            return storage.values().stream().anyMatch(w -> w.code().equalsIgnoreCase(code));
        }

        @Override
        public List<Warehouse> findAll() {
            return storage.values().stream().toList();
        }

        @Override
        public List<Warehouse> findActive() {
            return storage.values().stream().filter(Warehouse::active).toList();
        }

        @Override
        public Optional<Warehouse> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }
    }

    static class InMemoryStockBalanceRepository implements StockBalanceRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, StockBalance> storage = new HashMap<>();

        @Override
        public StockBalance save(StockBalance stockBalance) {
            Long id = stockBalance.id() == null ? sequence.getAndIncrement() : stockBalance.id();
            Instant now = Instant.now();
            StockBalance stored = new StockBalance(
                    id,
                    stockBalance.productId(),
                    stockBalance.warehouseId(),
                    stockBalance.quantity(),
                    stockBalance.version() == null ? 0L : stockBalance.version() + 1,
                    stockBalance.createdAt() == null ? now : stockBalance.createdAt(),
                    now
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<StockBalance> findByProductIdAndWarehouseId(Long productId, Long warehouseId) {
            return storage.values().stream()
                    .filter(s -> Objects.equals(s.productId(), productId) && Objects.equals(s.warehouseId(), warehouseId))
                    .findFirst();
        }

        @Override
        public Optional<StockBalance> findByProductIdAndWarehouseIdForUpdate(Long productId, Long warehouseId) {
            return findByProductIdAndWarehouseId(productId, warehouseId);
        }

        @Override
        public Page<StockBalance> findByFilters(Long productId, Long warehouseId, Pageable pageable) {
            List<StockBalance> results = storage.values().stream()
                    .filter(s -> productId == null || Objects.equals(s.productId(), productId))
                    .filter(s -> warehouseId == null || Objects.equals(s.warehouseId(), warehouseId))
                    .toList();
            return new PageImpl<>(results, pageable, results.size());
        }
    }

    static class InMemoryInventoryMovementRepository implements InventoryMovementRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, InventoryMovement> storage = new HashMap<>();

        @Override
        public InventoryMovement save(InventoryMovement movement) {
            Long id = movement.id() == null ? sequence.getAndIncrement() : movement.id();
            InventoryMovement stored = new InventoryMovement(
                    id,
                    movement.productId(),
                    movement.warehouseId(),
                    movement.movementType(),
                    movement.quantity(),
                    movement.previousStock(),
                    movement.newStock(),
                    movement.reason(),
                    movement.referenceType(),
                    movement.referenceId(),
                    movement.createdAt() == null ? Instant.now() : movement.createdAt(),
                    movement.createdBy()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId) {
            return storage.values().stream()
                    .anyMatch(m -> Objects.equals(m.productId(), productId) && Objects.equals(m.warehouseId(), warehouseId));
        }

        @Override
        public List<InventoryMovement> findKardex(Long productId, Long warehouseId, Instant fromInclusive, Instant toExclusive) {
            return storage.values().stream()
                    .filter(m -> productId == null || Objects.equals(m.productId(), productId))
                    .filter(m -> warehouseId == null || Objects.equals(m.warehouseId(), warehouseId))
                    .filter(m -> fromInclusive == null || !m.createdAt().isBefore(fromInclusive))
                    .filter(m -> toExclusive == null || m.createdAt().isBefore(toExclusive))
                    .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
                    .toList();
        }
    }

    static class InMemoryStockTransferRepository implements StockTransferRepositoryPort {
        private final AtomicLong transferSequence = new AtomicLong(1);
        private final AtomicLong itemSequence = new AtomicLong(1);
        private final Map<Long, StockTransfer> transferStorage = new HashMap<>();
        private final List<StockTransferItem> itemStorage = new ArrayList<>();

        @Override
        public StockTransfer saveTransfer(StockTransfer transfer) {
            Long id = transfer.id() == null ? transferSequence.getAndIncrement() : transfer.id();
            StockTransfer stored = new StockTransfer(
                    id,
                    transfer.sourceWarehouseId(),
                    transfer.targetWarehouseId(),
                    transfer.status(),
                    transfer.reason(),
                    transfer.createdAt() == null ? Instant.now() : transfer.createdAt(),
                    transfer.createdBy()
            );
            transferStorage.put(id, stored);
            return stored;
        }

        @Override
        public void saveItems(List<StockTransferItem> items) {
            for (StockTransferItem item : items) {
                itemStorage.add(new StockTransferItem(
                        item.id() == null ? itemSequence.getAndIncrement() : item.id(),
                        item.transferId(),
                        item.productId(),
                        item.quantity()
                ));
            }
        }
    }

    static class InMemoryProductReadPort implements InventoryProductReadPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, InventoryProductSnapshot> storage = new HashMap<>();

        InventoryProductSnapshot save(InventoryProductSnapshot product) {
            Long id = product.id() == null ? sequence.getAndIncrement() : product.id();
            InventoryProductSnapshot stored = new InventoryProductSnapshot(id, product.name(), product.active());
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<InventoryProductSnapshot> findById(Long productId) {
            return Optional.ofNullable(storage.get(productId));
        }
    }
}

