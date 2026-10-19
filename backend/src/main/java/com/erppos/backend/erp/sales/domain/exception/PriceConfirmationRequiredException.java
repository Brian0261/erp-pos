package com.erppos.backend.erp.sales.domain.exception;

import java.math.BigDecimal;
import java.util.List;

public class PriceConfirmationRequiredException extends RuntimeException {
    private final BigDecimal confirmedTotal;
    private final BigDecimal proposedTotal;
    private final List<PriceChange> changes;
    public PriceConfirmationRequiredException(BigDecimal confirmedTotal, BigDecimal proposedTotal, List<PriceChange> changes) {
        super("Los precios o el total cambiaron. Revisa las diferencias y confirma nuevamente.");
        this.confirmedTotal = confirmedTotal;
        this.proposedTotal = proposedTotal;
        this.changes = List.copyOf(changes);
    }
    public BigDecimal confirmedTotal() { return confirmedTotal; }
    public BigDecimal proposedTotal() { return proposedTotal; }
    public List<PriceChange> changes() { return changes; }
    public record PriceChange(Long productId, BigDecimal confirmedUnitPrice, BigDecimal currentUnitPrice) {}
}
