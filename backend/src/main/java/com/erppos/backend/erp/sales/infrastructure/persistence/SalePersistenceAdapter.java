package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.exception.SalesNotFoundException;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleItem;
import com.erppos.backend.erp.sales.domain.model.SalePayment;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import com.erppos.backend.erp.sales.domain.port.SaleRepositoryPort;
import com.erppos.backend.erp.sales.infrastructure.mapper.SaleMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class SalePersistenceAdapter implements SaleRepositoryPort {

    private final SaleJpaRepository saleJpaRepository;
    private final CashRegisterSessionJpaRepository cashRegisterSessionJpaRepository;

    public SalePersistenceAdapter(SaleJpaRepository saleJpaRepository,
                                  CashRegisterSessionJpaRepository cashRegisterSessionJpaRepository) {
        this.saleJpaRepository = saleJpaRepository;
        this.cashRegisterSessionJpaRepository = cashRegisterSessionJpaRepository;
    }

    @Override
    public Sale save(Sale sale) {
        CashRegisterSessionEntity cashSession = cashRegisterSessionJpaRepository.findById(sale.cashRegisterSessionId())
                .orElseThrow(() -> new SalesNotFoundException("Cash register session not found"));

        SaleEntity entity;
        if (sale.id() == null) {
            entity = SaleMapper.toEntity(sale, cashSession);
        } else {
            entity = saleJpaRepository.findById(sale.id()).orElseGet(SaleEntity::new);
            SaleMapper.merge(entity, sale, cashSession);
        }

        mergeItems(entity, sale.items());
        mergePayments(entity, sale.payments());
        return SaleMapper.toDomain(saleJpaRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Sale> findById(Long id) {
        return saleJpaRepository.findById(id).map(SaleMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Sale> findByFilters(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdBy) {
        return saleJpaRepository.findByFiltersWithDate(from, to, cashRegisterSessionId, status, createdBy)
                .stream()
                .map(SaleMapper::toDomain)
                .toList();
    }

    private void mergeItems(SaleEntity saleEntity, List<SaleItem> items) {
        Map<Long, SaleItemEntity> existing = new HashMap<>();
        for (SaleItemEntity itemEntity : saleEntity.getItems()) {
            existing.put(itemEntity.getId(), itemEntity);
        }

        saleEntity.getItems().clear();
        for (SaleItem item : items) {
            SaleItemEntity entity;
            if (item.id() != null && existing.containsKey(item.id())) {
                entity = existing.get(item.id());
                SaleMapper.mergeItem(entity, item, saleEntity);
            } else {
                entity = SaleMapper.toItemEntity(item, saleEntity);
            }
            saleEntity.getItems().add(entity);
        }
    }

    private void mergePayments(SaleEntity saleEntity, List<SalePayment> payments) {
        saleEntity.getPayments().clear();
        for (SalePayment payment : payments) {
            saleEntity.getPayments().add(SaleMapper.toPaymentEntity(payment, saleEntity));
        }
    }
}

