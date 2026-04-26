package com.erppos.backend.erp.quotes.application.usecase;

import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;

import java.time.LocalDate;
import java.util.List;

public interface QuoteUseCase {
    Quote create(CreateQuoteCommand command);
    List<Quote> list(QuoteStatus status, String customerQuery, LocalDate from, LocalDate to);
    Quote getById(Long id);
    Quote update(Long id, UpdateQuoteCommand command);
    Quote send(Long id, String comment);
    Quote cancel(Long id, String comment);
    Quote convertToSale(Long id, ConvertQuoteToSaleCommand command);
    List<QuoteStatusHistory> history(Long id);
}

