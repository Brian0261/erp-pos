package com.erppos.backend.erp.shared.domain.policy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.math.BigDecimal;
import java.math.BigInteger;
import static org.junit.jupiter.api.Assertions.*;

class QuantityPolicyTest {
    @ParameterizedTest
    @EnumSource(QuantityPolicy.class)
    void allPoliciesAcceptExactPositiveIntegers(QuantityPolicy policy) {
        assertEquals(0, BigDecimal.ONE.compareTo(policy.validateNew(new BigDecimal("1.000"), IllegalArgumentException::new)));
        for (String quantity : new String[]{"0", "-1", "0.0005", "10000000000000"}) {
            assertThrows(IllegalArgumentException.class, () -> policy.validateNew(new BigDecimal(quantity), IllegalArgumentException::new));
        }
        assertThrows(IllegalArgumentException.class, () -> policy.validateNew(null, IllegalArgumentException::new));
    }

    @ParameterizedTest
    @EnumSource(value = QuantityPolicy.class, names = {"WHOLE", "LEGACY_UNCLASSIFIED"})
    void wholeAndLegacyNeverTruncateFractions(QuantityPolicy policy) {
        assertThrows(IllegalArgumentException.class, () -> policy.validateNew(new BigDecimal("1.25"), IllegalArgumentException::new));
    }

    @Test
    void decimalPolicyPreservesExactFractions() {
        assertEquals(new BigDecimal("0.25"), QuantityPolicy.DECIMAL_2.validateNew(new BigDecimal("0.250"), IllegalArgumentException::new));
        assertThrows(IllegalArgumentException.class, () -> QuantityPolicy.DECIMAL_2.validateNew(new BigDecimal("0.125"), IllegalArgumentException::new));
        assertEquals(new BigDecimal("9999999999999.99"), QuantityPolicy.DECIMAL_2.validateNew(
                new BigDecimal("9999999999999.99"), IllegalArgumentException::new));
    }

    @Test
    void storageMappingDoesNotInferClassification() {
        assertEquals(QuantityPolicy.LEGACY_UNCLASSIFIED, QuantityPolicy.fromStorage(null));
        assertNull(QuantityPolicy.LEGACY_UNCLASSIFIED.storageValue());
        assertEquals(QuantityPolicy.DECIMAL_2, QuantityPolicy.fromStorage("DECIMAL_2"));
        assertThrows(IllegalArgumentException.class, () -> QuantityPolicy.fromStorage("UNKNOWN"));
        assertThrows(IllegalArgumentException.class, () -> QuantityPolicy.fromStorage("LEGACY_UNCLASSIFIED"));
    }

    @ParameterizedTest
    @EnumSource(QuantityPolicy.class)
    void acceptsRedundantZeroesAtTheTechnicalBoundaryWithoutRelaxingBusinessRules(QuantityPolicy policy) {
        BigDecimal expected = policy == QuantityPolicy.DECIMAL_2 ? new BigDecimal("1.00") : BigDecimal.ONE;
        assertEquals(expected, policy.validateNew(new BigDecimal("1.000").setScale(1_000), IllegalArgumentException::new));
        assertThrows(IllegalArgumentException.class, () -> policy.validateNew(new BigDecimal(BigInteger.ONE, 1_000), IllegalArgumentException::new));
        assertEquals("quantity exceeds NUMERIC(16,3) capacity", assertThrows(IllegalArgumentException.class,
                () -> policy.validateNew(new BigDecimal(BigInteger.ONE, -1_000), IllegalArgumentException::new)).getMessage());
        if (policy == QuantityPolicy.DECIMAL_2) {
            assertEquals(new BigDecimal("0.25"), policy.validateNew(new BigDecimal("0.250").setScale(1_000), IllegalArgumentException::new));
        }
    }

    @ParameterizedTest
    @EnumSource(QuantityPolicy.class)
    void preservesExistingBusinessErrorsAndMaximums(QuantityPolicy policy) {
        for (BigDecimal value : new BigDecimal[]{null, BigDecimal.ZERO, new BigDecimal("-1")}) {
            assertEquals("quantity must be > 0", assertThrows(IllegalArgumentException.class,
                    () -> policy.validateNew(value, IllegalArgumentException::new)).getMessage());
        }
        assertEquals("quantity exceeds NUMERIC(16,3) capacity", assertThrows(IllegalArgumentException.class,
                () -> policy.validateNew(new BigDecimal("10000000000000"), IllegalArgumentException::new)).getMessage());
        String precisionError = policy == QuantityPolicy.DECIMAL_2 ? "quantity must have at most two decimals"
                : "quantity must be an integer for " + policy.name();
        for (String value : new String[]{"0.505", "0.0005"}) {
            assertEquals(precisionError, assertThrows(IllegalArgumentException.class,
                    () -> policy.validateNew(new BigDecimal(value), IllegalArgumentException::new)).getMessage());
        }
        BigDecimal maximum = new BigDecimal(policy == QuantityPolicy.DECIMAL_2 ? "9999999999999.99" : "9999999999999");
        assertEquals(maximum, policy.validateNew(maximum, IllegalArgumentException::new));
    }

    @ParameterizedTest
    @EnumSource(QuantityPolicy.class)
    void rejectsExtremeScalesBeforeRescalingInAnIsolatedJvm(QuantityPolicy policy) throws Exception {
        IsolatedScaleGuardProbe.assertPreventiveRejection(policy.name());
    }
}
