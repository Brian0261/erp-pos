package com.erppos.backend.erp.inventory.application.usecase;

import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface InventoryUseCase {
    Page<StockBalance> listStocks(Long productId, Long warehouseId, Pageable pageable);
    InventoryMovement registerInitialStock(RegisterInitialStockCommand command);
    InventoryMovement registerAdjustment(RegisterAdjustmentCommand command);
    InventoryMovement registerPurchaseIn(RegisterPurchaseInCommand command);
    InventoryMovement registerSaleOut(RegisterSaleOutCommand command);
    InventoryMovement registerSaleVoidIn(RegisterSaleVoidInCommand command);
    StockTransfer transfer(TransferStockCommand command);
    Page<InventoryMovement> kardex(Long productId, Long warehouseId, LocalDate from, LocalDate to, Pageable pageable);
}
