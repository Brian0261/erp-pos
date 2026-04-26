package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import com.erppos.backend.erp.quotes.domain.port.QuoteRepositoryPort;
import com.erppos.backend.erp.quotes.infrastructure.mapper.QuoteMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class QuotePersistenceAdapter implements QuoteRepositoryPort {

    private final QuoteJpaRepository quoteJpaRepository;

    public QuotePersistenceAdapter(QuoteJpaRepository quoteJpaRepository) {
        this.quoteJpaRepository = quoteJpaRepository;
    }

    @Override
    public Quote save(Quote quote) {
        QuoteEntity entity;
        if (quote.id() == null) {
            entity = QuoteMapper.toEntity(quote);
        } else {
            entity = quoteJpaRepository.findById(quote.id()).orElseGet(QuoteEntity::new);
            QuoteMapper.merge(entity, quote);
        }

        mergeItems(entity, quote.items());
        return QuoteMapper.toDomain(quoteJpaRepository.save(entity));
    }

    @Override
    public Optional<Quote> findById(Long id) {
        return quoteJpaRepository.findById(id).map(QuoteMapper::toDomain);
    }

    @Override
    public List<Quote> findByFilters(QuoteStatus status, String customerQuery, LocalDate from, LocalDate to) {
        return quoteJpaRepository.findByFilters(status, customerQuery, from, to)
                .stream()
                .map(QuoteMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsByQuoteNumber(String quoteNumber) {
        return quoteJpaRepository.existsByQuoteNumber(quoteNumber);
    }

    private void mergeItems(QuoteEntity entity, List<QuoteItem> items) {
        Map<Long, QuoteItemEntity> existing = new HashMap<>();
        for (QuoteItemEntity it : entity.getItems()) {
            existing.put(it.getId(), it);
        }

        entity.getItems().clear();
        for (QuoteItem item : items) {
            QuoteItemEntity itemEntity;
            if (item.id() != null && existing.containsKey(item.id())) {
                itemEntity = existing.get(item.id());
                QuoteMapper.mergeItem(itemEntity, item, entity);
            } else {
                itemEntity = QuoteMapper.toItemEntity(item, entity);
            }
            entity.getItems().add(itemEntity);
        }
    }
}

