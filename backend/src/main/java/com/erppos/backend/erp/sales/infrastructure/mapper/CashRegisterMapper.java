package com.erppos.backend.erp.sales.infrastructure.mapper;

import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;
import com.erppos.backend.erp.sales.infrastructure.persistence.CashRegisterSessionEntity;

public final class CashRegisterMapper {
    private CashRegisterMapper() {
    }

    public static CashRegisterSession toDomain(CashRegisterSessionEntity entity) {
        return new CashRegisterSession(
                entity.getId(),
                entity.getOpenedByUserId(),
                entity.getOpenedAt(),
                entity.getClosedAt(),
                entity.getOpeningAmount(),
                entity.getCountedAmount(),
                entity.getExpectedCashAmount(),
                entity.getDifferenceAmount(),
                entity.getStatus(),
                entity.getNotes(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static CashRegisterSessionEntity toEntity(CashRegisterSession session) {
        CashRegisterSessionEntity entity = new CashRegisterSessionEntity();
        merge(entity, session);
        return entity;
    }

    public static void merge(CashRegisterSessionEntity entity, CashRegisterSession session) {
        entity.setOpenedByUserId(session.openedByUserId());
        entity.setOpenedAt(session.openedAt());
        entity.setClosedAt(session.closedAt());
        entity.setOpeningAmount(session.openingAmount());
        entity.setCountedAmount(session.countedAmount());
        entity.setExpectedCashAmount(session.expectedCashAmount());
        entity.setDifferenceAmount(session.differenceAmount());
        entity.setStatus(session.status());
        entity.setNotes(session.notes());
    }
}

