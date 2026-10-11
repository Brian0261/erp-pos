package com.erppos.backend.erp.sales;

import com.erppos.backend.erp.sales.adapter.rest.SalesController;
import com.erppos.backend.erp.sales.application.service.AuditUserProvider;
import com.erppos.backend.erp.sales.application.service.CashRegisterApplicationService;
import com.erppos.backend.erp.sales.application.service.SalesApplicationService;
import com.erppos.backend.erp.sales.application.usecase.CloseCashRegisterCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleItemCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSalePaymentCommand;
import com.erppos.backend.erp.sales.application.usecase.OpenCashRegisterCommand;
import com.erppos.backend.erp.sales.application.usecase.SalesListItemResult;
import com.erppos.backend.erp.sales.application.usecase.VoidSaleCommand;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;
import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import com.erppos.backend.erp.sales.domain.model.PaymentMethod;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleBillingSummary;
import com.erppos.backend.erp.sales.domain.model.SaleItem;
import com.erppos.backend.erp.sales.domain.model.SalePayment;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import com.erppos.backend.erp.sales.domain.port.CashRegisterRepositoryPort;
import com.erppos.backend.erp.sales.domain.port.CatalogReadPort;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import com.erppos.backend.erp.sales.domain.port.SaleRepositoryPort;
import com.erppos.backend.erp.sales.domain.port.SalesBillingSummaryReadPort;
import com.erppos.backend.erp.sales.domain.port.WarehouseReadPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import org.springframework.dao.DataIntegrityViolationException;
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
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class SalesApplicationServiceTest {

    private InMemoryCashRegisterRepository cashRepo;
    private InMemorySaleRepository saleRepo;
    private InMemoryCatalogReadPort catalogReadPort;
    private InMemoryWarehouseReadPort warehouseReadPort;
    private InMemoryInventorySalesPort inventoryPort;
    private InMemorySalesBillingSummaryReadPort salesBillingSummaryReadPort;
    private TestAuditUserProvider auditUserProvider;

    private CashRegisterApplicationService cashService;
    private SalesApplicationService salesService;

    @BeforeEach
    void setUp() {
        saleRepo = new InMemorySaleRepository();
        cashRepo = new InMemoryCashRegisterRepository();
        cashRepo.sales = saleRepo;
        catalogReadPort = new InMemoryCatalogReadPort();
        warehouseReadPort = new InMemoryWarehouseReadPort();
        inventoryPort = new InMemoryInventorySalesPort();
        salesBillingSummaryReadPort = new InMemorySalesBillingSummaryReadPort();

        auditUserProvider = new TestAuditUserProvider();
        cashService = new CashRegisterApplicationService(cashRepo, auditUserProvider);
        salesService = new SalesApplicationService(saleRepo, cashRepo, catalogReadPort, warehouseReadPort, inventoryPort, salesBillingSummaryReadPort, auditUserProvider);

        warehouseReadPort.activeWarehouses.put(1L, true);
        catalogReadPort.products.put(1L, new PosProductSnapshot(1L, "SKU-1", "EAN-1", "Producto 1", BigDecimal.valueOf(5), true));
        inventoryPort.stockByProductWarehouse.put(key(1L, 1L), BigDecimal.valueOf(20));
    }

    @Test
    void shouldOpenCashRegisterSuccessfully() {
        CashRegisterSession opened = cashService.open(new OpenCashRegisterCommand(BigDecimal.TEN, "Inicio"));
        assertNotNull(opened.id());
        assertEquals(CashRegisterStatus.OPEN, opened.status());
    }

    @Test
    void shouldRejectSecondOpenCashRegisterForSameUser() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        assertThrows(SalesConflictException.class, () -> cashService.open(new OpenCashRegisterCommand(BigDecimal.ONE, null)));
    }

    @Test
    void shouldAllowOpenCashRegisterForDifferentUsers() {
        auditUserProvider.setCurrentUserId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        CashRegisterSession first = cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));

        auditUserProvider.setCurrentUserId(UUID.fromString("00000000-0000-0000-0000-000000000002"));
        CashRegisterSession second = cashService.open(new OpenCashRegisterCommand(BigDecimal.ONE, null));

        assertNotNull(first.id());
        assertNotNull(second.id());
        assertNotEquals(first.id(), second.id());
    }

    @Test
    void shouldAllowReopenCashRegisterAfterCloseForSameUser() {
        CashRegisterSession opened = cashService.open(new OpenCashRegisterCommand(BigDecimal.TEN, null));
        CashRegisterSession closed = cashService.close(opened.id(), new CloseCashRegisterCommand(BigDecimal.TEN, null));
        CashRegisterSession reopened = cashService.open(new OpenCashRegisterCommand(BigDecimal.ONE, "Reapertura"));

        assertEquals(CashRegisterStatus.CLOSED, closed.status());
        assertEquals(CashRegisterStatus.OPEN, reopened.status());
        assertNotEquals(opened.id(), reopened.id());
    }

    @Test
    void shouldTranslateDbUniqueViolationToSalesConflictWhenOpeningCashRegister() {
        cashRepo.failNextOpenSaveWithUniqueViolation();

        SalesConflictException exception = assertThrows(SalesConflictException.class,
                () -> cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null)));

        assertEquals("El usuario ya tiene una caja abierta.", exception.getMessage());
    }

    @Test
    void shouldCloseCashRegisterSuccessfully() {
        CashRegisterSession opened = cashService.open(new OpenCashRegisterCommand(BigDecimal.TEN, null));
        CashRegisterSession closed = cashService.close(opened.id(), new CloseCashRegisterCommand(BigDecimal.TEN, "Cierre"));
        assertEquals(CashRegisterStatus.CLOSED, closed.status());
    }

    @Test
    void shouldRejectCloseAlreadyClosedCashRegister() {
        CashRegisterSession opened = cashService.open(new OpenCashRegisterCommand(BigDecimal.TEN, null));
        cashService.close(opened.id(), new CloseCashRegisterCommand(BigDecimal.TEN, null));
        assertThrows(SalesConflictException.class,
                () -> cashService.close(opened.id(), new CloseCashRegisterCommand(BigDecimal.TEN, null)));
    }

    @Test
    void shouldCreateSaleSuccessfully() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        assertNotNull(sale.id());
        assertEquals(SaleStatus.COMPLETED, sale.status());
    }

    @Test
    void shouldRejectSaleWithoutOpenCashRegister() {
        assertThrows(SalesConflictException.class, () -> salesService.create(validSaleCommand()));
    }

    @Test
    void shouldRejectSaleWithoutItems() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        CreateSaleCommand command = new CreateSaleCommand(1L, List.of(), validPayments());
        assertThrows(SalesBusinessRuleException.class, () -> salesService.create(command));
    }

    @Test
    void shouldRejectSaleWithInsufficientStock() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        inventoryPort.stockByProductWarehouse.put(key(1L, 1L), BigDecimal.ONE);
        CreateSaleCommand command = new CreateSaleCommand(
                1L,
                List.of(new CreateSaleItemCommand(1L, BigDecimal.TEN, BigDecimal.ZERO)),
                validPayments()
        );
        assertThrows(SalesConflictException.class, () -> salesService.create(command));
    }

    @Test
    void shouldDiscountStockOnSale() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        salesService.create(validSaleCommand());
        assertEquals(0, inventoryPort.stockByProductWarehouse.get(key(1L, 1L)).compareTo(BigDecimal.valueOf(18)));
    }

    @Test
    void shouldCreateSaleOutMovement() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        salesService.create(validSaleCommand());
        assertEquals(1, inventoryPort.saleOutMovements);
    }

    @Test
    void shouldCalculateChangeForCashPayment() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(new CreateSaleCommand(
                1L,
                List.of(new CreateSaleItemCommand(1L, BigDecimal.valueOf(2), BigDecimal.ZERO)),
                List.of(new CreateSalePaymentCommand(PaymentMethod.CASH, BigDecimal.valueOf(15), null))
        ));
        assertEquals(0, sale.changeAmount().compareTo(BigDecimal.valueOf(5)));
    }

    @Test
    void shouldFailWhenPaymentIsIncomplete() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        CreateSaleCommand command = new CreateSaleCommand(
                1L,
                List.of(new CreateSaleItemCommand(1L, BigDecimal.valueOf(2), BigDecimal.ZERO)),
                List.of(new CreateSalePaymentCommand(PaymentMethod.CASH, BigDecimal.valueOf(5), null))
        );
        assertThrows(SalesBusinessRuleException.class, () -> salesService.create(command));
    }

    static Stream<Arguments> paymentScenarios() {
        return Stream.of(
                Arguments.of("A", List.of(payment(PaymentMethod.CASH, 100)), true, 0),
                Arguments.of("B", List.of(payment(PaymentMethod.CASH, 120)), true, 20),
                Arguments.of("C", List.of(payment(PaymentMethod.CARD, 100)), true, 0),
                Arguments.of("D", List.of(payment(PaymentMethod.CARD, 120)), false, 0),
                Arguments.of("E", List.of(payment(PaymentMethod.CARD, 80), payment(PaymentMethod.CASH, 30)), true, 10),
                Arguments.of("F", List.of(payment(PaymentMethod.CARD, 110), payment(PaymentMethod.CASH, 10)), false, 0),
                Arguments.of("G", List.of(payment(PaymentMethod.CASH, 90)), false, 0),
                Arguments.of("H", List.of(payment(PaymentMethod.TRANSFER, 120)), false, 0));
    }

    private static CreateSalePaymentCommand payment(PaymentMethod method, int amount) {
        return new CreateSalePaymentCommand(method, BigDecimal.valueOf(amount), "QA-" + method);
    }

    @ParameterizedTest(name = "payment policy {0}")
    @MethodSource("paymentScenarios")
    void shouldEnforcePaymentPolicyBeforeAnyWrite(String scenario, List<CreateSalePaymentCommand> payments,
                                                 boolean accepted, int expectedChange) {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        catalogReadPort.products.put(1L, new PosProductSnapshot(1L, "QA-MONEY", null, "Synthetic", BigDecimal.valueOf(100), true));
        CreateSaleCommand command = new CreateSaleCommand(1L,
                List.of(new CreateSaleItemCommand(1L, BigDecimal.ONE, BigDecimal.ZERO)), payments);
        if (!accepted) {
            assertThrows(SalesBusinessRuleException.class, () -> salesService.create(command));
            assertEquals(0, saleRepo.saveCalls, "Invalid payments must not invoke sale/payment persistence");
            assertTrue(saleRepo.storage.isEmpty());
            assertEquals(0, inventoryPort.saleOutMovements);
            assertEquals(0, BigDecimal.valueOf(20).compareTo(inventoryPort.stockAvailable(1L, 1L)));
            return;
        }
        Sale sale = salesService.create(command);
        assertEquals(0, BigDecimal.valueOf(expectedChange).compareTo(sale.changeAmount()));
        BigDecimal cash = payments.stream().filter(p -> p.paymentMethod() == PaymentMethod.CASH)
                .map(CreateSalePaymentCommand::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertTrue(sale.changeAmount().signum() >= 0 && sale.changeAmount().compareTo(cash) <= 0);
        assertEquals(payments.size(), sale.payments().size());
        for (int i = 0; i < payments.size(); i++) {
            assertEquals(payments.get(i).paymentMethod(), sale.payments().get(i).paymentMethod());
            assertEquals(0, payments.get(i).amount().compareTo(sale.payments().get(i).amount()));
            assertEquals(payments.get(i).reference(), sale.payments().get(i).reference());
        }
    }

    static Stream<Arguments> cashCloseScenarios() {
        return Stream.of(
                Arguments.of(0, List.of(payment(PaymentMethod.CASH, 120)), 100),
                Arguments.of(0, List.of(payment(PaymentMethod.CARD, 80), payment(PaymentMethod.CASH, 30)), 20),
                Arguments.of(50, List.of(payment(PaymentMethod.CASH, 120)), 150));
    }

    @ParameterizedTest
    @MethodSource("cashCloseScenarios")
    void shouldCloseCashUsingReceivedCashMinusChange(int opening, List<CreateSalePaymentCommand> payments, int expected) {
        CashRegisterSession session = cashService.open(new OpenCashRegisterCommand(BigDecimal.valueOf(opening), null));
        catalogReadPort.products.put(1L, new PosProductSnapshot(1L, "QA-MONEY", null, "Synthetic", BigDecimal.valueOf(100), true));
        salesService.create(new CreateSaleCommand(1L,
                List.of(new CreateSaleItemCommand(1L, BigDecimal.ONE, BigDecimal.ZERO)), payments));
        CashRegisterSession closed = cashService.close(session.id(), new CloseCashRegisterCommand(BigDecimal.valueOf(expected), null));
        assertEquals(0, BigDecimal.valueOf(expected).compareTo(closed.expectedCashAmount()));
        assertEquals(0, closed.differenceAmount().compareTo(BigDecimal.ZERO));
    }

    @Test
    void shouldReturnStockOnVoidSale() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        Sale voided = salesService.voidSale(sale.id(), new VoidSaleCommand("Error caja"));

        assertEquals(SaleStatus.VOIDED, voided.status());
        assertEquals(0, inventoryPort.stockByProductWarehouse.get(key(1L, 1L)).compareTo(BigDecimal.valueOf(20)));
    }

    @Test
    void shouldCreateSaleVoidInMovement() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        salesService.voidSale(sale.id(), new VoidSaleCommand("Error caja"));
        assertEquals(1, inventoryPort.saleVoidMovements);
    }

    @Test
    void shouldRejectDoubleVoid() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        salesService.voidSale(sale.id(), new VoidSaleCommand("Error caja"));
        assertThrows(SalesConflictException.class, () -> salesService.voidSale(sale.id(), new VoidSaleCommand("Duplicado")));
    }

    @Test
    void shouldBlockVoidWhenBillingStatusIsDraft() {
        assertVoidBlockedByBillingStatus("DRAFT");
    }

    @Test
    void shouldBlockVoidWhenBillingStatusIsGenerated() {
        assertVoidBlockedByBillingStatus("GENERATED");
    }

    @Test
    void shouldBlockVoidWhenBillingStatusIsSigned() {
        assertVoidBlockedByBillingStatus("SIGNED");
    }

    @Test
    void shouldBlockVoidWhenBillingStatusIsSent() {
        assertVoidBlockedByBillingStatus("SENT");
    }

    @Test
    void shouldBlockVoidWhenBillingStatusIsAcceptedAndKeepStockUntouched() {
        assertVoidBlockedByBillingStatus("ACCEPTED");
    }

    @Test
    void shouldAllowVoidWhenBillingStatusIsRejected() {
        assertVoidAllowedByBillingStatus("REJECTED");
    }

    @Test
    void shouldAllowVoidWhenBillingStatusIsError() {
        assertVoidAllowedByBillingStatus("ERROR");
    }

    @Test
    void shouldAllowVoidWhenBillingStatusIsCancelled() {
        assertVoidAllowedByBillingStatus("CANCELLED");
    }

    @Test
    void listItemsShouldReturnPendingBillingSummaryWhenNoElectronicDocument() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());

        List<SalesListItemResult> rows = salesService.listItems(null, null, null, null, null);

        assertEquals(1, rows.size());
        SalesListItemResult item = rows.get(0);
        assertEquals(sale.id(), item.id());
        assertFalse(item.billingSummary().hasElectronicDocument());
        assertNull(item.billingSummary().documentId());
        assertNull(item.billingSummary().fullNumber());
    }

    @Test
    void listItemsShouldReturnBillingSummaryWhenElectronicDocumentExists() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        salesBillingSummaryReadPort.put(
                sale.id(),
                new SaleBillingSummary(true, 99L, "INVOICE", "F001-00000099", "ACCEPTED", "PROD")
        );

        List<SalesListItemResult> rows = salesService.listItems(null, null, null, null, null);

        assertEquals(1, rows.size());
        SalesListItemResult item = rows.get(0);
        assertTrue(item.billingSummary().hasElectronicDocument());
        assertEquals(99L, item.billingSummary().documentId());
        assertEquals("F001-00000099", item.billingSummary().fullNumber());
        assertEquals("ACCEPTED", item.billingSummary().status());
        assertEquals("PROD", item.billingSummary().environment());
    }

    @Test
    void listItemsShouldUseLatestBillingSummaryWhenMultipleDocumentsExist() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        salesBillingSummaryReadPort.put(
                sale.id(),
                new SaleBillingSummary(true, 120L, "RECEIPT", "B001-00000120", "SENT", "BETA")
        );
        salesBillingSummaryReadPort.put(
                sale.id(),
                new SaleBillingSummary(true, 121L, "RECEIPT", "B001-00000121", "ACCEPTED", "BETA")
        );

        List<SalesListItemResult> rows = salesService.listItems(null, null, null, null, null);

        assertEquals(1, rows.size());
        SalesListItemResult item = rows.get(0);
        assertEquals(121L, item.billingSummary().documentId());
        assertEquals("B001-00000121", item.billingSummary().fullNumber());
        assertEquals("ACCEPTED", item.billingSummary().status());
    }

    @Test
    void listItemsShouldRespectSalesFilters() {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale completed = salesService.create(validSaleCommand());
        Sale second = salesService.create(validSaleCommand());
        salesService.voidSale(second.id(), new VoidSaleCommand("Anulacion de prueba"));

        List<SalesListItemResult> rows = salesService.listItems(null, null, null, SaleStatus.VOIDED, null);

        assertEquals(1, rows.size());
        assertEquals(second.id(), rows.get(0).id());
        assertNotEquals(completed.id(), rows.get(0).id());
    }

    @Test
    void listItemsShouldNotInvokeBillingPortWhenNoSales() {
        List<SalesListItemResult> rows = salesService.listItems(null, null, null, null, null);

        assertTrue(rows.isEmpty());
        assertEquals(0, salesBillingSummaryReadPort.callCount);
    }

    @Test
    void shouldConfigureControllerToForbidAlmaceneroForCreateSale() throws NoSuchMethodException {
        Method method = SalesController.class.getMethod("create", com.erppos.backend.erp.sales.adapter.dto.CreateSaleRequest.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("CAJERO"));
        assertTrue(preAuthorize.value().contains("ADMIN"));
        assertTrue(preAuthorize.value().contains("SUPERVISOR"));
        assertFalse(preAuthorize.value().contains("ALMACENERO"));
    }

    private CreateSaleCommand validSaleCommand() {
        return new CreateSaleCommand(
                1L,
                List.of(new CreateSaleItemCommand(1L, BigDecimal.valueOf(2), BigDecimal.ZERO)),
                validPayments()
        );
    }

    private void assertVoidBlockedByBillingStatus(String status) {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        salesBillingSummaryReadPort.put(
                sale.id(),
                new SaleBillingSummary(true, 200L, "INVOICE", "F001-00000200", status, "PROD")
        );

        SalesConflictException exception = assertThrows(
                SalesConflictException.class,
                () -> salesService.voidSale(sale.id(), new VoidSaleCommand("Error caja"))
        );

        assertTrue(exception.getMessage().contains("No se puede anular internamente"));
        assertEquals(0, inventoryPort.stockByProductWarehouse.get(key(1L, 1L)).compareTo(BigDecimal.valueOf(18)));
        assertEquals(0, inventoryPort.saleVoidMovements);

        Sale persisted = salesService.getById(sale.id());
        assertEquals(SaleStatus.COMPLETED, persisted.status());
    }

    private void assertVoidAllowedByBillingStatus(String status) {
        cashService.open(new OpenCashRegisterCommand(BigDecimal.ZERO, null));
        Sale sale = salesService.create(validSaleCommand());
        salesBillingSummaryReadPort.put(
                sale.id(),
                new SaleBillingSummary(true, 201L, "INVOICE", "F001-00000201", status, "PROD")
        );

        Sale voided = salesService.voidSale(sale.id(), new VoidSaleCommand("Error caja"));

        assertEquals(SaleStatus.VOIDED, voided.status());
        assertEquals(0, inventoryPort.stockByProductWarehouse.get(key(1L, 1L)).compareTo(BigDecimal.valueOf(20)));
        assertEquals(1, inventoryPort.saleVoidMovements);
    }

    private List<CreateSalePaymentCommand> validPayments() {
        return List.of(new CreateSalePaymentCommand(PaymentMethod.CASH, BigDecimal.valueOf(10), null));
    }

    private static String key(Long productId, Long warehouseId) {
        return productId + "-" + warehouseId;
    }

    static class TestAuditUserProvider extends AuditUserProvider {
        private UUID currentUserId = UUID.fromString("00000000-0000-0000-0000-000000000000");

        @Override
        public UUID currentUserId() {
            return currentUserId;
        }

        void setCurrentUserId(UUID currentUserId) {
            this.currentUserId = currentUserId;
        }
    }

    static class InMemoryCashRegisterRepository implements CashRegisterRepositoryPort {
        private InMemorySaleRepository sales;
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, CashRegisterSession> storage = new HashMap<>();
        private final UUID fixedUser = UUID.fromString("00000000-0000-0000-0000-000000000000");
        private boolean failNextOpenSaveWithUniqueViolation = false;

        void failNextOpenSaveWithUniqueViolation() {
            failNextOpenSaveWithUniqueViolation = true;
        }

        @Override
        public CashRegisterSession save(CashRegisterSession session) {
            if (session.id() == null && session.status() == CashRegisterStatus.OPEN && failNextOpenSaveWithUniqueViolation) {
                failNextOpenSaveWithUniqueViolation = false;
                throw new DataIntegrityViolationException("duplicate key value violates unique constraint \"uq_cash_register_sessions_opened_by_user_open\"");
            }
            Long id = session.id() == null ? seq.getAndIncrement() : session.id();
            Instant now = Instant.now();
            CashRegisterSession stored = new CashRegisterSession(
                    id,
                    session.openedByUserId() == null ? fixedUser : session.openedByUserId(),
                    session.openedAt(),
                    session.closedAt(),
                    session.openingAmount(),
                    session.countedAmount(),
                    session.expectedCashAmount(),
                    session.differenceAmount(),
                    session.status(),
                    session.notes(),
                    session.createdAt() == null ? now : session.createdAt(),
                    now
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<CashRegisterSession> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public Optional<CashRegisterSession> findOpenByUserId(UUID userId) {
            return storage.values().stream().filter(s -> s.openedByUserId().equals(userId) && s.status() == CashRegisterStatus.OPEN).findFirst();
        }

        @Override
        public Optional<CashRegisterSession> findLatestByUserId(UUID userId) {
            return storage.values().stream().filter(s -> s.openedByUserId().equals(userId)).findFirst();
        }

        @Override
        public Instant findFirstSaleAt(Long cashRegisterSessionId) { return null; }

        @Override
        public Instant findLastSaleAt(Long cashRegisterSessionId) { return null; }

        @Override
        public BigDecimal sumSalesTotal(Long cashRegisterSessionId) {
            return BigDecimal.ZERO;
        }

        @Override
        public BigDecimal sumSalesCashPaid(Long cashRegisterSessionId) {
            return sales.storage.values().stream()
                    .filter(s -> s.status() == SaleStatus.COMPLETED && Objects.equals(s.cashRegisterSessionId(), cashRegisterSessionId))
                    .flatMap(s -> s.payments().stream()).filter(p -> p.paymentMethod() == PaymentMethod.CASH)
                    .map(SalePayment::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        @Override
        public BigDecimal sumSalesCashChange(Long cashRegisterSessionId) {
            return sales.storage.values().stream()
                    .filter(s -> s.status() == SaleStatus.COMPLETED && Objects.equals(s.cashRegisterSessionId(), cashRegisterSessionId))
                    .map(Sale::changeAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    static class InMemorySaleRepository implements SaleRepositoryPort {
        private int saveCalls;
        private final AtomicLong saleSeq = new AtomicLong(1);
        private final AtomicLong itemSeq = new AtomicLong(1);
        private final AtomicLong paySeq = new AtomicLong(1);
        private final Map<Long, Sale> storage = new HashMap<>();

        @Override
        public Sale save(Sale sale) {
            saveCalls++;
            Long id = sale.id() == null ? saleSeq.getAndIncrement() : sale.id();
            List<SaleItem> items = sale.items().stream()
                    .map(i -> new SaleItem(i.id() == null ? itemSeq.getAndIncrement() : i.id(), id, i.productId(), i.quantity(), i.unitPrice(), i.discountAmount(), i.lineTotal()))
                    .toList();
            List<SalePayment> payments = sale.payments().stream()
                    .map(p -> new SalePayment(p.id() == null ? paySeq.getAndIncrement() : p.id(), id, p.paymentMethod(), p.amount(), p.reference(), Instant.now()))
                    .toList();
            Instant now = Instant.now();
            Sale stored = new Sale(
                    id,
                    sale.cashRegisterSessionId(),
                    sale.warehouseId(),
                    sale.saleNumber(),
                    sale.status(),
                    sale.subtotalAmount(),
                    sale.discountAmount(),
                    sale.totalAmount(),
                    sale.paidAmount(),
                    sale.changeAmount(),
                    sale.soldAt(),
                    sale.voidedAt(),
                    sale.voidedByUserId(),
                    sale.voidReason(),
                    sale.createdBy(),
                    sale.createdAt() == null ? now : sale.createdAt(),
                    now,
                    items,
                    payments
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<Sale> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<Sale> findByFilters(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdBy) {
            return storage.values().stream()
                    .filter(s -> cashRegisterSessionId == null || Objects.equals(s.cashRegisterSessionId(), cashRegisterSessionId))
                    .filter(s -> status == null || s.status() == status)
                    .filter(s -> createdBy == null || Objects.equals(s.createdBy(), createdBy))
                    .toList();
        }
    }

    static class InMemoryCatalogReadPort implements CatalogReadPort {
        private final Map<Long, PosProductSnapshot> products = new HashMap<>();

        @Override
        public Optional<PosProductSnapshot> findById(Long productId) {
            return Optional.ofNullable(products.get(productId));
        }

        @Override
        public Optional<PosProductSnapshot> lookupByCode(String code) {
            return products.values().stream().filter(p -> p.sku().equalsIgnoreCase(code) || (p.barcode() != null && p.barcode().equalsIgnoreCase(code))).findFirst();
        }

        @Override
        public List<PosProductSnapshot> searchByNameOrCode(String query, int limit) {
            return products.values().stream().toList();
        }
    }

    static class InMemoryWarehouseReadPort implements WarehouseReadPort {
        private final Map<Long, Boolean> activeWarehouses = new HashMap<>();

        @Override
        public boolean existsAndActive(Long warehouseId) {
            return Boolean.TRUE.equals(activeWarehouses.get(warehouseId));
        }
    }

    static class InMemoryInventorySalesPort implements InventorySalesPort {
        private final Map<String, BigDecimal> stockByProductWarehouse = new HashMap<>();
        private int saleOutMovements = 0;
        private int saleVoidMovements = 0;

        @Override
        public BigDecimal stockAvailable(Long productId, Long warehouseId) {
            return stockByProductWarehouse.getOrDefault(key(productId, warehouseId), BigDecimal.ZERO);
        }

        @Override
        public void registerSaleOut(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
            String key = key(productId, warehouseId);
            stockByProductWarehouse.put(key, stockAvailable(productId, warehouseId).subtract(quantity));
            saleOutMovements++;
        }

        @Override
        public void registerSaleVoidIn(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
            String key = key(productId, warehouseId);
            stockByProductWarehouse.put(key, stockAvailable(productId, warehouseId).add(quantity));
            saleVoidMovements++;
        }
    }

    static class InMemorySalesBillingSummaryReadPort implements SalesBillingSummaryReadPort {
        private final Map<Long, List<SaleBillingSummary>> storage = new HashMap<>();
        private int callCount = 0;

        void put(Long saleId, SaleBillingSummary summary) {
            storage.computeIfAbsent(saleId, key -> new ArrayList<>()).add(summary);
        }

        @Override
        public Map<Long, SaleBillingSummary> findLatestBySaleIds(java.util.Collection<Long> saleIds) {
            callCount++;
            Map<Long, SaleBillingSummary> result = new HashMap<>();
            for (Long saleId : saleIds) {
                List<SaleBillingSummary> candidates = storage.get(saleId);
                if (candidates == null || candidates.isEmpty()) {
                    continue;
                }
                result.put(saleId, candidates.get(candidates.size() - 1));
            }
            return result;
        }
    }
}

