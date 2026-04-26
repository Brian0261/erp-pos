package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.quotes.application.usecase.QuotePaymentCommand;
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
    public Long createSaleFromQuote(Quote quote, Long warehouseId, List<QuotePaymentCommand> payments) {
        List<CreateSaleItemCommand> saleItems = quote.items().stream()
                .map(this::toSaleItem)
                .toList();
        List<CreateSalePaymentCommand> salePayments = payments.stream()
                .map(p -> new CreateSalePaymentCommand(p.paymentMethod(), p.amount(), p.reference()))
                .toList();

        Sale sale = salesUseCase.create(new CreateSaleCommand(warehouseId, saleItems, salePayments));
        return sale.id();
    }

    private CreateSaleItemCommand toSaleItem(QuoteItem quoteItem) {
        return new CreateSaleItemCommand(
                quoteItem.productId(),
                quoteItem.quantity(),
                quoteItem.discountAmount()
        );
    }
}

