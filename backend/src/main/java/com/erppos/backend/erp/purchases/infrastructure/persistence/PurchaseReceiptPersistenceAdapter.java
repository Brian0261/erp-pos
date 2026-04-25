package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.purchases.domain.exception.PurchaseNotFoundException;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceipt;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceiptItem;
import com.erppos.backend.erp.purchases.domain.port.PurchaseReceiptRepositoryPort;
import com.erppos.backend.erp.purchases.infrastructure.mapper.PurchaseReceiptMapper;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class PurchaseReceiptPersistenceAdapter implements PurchaseReceiptRepositoryPort {

    private final PurchaseReceiptJpaRepository purchaseReceiptJpaRepository;
    private final PurchaseOrderJpaRepository purchaseOrderJpaRepository;

    public PurchaseReceiptPersistenceAdapter(PurchaseReceiptJpaRepository purchaseReceiptJpaRepository,
                                            PurchaseOrderJpaRepository purchaseOrderJpaRepository) {
        this.purchaseReceiptJpaRepository = purchaseReceiptJpaRepository;
        this.purchaseOrderJpaRepository = purchaseOrderJpaRepository;
    }

    @Override
    public PurchaseReceipt save(PurchaseReceipt purchaseReceipt) {
        PurchaseOrderEntity orderEntity = purchaseOrderJpaRepository.findById(purchaseReceipt.purchaseOrderId())
                .orElseThrow(() -> new PurchaseNotFoundException("Purchase order not found"));

        PurchaseReceiptEntity entity = PurchaseReceiptMapper.toEntity(purchaseReceipt);
        entity.setPurchaseOrder(orderEntity);

        Map<Long, PurchaseOrderItemEntity> orderItemsById = new HashMap<>();
        for (PurchaseOrderItemEntity itemEntity : orderEntity.getItems()) {
            orderItemsById.put(itemEntity.getId(), itemEntity);
        }

        for (PurchaseReceiptItem item : purchaseReceipt.items()) {
            PurchaseOrderItemEntity orderItem = orderItemsById.get(item.purchaseOrderItemId());
            if (orderItem == null) {
                throw new PurchaseNotFoundException("Purchase order item not found");
            }
            entity.getItems().add(PurchaseReceiptMapper.toItemEntity(item, entity, orderItem));
        }

        return PurchaseReceiptMapper.toDomain(purchaseReceiptJpaRepository.save(entity));
    }

    @Override
    public boolean existsByPurchaseOrderId(Long purchaseOrderId) {
        return purchaseReceiptJpaRepository.existsByPurchaseOrderId(purchaseOrderId);
    }
}

