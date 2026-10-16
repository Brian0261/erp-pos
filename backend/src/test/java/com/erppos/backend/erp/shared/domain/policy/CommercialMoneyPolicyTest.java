package com.erppos.backend.erp.shared.domain.policy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.lang.management.ManagementFactory;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
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

    @Test
    void preservesExactAmountsAndRedundantZeroesAtTheTechnicalBoundary() {
        assertEquals(new BigDecimal("1.23"), CommercialMoneyPolicy.exact(new BigDecimal("1.23"), "amount", IllegalArgumentException::new));
        assertEquals(new BigDecimal("1.23"), CommercialMoneyPolicy.exact(new BigDecimal("1.230"), "amount", IllegalArgumentException::new));
        assertEquals(CommercialMoneyPolicy.ZERO, CommercialMoneyPolicy.exact(new BigDecimal("0.00"), "amount", IllegalArgumentException::new));
        assertEquals(new BigDecimal("1.23"), CommercialMoneyPolicy.exact(new BigDecimal("1.23").setScale(1_000), "amount", IllegalArgumentException::new));
        for (int scale : new int[]{-1_000, 1_000}) {
            assertEquals(CommercialMoneyPolicy.ZERO, CommercialMoneyPolicy.exact(
                    new BigDecimal(BigInteger.ZERO, scale), "amount", IllegalArgumentException::new));
        }
    }

    @Test
    void technicalBoundaryStillRequiresCommercialValidity() {
        assertEquals("amount must be exactly representable with two decimals", assertThrows(IllegalArgumentException.class,
                () -> CommercialMoneyPolicy.exact(new BigDecimal(BigInteger.ONE, 1_000), "amount", IllegalArgumentException::new)).getMessage());
        assertEquals("amount exceeds NUMERIC(14,2) capacity", assertThrows(IllegalArgumentException.class,
                () -> CommercialMoneyPolicy.exact(new BigDecimal(BigInteger.ONE, -1_000), "amount", IllegalArgumentException::new)).getMessage());
    }

    @Test
    void preservesExistingBusinessErrors() {
        assertEquals("amount is required", assertThrows(IllegalArgumentException.class,
                () -> CommercialMoneyPolicy.exact(null, "amount", IllegalArgumentException::new)).getMessage());
        assertEquals("amount must be >= 0", assertThrows(IllegalArgumentException.class,
                () -> CommercialMoneyPolicy.nonNegative(new BigDecimal("-1"), "amount", IllegalArgumentException::new)).getMessage());
        assertEquals("amount exceeds NUMERIC(14,2) capacity", assertThrows(IllegalArgumentException.class,
                () -> CommercialMoneyPolicy.exact(new BigDecimal("1E+999"), "amount", IllegalArgumentException::new)).getMessage());
        for (String value : new String[]{"0.505", "0.0005"}) {
            assertEquals("amount must be exactly representable with two decimals", assertThrows(IllegalArgumentException.class,
                    () -> CommercialMoneyPolicy.exact(new BigDecimal(value), "amount", IllegalArgumentException::new)).getMessage());
        }
    }

    @Test
    void rejectsExtremeScalesBeforeRescalingInAnIsolatedJvm() throws Exception {
        IsolatedScaleGuardProbe.assertPreventiveRejection("MONEY");
    }
}

/** Shared fork probe stays in an authorized test file; hostile values are created only in its child main. */
final class IsolatedScaleGuardProbe {
    private static final long MAX_HEAP_BYTES = 64L * 1024 * 1024;
    private static final long TIMEOUT_NANOS = TimeUnit.SECONDS.toNanos(5);
    private static boolean isolationVerified;

    static void assertPreventiveRejection(String policy) throws Exception {
        verifyIsolation();
        runChild(policy, false);
    }

    private static synchronized void verifyIsolation() throws Exception {
        if (!isolationVerified) {
            runChild("VERIFY_LIMITS", false);
            // A harmless sleeping child proves the external watchdog works before hostile inputs run.
            runChild("VERIFY_TIMEOUT", true);
            isolationVerified = true;
        }
    }

