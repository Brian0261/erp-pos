package com.erppos.backend.erp.sales.application.service;

import com.erppos.backend.erp.security.domain.RoleName;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSaleItemCommand;
import com.erppos.backend.erp.sales.application.usecase.CreateSalePaymentCommand;
import com.erppos.backend.erp.sales.application.usecase.SalesUseCase;
import com.erppos.backend.erp.sales.application.usecase.VoidSaleCommand;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.sales.domain.exception.SalesNotFoundException;
import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;
import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import com.erppos.backend.erp.sales.domain.model.PaymentMethod;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleItem;
import com.erppos.backend.erp.sales.domain.model.SalePayment;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import com.erppos.backend.erp.sales.domain.port.CashRegisterRepositoryPort;
import com.erppos.backend.erp.sales.domain.port.CatalogReadPort;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import com.erppos.backend.erp.sales.domain.port.SaleRepositoryPort;
import com.erppos.backend.erp.sales.domain.port.WarehouseReadPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SalesApplicationService implements SalesUseCase {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final SaleRepositoryPort saleRepositoryPort;
    private final CashRegisterRepositoryPort cashRegisterRepositoryPort;
    private final CatalogReadPort catalogReadPort;
    private final WarehouseReadPort warehouseReadPort;
    private final InventorySalesPort inventorySalesPort;
    private final AuditUserProvider auditUserProvider;

    public SalesApplicationService(
            SaleRepositoryPort saleRepositoryPort,
            CashRegisterRepositoryPort cashRegisterRepositoryPort,
            CatalogReadPort catalogReadPort,
            WarehouseReadPort warehouseReadPort,
            InventorySalesPort inventorySalesPort,
            AuditUserProvider auditUserProvider
    ) {
        this.saleRepositoryPort = saleRepositoryPort;
        this.cashRegisterRepositoryPort = cashRegisterRepositoryPort;
        this.catalogReadPort = catalogReadPort;
        this.warehouseReadPort = warehouseReadPort;
        this.inventorySalesPort = inventorySalesPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public Sale create(CreateSaleCommand command) {
        CashRegisterSession cashSession = cashRegisterRepositoryPort.findOpenByUserId(auditUserProvider.currentUserId())
                .orElseThrow(() -> new SalesConflictException("Current user does not have an OPEN cash register"));

        if (cashSession.status() != CashRegisterStatus.OPEN) {
            throw new SalesConflictException("Cash register session is not OPEN");
        }

        if (!warehouseReadPort.existsAndActive(command.warehouseId())) {
            throw new SalesNotFoundException("Warehouse not found or inactive");
        }

        if (command.items() == null || command.items().isEmpty()) {
            throw new SalesBusinessRuleException("Sale must include at least one item");
        }

        if (command.payments() == null || command.payments().isEmpty()) {
            throw new SalesBusinessRuleException("Sale must include at least one payment");
        }

        List<SaleItem> items = new ArrayList<>();
        BigDecimal subtotal = ZERO;
        BigDecimal discountTotal = ZERO;

        Map<Long, Boolean> seenProducts = new HashMap<>();
        for (CreateSaleItemCommand itemCommand : command.items()) {
            if (seenProducts.put(itemCommand.productId(), Boolean.TRUE) != null) {
                throw new SalesBusinessRuleException("Duplicated product in sale items");
            }

            PosProductSnapshot product = catalogReadPort.findById(itemCommand.productId())
                    .orElseThrow(() -> new SalesNotFoundException("Product not found"));
            if (!product.active()) {
                throw new SalesBusinessRuleException("Product is inactive");
            }

            BigDecimal quantity = normalize(itemCommand.quantity());
            if (quantity.compareTo(ZERO) <= 0) {
                throw new SalesBusinessRuleException("Item quantity must be > 0");
            }

            BigDecimal unitPrice = normalize(product.salePrice());
            BigDecimal itemSubtotal = unitPrice.multiply(quantity);
            BigDecimal itemDiscount = normalize(defaultZero(itemCommand.discountAmount()));
            if (itemDiscount.compareTo(ZERO) < 0) {
                throw new SalesBusinessRuleException("discountAmount must be >= 0");
            }
            if (itemDiscount.compareTo(itemSubtotal) > 0) {
                throw new SalesBusinessRuleException("discountAmount cannot exceed item subtotal");
            }

            BigDecimal stock = inventorySalesPort.stockAvailable(product.id(), command.warehouseId());
            if (stock.compareTo(quantity) < 0) {
                throw new SalesConflictException("Insufficient stock for product " + product.sku());
            }

            BigDecimal lineTotal = itemSubtotal.subtract(itemDiscount);
            items.add(new SaleItem(null, null, product.id(), quantity, unitPrice, itemDiscount, lineTotal));

            subtotal = subtotal.add(itemSubtotal);
            discountTotal = discountTotal.add(itemDiscount);
        }

        BigDecimal total = subtotal.subtract(discountTotal);
        if (total.compareTo(ZERO) < 0) {
            throw new SalesBusinessRuleException("Total cannot be negative");
        }

        List<SalePayment> payments = new ArrayList<>();
        BigDecimal paid = ZERO;
        BigDecimal cashPaid = ZERO;
        for (CreateSalePaymentCommand paymentCommand : command.payments()) {
            if (paymentCommand.paymentMethod() == null) {
                throw new SalesBusinessRuleException("paymentMethod is required");
            }
            BigDecimal amount = normalize(paymentCommand.amount());
            if (amount.compareTo(ZERO) <= 0) {
                throw new SalesBusinessRuleException("Payment amount must be > 0");
            }

            paid = paid.add(amount);
            if (paymentCommand.paymentMethod() == PaymentMethod.CASH) {
                cashPaid = cashPaid.add(amount);
            }
            payments.add(new SalePayment(null, null, paymentCommand.paymentMethod(), amount, trimToNull(paymentCommand.reference()), null));
        }

        if (paid.compareTo(total) < 0) {
            throw new SalesBusinessRuleException("Paid amount does not cover sale total");
        }

        BigDecimal change = ZERO;
        if (paid.compareTo(total) > 0 && cashPaid.compareTo(ZERO) > 0) {
            change = paid.subtract(total);
        }

        String saleNumber = generateSaleNumber();
        Sale sale = new Sale(
                null,
                cashSession.id(),
                command.warehouseId(),
                saleNumber,
                SaleStatus.COMPLETED,
                subtotal,
                discountTotal,
                total,
                paid,
                change,
                Instant.now(),
                null,
                null,
                null,
                auditUserProvider.currentUsername(),
                null,
                null,
                items,
                payments
        );

        Sale saved = saleRepositoryPort.save(sale);

        for (SaleItem item : saved.items()) {
            inventorySalesPort.registerSaleOut(
                    item.productId(),
                    saved.warehouseId(),
                    item.quantity(),
                    "Sale " + saved.saleNumber(),
                    "SALE",
                    saved.id().toString()
            );
        }

        return saved;
    }

    @Override
    public List<Sale> list(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdByFilter) {
        String createdBy = createdByFilter;
        if (auditUserProvider.hasRole(RoleName.CAJERO)) {
            createdBy = auditUserProvider.currentUsername();
        }
        return saleRepositoryPort.findByFilters(from, to, cashRegisterSessionId, status, createdBy);
    }

    @Override
    public Sale getById(Long id) {
        Sale sale = saleRepositoryPort.findById(id)
                .orElseThrow(() -> new SalesNotFoundException("Sale not found"));
        if (auditUserProvider.hasRole(RoleName.CAJERO) && !auditUserProvider.currentUsername().equals(sale.createdBy())) {
            throw new SalesBusinessRuleException("Cashier can only view own sales");
        }
        return sale;
    }

    @Override
    @Transactional
    public Sale voidSale(Long id, VoidSaleCommand command) {
        Sale current = getById(id);
        if (current.status() != SaleStatus.COMPLETED) {
            throw new SalesConflictException("Only COMPLETED sales can be voided");
        }

        String reason = trimToNull(command.reason());
        if (reason == null) {
            throw new SalesBusinessRuleException("voidReason is required");
        }

        CashRegisterSession cashSession = cashRegisterRepositoryPort.findById(current.cashRegisterSessionId())
                .orElseThrow(() -> new SalesNotFoundException("Cash register session not found"));
        if (cashSession.status() == CashRegisterStatus.CLOSED) {
            throw new SalesBusinessRuleException("Cannot void sale from CLOSED cash register session");
        }

        for (SaleItem item : current.items()) {
            inventorySalesPort.registerSaleVoidIn(
                    item.productId(),
                    current.warehouseId(),
                    item.quantity(),
                    "Sale void " + current.saleNumber(),
                    "SALE_VOID",
                    current.id().toString()
            );
        }

        Sale voided = new Sale(
                current.id(),
                current.cashRegisterSessionId(),
                current.warehouseId(),
                current.saleNumber(),
                SaleStatus.VOIDED,
                current.subtotalAmount(),
                current.discountAmount(),
                current.totalAmount(),
                current.paidAmount(),
                current.changeAmount(),
                current.soldAt(),
                Instant.now(),
                auditUserProvider.currentUserId(),
                reason,
                current.createdBy(),
                current.createdAt(),
                current.updatedAt(),
                current.items(),
                current.payments()
        );
        return saleRepositoryPort.save(voided);
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private BigDecimal normalize(BigDecimal value) {
        if (value == null) {
            return ZERO;
        }
        return value.stripTrailingZeros();
    }

    private String generateSaleNumber() {
        return "S-" + Instant.now().toEpochMilli();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

