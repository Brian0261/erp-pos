package com.erppos.backend.erp.purchases.application.service;

import com.erppos.backend.erp.purchases.application.usecase.CreatePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.application.usecase.PurchaseOrderItemCommand;
import com.erppos.backend.erp.purchases.application.usecase.PurchaseOrderUseCase;
import com.erppos.backend.erp.purchases.application.usecase.ReceivePurchaseItemCommand;
import com.erppos.backend.erp.purchases.application.usecase.ReceivePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.application.usecase.UpdatePurchaseOrderCommand;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseBusinessRuleException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseConflictException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseNotFoundException;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrder;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderItem;
import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;
import com.erppos.backend.erp.purchases.domain.model.PurchaseProductSnapshot;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceipt;
import com.erppos.backend.erp.purchases.domain.model.PurchaseReceiptItem;
import com.erppos.backend.erp.purchases.domain.model.PurchaseWarehouseSnapshot;
import com.erppos.backend.erp.purchases.domain.model.Supplier;
import com.erppos.backend.erp.purchases.domain.port.InventoryIngressPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseOrderRepositoryPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseProductReadPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseReceiptRepositoryPort;
import com.erppos.backend.erp.purchases.domain.port.PurchaseWarehouseReadPort;
import com.erppos.backend.erp.purchases.domain.port.SupplierRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PurchaseOrderApplicationService implements PurchaseOrderUseCase {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final PurchaseOrderRepositoryPort purchaseOrderRepositoryPort;
    private final PurchaseReceiptRepositoryPort purchaseReceiptRepositoryPort;
    private final SupplierRepositoryPort supplierRepositoryPort;
    private final PurchaseWarehouseReadPort purchaseWarehouseReadPort;
    private final PurchaseProductReadPort purchaseProductReadPort;
    private final InventoryIngressPort inventoryIngressPort;
    private final AuditUserProvider auditUserProvider;

    public PurchaseOrderApplicationService(
            PurchaseOrderRepositoryPort purchaseOrderRepositoryPort,
            PurchaseReceiptRepositoryPort purchaseReceiptRepositoryPort,
            SupplierRepositoryPort supplierRepositoryPort,
            PurchaseWarehouseReadPort purchaseWarehouseReadPort,
            PurchaseProductReadPort purchaseProductReadPort,
            InventoryIngressPort inventoryIngressPort,
            AuditUserProvider auditUserProvider
    ) {
        this.purchaseOrderRepositoryPort = purchaseOrderRepositoryPort;
        this.purchaseReceiptRepositoryPort = purchaseReceiptRepositoryPort;
        this.supplierRepositoryPort = supplierRepositoryPort;
        this.purchaseWarehouseReadPort = purchaseWarehouseReadPort;
        this.purchaseProductReadPort = purchaseProductReadPort;
        this.inventoryIngressPort = inventoryIngressPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public PurchaseOrder create(CreatePurchaseOrderCommand command) {
        validateSupplierAndWarehouse(command.supplierId(), command.warehouseId());
        List<PurchaseOrderItem> items = buildItems(command.items(), null);
        BigDecimal totalAmount = calculateTotal(items);
        String actor = auditUserProvider.currentUsername();

        PurchaseOrder purchaseOrder = new PurchaseOrder(
                null,
                command.supplierId(),
                command.warehouseId(),
                PurchaseOrderStatus.DRAFT,
                command.orderDate() == null ? LocalDate.now() : command.orderDate(),
                command.expectedDate(),
                totalAmount,
                trimToNull(command.notes()),
                null,
                null,
                actor,
                actor,
                items
        );
        return purchaseOrderRepositoryPort.save(purchaseOrder);
    }

    @Override
    public List<PurchaseOrder> list(PurchaseOrderStatus status, Long supplierId, LocalDate from, LocalDate to) {
        return purchaseOrderRepositoryPort.findByFilters(status, supplierId, from, to);
    }

    @Override
    public PurchaseOrder getById(Long id) {
        return purchaseOrderRepositoryPort.findById(id)
                .orElseThrow(() -> new PurchaseNotFoundException("Purchase order not found"));
    }

    @Override
    @Transactional
    public PurchaseOrder update(Long id, UpdatePurchaseOrderCommand command) {
        PurchaseOrder current = getById(id);
        if (current.status() != PurchaseOrderStatus.DRAFT) {
            throw new PurchaseConflictException("Only DRAFT purchase orders can be edited");
        }

        validateSupplierAndWarehouse(command.supplierId(), command.warehouseId());
        List<PurchaseOrderItem> items = buildItems(command.items(), current.id());
        BigDecimal totalAmount = calculateTotal(items);

        PurchaseOrder toUpdate = new PurchaseOrder(
                current.id(),
                command.supplierId(),
                command.warehouseId(),
                current.status(),
                current.orderDate(),
                command.expectedDate(),
                totalAmount,
                trimToNull(command.notes()),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                items
        );
        return purchaseOrderRepositoryPort.save(toUpdate);
    }

    @Override
    @Transactional
    public PurchaseOrder approve(Long id) {
        PurchaseOrder current = getById(id);
        if (current.status() != PurchaseOrderStatus.DRAFT) {
            throw new PurchaseConflictException("Only DRAFT purchase orders can be approved");
        }
        if (current.items() == null || current.items().isEmpty()) {
            throw new PurchaseBusinessRuleException("Purchase order must have at least one item");
        }

        PurchaseOrder approved = new PurchaseOrder(
                current.id(),
                current.supplierId(),
                current.warehouseId(),
                PurchaseOrderStatus.APPROVED,
                current.orderDate(),
                current.expectedDate(),
                current.totalAmount(),
                current.notes(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                current.items()
        );
        return purchaseOrderRepositoryPort.save(approved);
    }

    @Override
    @Transactional
    public PurchaseOrder receive(Long id, ReceivePurchaseOrderCommand command) {
        PurchaseOrder current = getById(id);
        if (current.status() != PurchaseOrderStatus.APPROVED && current.status() != PurchaseOrderStatus.PARTIALLY_RECEIVED) {
            throw new PurchaseConflictException("Purchase order status does not allow reception");
        }
        if (command.items() == null || command.items().isEmpty()) {
            throw new PurchaseBusinessRuleException("Receipt must include at least one item");
        }

        Map<Long, ReceivePurchaseItemCommand> receiveByItemId = new HashMap<>();
        for (ReceivePurchaseItemCommand item : command.items()) {
            if (receiveByItemId.put(item.purchaseOrderItemId(), item) != null) {
                throw new PurchaseBusinessRuleException("Duplicated purchaseOrderItemId in receipt");
            }
        }

        List<PurchaseOrderItem> updatedItems = current.items().stream().map(item -> {
            ReceivePurchaseItemCommand receive = receiveByItemId.get(item.id());
            if (receive == null) {
                return item;
            }

            BigDecimal receivedQty = normalize(receive.quantityReceived());
            if (receivedQty.compareTo(ZERO) <= 0) {
                throw new PurchaseBusinessRuleException("Received quantity must be > 0");
            }

            BigDecimal pending = item.quantityOrdered().subtract(item.quantityReceived());
            if (receivedQty.compareTo(pending) > 0) {
                throw new PurchaseBusinessRuleException("Received quantity exceeds pending quantity");
            }

            return new PurchaseOrderItem(
                    item.id(),
                    item.purchaseOrderId(),
                    item.productId(),
                    item.quantityOrdered(),
                    item.quantityReceived().add(receivedQty),
                    item.unitCost(),
                    item.lineTotal()
            );
        }).toList();

        PurchaseReceipt receipt = purchaseReceiptRepositoryPort.save(new PurchaseReceipt(
                null,
                current.id(),
                command.receiptDate() == null ? LocalDate.now() : command.receiptDate(),
                trimToNull(command.notes()),
                null,
                auditUserProvider.currentUsername(),
                command.items().stream().map(i -> {
                    PurchaseOrderItem target = current.items().stream()
                            .filter(poItem -> poItem.id().equals(i.purchaseOrderItemId()))
                            .findFirst()
                            .orElseThrow(() -> new PurchaseBusinessRuleException("Purchase order item not found in order"));
                    return new PurchaseReceiptItem(
                            null,
                            null,
                            i.purchaseOrderItemId(),
                            target.productId(),
                            normalize(i.quantityReceived())
                    );
                }).toList()
        ));

        for (PurchaseReceiptItem receiptItem : receipt.items()) {
            inventoryIngressPort.registerPurchaseIn(
                    receiptItem.productId(),
                    current.warehouseId(),
                    receiptItem.quantityReceived(),
                    "Purchase receipt #" + receipt.id(),
                    "PURCHASE_RECEIPT",
                    receipt.id().toString()
            );
        }

        boolean fullyReceived = updatedItems.stream().allMatch(i -> i.quantityReceived().compareTo(i.quantityOrdered()) >= 0);
        PurchaseOrderStatus nextStatus = fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;

        PurchaseOrder updatedOrder = new PurchaseOrder(
                current.id(),
                current.supplierId(),
                current.warehouseId(),
                nextStatus,
                current.orderDate(),
                current.expectedDate(),
                current.totalAmount(),
                current.notes(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                updatedItems
        );
        return purchaseOrderRepositoryPort.save(updatedOrder);
    }

    @Override
    @Transactional
    public PurchaseOrder cancel(Long id) {
        PurchaseOrder current = getById(id);
        if (current.status() != PurchaseOrderStatus.DRAFT && current.status() != PurchaseOrderStatus.APPROVED) {
            throw new PurchaseConflictException("Only DRAFT or APPROVED purchase orders can be cancelled");
        }
        if (purchaseReceiptRepositoryPort.existsByPurchaseOrderId(current.id())) {
            throw new PurchaseBusinessRuleException("Cannot cancel a purchase order with receipts");
        }

        PurchaseOrder cancelled = new PurchaseOrder(
                current.id(),
                current.supplierId(),
                current.warehouseId(),
                PurchaseOrderStatus.CANCELLED,
                current.orderDate(),
                current.expectedDate(),
                current.totalAmount(),
                current.notes(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername(),
                current.items()
        );
        return purchaseOrderRepositoryPort.save(cancelled);
    }

    private void validateSupplierAndWarehouse(Long supplierId, Long warehouseId) {
        Supplier supplier = supplierRepositoryPort.findById(supplierId)
                .orElseThrow(() -> new PurchaseNotFoundException("Supplier not found"));
        if (!supplier.active()) {
            throw new PurchaseBusinessRuleException("Supplier is inactive");
        }

        PurchaseWarehouseSnapshot warehouse = purchaseWarehouseReadPort.findById(warehouseId)
                .orElseThrow(() -> new PurchaseNotFoundException("Warehouse not found"));
        if (!warehouse.active()) {
            throw new PurchaseBusinessRuleException("Warehouse is inactive");
        }
    }

    private List<PurchaseOrderItem> buildItems(List<PurchaseOrderItemCommand> itemCommands, Long orderId) {
        if (itemCommands == null || itemCommands.isEmpty()) {
            throw new PurchaseBusinessRuleException("Purchase order must include at least one item");
        }

        Map<Long, Boolean> seenProducts = new HashMap<>();
        return itemCommands.stream().map(item -> {
            if (seenProducts.put(item.productId(), Boolean.TRUE) != null) {
                throw new PurchaseBusinessRuleException("Duplicated product in purchase order items");
            }

            PurchaseProductSnapshot product = purchaseProductReadPort.findById(item.productId())
                    .orElseThrow(() -> new PurchaseNotFoundException("Product not found"));
            if (!product.active()) {
                throw new PurchaseBusinessRuleException("Product is inactive");
            }

            BigDecimal orderedQty = normalize(item.quantityOrdered());
            if (orderedQty.compareTo(ZERO) <= 0) {
                throw new PurchaseBusinessRuleException("quantityOrdered must be > 0");
            }

            BigDecimal unitCost = normalize(item.unitCost());
            if (unitCost.compareTo(ZERO) < 0) {
                throw new PurchaseBusinessRuleException("unitCost must be >= 0");
            }

            BigDecimal lineTotal = orderedQty.multiply(unitCost);
            return new PurchaseOrderItem(
                    null,
                    orderId,
                    item.productId(),
                    orderedQty,
                    ZERO,
                    unitCost,
                    lineTotal
            );
        }).toList();
    }

    private BigDecimal calculateTotal(List<PurchaseOrderItem> items) {
        return items.stream()
                .map(PurchaseOrderItem::lineTotal)
                .reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal normalize(BigDecimal value) {
        return value.stripTrailingZeros();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

