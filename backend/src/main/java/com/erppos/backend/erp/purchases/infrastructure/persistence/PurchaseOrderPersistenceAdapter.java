package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.purchases.domain.exception.PurchaseNotFoundException;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderItem;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;
import com.erppos.backend.erp.purchases.domain.port.PurchaseOrderRepositoryPort;
import com.erppos.backend.erp.purchases.infrastructure.mapper.PurchaseOrderMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class PurchaseOrderPersistenceAdapter implements PurchaseOrderRepositoryPort {

    private final PurchaseOrderJpaRepository purchaseOrderJpaRepository;
    private final SupplierJpaRepository supplierJpaRepository;

    public PurchaseOrderPersistenceAdapter(PurchaseOrderJpaRepository purchaseOrderJpaRepository,
                                           SupplierJpaRepository supplierJpaRepository) {
        this.purchaseOrderJpaRepository = purchaseOrderJpaRepository;
        this.supplierJpaRepository = supplierJpaRepository;
    }

    @Override
    public PurchaseOrder save(PurchaseOrder purchaseOrder) {
        SupplierEntity supplier = supplierJpaRepository.findById(purchaseOrder.supplierId())
                .orElseThrow(() -> new PurchaseNotFoundException("Supplier not found"));

        PurchaseOrderEntity entity;
        if (purchaseOrder.id() == null) {
            entity = PurchaseOrderMapper.toEntity(purchaseOrder, supplier);
        } else {
            entity = purchaseOrderJpaRepository.findById(purchaseOrder.id()).orElseGet(PurchaseOrderEntity::new);
            PurchaseOrderMapper.merge(entity, purchaseOrder, supplier);
        }

        mergeItems(entity, purchaseOrder.items());
        return PurchaseOrderMapper.toDomain(purchaseOrderJpaRepository.save(entity));
    }

    @Override
    public Optional<PurchaseOrder> findById(Long id) {
        return purchaseOrderJpaRepository.findById(id).map(PurchaseOrderMapper::toDomain);
    }

    @Override
    public List<PurchaseOrder> findByFilters(PurchaseOrderStatus status, Long supplierId, LocalDate from, LocalDate to) {
        return purchaseOrderJpaRepository.findByFilters(status, supplierId, from, to)
                .stream()
                .map(PurchaseOrderMapper::toDomain)
                .toList();
    }

    private void mergeItems(PurchaseOrderEntity entity, List<PurchaseOrderItem> items) {
        Map<Long, PurchaseOrderItemEntity> existingById = new HashMap<>();
        for (PurchaseOrderItemEntity existing : entity.getItems()) {
            existingById.put(existing.getId(), existing);
        }

        entity.getItems().clear();
        for (PurchaseOrderItem item : items) {
            PurchaseOrderItemEntity itemEntity;
            if (item.id() != null && existingById.containsKey(item.id())) {
                itemEntity = existingById.get(item.id());
                PurchaseOrderMapper.mergeItem(itemEntity, item, entity);
            } else {
                itemEntity = PurchaseOrderMapper.toItemEntity(item, entity);
            }
            entity.getItems().add(itemEntity);
        }
    }
}

