package com.erppos.backend.erp.quotes.domain.port;

import com.erppos.backend.erp.quotes.domain.model.QuoteProductSnapshot;

import java.util.Optional;

public interface QuoteCatalogReadPort {
    Optional<QuoteProductSnapshot> findById(Long productId);
}

