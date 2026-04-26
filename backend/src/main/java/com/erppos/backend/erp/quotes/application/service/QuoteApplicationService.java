package com.erppos.backend.erp.quotes.application.service;

import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import com.erppos.backend.erp.quotes.application.usecase.CreateQuoteCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuoteItemCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuoteUseCase;
import com.erppos.backend.erp.quotes.application.usecase.UpdateQuoteCommand;
import com.erppos.backend.erp.quotes.domain.exception.QuoteBusinessRuleException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteConflictException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteNotFoundException;
import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.quotes.domain.model.QuoteProductSnapshot;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;
import com.erppos.backend.erp.quotes.domain.port.QuoteCatalogReadPort;
import com.erppos.backend.erp.quotes.domain.port.QuoteHistoryRepositoryPort;
import com.erppos.backend.erp.quotes.domain.port.QuoteRepositoryPort;
import com.erppos.backend.erp.quotes.domain.port.QuoteSalesPort;
import com.erppos.backend.erp.security.domain.RoleName;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QuoteApplicationService implements QuoteUseCase {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final QuoteRepositoryPort quoteRepositoryPort;
    private final QuoteHistoryRepositoryPort quoteHistoryRepositoryPort;
    private final QuoteCatalogReadPort quoteCatalogReadPort;
    private final QuoteSalesPort quoteSalesPort;
    private final AuditUserProvider auditUserProvider;

    public QuoteApplicationService(
            QuoteRepositoryPort quoteRepositoryPort,
            QuoteHistoryRepositoryPort quoteHistoryRepositoryPort,
            QuoteCatalogReadPort quoteCatalogReadPort,
            QuoteSalesPort quoteSalesPort,
            AuditUserProvider auditUserProvider
    ) {
        this.quoteRepositoryPort = quoteRepositoryPort;
        this.quoteHistoryRepositoryPort = quoteHistoryRepositoryPort;
        this.quoteCatalogReadPort = quoteCatalogReadPort;
        this.quoteSalesPort = quoteSalesPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public Quote create(CreateQuoteCommand command) {
        LocalDate issueDate = command.issueDate() == null ? LocalDate.now() : command.issueDate();
        validateDates(issueDate, command.expiresAt());

        List<QuoteItem> items = buildItems(command.items(), null);
        Totals totals = calculateTotals(items);

        Quote quote = new Quote(
                null,
                nextQuoteNumber(),
                command.customerName().trim(),
                trimToNull(command.customerDocument()),
                trimToNull(command.customerPhone()),
                trimToNull(command.customerEmail()),
                QuoteStatus.DRAFT,
                issueDate,
                command.expiresAt(),
                null,
                null,
                totals.subtotal(),
                totals.discount(),
                totals.total(),
                trimToNull(command.notes()),
                null,
                null,
                auditUserProvider.currentUsername(),
                auditUserProvider.currentUsername(),
                items
        );
        return quoteRepositoryPort.save(quote);
    }

    @Override
    public List<Quote> list(QuoteStatus status, String customerQuery, LocalDate from, LocalDate to) {
        List<Quote> quotes = quoteRepositoryPort.findByFilters(status, customerQuery, from, to);
        return quotes.stream().map(this::asExpiredIfNeeded).toList();
    }

    @Override
    public Quote getById(Long id) {
        Quote quote = quoteRepositoryPort.findById(id)
                .orElseThrow(() -> new QuoteNotFoundException("Quote not found"));
        return asExpiredIfNeeded(quote);
    }

    @Override
    @Transactional
    public Quote update(Long id, UpdateQuoteCommand command) {
        Quote current = getById(id);
        if (current.status() != QuoteStatus.DRAFT && current.status() != QuoteStatus.SENT) {
            throw new QuoteConflictException("Only DRAFT or SENT quotes can be edited");
        }

        validateDates(current.issueDate(), command.expiresAt());
        List<QuoteItem> items = buildItems(command.items(), current.id());
        Totals totals = calculateTotals(items);

        Quote updated = new Quote(
                current.id(),
                current.quoteNumber(),
                command.customerName().trim(),
                trimToNull(command.customerDocument()),
                trimToNull(command.customerPhone()),
                trimToNull(command.customerEmail()),
                current.status(),
                current.issueDate(),
                command.expiresAt(),
                current.sentAt(),
                current.convertedSaleId(),
                totals.subtotal(),
                totals.discount(),
                totals.total(),
                trimToNull(command.notes()),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                items
        );
        return quoteRepositoryPort.save(updated);
    }

    @Override
    @Transactional
    public Quote send(Long id, String comment) {
        Quote current = getById(id);
        if (current.status() != QuoteStatus.DRAFT) {
            throw new QuoteConflictException("Only DRAFT quotes can be sent");
        }

        Quote sent = new Quote(
                current.id(),
                current.quoteNumber(),
                current.customerName(),
                current.customerDocument(),
                current.customerPhone(),
                current.customerEmail(),
                QuoteStatus.SENT,
                current.issueDate(),
                current.expiresAt(),
                Instant.now(),
                current.convertedSaleId(),
                current.subtotalAmount(),
                current.discountAmount(),
                current.totalAmount(),
                current.notes(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                current.items()
        );
        Quote saved = quoteRepositoryPort.save(sent);
        addHistory(saved.id(), current.status(), QuoteStatus.SENT, comment);
        return saved;
    }

    @Override
    @Transactional
    public Quote cancel(Long id, String comment) {
        Quote current = getById(id);
        if (current.status() != QuoteStatus.DRAFT && current.status() != QuoteStatus.SENT) {
            throw new QuoteConflictException("Only DRAFT or SENT quotes can be cancelled");
        }
        if (auditUserProvider.hasRole(RoleName.CAJERO) && !current.createdBy().equals(auditUserProvider.currentUsername())) {
            throw new QuoteBusinessRuleException("Cashier can only cancel own quotes");
        }

        Quote cancelled = new Quote(
                current.id(),
                current.quoteNumber(),
                current.customerName(),
                current.customerDocument(),
                current.customerPhone(),
                current.customerEmail(),
                QuoteStatus.CANCELLED,
                current.issueDate(),
                current.expiresAt(),
                current.sentAt(),
                current.convertedSaleId(),
                current.subtotalAmount(),
                current.discountAmount(),
                current.totalAmount(),
                current.notes(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                current.items()
        );
        Quote saved = quoteRepositoryPort.save(cancelled);
        addHistory(saved.id(), current.status(), QuoteStatus.CANCELLED, comment);
        return saved;
    }

    @Override
    @Transactional
    public Quote convertToSale(Long id, ConvertQuoteToSaleCommand command) {
        Quote current = getById(id);

        // Prioridad: una cotización ya convertida siempre responde conflicto (409).
        if (current.convertedSaleId() != null || current.status() == QuoteStatus.CONVERTED) {
            throw new QuoteConflictException("Quote already converted");
        }
        if (current.status() == QuoteStatus.CANCELLED) {
            throw new QuoteConflictException("Cancelled quote cannot be converted");
        }
        if (current.expiresAt().isBefore(LocalDate.now()) || current.status() == QuoteStatus.EXPIRED) {
            throw new QuoteBusinessRuleException("Quote is expired and cannot be converted");
        }
        if (current.status() != QuoteStatus.DRAFT && current.status() != QuoteStatus.SENT) {
            throw new QuoteConflictException("Only DRAFT or SENT quotes can be converted");
        }
        if (command.warehouseId() == null) {
            throw new QuoteBusinessRuleException("warehouseId is required");
        }
        if (command.payments() == null || command.payments().isEmpty()) {
            throw new QuoteBusinessRuleException("At least one payment is required");
        }

        Long saleId = quoteSalesPort.createSaleFromQuote(current, command.warehouseId(), command.payments());

        Quote converted = new Quote(
                current.id(),
                current.quoteNumber(),
                current.customerName(),
                current.customerDocument(),
                current.customerPhone(),
                current.customerEmail(),
                QuoteStatus.CONVERTED,
                current.issueDate(),
                current.expiresAt(),
                current.sentAt(),
                saleId,
                current.subtotalAmount(),
                current.discountAmount(),
                current.totalAmount(),
                current.notes(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                current.items()
        );
        Quote saved = quoteRepositoryPort.save(converted);
        addHistory(saved.id(), current.status(), QuoteStatus.CONVERTED, command.comment());
        return saved;
    }

    @Override
    public List<QuoteStatusHistory> history(Long id) {
        getById(id);
        return quoteHistoryRepositoryPort.findByQuoteId(id);
    }

    private Quote asExpiredIfNeeded(Quote quote) {
        if ((quote.status() == QuoteStatus.DRAFT || quote.status() == QuoteStatus.SENT)
                && quote.expiresAt().isBefore(LocalDate.now())) {
            return new Quote(
                    quote.id(),
                    quote.quoteNumber(),
                    quote.customerName(),
                    quote.customerDocument(),
                    quote.customerPhone(),
                    quote.customerEmail(),
                    QuoteStatus.EXPIRED,
                    quote.issueDate(),
                    quote.expiresAt(),
                    quote.sentAt(),
                    quote.convertedSaleId(),
                    quote.subtotalAmount(),
                    quote.discountAmount(),
                    quote.totalAmount(),
                    quote.notes(),
                    quote.createdAt(),
                    quote.updatedAt(),
                    quote.createdBy(),
                    quote.updatedBy(),
                    quote.items()
            );
        }
        return quote;
    }

    private List<QuoteItem> buildItems(List<QuoteItemCommand> itemCommands, Long quoteId) {
        if (itemCommands == null || itemCommands.isEmpty()) {
            throw new QuoteBusinessRuleException("Quote must include at least one item");
        }

        Map<Long, Boolean> seen = new HashMap<>();
        return itemCommands.stream().map(item -> {
            if (seen.put(item.productId(), Boolean.TRUE) != null) {
                throw new QuoteBusinessRuleException("Duplicated product in quote items");
            }

            QuoteProductSnapshot product = quoteCatalogReadPort.findById(item.productId())
                    .orElseThrow(() -> new QuoteNotFoundException("Product not found"));
            if (!product.active()) {
                throw new QuoteBusinessRuleException("Product is inactive");
            }

            BigDecimal qty = normalize(item.quantity());
            if (qty.compareTo(ZERO) <= 0) {
                throw new QuoteBusinessRuleException("quantity must be > 0");
            }

            BigDecimal unitPrice = normalize(product.salePrice());
            BigDecimal subtotal = unitPrice.multiply(qty);
            BigDecimal discount = normalize(defaultZero(item.discountAmount()));
            if (discount.compareTo(ZERO) < 0) {
                throw new QuoteBusinessRuleException("discountAmount must be >= 0");
            }
            if (discount.compareTo(subtotal) > 0) {
                throw new QuoteBusinessRuleException("discountAmount cannot exceed item subtotal");
            }

            return new QuoteItem(null, quoteId, item.productId(), qty, unitPrice, discount, subtotal.subtract(discount));
        }).toList();
    }

    private Totals calculateTotals(List<QuoteItem> items) {
        BigDecimal subtotal = ZERO;
        BigDecimal discount = ZERO;
        for (QuoteItem item : items) {
            subtotal = subtotal.add(item.unitPrice().multiply(item.quantity()));
            discount = discount.add(item.discountAmount());
        }
        BigDecimal total = subtotal.subtract(discount);
        if (total.compareTo(ZERO) < 0) {
            throw new QuoteBusinessRuleException("Quote total cannot be negative");
        }
        return new Totals(subtotal, discount, total);
    }

    private void validateDates(LocalDate issueDate, LocalDate expiresAt) {
        if (expiresAt == null) {
            throw new QuoteBusinessRuleException("expiresAt is required");
        }
        if (expiresAt.isBefore(issueDate)) {
            throw new QuoteBusinessRuleException("expiresAt must be >= issueDate");
        }
    }

    private String nextQuoteNumber() {
        String number;
        do {
            number = "Q-" + Instant.now().toEpochMilli();
        } while (quoteRepositoryPort.existsByQuoteNumber(number));
        return number;
    }

    private void addHistory(Long quoteId, QuoteStatus previous, QuoteStatus next, String comment) {
        quoteHistoryRepositoryPort.save(new QuoteStatusHistory(
                null,
                quoteId,
                previous,
                next,
                trimToNull(comment),
                Instant.now(),
                auditUserProvider.currentUsername()
        ));
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private BigDecimal normalize(BigDecimal value) {
        if (value == null) {
            return ZERO;
        }
        return value.stripTrailingZeros();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal total) {
    }
}

