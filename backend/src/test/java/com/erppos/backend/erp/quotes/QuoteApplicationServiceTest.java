package com.erppos.backend.erp.quotes;

import com.erppos.backend.erp.quotes.adapter.rest.QuoteController;
import com.erppos.backend.erp.quotes.application.service.AuditUserProvider;
import com.erppos.backend.erp.quotes.application.service.QuoteApplicationService;
import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import com.erppos.backend.erp.quotes.application.usecase.CreateQuoteCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuoteItemCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuotePaymentCommand;
import com.erppos.backend.erp.quotes.application.usecase.UpdateQuoteCommand;
import com.erppos.backend.erp.quotes.domain.exception.QuoteBusinessRuleException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteConflictException;
import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.quotes.domain.model.QuoteProductSnapshot;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;
import com.erppos.backend.erp.quotes.domain.port.QuoteCatalogReadPort;
import com.erppos.backend.erp.quotes.domain.port.QuoteHistoryRepositoryPort;
import com.erppos.backend.erp.quotes.domain.port.QuoteRepositoryPort;
import com.erppos.backend.erp.quotes.domain.port.QuoteSalesPort;
import com.erppos.backend.erp.sales.domain.model.PaymentMethod;
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

class QuoteApplicationServiceTest {

    private InMemoryQuoteRepository quoteRepository;
    private InMemoryQuoteHistoryRepository quoteHistoryRepository;
    private InMemoryQuoteCatalogReadPort quoteCatalogReadPort;
    private InMemoryQuoteSalesPort quoteSalesPort;
    private QuoteApplicationService quoteService;

    @BeforeEach
    void setUp() {
        quoteRepository = new InMemoryQuoteRepository();
        quoteHistoryRepository = new InMemoryQuoteHistoryRepository();
        quoteCatalogReadPort = new InMemoryQuoteCatalogReadPort();
        quoteSalesPort = new InMemoryQuoteSalesPort();

        AuditUserProvider auditUserProvider = new AuditUserProvider();
        quoteService = new QuoteApplicationService(
                quoteRepository,
                quoteHistoryRepository,
                quoteCatalogReadPort,
                quoteSalesPort,
                auditUserProvider
        );

        quoteCatalogReadPort.products.put(1L, new QuoteProductSnapshot(1L, "SKU-1", "EAN-1", "Producto 1", BigDecimal.valueOf(10), true));
        quoteCatalogReadPort.products.put(2L, new QuoteProductSnapshot(2L, "SKU-2", "EAN-2", "Producto 2", BigDecimal.valueOf(5), true));
        quoteCatalogReadPort.products.put(99L, new QuoteProductSnapshot(99L, "SKU-I", null, "Inactivo", BigDecimal.ONE, false));
    }

    @Test
    void shouldCreateQuoteSuccessfully() {
        Quote quote = quoteService.create(validCreateCommand());
        assertNotNull(quote.id());
        assertEquals(QuoteStatus.DRAFT, quote.status());
    }

    @Test
    void shouldRejectQuoteWithoutItems() {
        CreateQuoteCommand command = new CreateQuoteCommand("Cliente", null, null, null, LocalDate.now(), LocalDate.now().plusDays(1), null, List.of());
        assertThrows(QuoteBusinessRuleException.class, () -> quoteService.create(command));
    }

    @Test
    void shouldRejectQuoteWithInactiveOrMissingProduct() {
        CreateQuoteCommand inactiveCommand = new CreateQuoteCommand(
                "Cliente", null, null, null, LocalDate.now(), LocalDate.now().plusDays(1), null,
                List.of(new QuoteItemCommand(99L, BigDecimal.ONE, BigDecimal.ZERO))
        );
        assertThrows(QuoteBusinessRuleException.class, () -> quoteService.create(inactiveCommand));

        CreateQuoteCommand missingCommand = new CreateQuoteCommand(
                "Cliente", null, null, null, LocalDate.now(), LocalDate.now().plusDays(1), null,
                List.of(new QuoteItemCommand(77L, BigDecimal.ONE, BigDecimal.ZERO))
        );
        assertThrows(RuntimeException.class, () -> quoteService.create(missingCommand));
    }

