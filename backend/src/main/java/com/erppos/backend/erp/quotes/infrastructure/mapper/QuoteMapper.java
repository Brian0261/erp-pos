package com.erppos.backend.erp.quotes.infrastructure.mapper;

import com.erppos.backend.erp.quotes.domain.model.Quote;
import com.erppos.backend.erp.quotes.domain.model.QuoteItem;
import com.erppos.backend.erp.quotes.infrastructure.persistence.QuoteEntity;
import com.erppos.backend.erp.quotes.infrastructure.persistence.QuoteItemEntity;

import java.util.List;

public final class QuoteMapper {
    private QuoteMapper() {
    }

    public static Quote toDomain(QuoteEntity entity) {
        List<QuoteItem> items = entity.getItems().stream().map(QuoteMapper::toDomainItem).toList();
        return new Quote(
                entity.getId(),
                entity.getQuoteNumber(),
                entity.getCustomerName(),
                entity.getCustomerDocument(),
                entity.getCustomerPhone(),
                entity.getCustomerEmail(),
                entity.getStatus(),
                entity.getIssueDate(),
                entity.getExpiresAt(),
                entity.getSentAt(),
                entity.getConvertedSaleId(),
                entity.getSubtotalAmount(),
                entity.getDiscountAmount(),
                entity.getTotalAmount(),
                entity.getNotes(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                items
        );
    }

    public static QuoteItem toDomainItem(QuoteItemEntity entity) {
        return new QuoteItem(
                entity.getId(),
                entity.getQuote().getId(),
                entity.getProductId(),
                entity.getQuantity(),
                entity.getUnitPrice(),
                entity.getDiscountAmount(),
                entity.getLineTotal()
        );
    }

    public static QuoteEntity toEntity(Quote quote) {
        QuoteEntity entity = new QuoteEntity();
        merge(entity, quote);
        return entity;
    }

    public static void merge(QuoteEntity entity, Quote quote) {
        entity.setQuoteNumber(quote.quoteNumber());
        entity.setCustomerName(quote.customerName());
        entity.setCustomerDocument(quote.customerDocument());
        entity.setCustomerPhone(quote.customerPhone());
        entity.setCustomerEmail(quote.customerEmail());
        entity.setStatus(quote.status());
        entity.setIssueDate(quote.issueDate());
        entity.setExpiresAt(quote.expiresAt());
        entity.setSentAt(quote.sentAt());
        entity.setConvertedSaleId(quote.convertedSaleId());
        entity.setSubtotalAmount(quote.subtotalAmount());
        entity.setDiscountAmount(quote.discountAmount());
        entity.setTotalAmount(quote.totalAmount());
        entity.setNotes(quote.notes());
        entity.setCreatedBy(quote.createdBy());
        entity.setUpdatedBy(quote.updatedBy());
    }

    public static QuoteItemEntity toItemEntity(QuoteItem item, QuoteEntity quoteEntity) {
        QuoteItemEntity entity = new QuoteItemEntity();
        mergeItem(entity, item, quoteEntity);
        return entity;
    }

    public static void mergeItem(QuoteItemEntity entity, QuoteItem item, QuoteEntity quoteEntity) {
        entity.setQuote(quoteEntity);
        entity.setProductId(item.productId());
        entity.setQuantity(item.quantity());
        entity.setUnitPrice(item.unitPrice());
        entity.setDiscountAmount(item.discountAmount());
        entity.setLineTotal(item.lineTotal());
    }
}

