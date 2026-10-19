import { PosCartItem, PaymentLine } from "../data/pos-ui.models";
import { availableQuantity, decimalText, moneyCents, quantityHundredths, scaledNumber, stockMillis } from "./pos-decimal";
import { calculatePosChange, calculatePosLineSubtotal, calculatePosRemaining, calculatePosTotal,
  canPosStep, posLineCents, posPaidCents, posTotalCents, posUnitPriceText } from "./pos-calculations";

describe("POS exact decimal arithmetic", () => {
  const item = (salePrice: number, quantity: number, discountAmount = 0): PosCartItem => ({
    productId: 1, sku: "QA", barcode: null, name: "Synthetic product", salePrice, quantity,
    discountAmount, stockAvailable: 100, quantityPolicy: "DECIMAL_2",
  });
  const payment = (paymentMethod: PaymentLine["paymentMethod"], amount: number): PaymentLine =>
    ({ paymentMethod, amount, reference: "" });

  it("keeps 0.10 times three equal to thirty cents and an exact payment", () => {
    const cart = [item(0.10, 3)];
    expect(posTotalCents(cart)).toBe(30n);
    expect(calculatePosTotal(cart)).toBe(0.30);
    expect(posPaidCents([payment("CASH", 0.30)])).toBe(30n);
    expect(calculatePosChange(cart, [payment("CASH", 0.30)])).toBe(0);
  });
  it("rounds HALF_UP per line before summing, matching backend case B", () => {
    expect(calculatePosLineSubtotal(item(0.01, 0.5))).toBe(0.01);
    expect(posTotalCents([item(0.01, 0.5), item(0.01, 0.5)])).toBe(2n);
  });
  it("uses exact discounts and repeated decimal sums", () => {
    expect(posTotalCents([item(0.10, 3, 0.10), item(0.20, 1)])).toBe(40n);
    expect(posTotalCents(Array.from({ length: 100 }, () => item(0.01, 1)))).toBe(100n);
  });
  for (const [text, cents] of [["1.230", 123n], ["0.30", 30n], ["1e-2", 1n], ["999999999999.99", 99_999_999_999_999n]] as const) {
    it(`parses exact monetary input ${text} without floating point multiplication`, () => {
      expect(moneyCents(text)).toBe(cents);
      expect(moneyCents(scaledNumber(cents))).toBe(cents);
    });
  }
  for (const invalid of ["0.505", "0.0005", "", "abc", "1e-100000000", "1e999999999", "1000000000000", -1, NaN, Infinity]) {
    it(`rejects invalid or excessive monetary input ${String(invalid)}`, () => {
      expect(() => moneyCents(invalid)).toThrow();
    });
  }
  it("uses BigInt products and checks the result capacity", () => {
    expect(posLineCents(item(999999999999.99, 0.01)).gross).toBe(1_000_000_000_000n);
    expect(() => posLineCents(item(999999999999.99, 2))).toThrow();
    expect(() => posTotalCents([item(999999999999.99, 1), item(0.01, 1)])).toThrow();
  });
  it("preserves legitimate free lines but rejects rounding a positive line to zero", () => {
    expect(posLineCents(item(0, 0.01)).net).toBe(0n);
    expect(posLineCents(item(1, 1, 1)).net).toBe(0n);
    expect(() => posLineCents(item(0.01, 0.01))).toThrow();
    expect(() => posLineCents(item(1, 1, 1.01))).toThrow();
  });
  it("calculates mixed payments, cash change and insufficient balance exactly", () => {
    const cart = [item(0.10, 3)];
    const mixed = [payment("CARD", 0.10), payment("TRANSFER", 0.10), payment("CASH", 0.20)];
    expect(posPaidCents(mixed)).toBe(40n);
    expect(calculatePosChange(cart, mixed)).toBe(0.10);
    expect(calculatePosRemaining(0.30, 0.29)).toBe(0.01);
    expect(calculatePosRemaining(0.30, 0.30)).toBe(0);
    expect(calculatePosChange(cart, [payment("CARD", 0.31)])).toBe(0);
  });
  it("does not mask invalid input or total as zero", () => {
    const invalid = item(1, 1); invalid.discountInput = "0.005";
    expect(Number.isNaN(calculatePosTotal([invalid]))).toBeTrue();
    expect(() => posPaidCents([{ ...payment("CASH", 1), amountInput: "" }])).toThrow();
  });
  it("shows an invalid saved price unchanged instead of rounding it for presentation", () => {
    expect(posUnitPriceText(item(10.005, 1))).toBe("No válido (10.005)");
    expect(posUnitPriceText(item(0.10, 1))).toBe("0.10");
  });
  for (const policy of ["WHOLE", "LEGACY_UNCLASSIFIED"] as const) {
    it(`accepts only positive integers for ${policy}`, () => {
      expect(quantityHundredths("3.000", policy)).toBe(300n);
      for (const value of ["1.5", "0", "-1", "abc", ""]) expect(() => quantityHundredths(value, policy)).toThrow();
    });
  }
  it("accepts fractional quantities without rounding or inventing a missing policy", () => {
    expect(quantityHundredths("0.250", "DECIMAL_2")).toBe(25n);
    expect(() => quantityHundredths("0.001", "DECIMAL_2")).toThrow();
    expect(() => quantityHundredths("1", undefined)).toThrow();
    expect(() => quantityHundredths("10000000000000", "DECIMAL_2")).toThrow();
  });
  it("compares fractional stock exactly and derives the allowed stepping grid", () => {
    expect(stockMillis("0.255")).toBe(255n);
    expect(availableQuantity("0.255", "DECIMAL_2")).toBe(0.25);
    expect(availableQuantity("0.999", "WHOLE")).toBe(0);
    const fraction = { ...item(10, 0.24), stockAvailable: 0.255 };
    expect(canPosStep(fraction, 1)).toBeTrue();
    fraction.quantity = 0.25;
    expect(canPosStep(fraction, 1)).toBeFalse();
    expect(canPosStep({ ...fraction, quantity: 0.01 }, -1)).toBeFalse();
    expect(decimalText(quantityHundredths("0.25", "DECIMAL_2"))).toBe("0.25");
  });
});