    @Test
    void shouldEditDraftQuote() {
        Quote quote = quoteService.create(validCreateCommand());
        Quote updated = quoteService.update(quote.id(), new UpdateQuoteCommand(
                "Cliente Editado",
                "123",
                null,
                null,
                LocalDate.now().plusDays(5),
                "nota",
                List.of(new QuoteItemCommand(1L, BigDecimal.valueOf(2), BigDecimal.ONE))
        ));
        assertEquals("Cliente Editado", updated.customerName());
    }

    @Test
    void shouldRejectEditConvertedQuote() {
        Quote quote = quoteService.create(validCreateCommand());
        Quote converted = quoteService.convertToSale(quote.id(), validConvertCommand());
        assertThrows(QuoteConflictException.class,
                () -> quoteService.update(converted.id(), new UpdateQuoteCommand(
                        "X", null, null, null, LocalDate.now().plusDays(2), null,
                        List.of(new QuoteItemCommand(1L, BigDecimal.ONE, BigDecimal.ZERO))
                )));
    }

    @Test
    void shouldSendDraftQuote() {
        Quote quote = quoteService.create(validCreateCommand());
        Quote sent = quoteService.send(quote.id(), "enviado");
        assertEquals(QuoteStatus.SENT, sent.status());
        assertNotNull(sent.sentAt());
    }

    @Test
    void shouldRejectSendConvertedQuote() {
        Quote quote = quoteService.create(validCreateCommand());
        quoteService.convertToSale(quote.id(), validConvertCommand());
        assertThrows(QuoteConflictException.class, () -> quoteService.send(quote.id(), null));
    }

    @Test
    void shouldCancelDraftQuote() {
        Quote quote = quoteService.create(validCreateCommand());
        Quote cancelled = quoteService.cancel(quote.id(), "cancelado");
        assertEquals(QuoteStatus.CANCELLED, cancelled.status());
    }

    @Test
    void shouldRejectCancelConvertedQuote() {
        Quote quote = quoteService.create(validCreateCommand());
        quoteService.convertToSale(quote.id(), validConvertCommand());
        assertThrows(QuoteConflictException.class, () -> quoteService.cancel(quote.id(), null));
    }

