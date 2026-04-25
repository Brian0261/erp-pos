package com.erppos.backend.erp.purchases;

import com.erppos.backend.erp.purchases.adapter.rest.PurchaseOrderController;
import com.erppos.backend.erp.purchases.application.service.AuditUserProvider;
import com.erppos.backend.erp.purchases.application.service.PurchaseOrderApplicationService;
import com.erppos.backend.erp.purchases.application.service.SupplierApplicationService;
import com.erppos.backend.erp.purchases.application.usecase.CreatePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.application.usecase.CreateSupplierCommand;
import com.erppos.backend.erp.purchases.application.usecase.PurchaseOrderItemCommand;
import com.erppos.backend.erp.purchases.application.usecase.ReceivePurchaseItemCommand;
import com.erppos.backend.erp.purchases.application.usecase.ReceivePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.application.usecase.UpdateSupplierCommand;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseBusinessRuleException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseConflictException;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderItem;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;
import com.erppos.backend.erp.purchases.domain.model.PurchaseProductSnapshot;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceipt;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceiptItem;
import com.erppos.backend.erp.purchases.domain.model.PurchaseWarehouseSnapshot;
import com.erppos.backend.erp.purchases.domain.model.Supplier;
import com.erppos.backend.erp.purchases.domain.port.InventoryIngressPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseOrderRepositoryPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseProductReadPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseReceiptRepositoryPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseWarehouseReadPort;
import com.erppos.backend.erp.purchases.domain.port.SupplierRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class PurchasesApplicationServiceTest {

    private InMemorySupplierRepository supplierRepository;
    private InMemoryPurchaseOrderRepository purchaseOrderRepository;
    private InMemoryPurchaseReceiptRepository purchaseReceiptRepository;
    private InMemoryProductReadPort productReadPort;
    private InMemoryWarehouseReadPort warehouseReadPort;
    private InMemoryInventoryIngressPort inventoryIngressPort;

    private SupplierApplicationService supplierService;
    private PurchaseOrderApplicationService purchaseOrderService;

    @BeforeEach
    void setUp() {
        supplierRepository = new InMemorySupplierRepository();
        purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
        purchaseReceiptRepository = new InMemoryPurchaseReceiptRepository();
        productReadPort = new InMemoryProductReadPort();
        warehouseReadPort = new InMemoryWarehouseReadPort();
        inventoryIngressPort = new InMemoryInventoryIngressPort();

        AuditUserProvider auditUserProvider = new AuditUserProvider();
        supplierService = new SupplierApplicationService(supplierRepository, auditUserProvider);
        purchaseOrderService = new PurchaseOrderApplicationService(
                purchaseOrderRepository,
                purchaseReceiptRepository,
                supplierRepository,
                warehouseReadPort,
                productReadPort,
                inventoryIngressPort,
                auditUserProvider
        );

        productReadPort.save(new PurchaseProductSnapshot(1L, "Producto 1", true));
        productReadPort.save(new PurchaseProductSnapshot(2L, "Producto 2", true));
        warehouseReadPort.save(new PurchaseWarehouseSnapshot(1L, "Almacen 1", true));
    }

    @Test
    void shouldCreateSupplierSuccessfully() {
        Supplier supplier = supplierService.create(new CreateSupplierCommand("20600011111", "Proveedor Uno", null, null, null, null));
        assertNotNull(supplier.id());
        assertTrue(supplier.active());
    }

    @Test
    void shouldRejectDuplicatedSupplierDocumentNumber() {
        supplierService.create(new CreateSupplierCommand("20600011111", "Proveedor Uno", null, null, null, null));
        assertThrows(PurchaseConflictException.class,
                () -> supplierService.create(new CreateSupplierCommand("20600011111", "Proveedor Dos", null, null, null, null)));
    }

    @Test
    void shouldCreateDraftOrderSuccessfully() {
        Long supplierId = seedSupplier();
        PurchaseOrder order = purchaseOrderService.create(new CreatePurchaseOrderCommand(
                supplierId,
                1L,
                LocalDate.now(),
                LocalDate.now().plusDays(2),
                "OC inicial",
                List.of(new PurchaseOrderItemCommand(1L, BigDecimal.TEN, BigDecimal.valueOf(2.5)))
        ));

        assertNotNull(order.id());
        assertEquals(PurchaseOrderStatus.DRAFT, order.status());
        assertEquals(0, order.totalAmount().compareTo(BigDecimal.valueOf(25.0)));
    }

    @Test
    void shouldRejectOrderWithoutItems() {
        Long supplierId = seedSupplier();
        assertThrows(PurchaseBusinessRuleException.class, () ->
                purchaseOrderService.create(new CreatePurchaseOrderCommand(
                        supplierId,
                        1L,
                        LocalDate.now(),
                        null,
                        null,
                        List.of()
                ))
        );
    }

    @Test
    void shouldApproveDraftOrder() {
        PurchaseOrder order = createDraftOrder();
        PurchaseOrder approved = purchaseOrderService.approve(order.id());
        assertEquals(PurchaseOrderStatus.APPROVED, approved.status());
    }

    @Test
    void shouldRejectApproveAlreadyApprovedOrder() {
        PurchaseOrder order = purchaseOrderService.approve(createDraftOrder().id());
        assertThrows(PurchaseConflictException.class, () -> purchaseOrderService.approve(order.id()));
    }

    @Test
    void shouldIncreaseStockOnTotalReception() {
        PurchaseOrder approved = purchaseOrderService.approve(createDraftOrder().id());
        PurchaseOrderItem item = approved.items().get(0);

        PurchaseOrder received = purchaseOrderService.receive(approved.id(), new ReceivePurchaseOrderCommand(
                LocalDate.now(),
                "Recepcion total",
                List.of(new ReceivePurchaseItemCommand(item.id(), item.quantityOrdered()))
        ));

        assertEquals(PurchaseOrderStatus.RECEIVED, received.status());
        assertEquals(0, inventoryIngressPort.stockFor(item.productId(), approved.warehouseId()).compareTo(item.quantityOrdered()));
    }

    @Test
    void shouldKeepPartiallyReceivedStatusOnPartialReception() {
        PurchaseOrder approved = purchaseOrderService.approve(createDraftOrder().id());
        PurchaseOrderItem item = approved.items().get(0);

        PurchaseOrder partial = purchaseOrderService.receive(approved.id(), new ReceivePurchaseOrderCommand(
                LocalDate.now(),
                "Recepcion parcial",
                List.of(new ReceivePurchaseItemCommand(item.id(), BigDecimal.valueOf(4)))
        ));

        assertEquals(PurchaseOrderStatus.PARTIALLY_RECEIVED, partial.status());
    }

    @Test
    void shouldFailWhenReceptionExceedsPending() {
        PurchaseOrder approved = purchaseOrderService.approve(createDraftOrder().id());
        PurchaseOrderItem item = approved.items().get(0);

        assertThrows(PurchaseBusinessRuleException.class, () ->
                purchaseOrderService.receive(approved.id(), new ReceivePurchaseOrderCommand(
                        LocalDate.now(),
                        "Recepcion invalida",
                        List.of(new ReceivePurchaseItemCommand(item.id(), item.quantityOrdered().add(BigDecimal.ONE)))
                ))
        );
    }

    @Test
    void shouldCreateInventoryMovementOnReception() {
        PurchaseOrder approved = purchaseOrderService.approve(createDraftOrder().id());
        PurchaseOrderItem item = approved.items().get(0);

        purchaseOrderService.receive(approved.id(), new ReceivePurchaseOrderCommand(
                LocalDate.now(),
                "Recepcion",
                List.of(new ReceivePurchaseItemCommand(item.id(), BigDecimal.valueOf(3)))
        ));

        assertEquals(1, inventoryIngressPort.movements.size());
        InMemoryInventoryIngressPort.Movement movement = inventoryIngressPort.movements.get(0);
        assertEquals(item.productId(), movement.productId());
        assertEquals(approved.warehouseId(), movement.warehouseId());
        assertEquals(0, movement.quantity().compareTo(BigDecimal.valueOf(3)));
    }

    @Test
    void shouldCancelDraftOrder() {
        PurchaseOrder draft = createDraftOrder();
        PurchaseOrder cancelled = purchaseOrderService.cancel(draft.id());
        assertEquals(PurchaseOrderStatus.CANCELLED, cancelled.status());
    }

    @Test
    void shouldRejectCancelOrderWithReceipt() {
        PurchaseOrder approved = purchaseOrderService.approve(createDraftOrder().id());
        PurchaseOrderItem item = approved.items().get(0);
        purchaseOrderService.receive(approved.id(), new ReceivePurchaseOrderCommand(
                LocalDate.now(),
                "Recepcion parcial",
                List.of(new ReceivePurchaseItemCommand(item.id(), BigDecimal.valueOf(2)))
        ));

        assertThrows(PurchaseConflictException.class, () -> purchaseOrderService.cancel(approved.id()));
    }

    @Test
    void shouldConfigureControllerToForbidCajeroForCreatePurchase() throws NoSuchMethodException {
        Method method = PurchaseOrderController.class.getMethod("create", com.erppos.backend.erp.purchases.adapter.dto.PurchaseOrderCreateRequest.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("ADMIN"));
        assertTrue(preAuthorize.value().contains("ALMACENERO"));
        assertFalse(preAuthorize.value().contains("CAJERO"));
    }

    private PurchaseOrder createDraftOrder() {
        Long supplierId = seedSupplier();
        return purchaseOrderService.create(new CreatePurchaseOrderCommand(
                supplierId,
                1L,
                LocalDate.now(),
                LocalDate.now().plusDays(2),
                "OC test",
                List.of(new PurchaseOrderItemCommand(1L, BigDecimal.TEN, BigDecimal.valueOf(2)))
        ));
    }

    private Long seedSupplier() {
        return supplierService.create(new CreateSupplierCommand("", "Proveedor Demo", null, null, null, null)).id();
    }

    static class InMemorySupplierRepository implements SupplierRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, Supplier> storage = new HashMap<>();

        @Override
        public Supplier save(Supplier supplier) {
            Long id = supplier.id() == null ? sequence.getAndIncrement() : supplier.id();
            Instant now = Instant.now();
            Supplier stored = new Supplier(
                    id,
                    supplier.documentNumber(),
                    supplier.name(),
                    supplier.contactName(),
                    supplier.phone(),
                    supplier.email(),
                    supplier.address(),
                    supplier.active(),
                    supplier.createdAt() == null ? now : supplier.createdAt(),
                    now,
                    supplier.createdBy(),
                    supplier.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<Supplier> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<Supplier> findAll(String query) {
            String q = query == null ? "" : query.toLowerCase();
            return storage.values().stream().filter(s ->
                    q.isBlank()
                            || s.name().toLowerCase().contains(q)
                            || (s.documentNumber() != null && s.documentNumber().toLowerCase().contains(q))
            ).toList();
        }

        @Override
        public boolean existsByDocumentNumber(String documentNumber) {
            return storage.values().stream().anyMatch(s -> Objects.equals(s.documentNumber(), documentNumber));
        }

        @Override
        public boolean existsByDocumentNumberAndIdNot(String documentNumber, Long id) {
            return storage.values().stream().anyMatch(s -> Objects.equals(s.documentNumber(), documentNumber) && !s.id().equals(id));
        }
    }

    static class InMemoryPurchaseOrderRepository implements PurchaseOrderRepositoryPort {
        private final AtomicLong orderSequence = new AtomicLong(1);
        private final AtomicLong itemSequence = new AtomicLong(1);
        private final Map<Long, PurchaseOrder> storage = new HashMap<>();

        @Override
        public PurchaseOrder save(PurchaseOrder purchaseOrder) {
            Long orderId = purchaseOrder.id() == null ? orderSequence.getAndIncrement() : purchaseOrder.id();
            List<PurchaseOrderItem> items = new ArrayList<>();
            for (PurchaseOrderItem item : purchaseOrder.items()) {
                Long itemId = item.id() == null ? itemSequence.getAndIncrement() : item.id();
                items.add(new PurchaseOrderItem(
                        itemId,
                        orderId,
                        item.productId(),
                        item.quantityOrdered(),
                        item.quantityReceived(),
                        item.unitCost(),
                        item.lineTotal()
                ));
            }

            Instant now = Instant.now();
            PurchaseOrder stored = new PurchaseOrder(
                    orderId,
                    purchaseOrder.supplierId(),
                    purchaseOrder.warehouseId(),
                    purchaseOrder.status(),
                    purchaseOrder.orderDate(),
                    purchaseOrder.expectedDate(),
                    purchaseOrder.totalAmount(),
                    purchaseOrder.notes(),
                    purchaseOrder.createdAt() == null ? now : purchaseOrder.createdAt(),
                    now,
                    purchaseOrder.createdBy(),
                    purchaseOrder.updatedBy(),
                    items
            );
            storage.put(orderId, stored);
            return stored;
        }

        @Override
        public Optional<PurchaseOrder> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<PurchaseOrder> findByFilters(PurchaseOrderStatus status, Long supplierId, LocalDate from, LocalDate to) {
            return storage.values().stream()
                    .filter(po -> status == null || po.status() == status)
                    .filter(po -> supplierId == null || Objects.equals(po.supplierId(), supplierId))
                    .filter(po -> from == null || !po.orderDate().isBefore(from))
                    .filter(po -> to == null || !po.orderDate().isAfter(to))
                    .toList();
        }
    }

    static class InMemoryPurchaseReceiptRepository implements PurchaseReceiptRepositoryPort {
        private final AtomicLong receiptSequence = new AtomicLong(1);
        private final AtomicLong receiptItemSequence = new AtomicLong(1);
        private final Map<Long, List<PurchaseReceipt>> receiptsByOrder = new HashMap<>();

        @Override
        public PurchaseReceipt save(PurchaseReceipt purchaseReceipt) {
            Long receiptId = receiptSequence.getAndIncrement();
            List<PurchaseReceiptItem> items = purchaseReceipt.items().stream()
                    .map(i -> new PurchaseReceiptItem(receiptItemSequence.getAndIncrement(), receiptId, i.purchaseOrderItemId(), i.productId(), i.quantityReceived()))
                    .toList();
            PurchaseReceipt stored = new PurchaseReceipt(
                    receiptId,
                    purchaseReceipt.purchaseOrderId(),
                    purchaseReceipt.receiptDate(),
                    purchaseReceipt.notes(),
                    Instant.now(),
                    purchaseReceipt.createdBy(),
                    items
            );
            receiptsByOrder.computeIfAbsent(purchaseReceipt.purchaseOrderId(), key -> new ArrayList<>()).add(stored);
            return stored;
        }

        @Override
        public boolean existsByPurchaseOrderId(Long purchaseOrderId) {
            return receiptsByOrder.containsKey(purchaseOrderId) && !receiptsByOrder.get(purchaseOrderId).isEmpty();
        }
    }

    static class InMemoryProductReadPort implements PurchaseProductReadPort {
        private final Map<Long, PurchaseProductSnapshot> products = new HashMap<>();

        void save(PurchaseProductSnapshot product) {
            products.put(product.id(), product);
        }

        @Override
        public Optional<PurchaseProductSnapshot> findById(Long productId) {
            return Optional.ofNullable(products.get(productId));
        }
    }

    static class InMemoryWarehouseReadPort implements PurchaseWarehouseReadPort {
        private final Map<Long, PurchaseWarehouseSnapshot> warehouses = new HashMap<>();

        void save(PurchaseWarehouseSnapshot warehouse) {
            warehouses.put(warehouse.id(), warehouse);
        }

        @Override
        public Optional<PurchaseWarehouseSnapshot> findById(Long warehouseId) {
            return Optional.ofNullable(warehouses.get(warehouseId));
        }
    }

    static class InMemoryInventoryIngressPort implements InventoryIngressPort {
        record Movement(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
        }

        final List<Movement> movements = new ArrayList<>();
        final Map<String, BigDecimal> stockBalances = new HashMap<>();

        @Override
        public void registerPurchaseIn(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
            movements.add(new Movement(productId, warehouseId, quantity, reason, referenceType, referenceId));
            String key = key(productId, warehouseId);
            stockBalances.merge(key, quantity, BigDecimal::add);
        }

        BigDecimal stockFor(Long productId, Long warehouseId) {
            return stockBalances.getOrDefault(key(productId, warehouseId), BigDecimal.ZERO);
        }

        private String key(Long productId, Long warehouseId) {
            return productId + "-" + warehouseId;
        }
    }
}

