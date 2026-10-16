package com.erppos.backend.erp.shared.domain.policy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class CommercialMoneyPolicyTest {
    @ParameterizedTest
    @ValueSource(strings = {"0", "1.230", "999999999999.99", "1E+2"})
    void acceptsExactAmounts(String value) {
        assertEquals(2, CommercialMoneyPolicy.nonNegative(new BigDecimal(value), "amount", IllegalArgumentException::new).scale());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.505", "-1", "1000000000000", "0.0001", "1E+999"})
    void rejectsInvalidInputs(String value) {
        assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.nonNegative(
                new BigDecimal(value), "amount", IllegalArgumentException::new));
    }

    @Test
    void roundsHalfUpPerLineAndProtectsDiscounts() {
        var line = CommercialMoneyPolicy.line(new BigDecimal("0.01"), new BigDecimal("0.50"),
                BigDecimal.ZERO, IllegalArgumentException::new);
        assertEquals(new BigDecimal("0.01"), line.net());
        assertEquals(new BigDecimal("0.02"), line.net().add(line.net()));
        var free = CommercialMoneyPolicy.line(new BigDecimal("0.01"), new BigDecimal("0.50"),
                new BigDecimal("0.010"), IllegalArgumentException::new);
        assertEquals(new BigDecimal("0.00"), free.net());
        for (String discount : new String[]{"-0.01", "0.02", "0.005"}) {
            assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.line(new BigDecimal("0.01"),
                    new BigDecimal("0.50"), new BigDecimal(discount), IllegalArgumentException::new));
        }
    }

    @Test
    void preventsAccidentalFreeLinesButPreservesExplicitGratuity() {
        assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.line(new BigDecimal("0.01"),
                new BigDecimal("0.25"), null, IllegalArgumentException::new));
        assertEquals(CommercialMoneyPolicy.ZERO, CommercialMoneyPolicy.line(BigDecimal.ZERO,
                BigDecimal.ONE, null, IllegalArgumentException::new).net());
    }

    @Test
    void rejectsOverflowAndHandlesSignedCashDifference() {
        assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.line(new BigDecimal("999999999999.99"),
                new BigDecimal("2"), null, IllegalArgumentException::new));
        assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.exact(
                new BigDecimal("999999999999.99").add(new BigDecimal("0.01")), "total", IllegalArgumentException::new));
        assertEquals(new BigDecimal("-1.23"), CommercialMoneyPolicy.exact(new BigDecimal("-1.230"), "difference", IllegalArgumentException::new));
        assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.positive(BigDecimal.ZERO, "payment", IllegalArgumentException::new));
        assertThrows(IllegalArgumentException.class, () -> CommercialMoneyPolicy.exact(null, "amount", IllegalArgumentException::new));
    }
}
