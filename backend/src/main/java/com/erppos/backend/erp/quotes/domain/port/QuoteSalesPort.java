package com.erppos.backend.erp.quotes.domain.port;

import com.erppos.backend.erp.quotes.application.usecase.QuotePaymentCommand;
import com.erppos.backend.erp.quotes.domain.model.Quote;

import java.util.List;

public interface QuoteSalesPort {
    Long createSaleFromQuote(Quote quote, com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand command);
    java.util.Optional<Long> replay(Quote quote, com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand command);
}

