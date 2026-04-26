package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.quotes.domain.exception.QuoteNotFoundException;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;
import com.erppos.backend.erp.quotes.domain.port.QuoteHistoryRepositoryPort;
import com.erppos.backend.erp.quotes.infrastructure.mapper.QuoteHistoryMapper;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class QuoteHistoryPersistenceAdapter implements QuoteHistoryRepositoryPort {

    private final QuoteStatusHistoryJpaRepository quoteStatusHistoryJpaRepository;
    private final QuoteJpaRepository quoteJpaRepository;

    public QuoteHistoryPersistenceAdapter(QuoteStatusHistoryJpaRepository quoteStatusHistoryJpaRepository,
                                          QuoteJpaRepository quoteJpaRepository) {
        this.quoteStatusHistoryJpaRepository = quoteStatusHistoryJpaRepository;
        this.quoteJpaRepository = quoteJpaRepository;
    }

    @Override
    public QuoteStatusHistory save(QuoteStatusHistory history) {
        QuoteEntity quoteEntity = quoteJpaRepository.findById(history.quoteId())
                .orElseThrow(() -> new QuoteNotFoundException("Quote not found"));
        QuoteStatusHistoryEntity entity = QuoteHistoryMapper.toEntity(history, quoteEntity);
        return QuoteHistoryMapper.toDomain(quoteStatusHistoryJpaRepository.save(entity));
    }

    @Override
    public List<QuoteStatusHistory> findByQuoteId(Long quoteId) {
        return quoteStatusHistoryJpaRepository.findByQuoteIdOrderByChangedAtAsc(quoteId)
                .stream()
                .map(QuoteHistoryMapper::toDomain)
                .toList();
    }
}

