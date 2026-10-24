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
        return com.erppos.backend.erp.quotes.application.service.QuoteSaleCommandFactory.toCommand(quote, command);
    }
}

