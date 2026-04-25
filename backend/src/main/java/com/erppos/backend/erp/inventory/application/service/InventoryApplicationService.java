package com.erppos.backend.erp.inventory.application.service;

import com.erppos.backend.erp.inventory.application.usecase.InventoryUseCase;
import com.erppos.backend.erp.inventory.application.usecase.RegisterAdjustmentCommand;
import com.erppos.backend.erp.inventory.application.usecase.RegisterInitialStockCommand;
import com.erppos.backend.erp.inventory.application.usecase.RegisterPurchaseInCommand;
import com.erppos.backend.erp.inventory.application.usecase.TransferStockCommand;
import com.erppos.backend.erp.inventory.application.usecase.TransferStockItemCommand;
import com.erppos.backend.erp.inventory.domain.exception.InventoryBusinessRuleException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryConflictException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryNotFoundException;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovementType;
import com.erppos.backend.erp.inventory.domain.model.InventoryProductSnapshot;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import com.erppos.backend.erp.inventory.domain.model.StockTransferItem;
import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.inventory.domain.port.InventoryMovementRepositoryPort;
import com.erppos.backend.erp.inventory.domain.port.InventoryProductReadPort;
import com.erppos.backend.erp.inventory.domain.port.StockBalanceRepositoryPort;
import com.erppos.backend.erp.inventory.domain.port.StockTransferRepositoryPort;
import com.erppos.backend.erp.inventory.domain.port.WarehouseRepositoryPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class InventoryApplicationService implements InventoryUseCase {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final StockBalanceRepositoryPort stockBalanceRepositoryPort;
    private final InventoryMovementRepositoryPort inventoryMovementRepositoryPort;
    private final WarehouseRepositoryPort warehouseRepositoryPort;
    private final InventoryProductReadPort inventoryProductReadPort;
    private final StockTransferRepositoryPort stockTransferRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public InventoryApplicationService(
            StockBalanceRepositoryPort stockBalanceRepositoryPort,
            InventoryMovementRepositoryPort inventoryMovementRepositoryPort,
            WarehouseRepositoryPort warehouseRepositoryPort,
            InventoryProductReadPort inventoryProductReadPort,
            StockTransferRepositoryPort stockTransferRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.stockBalanceRepositoryPort = stockBalanceRepositoryPort;
        this.inventoryMovementRepositoryPort = inventoryMovementRepositoryPort;
        this.warehouseRepositoryPort = warehouseRepositoryPort;
        this.inventoryProductReadPort = inventoryProductReadPort;
        this.stockTransferRepositoryPort = stockTransferRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public Page<StockBalance> listStocks(Long productId, Long warehouseId, Pageable pageable) {
        return stockBalanceRepositoryPort.findByFilters(productId, warehouseId, pageable);
    }

    @Override
    @Transactional
    public InventoryMovement registerInitialStock(RegisterInitialStockCommand command) {
        ensureProductActive(command.productId());
        ensureWarehouseActive(command.warehouseId());

        if (inventoryMovementRepositoryPort.existsByProductIdAndWarehouseId(command.productId(), command.warehouseId())) {
            throw new InventoryBusinessRuleException("Initial stock already registered for this product in the warehouse");
        }

        BigDecimal quantity = normalizeQuantity(command.quantity());
        StockBalance current = stockBalanceRepositoryPort.findByProductIdAndWarehouseIdForUpdate(command.productId(), command.warehouseId())
                .orElse(null);
        BigDecimal previous = current == null ? ZERO : current.quantity();
        BigDecimal next = quantity;

        StockBalance savedBalance = stockBalanceRepositoryPort.save(new StockBalance(
                current == null ? null : current.id(),
                command.productId(),
                command.warehouseId(),
                next,
                current == null ? null : current.version(),
                current == null ? null : current.createdAt(),
                current == null ? null : current.updatedAt()
        ));

        return inventoryMovementRepositoryPort.save(new InventoryMovement(
                null,
                command.productId(),
                command.warehouseId(),
                InventoryMovementType.INITIAL_STOCK,
                quantity,
                previous,
                next,
                command.reason().trim(),
                "INITIAL_STOCK",
                savedBalance.id() == null ? null : savedBalance.id().toString(),
                null,
                auditUserProvider.currentUsername()
        ));
    }

    @Override
    @Transactional
    public InventoryMovement registerAdjustment(RegisterAdjustmentCommand command) {
        ensureProductActive(command.productId());
        ensureWarehouseActive(command.warehouseId());

        BigDecimal quantity = normalizeQuantity(command.quantity());
        StockBalance current = stockBalanceRepositoryPort.findByProductIdAndWarehouseIdForUpdate(command.productId(), command.warehouseId())
                .orElse(null);

        BigDecimal previous = current == null ? ZERO : current.quantity();
        BigDecimal next = command.positive() ? previous.add(quantity) : previous.subtract(quantity);
        if (next.compareTo(ZERO) < 0) {
            throw new InventoryBusinessRuleException("Adjustment leaves negative stock");
        }

        stockBalanceRepositoryPort.save(new StockBalance(
                current == null ? null : current.id(),
                command.productId(),
                command.warehouseId(),
                next,
                current == null ? null : current.version(),
                current == null ? null : current.createdAt(),
                current == null ? null : current.updatedAt()
        ));

        return inventoryMovementRepositoryPort.save(new InventoryMovement(
                null,
                command.productId(),
                command.warehouseId(),
                command.positive() ? InventoryMovementType.ADJUSTMENT_IN : InventoryMovementType.ADJUSTMENT_OUT,
                quantity,
                previous,
                next,
                command.reason().trim(),
                "ADJUSTMENT",
                null,
                null,
                auditUserProvider.currentUsername()
        ));
    }

    @Override
    @Transactional
    public StockTransfer transfer(TransferStockCommand command) {
        if (command.sourceWarehouseId().equals(command.targetWarehouseId())) {
            throw new InventoryBusinessRuleException("Source and target warehouses must be different");
        }
        if (command.items() == null || command.items().isEmpty()) {
            throw new InventoryBusinessRuleException("Transfer must include at least one item");
        }

        ensureWarehouseActive(command.sourceWarehouseId());
        ensureWarehouseActive(command.targetWarehouseId());

        List<TransferStockItemCommand> normalizedItems = mergeDuplicatedItems(command.items());
        for (TransferStockItemCommand item : normalizedItems) {
            ensureProductActive(item.productId());
        }

        String actor = auditUserProvider.currentUsername();
        StockTransfer transfer = stockTransferRepositoryPort.saveTransfer(new StockTransfer(
                null,
                command.sourceWarehouseId(),
                command.targetWarehouseId(),
                "COMPLETED",
                command.reason().trim(),
                null,
                actor
        ));

        List<StockTransferItem> transferItems = new ArrayList<>();
        for (TransferStockItemCommand item : normalizedItems) {
            BigDecimal quantity = normalizeQuantity(item.quantity());

            StockBalance sourceBalance = stockBalanceRepositoryPort
                    .findByProductIdAndWarehouseIdForUpdate(item.productId(), command.sourceWarehouseId())
                    .orElse(new StockBalance(null, item.productId(), command.sourceWarehouseId(), ZERO, null, null, null));
            StockBalance targetBalance = stockBalanceRepositoryPort
                    .findByProductIdAndWarehouseIdForUpdate(item.productId(), command.targetWarehouseId())
                    .orElse(new StockBalance(null, item.productId(), command.targetWarehouseId(), ZERO, null, null, null));

            BigDecimal sourcePrevious = sourceBalance.quantity();
            BigDecimal sourceNext = sourcePrevious.subtract(quantity);
            if (sourceNext.compareTo(ZERO) < 0) {
                throw new InventoryConflictException("Insufficient stock for transfer");
            }

            BigDecimal targetPrevious = targetBalance.quantity();
            BigDecimal targetNext = targetPrevious.add(quantity);

            stockBalanceRepositoryPort.save(new StockBalance(
                    sourceBalance.id(),
                    sourceBalance.productId(),
                    sourceBalance.warehouseId(),
                    sourceNext,
                    sourceBalance.version(),
                    sourceBalance.createdAt(),
                    sourceBalance.updatedAt()
            ));

            stockBalanceRepositoryPort.save(new StockBalance(
                    targetBalance.id(),
                    targetBalance.productId(),
                    targetBalance.warehouseId(),
                    targetNext,
                    targetBalance.version(),
                    targetBalance.createdAt(),
                    targetBalance.updatedAt()
            ));

            inventoryMovementRepositoryPort.save(new InventoryMovement(
                    null,
                    item.productId(),
                    command.sourceWarehouseId(),
                    InventoryMovementType.TRANSFER_OUT,
                    quantity,
                    sourcePrevious,
                    sourceNext,
                    command.reason().trim(),
                    "TRANSFER",
                    transfer.id().toString(),
                    null,
                    actor
            ));
            inventoryMovementRepositoryPort.save(new InventoryMovement(
                    null,
                    item.productId(),
                    command.targetWarehouseId(),
                    InventoryMovementType.TRANSFER_IN,
                    quantity,
                    targetPrevious,
                    targetNext,
                    command.reason().trim(),
                    "TRANSFER",
                    transfer.id().toString(),
                    null,
                    actor
            ));

            transferItems.add(new StockTransferItem(null, transfer.id(), item.productId(), quantity));
        }

        stockTransferRepositoryPort.saveItems(transferItems);
        return transfer;
    }

    @Override
    @Transactional
    public InventoryMovement registerPurchaseIn(RegisterPurchaseInCommand command) {
        ensureProductActive(command.productId());
        ensureWarehouseActive(command.warehouseId());

        BigDecimal quantity = normalizeQuantity(command.quantity());
        if (quantity.compareTo(ZERO) <= 0) {
            throw new InventoryBusinessRuleException("Purchase quantity must be > 0");
        }

        StockBalance current = stockBalanceRepositoryPort.findByProductIdAndWarehouseIdForUpdate(command.productId(), command.warehouseId())
                .orElse(null);

        BigDecimal previous = current == null ? ZERO : current.quantity();
        BigDecimal next = previous.add(quantity);

        stockBalanceRepositoryPort.save(new StockBalance(
                current == null ? null : current.id(),
                command.productId(),
                command.warehouseId(),
                next,
                current == null ? null : current.version(),
                current == null ? null : current.createdAt(),
                current == null ? null : current.updatedAt()
        ));

        String reason = command.reason() == null ? "Purchase reception" : command.reason().trim();
        String referenceType = command.referenceType() == null ? "PURCHASE_RECEIPT" : command.referenceType().trim();

        return inventoryMovementRepositoryPort.save(new InventoryMovement(
                null,
                command.productId(),
                command.warehouseId(),
                InventoryMovementType.PURCHASE_IN,
                quantity,
                previous,
                next,
                reason,
                referenceType,
                command.referenceId(),
                null,
                auditUserProvider.currentUsername()
        ));
    }

    @Override
    public List<InventoryMovement> kardex(Long productId, Long warehouseId, LocalDate from, LocalDate to) {
        Instant fromInclusive = from == null ? null : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toExclusive = to == null ? null : to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return inventoryMovementRepositoryPort.findKardex(productId, warehouseId, fromInclusive, toExclusive);
    }

    private void ensureProductActive(Long productId) {
        InventoryProductSnapshot product = inventoryProductReadPort.findById(productId)
                .orElseThrow(() -> new InventoryNotFoundException("Product not found"));
        if (!product.active()) {
            throw new InventoryBusinessRuleException("Product is inactive");
        }
    }

    private Warehouse ensureWarehouseActive(Long warehouseId) {
        Warehouse warehouse = warehouseRepositoryPort.findById(warehouseId)
                .orElseThrow(() -> new InventoryNotFoundException("Warehouse not found"));
        if (!warehouse.active()) {
            throw new InventoryBusinessRuleException("Warehouse is inactive");
        }
        return warehouse;
    }

    private BigDecimal normalizeQuantity(BigDecimal quantity) {
        return quantity.stripTrailingZeros();
    }

    private List<TransferStockItemCommand> mergeDuplicatedItems(List<TransferStockItemCommand> items) {
        Map<Long, BigDecimal> merged = new LinkedHashMap<>();
        for (TransferStockItemCommand item : items) {
            merged.merge(item.productId(), item.quantity(), BigDecimal::add);
        }
        return merged.entrySet().stream()
                .map(e -> new TransferStockItemCommand(e.getKey(), e.getValue()))
                .toList();
    }
}