    @Test
    void shouldRejectConversionOfCancelledQuoteWithout500() {
        Quote quote = quoteService.create(validCreateCommand());
        quoteService.cancel(quote.id(), "cancelada");

        assertThrows(QuoteConflictException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));
    }

    @Test
    void shouldConvertQuoteToSaleSuccessfully() {
        Quote quote = quoteService.create(validCreateCommand());
        Quote converted = quoteService.convertToSale(quote.id(), validConvertCommand());
        assertEquals(QuoteStatus.CONVERTED, converted.status());
        assertNotNull(converted.convertedSaleId());
    }

    @Test
    void shouldUseLockedReadWhenConvertingQuote() {
        Quote quote = quoteService.create(validCreateCommand());

        quoteService.convertToSale(quote.id(), validConvertCommand());

        assertEquals(1, quoteRepository.findByIdForUpdateCalls);
    }

    @Test
    void shouldRegisterConvertedSaleIdAndHistory() {
        Quote quote = quoteService.create(validCreateCommand());
        Quote converted = quoteService.convertToSale(quote.id(), validConvertCommand());
        List<QuoteStatusHistory> history = quoteService.history(quote.id());

        assertNotNull(converted.convertedSaleId());
        assertFalse(history.isEmpty());
        assertEquals(QuoteStatus.CONVERTED, history.get(history.size() - 1).newStatus());
    }

    @Test
    void shouldRejectConversionWithoutOpenCashRegister() {
        quoteSalesPort.failNoOpenCash = true;
        Quote quote = quoteService.create(validCreateCommand());
        assertThrows(QuoteBusinessRuleException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));
    }

    @Test
    void shouldRejectConversionWithInsufficientStock() {
        quoteSalesPort.failStock = true;
        Quote quote = quoteService.create(validCreateCommand());
        assertThrows(QuoteConflictException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));
    }

    @Test
    void shouldRejectExpiredQuoteConversion() {
        Quote expired = quoteService.create(new CreateQuoteCommand(
                "Cliente",
                null,
                null,
                null,
                LocalDate.now().minusDays(5),
                LocalDate.now().minusDays(1),
                null,
                List.of(new QuoteItemCommand(1L, BigDecimal.ONE, BigDecimal.ZERO))
        ));
        assertThrows(QuoteBusinessRuleException.class, () -> quoteService.convertToSale(expired.id(), validConvertCommand()));
    }

    @Test
    void shouldRejectDoubleConversion() {
        Quote quote = quoteService.create(validCreateCommand());
        quoteService.convertToSale(quote.id(), validConvertCommand());

        assertThrows(QuoteConflictException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));
    }

    @Test
    void shouldRejectConvertedStatusWithoutCallingSalesPort() {
        Quote quote = quoteService.create(validCreateCommand());
        quoteService.convertToSale(quote.id(), validConvertCommand());

        long callsBeforeSecondAttempt = quoteSalesPort.callCount;
        assertThrows(QuoteConflictException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));
        assertEquals(callsBeforeSecondAttempt, quoteSalesPort.callCount);
    }

    @Test
    void shouldRejectQuoteWithConvertedSaleIdWithoutCallingSalesPort() {
        Quote draft = quoteService.create(validCreateCommand());
        Quote inconsistentDraftWithSaleId = new Quote(
                draft.id(),
                draft.quoteNumber(),
                draft.customerName(),
                draft.customerDocument(),
                draft.customerPhone(),
                draft.customerEmail(),
                QuoteStatus.DRAFT,
                draft.issueDate(),
                draft.expiresAt(),
                draft.sentAt(),
                999L,
                draft.subtotalAmount(),
                draft.discountAmount(),
                draft.totalAmount(),
                draft.notes(),
                draft.createdAt(),
                draft.updatedAt(),
                draft.createdBy(),
                draft.updatedBy(),
                draft.items()
        );
        quoteRepository.save(inconsistentDraftWithSaleId);

        assertThrows(QuoteConflictException.class, () -> quoteService.convertToSale(draft.id(), validConvertCommand()));
        assertEquals(0, quoteSalesPort.callCount);
    }

    @Test
    void shouldNotChangeQuoteStatusWhenConversionFails() {
        quoteSalesPort.failNoOpenCash = true;
        Quote quote = quoteService.create(validCreateCommand());

        assertThrows(QuoteBusinessRuleException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));

        Quote reloaded = quoteService.getById(quote.id());
        assertEquals(QuoteStatus.DRAFT, reloaded.status());
    }

    @Test
    void shouldNotSetConvertedSaleIdWhenConversionFails() {
        quoteSalesPort.failStock = true;
        Quote quote = quoteService.create(validCreateCommand());

        assertThrows(QuoteConflictException.class, () -> quoteService.convertToSale(quote.id(), validConvertCommand()));

        Quote reloaded = quoteService.getById(quote.id());
        assertNull(reloaded.convertedSaleId());
    }

    @Test
    void shouldConfigureControllerToForbidAlmaceneroForCreateQuote() throws NoSuchMethodException {
        Method method = QuoteController.class.getMethod("create", com.erppos.backend.erp.quotes.adapter.dto.CreateQuoteRequest.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("CAJERO"));
        assertTrue(preAuthorize.value().contains("ADMIN"));
        assertTrue(preAuthorize.value().contains("SUPERVISOR"));
        assertFalse(preAuthorize.value().contains("ALMACENERO"));
    }

    private CreateQuoteCommand validCreateCommand() {
        return new CreateQuoteCommand(
                "Cliente Uno",
                "12345678",
                "999999999",
                "cliente@test.local",
                LocalDate.now(),
                LocalDate.now().plusDays(2),
                "nota",
                List.of(
                        new QuoteItemCommand(1L, BigDecimal.valueOf(2), BigDecimal.ZERO),
                        new QuoteItemCommand(2L, BigDecimal.ONE, BigDecimal.ZERO)
                )
        );
    }

    private ConvertQuoteToSaleCommand validConvertCommand() {
        return new ConvertQuoteToSaleCommand(
                1L,
                "convertir",
                List.of(new QuotePaymentCommand(PaymentMethod.CASH, BigDecimal.valueOf(30), null))
        );
    }

    static class InMemoryQuoteRepository implements QuoteRepositoryPort {
        private final AtomicLong quoteSeq = new AtomicLong(1);
        private final AtomicLong itemSeq = new AtomicLong(1);
        private final Map<Long, Quote> storage = new HashMap<>();
        private long findByIdForUpdateCalls;

        @Override
        public Quote save(Quote quote) {
            Long id = quote.id() == null ? quoteSeq.getAndIncrement() : quote.id();
            List<QuoteItem> items = quote.items().stream().map(i -> new QuoteItem(
                    i.id() == null ? itemSeq.getAndIncrement() : i.id(),
                    id,
                    i.productId(),
                    i.quantity(),
                    i.unitPrice(),
                    i.discountAmount(),
                    i.lineTotal()
            )).toList();
            Instant now = Instant.now();
            Quote stored = new Quote(
                    id,
                    quote.quoteNumber(),
                    quote.customerName(),
                    quote.customerDocument(),
                    quote.customerPhone(),
                    quote.customerEmail(),
                    quote.status(),
                    quote.issueDate(),
                    quote.expiresAt(),
                    quote.sentAt(),
                    quote.convertedSaleId(),
                    quote.subtotalAmount(),
                    quote.discountAmount(),
                    quote.totalAmount(),
                    quote.notes(),
                    quote.createdAt() == null ? now : quote.createdAt(),
                    now,
                    quote.createdBy(),
                    quote.updatedBy(),
                    items
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<Quote> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public Optional<Quote> findByIdForUpdate(Long id) {
            findByIdForUpdateCalls++;
            return findById(id);
        }

        @Override
        public List<Quote> findByFilters(QuoteStatus status, String customerQuery, LocalDate from, LocalDate to) {
            String q = customerQuery == null ? "" : customerQuery.toLowerCase();
            return storage.values().stream()
                    .filter(quote -> status == null || quote.status() == status)
                    .filter(quote -> q.isBlank() || quote.customerName().toLowerCase().contains(q)
                            || (quote.customerDocument() != null && quote.customerDocument().toLowerCase().contains(q)))
                    .filter(quote -> from == null || !quote.issueDate().isBefore(from))
                    .filter(quote -> to == null || !quote.issueDate().isAfter(to))
                    .toList();
        }

        @Override
        public boolean existsByQuoteNumber(String quoteNumber) {
            return storage.values().stream().anyMatch(q -> Objects.equals(q.quoteNumber(), quoteNumber));
        }
    }

    static class InMemoryQuoteHistoryRepository implements QuoteHistoryRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, List<QuoteStatusHistory>> byQuote = new HashMap<>();

        @Override
        public QuoteStatusHistory save(QuoteStatusHistory history) {
            QuoteStatusHistory stored = new QuoteStatusHistory(
                    seq.getAndIncrement(),
                    history.quoteId(),
                    history.previousStatus(),
                    history.newStatus(),
                    history.comment(),
                    history.changedAt() == null ? Instant.now() : history.changedAt(),
                    history.changedBy()
            );
            byQuote.computeIfAbsent(history.quoteId(), k -> new ArrayList<>()).add(stored);
            return stored;
        }

        @Override
        public List<QuoteStatusHistory> findByQuoteId(Long quoteId) {
            return byQuote.getOrDefault(quoteId, List.of());
        }
    }

    static class InMemoryQuoteCatalogReadPort implements QuoteCatalogReadPort {
        private final Map<Long, QuoteProductSnapshot> products = new HashMap<>();

        @Override
        public Optional<QuoteProductSnapshot> findById(Long productId) {
            return Optional.ofNullable(products.get(productId));
        }
    }

    static class InMemoryQuoteSalesPort implements QuoteSalesPort {
        private long saleIdSeq = 1;
        private long callCount;
        private boolean failNoOpenCash;
        private boolean failStock;

        @Override
        public Long createSaleFromQuote(Quote quote, Long warehouseId, List<QuotePaymentCommand> payments) {
            callCount++;
            if (failNoOpenCash) {
                throw new QuoteBusinessRuleException("No open cash register");
            }
            if (failStock) {
                throw new QuoteConflictException("Insufficient stock");
            }
            return saleIdSeq++;
        }
    }
}

