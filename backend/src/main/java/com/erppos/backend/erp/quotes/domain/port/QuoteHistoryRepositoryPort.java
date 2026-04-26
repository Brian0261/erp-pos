package com.erppos.backend.erp.quotes.domain.port;

import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;

import java.util.List;

public interface QuoteHistoryRepositoryPort {
    QuoteStatusHistory save(QuoteStatusHistory history);
    List<QuoteStatusHistory> findByQuoteId(Long quoteId);
}

