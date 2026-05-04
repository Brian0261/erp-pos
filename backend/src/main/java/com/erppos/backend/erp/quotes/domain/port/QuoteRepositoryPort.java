package com.erppos.backend.erp.quotes.domain.port;

import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface QuoteRepositoryPort {
    Quote save(Quote quote);
    Optional<Quote> findById(Long id);
    Optional<Quote> findByIdForUpdate(Long id);
    List<Quote> findByFilters(QuoteStatus status, String customerQuery, LocalDate from, LocalDate to);
    boolean existsByQuoteNumber(String quoteNumber);
}

