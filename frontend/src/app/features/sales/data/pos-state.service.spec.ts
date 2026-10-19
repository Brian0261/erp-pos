import { PosDraftState, PosReceiptRecovery, PosStateService } from "./pos-state.service";
import { CreateSaleRequest } from "./sales.models";

describe("POS draft exact decimal persistence", () => {
  const key = "erp_pos_sales_draft_v1";
  let service: PosStateService;
  const operationId = "00000000-0000-4000-8000-000000000077";
  const pending = (): CreateSaleRequest => ({ operationId, warehouseId: 1, confirmedTotal: 2.45,
    items: [{ productId: 1, quantity: .25, confirmedUnitPrice: 10, discountAmount: .05 }],
    payments: [{ paymentMethod: "CASH", amount: 2.45 }] });
  const recovery = (receiptType: "TICKET" | "RECEIPT" | "INVOICE" = "INVOICE"): PosReceiptRecovery => ({
    version: 1, operationId, userId: "synthetic", receiptType, saleId: null, documentId: null,
    creationState: "NOT_STARTED", customerAddress: "Dirección sintética",
    payload: receiptType === "TICKET" ? null : { documentType: receiptType, billingSeriesId: 21,
      customerName: "Cliente sintético", customerDocument: receiptType === "INVOICE" ? "20123456789" : "12345678" },
  });
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

  for (const type of ["TICKET", "RECEIPT", "INVOICE"] as const) {
    it("round-trips explicit " + type + " intent with its owner and operation", () => {
      const state = { ...draft(), pendingSaleRequest: pending(), receiptRecovery: recovery(type) };
      expect(service.save(state)).toBeTrue();
      const loaded = service.load()!;
      expect(loaded.pendingSaleRequest).toEqual(state.pendingSaleRequest);
      expect(loaded.receiptRecovery).toEqual(state.receiptRecovery);
      expect(Object.isFrozen(loaded.receiptRecovery)).toBeTrue();
      if (type !== "TICKET") expect(Object.isFrozen(loaded.receiptRecovery!.payload)).toBeTrue();
      expect(loaded.formatVersion).toBe(2);
    });
  }
  it("preserves a legacy pending request as unknown intent instead of defaulting to ticket", () => {
    const state = { ...draft(), pendingSaleRequest: pending() };
    sessionStorage.setItem(key, JSON.stringify(state)); const loaded = service.load()!;
    expect(loaded.pendingSaleRequest).toEqual(state.pendingSaleRequest);
    expect(loaded.receiptRecovery!.receiptType).toBe("UNKNOWN");
    expect(loaded.receiptRecovery!.creationState).toBe("REVIEW_REQUIRED");
    expect(loaded.receiptRecovery!.operationId).toBe(operationId);
    expect(loaded.receiptRecovery!.userId).toBe("synthetic");
  });
  for (const invalid of ["version", "series", "customer", "operation", "owner", "type", "state"] as const) {
    it("marks " + invalid + " corruption for review without inventing valid receipt metadata", () => {
      const state = { ...draft(), pendingSaleRequest: pending(), receiptRecovery: recovery() };
      const raw = JSON.parse(JSON.stringify(state));
      if (invalid === "version") raw.receiptRecovery.version = 9;
      if (invalid === "series") delete raw.receiptRecovery.payload.billingSeriesId;
      if (invalid === "customer") raw.receiptRecovery.payload.customerDocument = 123;
      if (invalid === "operation") raw.receiptRecovery.operationId = "another-operation";
      if (invalid === "owner") raw.receiptRecovery.userId = "another-user";
      if (invalid === "type") raw.receiptRecovery.receiptType = "unsupported";
      if (invalid === "state") raw.receiptRecovery.creationState = "CONFIRMED";
      sessionStorage.setItem(key, JSON.stringify(raw)); const loaded = service.load()!;
      expect(loaded.pendingSaleRequest).toEqual(state.pendingSaleRequest);
      expect(loaded.receiptRecovery!.creationState).toBe("REVIEW_REQUIRED");
      expect(loaded.receiptRecovery!.receiptType).not.toBe("TICKET");
      if (invalid === "series" || invalid === "customer") expect(loaded.receiptRecovery!.payload).toBeNull();
      if (invalid === "series") expect(loaded.receiptRecovery!.reviewPayload!.customerDocument).toBe("20123456789");
      if (invalid === "owner") expect(loaded.receiptRecovery!.userId).toBe("another-user");
    });
  }
  it("keeps a possibly sent creation across normal save and clearDraft", () => {
    const state = { ...draft(), receiptRecovery: { ...recovery(), saleId: 77, creationState: "POSSIBLY_SENT" as const } };
    expect(service.save(state)).toBeTrue(); service.clearDraft();
    expect(service.load()!.receiptRecovery).toEqual(state.receiptRecovery);
    expect(service.load()!.pendingSaleRequest).toBeNull();
  });
  it("keeps a known sale whose receipt has not yet been dispatched", () => {
    const state = { ...draft(), receiptRecovery: { ...recovery(), saleId: 77 } };
    service.save(state); service.clearDraft(); expect(service.load()!.receiptRecovery).toEqual(state.receiptRecovery);
  });
  it("preserves a corrupted ticket context for review instead of clearing its confirmed sale", () => {
    const raw = { ...draft(), receiptRecovery: { ...recovery("TICKET"), version: 9, saleId: 77 } };
    sessionStorage.setItem(key, JSON.stringify(raw)); service.clearDraft();
    expect(service.load()!.receiptRecovery!.creationState).toBe("REVIEW_REQUIRED");
    expect(service.load()!.receiptRecovery!.saleId).toBe(77);
  });
  it("does not mutate its caller's context during serialization", () => {
    const context = recovery(); const original = structuredClone(context);
    service.save({ ...draft(), pendingSaleRequest: pending(), receiptRecovery: context });
    expect(context).toEqual(original); expect(service.load()!.receiptRecovery).not.toBe(context);
  });
  it("retains a confirmed document reference without requiring a pending sale request", () => {
    const context = { ...recovery(), saleId: 77, documentId: 901, creationState: "CONFIRMED" as const };
    service.save({ ...draft(), receiptRecovery: context });
    expect(service.load()!.receiptRecovery).toEqual(context);
  });
  it("does not create receipt recovery state for an ordinary historical draft", () => {
    service.save(draft()); expect(service.load()!.receiptRecovery).toBeNull();
    service.clearDraft(); expect(service.load()!.cart).toEqual([]);
  });
});
