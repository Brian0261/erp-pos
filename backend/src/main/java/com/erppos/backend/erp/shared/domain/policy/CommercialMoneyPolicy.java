package com.erppos.backend.erp.shared.domain.policy;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.function.Function;

/** Exact commercial PEN amounts; rounding is reserved for derived line amounts. */
public final class CommercialMoneyPolicy {
    public static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal MAX = new BigDecimal("999999999999.99");

    private CommercialMoneyPolicy() { }

    public static BigDecimal exact(BigDecimal value, String field,
                                   Function<String, ? extends RuntimeException> error) {
        if (value == null) throw error.apply(field + " is required");
        // Bound before rescaling also avoids expanding an unbounded exponent.
        if (value.abs().compareTo(MAX) > 0) throw error.apply(field + " exceeds NUMERIC(14,2) capacity");
        try {
            return value.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw error.apply(field + " must be exactly representable with two decimals");
        }
    }

    public static BigDecimal nonNegative(BigDecimal value, String field,
                                         Function<String, ? extends RuntimeException> error) {
        BigDecimal amount = exact(value, field, error);
        if (amount.signum() < 0) throw error.apply(field + " must be >= 0");
        return amount;
    }

    public static BigDecimal positive(BigDecimal value, String field,
                                      Function<String, ? extends RuntimeException> error) {
        BigDecimal amount = nonNegative(value, field, error);
        if (amount.signum() == 0) throw error.apply(field + " must be > 0");
        return amount;
    }

    public static Line line(BigDecimal price, BigDecimal quantity, BigDecimal discount,
                            Function<String, ? extends RuntimeException> error) {
        if (quantity == null || quantity.signum() <= 0) throw error.apply("quantity must be > 0");
        BigDecimal unitPrice = nonNegative(price, "unitPrice", error);
        BigDecimal gross = nonNegative(unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP),
                "line subtotal", error);
        if (unitPrice.signum() > 0 && quantity.signum() > 0 && gross.signum() == 0) {
            throw error.apply("Positive line amount is below one cent; rounding cannot create a free item");
        }
        BigDecimal fixedDiscount = nonNegative(discount == null ? ZERO : discount, "discountAmount", error);
        if (fixedDiscount.compareTo(gross) > 0) throw error.apply("discountAmount cannot exceed item subtotal");
        return new Line(unitPrice, gross, fixedDiscount, gross.subtract(fixedDiscount));
    }

    public record Line(BigDecimal unitPrice, BigDecimal gross, BigDecimal discount, BigDecimal net) { }
}