    private static void runChild(String mode, boolean expectTimeout) throws Exception {
        String executable = System.getProperty("os.name").startsWith("Windows") ? "java.exe" : "java";
        String java = Path.of(System.getProperty("java.home"), "bin", executable).toString();
        String classpath = System.getProperty("surefire.test.class.path", System.getProperty("java.class.path"));
        long started = System.nanoTime();
        Process process = new ProcessBuilder(java, "-Xmx64m", "-XX:ActiveProcessorCount=1", "-cp", classpath,
                IsolatedScaleGuardProbe.class.getName(), mode).redirectErrorStream(true).start();
        try {
            long remaining = Math.max(0L, TIMEOUT_NANOS - (System.nanoTime() - started));
            if (!process.waitFor(remaining, TimeUnit.NANOSECONDS)) {
                terminateTree(process);
                assertTrue(process.waitFor(1, TimeUnit.SECONDS), "Isolated JVM did not terminate after forced stop");
                assertTrue(expectTimeout, "Adversarial probe exceeded its five-second deadline: " + mode);
                System.out.println("SCALE_PROBE_WATCHDOG timeoutSeconds=5 terminated=true");
                return;
            }
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertFalse(expectTimeout, "Watchdog verification child exited before its deadline: " + output);
            assertEquals(0, process.exitValue(), output);
            assertTrue(output.contains("SCALE_PROBE_LIMITS"), output);
            if (!mode.equals("VERIFY_LIMITS")) assertTrue(output.contains("PREVENTIVE_REJECTION_OK"), output);
            System.out.print(output);
        } finally {
            if (process.isAlive()) terminateTree(process);
        }
    }

    private static void terminateTree(Process process) {
        List<ProcessHandle> children = process.descendants().toList();
        children.forEach(ProcessHandle::destroyForcibly);
        process.destroyForcibly();
        children.stream().filter(ProcessHandle::isAlive).forEach(ProcessHandle::destroyForcibly);
    }

    public static void main(String[] args) throws Exception {
        long heap = Runtime.getRuntime().maxMemory();
        List<String> options = ManagementFactory.getRuntimeMXBean().getInputArguments();
        if (heap <= 0 || heap > MAX_HEAP_BYTES || !options.contains("-Xmx64m")
                || !options.contains("-XX:ActiveProcessorCount=1") || Runtime.getRuntime().availableProcessors() != 1) {
            throw new AssertionError("Required child JVM resource limits are not effective");
        }
        System.out.println("SCALE_PROBE_LIMITS maxHeapBytes=" + heap + " processors=1");
        String mode = args[0];
        if (mode.equals("VERIFY_LIMITS")) return;
        if (mode.equals("VERIFY_TIMEOUT")) {
            Thread.sleep(10_000);
            throw new AssertionError("External watchdog failed to terminate the child");
        }

        List<BigDecimal> values = new ArrayList<>(List.of(
                new BigDecimal("1e-100000000"), new BigDecimal("1e-999999999"),
                new BigDecimal("1e+100000000"), new BigDecimal("1e+999999999"),
                new BigDecimal(BigInteger.ONE, 1_001), new BigDecimal(BigInteger.ONE, -1_001),
                new BigDecimal(BigInteger.ONE, Integer.MAX_VALUE), new BigDecimal(BigInteger.ONE, Integer.MIN_VALUE)));
        if (mode.equals("MONEY")) {
            for (int scale : new int[]{1_001, -1_001, Integer.MAX_VALUE, Integer.MIN_VALUE}) {
                values.add(new BigDecimal(BigInteger.ZERO, scale));
            }
        }
        for (BigDecimal value : values) {
            // Fail before attempting real rescaling if the preventive guard ever regresses.
            expectFactoryRejection(mode, new RescaleForbiddenDecimal(value));
            expectFactoryRejection(mode, value);
        }
        System.out.println("PREVENTIVE_REJECTION_OK policy=" + mode + " cases=" + values.size());
    }

    private static void expectFactoryRejection(String mode, BigDecimal value) {
        String expected = mode.equals("MONEY") ? "amount must be exactly representable with two decimals"
                : mode.equals("DECIMAL_2") ? "quantity must have at most two decimals"
                : "quantity must be an integer for " + mode;
        try {
            if (mode.equals("MONEY")) CommercialMoneyPolicy.exact(value, "amount", ProbeRejection::new);
            else QuantityPolicy.valueOf(mode).validateNew(value, ProbeRejection::new);
            throw new AssertionError("Out-of-range scale was accepted");
        } catch (ProbeRejection ex) {
            if (!expected.equals(ex.getMessage())) throw new AssertionError("Business error changed: " + ex.getMessage());
        }
    }

    private static final class ProbeRejection extends RuntimeException {
        private static final long serialVersionUID = 1L;
        private ProbeRejection(String message) { super(message); }
    }

    private static final class RescaleForbiddenDecimal extends BigDecimal {
        private static final long serialVersionUID = 1L;
        private RescaleForbiddenDecimal(BigDecimal value) { super(value.unscaledValue(), value.scale()); }
        @Override
        public BigDecimal setScale(int scale, RoundingMode roundingMode) {
            throw new AssertionError("Out-of-range input reached setScale");
        }
    }
}
