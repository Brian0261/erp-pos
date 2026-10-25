package com.erppos.backend.erp.quotes.application.service;

import com.erppos.backend.erp.quotes.application.usecase.*;
import com.erppos.backend.erp.quotes.domain.exception.QuoteBusinessRuleException;
import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.sales.application.usecase.*;
import java.util.List;

/** The same canonical conversion is used by preparation and execution. */
public final class QuoteSaleCommandFactory {
    private QuoteSaleCommandFactory() {}
    public static CreateSaleCommand toCommand(Quote quote, ConvertQuoteToSaleCommand command) {
        if (command.items() == null || command.items().size() != quote.items().size())
            throw new QuoteBusinessRuleException("Confirmed quote items must match the current quote");
        java.util.Map<Long, QuoteConfirmedItemCommand> confirmed = new java.util.HashMap<>();
        for (QuoteConfirmedItemCommand item : command.items()) {
            if (item == null || item.quoteItemId() == null || confirmed.put(item.quoteItemId(), item) != null)
                throw new QuoteBusinessRuleException("Duplicate or missing quoteItemId");
        }
        List<CreateSaleItemCommand> items = quote.items().stream().map(item -> {
            var input = confirmed.get(item.id());
            if (input == null || input.quantity() == null || input.discountAmount() == null
                    || input.quantity().compareTo(item.quantity()) != 0 || input.discountAmount().compareTo(item.discountAmount()) != 0)
                throw new QuoteBusinessRuleException("Quote quantities or discounts changed; reload before conversion");
            return new CreateSaleItemCommand(item.productId(), input.quantity(), input.discountAmount(), input.confirmedUnitPrice());
        }).toList();
        if (command.payments() == null) throw new QuoteBusinessRuleException("Payments are required");
        var payments = command.payments().stream().map(p -> new CreateSalePaymentCommand(p.paymentMethod(),p.amount(),p.reference())).toList();
        String ids = quote.items().stream().map(QuoteItem::id).sorted().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
        return new CreateSaleCommand(command.warehouseId(), items, payments, command.operationId(),command.confirmedTotal(),
                "QUOTE:" + quote.id() + ":" + ids + ":" + (command.comment() == null ? "" : command.comment().trim()));
    }
}
