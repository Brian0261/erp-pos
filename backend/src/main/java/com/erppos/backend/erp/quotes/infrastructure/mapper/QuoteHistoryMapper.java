package com.erppos.backend.erp.quotes.infrastructure.mapper;

import com.erppos.backend.erp.quotes.domain.model.QuoteStatusHistory;
import com.erppos.backend.erp.quotes.infrastructure.persistence.QuoteEntity;
import com.erppos.backend.erp.quotes.infrastructure.persistence.QuoteStatusHistoryEntity;

public final class QuoteHistoryMapper {
    private QuoteHistoryMapper() {
    }

    public static QuoteStatusHistory toDomain(QuoteStatusHistoryEntity entity) {
        return new QuoteStatusHistory(
                entity.getId(),
                entity.getQuote().getId(),
                entity.getPreviousStatus(),
                entity.getNewStatus(),
                entity.getComment(),
                entity.getChangedAt(),
                entity.getChangedBy()
        );
    }

    public static QuoteStatusHistoryEntity toEntity(QuoteStatusHistory history, QuoteEntity quoteEntity) {
        QuoteStatusHistoryEntity entity = new QuoteStatusHistoryEntity();
        entity.setQuote(quoteEntity);
        entity.setPreviousStatus(history.previousStatus());
        entity.setNewStatus(history.newStatus());
        entity.setComment(history.comment());
        entity.setChangedAt(history.changedAt());
        entity.setChangedBy(history.changedBy());
        return entity;
    }
}

