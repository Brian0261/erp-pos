package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.quotes.application.usecase.QuotePaymentCommand;
import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import com.erppos.backend.erp.quotes.application.usecase.QuoteConfirmedItemCommand;
import com.erppos.backend.erp.quotes.domain.exception.QuoteBusinessRuleException;
import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.quotes.domain.port.QuoteSalesPort;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleItemCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSalePaymentCommand;
import com.erppos.backend.erp.sales.application.usecase.SalesUseCase;
import com.erppos.backend.erp.sales.domain.model.Sale;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SalesFromQuoteAdapter implements QuoteSalesPort {

    private final SalesUseCase salesUseCase;

    public SalesFromQuoteAdapter(SalesUseCase salesUseCase) {
        this.salesUseCase = salesUseCase;
    }

    @Override
    public Long createSaleFromQuote(Quote quote, ConvertQuoteToSaleCommand command) {
        return salesUseCase.create(toCommand(quote, command)).id();
    }

    @Override
    public java.util.Optional<Long> replay(Quote quote, ConvertQuoteToSaleCommand command) {
        return salesUseCase.replay(toCommand(quote, command)).map(Sale::id);
    }

    private CreateSaleCommand toCommand(Quote quote, ConvertQuoteToSaleCommand command) {
        if (command.items() == null || command.items().size() != quote.items().size())
            throw new QuoteBusinessRuleException("Confirmed quote items must match the current quote");
        java.util.Map<Long, QuoteConfirmedItemCommand> confirmed = new java.util.HashMap<>();
        for (QuoteConfirmedItemCommand item : command.items()) {
            if (item.quoteItemId() == null || confirmed.put(item.quoteItemId(), item) != null)
                throw new QuoteBusinessRuleException("Duplicate or missing quoteItemId");
        }
        List<CreateSaleItemCommand> saleItems = quote.items().stream()
                .map(item -> {
                    QuoteConfirmedItemCommand input = confirmed.get(item.id());
                    if (input == null || input.quantity() == null || input.discountAmount() == null
                            || input.quantity().compareTo(item.quantity()) != 0 || input.discountAmount().compareTo(item.discountAmount()) != 0)
                        throw new QuoteBusinessRuleException("Quote quantities or discounts changed; reload before conversion");
                    return new CreateSaleItemCommand(item.productId(), input.quantity(), input.discountAmount(), input.confirmedUnitPrice());
                })
                .toList();
        List<CreateSalePaymentCommand> salePayments = command.payments().stream()
                .map(p -> new CreateSalePaymentCommand(p.paymentMethod(), p.amount(), p.reference()))
                .toList();

        String itemIdentity = quote.items().stream().map(QuoteItem::id).sorted().map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        return new CreateSaleCommand(command.warehouseId(), saleItems, salePayments, command.operationId(),
                command.confirmedTotal(), "QUOTE:" + quote.id() + ":" + itemIdentity + ":" + (command.comment() == null ? "" : command.comment().trim()));
    }
}

