package com.erppos.backend.erp.shared.domain.policy;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.function.Function;

/** LEGACY_UNCLASSIFIED is an explicit compatibility state, never an inferred classification. */
public enum QuantityPolicy {
    WHOLE, DECIMAL_2, LEGACY_UNCLASSIFIED;

    private static final BigDecimal MAX = new BigDecimal("9999999999999.999");

    public BigDecimal validateNew(BigDecimal value, Function<String, ? extends RuntimeException> error) {
        if (value == null || value.signum() <= 0) throw error.apply("quantity must be > 0");
        if (value.compareTo(MAX) > 0) throw error.apply("quantity exceeds NUMERIC(16,3) capacity");
        try {
            return value.setScale(this == DECIMAL_2 ? 2 : 0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw error.apply(this == DECIMAL_2 ? "quantity must have at most two decimals"
                    : "quantity must be an integer for " + name());
        }
    }

    public static QuantityPolicy fromStorage(String value) {
        if (value == null) return LEGACY_UNCLASSIFIED;
        QuantityPolicy policy = valueOf(value);
        if (policy == LEGACY_UNCLASSIFIED) throw new IllegalArgumentException("Invalid stored quantity policy");
        return policy;
    }

    public String storageValue() {
        return this == LEGACY_UNCLASSIFIED ? null : name();
    }
}
