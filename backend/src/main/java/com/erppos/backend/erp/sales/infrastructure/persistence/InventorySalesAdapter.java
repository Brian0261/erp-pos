package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.inventory.application.usecase.InventoryUseCase;
import com.erppos.backend.erp.inventory.application.usecase.RegisterSaleOutCommand;
import com.erppos.backend.erp.inventory.application.usecase.RegisterSaleVoidInCommand;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class InventorySalesAdapter implements InventorySalesPort {

    private final InventoryUseCase inventoryUseCase;

    public InventorySalesAdapter(InventoryUseCase inventoryUseCase) {
        this.inventoryUseCase = inventoryUseCase;
    }

    @Override
    public BigDecimal stockAvailable(Long productId, Long warehouseId) {
        if (warehouseId != null) {
            return inventoryUseCase.listStocks(productId, warehouseId, Pageable.unpaged())
                    .stream()
                    .findFirst()
                    .map(stock -> stock.quantity())
                    .orElse(BigDecimal.ZERO);
        }
        return inventoryUseCase.listStocks(productId, null, Pageable.unpaged())
                .stream()
                .map(stock -> stock.quantity())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public void registerSaleOut(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
        inventoryUseCase.registerSaleOut(new RegisterSaleOutCommand(
                productId,
                warehouseId,
                quantity,
                reason,
                referenceType,
                referenceId
        ));
    }

    @Override
    public void registerSaleVoidIn(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId) {
        inventoryUseCase.registerSaleVoidIn(new RegisterSaleVoidInCommand(
                productId,
                warehouseId,
                quantity,
                reason,
                referenceType,
                referenceId
        ));
    }
}

