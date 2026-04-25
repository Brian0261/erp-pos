package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.inventory.application.usecase.InventoryUseCase;
import com.erppos.backend.erp.inventory.application.usecase.RegisterPurchaseInCommand;
import com.erppos.backend.erp.purchases.domain.port.InventoryIngressPort;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class InventoryIngressAdapter implements InventoryIngressPort {

    private final InventoryUseCase inventoryUseCase;

    public InventoryIngressAdapter(InventoryUseCase inventoryUseCase) {
        this.inventoryUseCase = inventoryUseCase;
    }

    @Override
    public void registerPurchaseIn(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
        inventoryUseCase.registerPurchaseIn(new RegisterPurchaseInCommand(
                productId,
                warehouseId,
                quantity,
                reason,
                referenceType,
                referenceId
        ));
    }
}

