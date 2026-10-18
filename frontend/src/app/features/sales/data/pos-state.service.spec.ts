import { PosDraftState, PosStateService } from "./pos-state.service";

describe("POS draft exact decimal persistence", () => {
  const key = "erp_pos_sales_draft_v1";
  let service: PosStateService;
  const draft = (): PosDraftState => ({
    formatVersion: 2, requiresRevalidation: false, preliminaryTotal: "2.45",
    userId: "synthetic", cashRegisterSessionId: 7, warehouseId: 1, lastWarehouseId: 1,
    code: "", query: "", searchResults: [], lastSaleId: null,
    cart: [{ productId: 1, name: "Synthetic", sku: "QA", barcode: null,
      salePrice: 10, stockAvailable: 0.255, quantity: 0.25, discountAmount: 0.05, quantityPolicy: "DECIMAL_2" }],
    payments: [{ paymentMethod: "CASH", amount: 2.45, reference: "" }],
  });
  beforeEach(() => { sessionStorage.removeItem(key); service = new PosStateService(); });
  afterEach(() => sessionStorage.removeItem(key));

  it("stores decimal text, restores fractions and policy, and marks the snapshot for revalidation", () => {
    service.save(draft());
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    expect(stored.formatVersion).toBe(2);
    expect(stored.cart[0].quantity).toBe("0.25");
    expect(stored.cart[0].salePrice).toBe("10");
    expect(stored.payments[0].amount).toBe("2.45");
    const restored = service.load()!;
    expect(restored.cart[0].quantity).toBe(0.25);
    expect(restored.cart[0].discountAmount).toBe(0.05);
    expect(restored.cart[0].quantityPolicy).toBe("DECIMAL_2");
    expect(restored.preliminaryTotal).toBe("2.45");
    expect(restored.requiresRevalidation).toBeTrue();
    expect(restored.validationIssues).toEqual([]);
  });
  it("preserves legacy quantity, price and discount instead of truncating or clamping", () => {
    const legacy = draft(); delete legacy.formatVersion; delete legacy.cart[0].quantityPolicy;
    Object.assign(legacy.cart[0], { quantity: 0.125, salePrice: 10.005, discountAmount: 25 });
    sessionStorage.setItem(key, JSON.stringify(legacy));
    const restored = service.load()!;
    expect(restored.cart[0].quantity).toBe(0.125);
    expect(restored.cart[0].salePrice).toBe(10.005);
    expect(restored.cart[0].discountAmount).toBe(25);
    expect(restored.cart[0].quantityPolicy).toBeUndefined();
    expect(restored.requiresRevalidation).toBeTrue();
    expect(restored.validationIssues!.length).toBeGreaterThan(0);
    service.save(restored);
    expect(service.load()!.cart[0].quantity).toBe(0.125);
    expect(service.load()!.sourceFormatVersion).toBe(0);
  });
  it("retains invalid raw monetary and quantity inputs across a round trip", () => {
    const state = draft();
    Object.assign(state.cart[0], { quantityInput: "0.0005", discountInput: "0.505" });
    state.payments[0].amountInput = "not-a-number";
    service.save(state);
    const restored = service.load()!;
    expect(restored.cart[0].quantityInput).toBe("0.0005");
    expect(restored.cart[0].discountInput).toBe("0.505");
    expect(restored.payments[0].amountInput).toBe("not-a-number");
    expect(restored.requiresRevalidation).toBeTrue();
    service.save(restored);
    expect(service.load()!.payments[0].amountInput).toBe("not-a-number");
  });
  it("does not turn nonfinite or negative amounts into zero", () => {
    const state = draft(); state.cart[0].discountAmount = -2; state.payments[0].amount = Infinity;
    service.save(state);
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    expect(stored.cart[0].discountAmount).toBe("-2");
    expect(stored.payments[0].amount).toBe("Infinity");
    expect(service.load()!.validationIssues!.length).toBeGreaterThan(0);
  });
  it("flags mismatched totals and stock without altering their saved values", () => {
    const state = draft(); state.preliminaryTotal = "99.99"; state.cart[0].quantity = 0.26;
    service.save(state);
    const restored = service.load()!;
    expect(restored.preliminaryTotal).toBe("99.99");
    expect(restored.cart[0].quantity).toBe(0.26);
    expect(restored.cart[0].stockAvailable).toBe(0.255);
    expect(restored.validationIssues!.some(issue => issue.includes("stock"))).toBeTrue();
  });
  it("marks unsupported formats and never defaults an unknown payment method to cash", () => {
    const state = draft(); state.formatVersion = 99;
    (state.payments[0] as { paymentMethod: string }).paymentMethod = "INVALID";
    sessionStorage.setItem(key, JSON.stringify(state));
    const restored = service.load()!;
    expect(restored.requiresRevalidation).toBeTrue();
    expect(restored.payments[0].paymentMethod as string).toBe("INVALID");
    expect(restored.validationIssues!.some(issue => issue.includes("formato"))).toBeTrue();
  });
  it("handles corrupt JSON and storage failure without dispatching any operation", () => {
    sessionStorage.setItem(key, "{"); expect(service.load()).toBeNull();
    spyOn(sessionStorage, "setItem").and.throwError("Synthetic quota");
    expect(() => service.save(draft())).not.toThrow();
  });
});
