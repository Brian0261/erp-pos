package com.erppos.backend.erp.inventory.domain.port;

import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import com.erppos.backend.erp.inventory.domain.model.StockTransferItem;

import java.util.List;

public interface StockTransferRepositoryPort {
    StockTransfer saveTransfer(StockTransfer transfer);
    void saveItems(List<StockTransferItem> items);
}

