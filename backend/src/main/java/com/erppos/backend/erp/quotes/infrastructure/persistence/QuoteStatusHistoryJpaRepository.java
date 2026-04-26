package com.erppos.backend.erp.quotes.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuoteStatusHistoryJpaRepository extends JpaRepository<QuoteStatusHistoryEntity, Long> {
    List<QuoteStatusHistoryEntity> findByQuoteIdOrderByChangedAtAsc(Long quoteId);
}

