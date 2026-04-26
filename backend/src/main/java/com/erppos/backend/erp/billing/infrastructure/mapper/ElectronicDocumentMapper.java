package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.infrastructure.persistence.BillingSeriesEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEntity;

public final class ElectronicDocumentMapper {
    private ElectronicDocumentMapper() {
    }

    public static ElectronicDocument toDomain(ElectronicDocumentEntity entity) {
        return new ElectronicDocument(
                entity.getId(),
                entity.getSaleId(),
                entity.getBillingSeries().getId(),
                entity.getDocumentType(),
                entity.getStatus(),
                entity.getEnvironment(),
                entity.getSeries(),
                entity.getNumber(),
                entity.getFullNumber(),
                entity.getCustomerName(),
                entity.getCustomerDocument(),
                entity.getCurrencyCode(),
                entity.getSubtotalAmount(),
                entity.getTaxAmount(),
                entity.getTotalAmount(),
                entity.getXmlGeneratedAt(),
                entity.getSignedAt(),
                entity.getSentAt(),
                entity.getProviderTicket(),
                entity.getProviderMessage(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static ElectronicDocumentEntity toEntity(ElectronicDocument document, BillingSeriesEntity seriesEntity) {
        ElectronicDocumentEntity entity = new ElectronicDocumentEntity();
        merge(entity, document, seriesEntity);
        return entity;
    }

    public static void merge(ElectronicDocumentEntity entity, ElectronicDocument document, BillingSeriesEntity seriesEntity) {
        entity.setSaleId(document.saleId());
        entity.setBillingSeries(seriesEntity);
        entity.setDocumentType(document.documentType());
        entity.setStatus(document.status());
        entity.setEnvironment(document.environment());
        entity.setSeries(document.series());
        entity.setNumber(document.number());
        entity.setFullNumber(document.fullNumber());
        entity.setCustomerName(document.customerName());
        entity.setCustomerDocument(document.customerDocument());
        entity.setCurrencyCode(document.currencyCode());
        entity.setSubtotalAmount(document.subtotalAmount());
        entity.setTaxAmount(document.taxAmount());
        entity.setTotalAmount(document.totalAmount());
        entity.setXmlGeneratedAt(document.xmlGeneratedAt());
        entity.setSignedAt(document.signedAt());
        entity.setSentAt(document.sentAt());
        entity.setProviderTicket(document.providerTicket());
        entity.setProviderMessage(document.providerMessage());
        entity.setCreatedBy(document.createdBy());
        entity.setUpdatedBy(document.updatedBy());
    }
}

