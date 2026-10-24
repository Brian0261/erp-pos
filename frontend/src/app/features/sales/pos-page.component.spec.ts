import { HttpContext, provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { BOUND_AUTH_CREDENTIALS } from "../../core/auth/bound-auth-context";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "./data/cash-register.service";
import { PosService } from "./data/pos.service";
import { PosDraftState, PosStateService } from "./data/pos-state.service";
import { CashRegisterResponse, PosProductResponse } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import { PosPageComponent } from "./pos-page.component";
import { PaymentLine } from "./data/pos-ui.models";
import { SaleOperationsService } from "./data/sale-operations.service";
import { createOperationDouble } from "./testing/sale-operation-double.spec";

const SPEC_CREDENTIAL = "synthetic-pos-component-credential";

function createAuthDouble(user: UserProfile): jasmine.SpyObj<AuthService> {
  const auth = jasmine.createSpyObj<AuthService>("AuthService", ["me", "getToken"]);
  auth.getToken.and.returnValue(SPEC_CREDENTIAL);
  auth.me.and.callFake((context?: HttpContext) => {
    if (context !== undefined && (!(context instanceof HttpContext)
        || !context.has(BOUND_AUTH_CREDENTIALS)
        || context.get(BOUND_AUTH_CREDENTIALS)?.token !== SPEC_CREDENTIAL)) {
      return throwError(() => new Error("Expected the component's bound verification context"));
    }
    return of(user);
  });
  return auth;
}

function expectVerifiedContext(auth: jasmine.SpyObj<AuthService>, sales: jasmine.SpyObj<SalesService>): HttpContext {
  expect(auth.getToken).toHaveBeenCalledTimes(2);
  expect(auth.me).toHaveBeenCalledTimes(2);
  expect(auth.me.calls.first().args[0]).toBeUndefined();
  const context = auth.me.calls.mostRecent().args[0];
  expect(context instanceof HttpContext).toBeTrue();
  if (!(context instanceof HttpContext)) throw new Error("Missing bound verification context");
  expect(context.has(BOUND_AUTH_CREDENTIALS)).toBeTrue();
  expect(context.get(BOUND_AUTH_CREDENTIALS)).toEqual({ token: SPEC_CREDENTIAL });
  expect(Object.isFrozen(context.get(BOUND_AUTH_CREDENTIALS))).toBeTrue();
  expect(sales.create.calls.mostRecent().args[1]).toBe(context);
  return context;
}

describe("PosPageComponent cash and electronic payment policy", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>;
  let component: PosPageComponent;
  let sales: jasmine.SpyObj<SalesService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  let documents: jasmine.SpyObj<ElectronicDocumentService>;
  let http: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  const line = (paymentMethod: PaymentLine["paymentMethod"], amount: number): PaymentLine =>
    ({ paymentMethod, amount, reference: `QA-${paymentMethod}` });

  beforeEach(async () => {
    auth = createAuthDouble({ id: "qa-money", username: "qa", email: "qa@example.test", roles: ["CAJERO"] });
    sales = jasmine.createSpyObj<SalesService>("SalesService", ["create"]);
    sales.create.and.returnValue(of());
    confirm = jasmine.createSpyObj<ConfirmDialogService>("ConfirmDialogService", ["confirm"]);
    confirm.confirm.and.returnValue(Promise.resolve(false));
    documents = jasmine.createSpyObj<ElectronicDocumentService>(
      "ElectronicDocumentService", ["createFromSale", "generateXml", "sign", "send"],
    );
    await TestBed.configureTestingModule({
      imports: [PosPageComponent],
      providers: [
        provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: WarehouseService, useValue: { list: () => of([
          { id: 1, code: "QA", name: "Synthetic warehouse", type: "STORE", active: true },
        ]) } },
        { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
        { provide: PosService, useValue: { search: () => of([]), lookup: () => of([]) } },
        { provide: PosStateService, useValue: { load: () => null, save: () => {}, clearAll: () => {} } },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: SalesService, useValue: sales },
        { provide: SaleOperationsService, useValue: createOperationDouble() },
        { provide: BillingSeriesService, useValue: { list: () => of([]) } },
        { provide: ElectronicDocumentService, useValue: documents },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    component.cart = [{ productId: 101, sku: "QA-MONEY", barcode: null, name: "Synthetic product",
      salePrice: 100, stockAvailable: 10, quantity: 1, discountAmount: 0, quantityPolicy: "WHOLE" }];
  });

  afterEach(() => {
    expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(documents.generateXml).not.toHaveBeenCalled();
    expect(documents.sign).not.toHaveBeenCalled();
    expect(documents.send).not.toHaveBeenCalled();
    http.expectNone(() => true, "Payment QA must never call a backend");
    http.verify();
    fixture.destroy();
  });

  const scenarios: { name: string; payments: PaymentLine[]; accepted: boolean; change: number }[] = [
    { name: "A", payments: [line("CASH", 100)], accepted: true, change: 0 },
    { name: "B", payments: [line("CASH", 120)], accepted: true, change: 20 },
    { name: "C", payments: [line("CARD", 100)], accepted: true, change: 0 },
    { name: "D", payments: [line("CARD", 120)], accepted: false, change: 0 },
    { name: "E", payments: [line("CARD", 80), line("CASH", 30)], accepted: true, change: 10 },
    { name: "F", payments: [line("CARD", 110), line("CASH", 10)], accepted: false, change: 0 },
    { name: "G", payments: [line("CASH", 90)], accepted: false, change: 0 },
    { name: "H", payments: [line("TRANSFER", 120)], accepted: false, change: 0 },
  ];
  for (const scenario of scenarios) {
    it(`enforces scenario ${scenario.name} and renders only cash-funded change`, async () => {
      component.payments = structuredClone(scenario.payments);
      component.openCheckoutModal();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(component.change).toBe(scenario.change);
      expect(component.change).toBeLessThanOrEqual(scenario.payments
        .filter(p => p.paymentMethod === "CASH").reduce((sum, p) => sum + p.amount, 0));
      const metrics = fixture.nativeElement.querySelector('[aria-label="Resumen de pagos"]');
      expect(metrics.textContent).toContain(`Vuelto: S/ ${scenario.change.toFixed(2)}`);
      component.finalizeSale();
      await fixture.whenStable();
      if (scenario.accepted) {
        expect(confirm.confirm).toHaveBeenCalledTimes(1);
        expect(component.errorMessage).toBe("");
      } else {
        expect(confirm.confirm).not.toHaveBeenCalled();
        expect(component.errorMessage).not.toBe("");
        if (scenario.name !== "G") expect(component.errorMessage).toContain("electrónicos");
      }
      expect(sales.create).not.toHaveBeenCalled();
      expect(component.payments).toEqual(scenario.payments);
      expect(component.cart.length).toBe(1);
    });
  }

  it("preserves valid mixed payments and cart when the simulated backend rejects confirmation", async () => {
    component.payments = [line("TRANSFER", 40), line("CARD", 40), line("CASH", 30)];
    const originalCart = structuredClone(component.cart);
    const originalPayments = structuredClone(component.payments);
    confirm.confirm.and.returnValue(Promise.resolve(true));
    sales.create.and.returnValue(throwError(() => ({ status: 422, error: { message: "Synthetic rejection" } })));
    component.finalizeSale();
    await fixture.whenStable();
    expect(sales.create).toHaveBeenCalledOnceWith({ warehouseId: 1,
      operationId: jasmine.any(String), confirmedTotal: 100,
      items: [{ productId: 101, quantity: 1, discountAmount: 0, confirmedUnitPrice: 100 }],
      payments: originalPayments }, expectVerifiedContext(auth, sales));
    expect(component.cart).toEqual(originalCart);
    expect(component.payments).toEqual(originalPayments);
    expect(component.submitting).toBeFalse();
    expect(component.errorMessage).not.toBe("");
  });

  it("rechecks electronic overpayment after asynchronous confirmation before sending", async () => {
    component.payments = [line("CARD", 80), line("CASH", 30)];
    let resolve!: (confirmed: boolean) => void;
    confirm.confirm.and.returnValue(new Promise<boolean>(r => { resolve = r; }));
    component.finalizeSale();
    component.payments[0].amount = 110;
    resolve(true);
    await fixture.whenStable();
    expect(component.errorMessage).toContain("electrónicos");
    expect(sales.create).not.toHaveBeenCalled();
    expect(component.payments[0].amount).toBe(110);
    expect(component.cart.length).toBe(1);
  });
});

describe("PosPageComponent monetary reconciliation", () => {
  it("keeps the cart total equal to net line amounts after reducing a discounted quantity", async () => {
    const user: UserProfile = {
      id: "qa-user", username: "qa-pos", email: "qa@example.test", roles: ["CAJERO"],
    };
    const warehouse: WarehouseResponse = {
      id: 1, code: "QA", name: "Synthetic warehouse", type: "STORE", active: true,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    };
    const cashSession: CashRegisterResponse = {
      id: 7, openedByUserId: user.id, openedAt: "2026-01-01T00:00:00Z",
      closedAt: null, openingAmount: 0, countedAmount: null,
      expectedCashAmount: null, differenceAmount: null, status: "OPEN", notes: null,
    };
    const products: PosProductResponse[] = [
      { productId: 101, sku: "QA-A", barcode: null, name: "QA Product A", salePrice: 10, stockAvailable: 10, quantityPolicy: "WHOLE" },
      { productId: 102, sku: "QA-B", barcode: null, name: "QA Product B", salePrice: 5, stockAvailable: 10, quantityPolicy: "WHOLE" },
    ];
    let draft: PosDraftState | null = null;
    const draftState = {
      load: () => draft === null ? null : structuredClone(draft),
      save: (value: PosDraftState) => { draft = structuredClone(value); },
      clearAll: () => { draft = null; },
    };
    const sales = jasmine.createSpyObj<SalesService>("SalesService", ["create"]);
    const documents = jasmine.createSpyObj<ElectronicDocumentService>(
      "ElectronicDocumentService", ["createFromSale", "generateXml", "sign", "send"],
    );
    const cash = jasmine.createSpyObj<CashRegisterService>(
      "CashRegisterService", ["current", "open", "close"],
    );
    cash.current.and.returnValue(of(cashSession));
    const confirm = jasmine.createSpyObj<ConfirmDialogService>("ConfirmDialogService", ["confirm"]);
    confirm.confirm.and.returnValue(Promise.resolve(false));
    const pos = jasmine.createSpyObj<PosService>("PosService", ["search", "lookup"]);
    pos.search.and.returnValue(of(products));

    await TestBed.configureTestingModule({
      imports: [PosPageComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: createAuthDouble(user) },
        { provide: WarehouseService, useValue: { list: () => of([warehouse]) } },
        { provide: CashRegisterService, useValue: cash },
        { provide: PosService, useValue: pos },
        { provide: PosStateService, useValue: draftState },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: SalesService, useValue: sales },
        { provide: SaleOperationsService, useValue: createOperationDouble() },
        { provide: BillingSeriesService, useValue: { list: () => of([]) } },
        { provide: ElectronicDocumentService, useValue: documents },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PosPageComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const host: HTMLElement = fixture.nativeElement;
    const element = <T extends Element>(root: ParentNode, selector: string): T => {
      const found = root.querySelector<T>(selector);
      if (!found) {
        throw new Error(`Missing real POS control: ${selector}`);
      }
      return found;
    };
    const button = (root: ParentNode, text: string): HTMLButtonElement => {
      const found = Array.from(root.querySelectorAll("button"))
        .find((candidate) => candidate.textContent?.trim() === text);
      if (!found) {
        throw new Error(`Missing real POS button: ${text}`);
      }
      return found;
    };
    const row = (name: string): HTMLElement => {
      const found = Array.from(host.querySelectorAll<HTMLElement>("app-pos-cart-item"))
        .find((candidate) => candidate.querySelector("h3")?.textContent?.trim() === name);
      if (!found) {
        throw new Error(`Missing cart product: ${name}`);
      }
      return found;
    };
    const renderedCents = (amount: Element): number => {
      const match = amount.textContent?.trim().match(/^S\/\s*(\d+)\.(\d{2})$/);
      if (!match) {
        throw new Error(`Unexpected monetary rendering: ${amount.textContent}`);
      }
      return Number(match[1]) * 100 + Number(match[2]);
    };
    const lineCents = () => products.map((product) => renderedCents(
      element(row(product.name), ".cart-item__subtotal strong"),
    ));
    const totalCents = () => renderedCents(element(
      host, '[aria-label="Carrito y cobro"] [aria-label="Totales de venta"] .total-main strong',
    ));
    const updateInput = (input: HTMLInputElement, value: string): void => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const render = async (): Promise<void> => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    try {
      await render();
      updateInput(element(host, 'input[formControlName="code"]'), "QA products");
      button(element(host, "app-pos-search-panel"), "Buscar").click();
      await render();
      expect(pos.search).toHaveBeenCalledOnceWith("QA products", warehouse.id);
      const results = host.querySelectorAll("app-pos-search-results article");
      expect(results.length).toBe(2);
      for (const result of Array.from(results)) {
        button(result, "Agregar").click();
      }
      await render();
      expect(component.cart.map((item) => item.productId)).toEqual([101, 102]);

      updateInput(element(row(products[0].name), '[aria-label="Cantidad del producto"]'), "2");
      await render();
      updateInput(element(row(products[0].name), '[aria-label="Descuento del producto"]'), "15");
      await render();
      expect(component.cart.map((item) => item.quantity)).toEqual([2, 1]);
      expect(component.cart.map((item) => item.discountAmount)).toEqual([15, 0]);
      const initialLines = lineCents();
      const initialTotal = totalCents();
      expect(initialLines).toEqual([500, 500]);
      expect(initialTotal).toBe(1000);
      expect(initialTotal).toBe(initialLines.reduce((sum, value) => sum + value, 0));

      const decrease = element<HTMLButtonElement>(row(products[0].name), '[aria-label="Disminuir cantidad"]');
      expect(decrease.disabled).toBeFalse();
      decrease.click();
      await render();
      const finalLines = lineCents();
      const finalTotal = totalCents();
      const sumOfLines = finalLines.reduce((sum, value) => sum + value, 0);
      const difference = sumOfLines - finalTotal;
      console.info("QA-FE-RISK-1A monetary reproduction (cents)", JSON.stringify({
        initial: { quantities: [2, 1], discounts: [1500, 0], lines: initialLines, total: initialTotal },
        action: "Click Disminuir cantidad for QA Product A",
        final: {
          quantities: component.cart.map((item) => item.quantity),
          discounts: component.cart.map((item) => Math.round(item.discountAmount * 100)),
          lines: finalLines, sumOfLines, total: finalTotal, difference,
        },
      }));

      // Reconcile independently rendered amounts; do not prescribe a discount policy
      // or turn the observed defect into an expected, permanently incorrect total.
      expect(finalTotal)
        .withContext(`Cart total must reconcile with net lines (cents): lines=${JSON.stringify(finalLines)}, sum=${sumOfLines}, total=${finalTotal}, difference=${difference}`)
        .toBe(sumOfLines);
    } finally {
      expect(sales.create).not.toHaveBeenCalled();
      expect(documents.createFromSale).not.toHaveBeenCalled();
      expect(documents.generateXml).not.toHaveBeenCalled();
      expect(documents.sign).not.toHaveBeenCalled();
      expect(documents.send).not.toHaveBeenCalled();
      expect(cash.open).not.toHaveBeenCalled();
      expect(cash.close).not.toHaveBeenCalled();
      expect(confirm.confirm).not.toHaveBeenCalled();
      http.expectNone(() => true, "No real or simulated HTTP request is needed");
      http.verify();
      fixture.destroy();
    }
  });
});

describe("PosPageComponent controlled discount correction", () => {
  const user: UserProfile = {
    id: "qa-discounts", username: "qa-discounts", email: "discounts@example.test", roles: ["CAJERO"],
  };
  const warehouse: WarehouseResponse = {
    id: 1, code: "QA", name: "Synthetic warehouse", type: "STORE", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  };
  const cashSession: CashRegisterResponse = {
    id: 7, openedByUserId: user.id, openedAt: "2026-01-01T00:00:00Z", closedAt: null,
    openingAmount: 0, countedAmount: null, expectedCashAmount: null,
    differenceAmount: null, status: "OPEN", notes: null,
  };
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>> | undefined;
  let component: PosPageComponent;
  let http: HttpTestingController;
  let draft: PosDraftState | null;
  let sales: jasmine.SpyObj<SalesService>;
  let documents: jasmine.SpyObj<ElectronicDocumentService>;
  let cash: jasmine.SpyObj<CashRegisterService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  let allowedMockSalesCalls: number;
  let saveDraft: jasmine.Spy;
  let auth: jasmine.SpyObj<AuthService>;

  const cart = () => [
    { productId: 101, sku: "QA-A", barcode: null, name: "QA Product A", salePrice: 10,
      stockAvailable: 10, quantity: 2, discountAmount: 15, quantityPolicy: "WHOLE" as const },
    { productId: 102, sku: "QA-B", barcode: null, name: "QA Product B", salePrice: 5.25,
      stockAvailable: 10, quantity: 1, discountAmount: 1.25, quantityPolicy: "WHOLE" as const },
  ];
  const element = <T extends Element>(root: ParentNode, selector: string): T => {
    const found = root.querySelector<T>(selector);
    if (!found) {
      throw new Error(`Missing real POS control: ${selector}`);
    }
    return found;
  };
  const host = (): HTMLElement => fixture!.nativeElement;
  const render = async (): Promise<void> => {
    fixture!.detectChanges();
    await fixture!.whenStable();
    fixture!.detectChanges();
  };
  const input = (control: HTMLInputElement, value: string): void => {
    control.value = value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const savedDraft = (): PosDraftState => {
    if (!draft) {
      throw new Error("Expected an isolated saved POS draft");
    }
    return structuredClone(draft);
  };
  const mount = async (initialDraft: PosDraftState | null = null): Promise<void> => {
    draft = initialDraft === null ? null : structuredClone(initialDraft);
    fixture = TestBed.createComponent(PosPageComponent);
    component = fixture.componentInstance;
    await render();
  };

  beforeEach(async () => {
    auth = createAuthDouble(user);
    fixture = undefined;
    draft = null;
    allowedMockSalesCalls = 0;
    saveDraft = jasmine.createSpy("save isolated draft").and.callFake((value: PosDraftState) => {
      draft = structuredClone(value);
    });
    sales = jasmine.createSpyObj<SalesService>("SalesService", ["create"]);
    documents = jasmine.createSpyObj<ElectronicDocumentService>(
      "ElectronicDocumentService", ["createFromSale", "generateXml", "sign", "send"],
    );
    cash = jasmine.createSpyObj<CashRegisterService>("CashRegisterService", ["current", "open", "close"]);
    cash.current.and.returnValue(of(cashSession));
    confirm = jasmine.createSpyObj<ConfirmDialogService>("ConfirmDialogService", ["confirm"]);
    confirm.confirm.and.returnValue(Promise.resolve(false));
    const pos = jasmine.createSpyObj<PosService>("PosService", ["search", "lookup"]);
    pos.search.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PosPageComponent],
      providers: [
        provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: WarehouseService, useValue: { list: () => of([warehouse]) } },
        { provide: CashRegisterService, useValue: cash },
        { provide: PosService, useValue: pos },
        { provide: PosStateService, useValue: {
          load: () => draft === null ? null : structuredClone(draft),
          save: saveDraft, clearAll: () => { draft = null; },
        } },
        { provide: SaleOperationsService, useValue: createOperationDouble() },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: SalesService, useValue: sales },
        { provide: BillingSeriesService, useValue: { list: () => of([]) } },
        { provide: ElectronicDocumentService, useValue: documents },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    expect(sales.create).toHaveBeenCalledTimes(allowedMockSalesCalls);
    expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(documents.generateXml).not.toHaveBeenCalled();
    expect(documents.sign).not.toHaveBeenCalled();
    expect(documents.send).not.toHaveBeenCalled();
    expect(cash.open).not.toHaveBeenCalled();
    expect(cash.close).not.toHaveBeenCalled();
    http.expectNone(() => true, "All POS services are simulated; no backend requests are allowed");
    http.verify();
    fixture?.destroy();
  });

  it("clamps a decimal discount through the quantity input, preserves other lines and valid boundaries", async () => {
    await mount();
    component.cart = cart();
    component.cart[0].salePrice = 12.50;
    component.cart[0].discountAmount = 20;
    await render();
    input(element(host(), 'app-pos-cart-item [aria-label="Cantidad del producto"]'), "1");
    await render();

    expect(component.cart.map((item) => item.discountAmount)).toEqual([12.50, 1.25]);
    expect(component.cartLineTotals).toEqual([0, 4]);
    expect(component.total).toBe(4);
    expect(component.discountTotal).toBe(13.75);
    expect(savedDraft().cart.map((item) => [item.quantity, item.discountAmount])).toEqual([[1, 12.50], [1, 1.25]]);
    expect(element(host(), '[role="status"]').textContent).toContain("de S/ 20.00 a S/ 12.50");
    expect(element(host(), '[aria-label="Carrito y cobro"] .total-main strong').textContent?.trim()).toBe("S/ 4.00");

    element<HTMLButtonElement>(host(), 'app-pos-cart-item [aria-label="Aumentar cantidad"]').click();
    await render();
    expect(component.cart[0].quantity).toBe(2);
    expect(component.cart[0].discountAmount).toBe(12.50);
    expect(host().querySelector('[role="status"]')).toBeNull();

    for (const discount of [12.50, 5.25, 0]) {
      component.cart[0].quantity = 2;
      component.cart[0].discountAmount = discount;
      component.setQuantity(0, "1");
      expect(component.cart[0].discountAmount).toBe(discount);
      expect(component.cart[1].discountAmount).toBe(1.25);
      expect(component.discountAdjustmentMessage).toBe("");
      expect(component.total).toBe(component.cartLineTotals.reduce((sum, net) => sum + net, 0));
    }
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it("preserves a quantity above stock as invalid input without changing quantity or discount", async () => {
    await mount();
    component.cart = cart();
    Object.assign(component.cart[0], { quantity: 4, stockAvailable: 2, discountAmount: 35 });
    await render();
    const quantity = element<HTMLInputElement>(host(), 'app-pos-cart-item [aria-label="Cantidad del producto"]');
    input(quantity, "8");
    await render();

    expect(component.cart[0].quantity).toBe(4);
    expect(component.cart[0].quantityInput).toBe("8");
    expect(component.cart[0].discountAmount).toBe(35);
    expect(quantity.value).toBe("8");
    expect(savedDraft().cart[0].quantityInput).toBe("8");
    expect(savedDraft().cart[0].discountAmount).toBe(35);
    expect(component.cart[1].discountAmount).toBe(1.25);
    expect(component.errorMessage).toContain("Cantidad excede stock disponible");
    expect(host().querySelector('[role="status"]')).toBeNull();
    component.payments[0].amount = 100;
    component.finalizeSale();
    expect(component.errorMessage).toContain("Stock insuficiente");
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it("rejects quantity editing with zero stock without removing the row or allowing checkout", async () => {
    await mount();
    component.cart = cart();
    Object.assign(component.cart[0], { quantity: 1, stockAvailable: 0, discountAmount: 0 });
    component.payments[0].amount = 100;
    await render();
    const savesBefore = saveDraft.calls.count();
    const quantity = element<HTMLInputElement>(host(), 'app-pos-cart-item [aria-label="Cantidad del producto"]');
    input(quantity, "3");
    await render();
    expect(quantity.value).toBe("3");
    expect(component.cart.length).toBe(2);
    expect(component.cart[0].quantity).toBe(1);
    expect(component.cart[0].discountAmount).toBe(0);
    expect(saveDraft.calls.count()).toBe(savesBefore + 1);
    expect(savedDraft().cart[0].quantityInput).toBe("3");
    expect(host().querySelector('[role="status"]')).toBeNull();
    component.finalizeSale();
    expect(component.errorMessage).toContain("Stock insuficiente");
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it("preserves incompatible legacy draft amounts and blocks checkout instead of repairing them", async () => {
    const restoredCart = cart();
    restoredCart[0].discountAmount = 25;
    restoredCart.push({ ...restoredCart[1], productId: 103, name: "QA Invalid discount", discountAmount: Infinity });
    restoredCart.push({ ...restoredCart[1], productId: 104, name: "QA Negative discount", discountAmount: -2 });
    await mount({
      userId: user.id, cashRegisterSessionId: cashSession.id, warehouseId: warehouse.id,
      lastWarehouseId: warehouse.id, code: "", query: "", searchResults: [],
      cart: restoredCart, payments: [{ paymentMethod: "CASH", amount: 0, reference: "" }], lastSaleId: null,
    });
    expect(component.cart.map((item) => item.discountAmount)).toEqual([25, 1.25, Infinity, -2]);
    expect(savedDraft().cart.map((item) => item.discountAmount)).toEqual([25, 1.25, Infinity, -2]);
    expect(Number.isNaN(component.total)).toBeTrue();
    expect(component.draftReviewMessage).toContain("pendientes de revalidación");
    expect(component.discountAdjustmentMessage).toBe("");
    component.payments[0].amount = 100;
    component.finalizeSale();
    expect(component.errorMessage).toContain("descuento");

    const repaired = savedDraft();
    fixture!.destroy();
    await mount(repaired);
    expect(component.cart.map((item) => item.discountAmount)).toEqual([25, 1.25, Infinity, -2]);
    expect(host().querySelector('[role="status"]')).toBeNull();
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it("shows one contextual accessible notice in the full cart without overwriting critical or fiscal messages", async () => {
    await mount();
    component.cart = cart();
    component.errorMessage = "QA critical error";
    component.warningMessage = "QA fiscal warning";
    component.openFullCart();
    await render();
    const modal = element<HTMLElement>(host(), '[role="dialog"][aria-labelledby="full-cart-title"]');
    element<HTMLButtonElement>(modal, '[aria-label="Disminuir cantidad"]').click();
    await render();

    expect(host().querySelectorAll('[role="status"]').length).toBe(1);
    const notice = element(modal, '[role="status"]');
    expect(notice.getAttribute("aria-live")).toBe("polite");
    expect(notice.textContent).toContain("QA Product A de S/ 15.00 a S/ 10.00");
    expect(component.errorMessage).toBe("QA critical error");
    expect(component.warningMessage).toBe("QA fiscal warning");
    expect(savedDraft().cart[0].discountAmount).toBe(10);
    expect(element(modal, ".full-cart-summary strong").textContent?.trim()).toBe("S/ 4.00");

    element<HTMLButtonElement>(modal, ".full-cart-header button").click();
    await render();
    expect(host().querySelectorAll('[role="status"]').length).toBe(1);
    expect(host().querySelector('app-pos-full-cart-modal [role="status"]')).toBeNull();
    component.setQuantity(0, "1");
    await render();
    expect(host().querySelector('[role="status"]')).toBeNull();
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it("blocks invalid monetary state before confirmation and rechecks discounts after asynchronous confirmation", async () => {
    await mount();
    component.cart = cart();
    component.cart[0].quantity = 1;
    component.payments[0].amount = 100;
    for (const invalid of [15, -1, Infinity, NaN]) {
      component.cart[0].discountAmount = invalid;
      component.finalizeSale();
      expect(component.errorMessage).toContain("descuento");
      expect(confirm.confirm).not.toHaveBeenCalled();
    }
    component.cart[0].discountAmount = 10;
    component.payments[0].amount = Infinity;
    component.finalizeSale();
    expect(component.errorMessage).toContain("finito");
    expect(confirm.confirm).not.toHaveBeenCalled();

    component.payments[0].amount = 100;
    let resolveConfirmation!: (confirmed: boolean) => void;
    confirm.confirm.and.returnValue(new Promise<boolean>((resolve) => { resolveConfirmation = resolve; }));
    component.finalizeSale();
    expect(confirm.confirm).toHaveBeenCalledTimes(1);
    component.cart[0].discountAmount = 15;
    resolveConfirmation(true);
    await render();
    expect(component.errorMessage).toContain("no puede superar el subtotal");
    expect(component.cart[0].discountAmount).toBe(15);
    expect(component.submitting).toBeFalse();
  });

  it("builds only the existing sale contract from the corrected cart using a simulated sale service", async () => {
    await mount();
    component.cart = cart();
    component.setQuantity(0, "1");
    component.payments = [
      { paymentMethod: "CASH", amount: 10, reference: " QA payment " },
      { paymentMethod: "CARD", amount: 0, reference: "" },
    ];
    confirm.confirm.and.returnValue(Promise.resolve(true));
    // Complete without any HTTP request or simulated sale issuance side effects.
    sales.create.and.returnValue(of());
    allowedMockSalesCalls = 1;
    component.finalizeSale();
    await render();

    expect(component.total).toBe(4);
    expect(component.total).toBe(component.cartLineTotals.reduce((sum, net) => sum + net, 0));
    expect(confirm.confirm).toHaveBeenCalledTimes(1);
    expect(sales.create).toHaveBeenCalledOnceWith({
      warehouseId: warehouse.id,
      operationId: jasmine.any(String), confirmedTotal: 4,
      items: [
        { productId: 101, quantity: 1, discountAmount: 10, confirmedUnitPrice: 10 },
        { productId: 102, quantity: 1, discountAmount: 1.25, confirmedUnitPrice: 5.25 },
      ],
      payments: [{ paymentMethod: "CASH", amount: 10, reference: "QA payment" }],
    }, expectVerifiedContext(auth, sales));
  });

  it("steps fractional quantities exactly in both cart views and preserves the P0 discount adjustment", async () => {
    await mount();
    component.cart = cart();
    Object.assign(component.cart[0], { quantityPolicy: "DECIMAL_2", quantity: 0.25,
      salePrice: 10, stockAvailable: 0.255, discountAmount: 2.50 });
    await render();
    const quantity = element<HTMLInputElement>(host(), 'app-pos-cart-item [aria-label="Cantidad del producto"]');
    expect(quantity.step).toBe("0.01");
    expect(quantity.min).toBe("0.01");
    expect(element<HTMLButtonElement>(host(), 'app-pos-cart-item [aria-label="Aumentar cantidad"]').disabled).toBeTrue();
    component.decreaseQuantity(0);
    expect(component.cart[0].quantity).toBe(0.24);
    expect(component.cart[0].discountAmount).toBe(2.40);
    expect(component.discountAdjustmentMessage).toContain("2.40");
    component.openFullCart(); await render();
    const modal = element<HTMLElement>(host(), 'app-pos-full-cart-modal [role="dialog"]');
    expect(element<HTMLInputElement>(modal, '[aria-label="Cantidad del producto"]').step).toBe("0.01");
    element<HTMLButtonElement>(modal, '[aria-label="Aumentar cantidad"]').click(); await render();
    expect(component.cart[0].quantity).toBe(0.25);
    expect(component.cart[0].discountAmount).toBe(2.40);
    expect(savedDraft().cart[0].quantityPolicy).toBe("DECIMAL_2");
  });

  for (const policy of ["WHOLE", "LEGACY_UNCLASSIFIED"] as const) {
    it(`rejects fractional edits for ${policy} without truncating the requested value`, async () => {
      await mount(); component.cart = cart(); component.cart[0].quantityPolicy = policy;
      component.setQuantity(0, "1.25");
      expect(component.cart[0].quantity).toBe(2);
      expect(component.cart[0].quantityInput).toBe("1.25");
      expect(component.errorMessage).toContain("entera");
      component.payments[0].amount = 100;
      component.finalizeSale();
      expect(confirm.confirm).not.toHaveBeenCalled();
      component.setQuantity(0, "1");
      expect(component.cart[0].quantity).toBe(1);
      expect(component.cart[0].quantityInput).toBeUndefined();
      expect(component.cart[0].discountAmount).toBe(10);
    });
  }

  it("adds a product with fractional stock, refuses a missing policy and never invents legacy", async () => {
    await mount();
    const product: PosProductResponse = { productId: 401, sku: "QA-FRACTION", name: "Synthetic fraction",
      barcode: null, salePrice: 10, stockAvailable: 0.25, quantityPolicy: "DECIMAL_2" };
    component.addToCart(product);
    expect(component.cart[0].quantity).toBe(0.01);
    component.setQuantity(0, "0.25");
    expect(component.total).toBe(2.50);
    component.setQuantity(0, "0.26");
    expect(component.cart[0].quantity).toBe(0.25);
    expect(component.cart[0].quantityInput).toBe("0.26");
    component.addToCart({ ...product, productId: 402, quantityPolicy: undefined });
    expect(component.cart.length).toBe(1);
    expect(component.errorMessage).toContain("política");
  });

  it("rejects monetary precision and empty inputs before confirmation without zeroing stored amounts", async () => {
    await mount(); component.cart = cart(); component.cart[0].discountAmount = 1;
    component.setDiscount(0, "0.505");
    expect(component.cart[0].discountAmount).toBe(1);
    expect(component.cart[0].discountInput).toBe("0.505");
    component.payments[0].amount = 100;
    component.finalizeSale();
    expect(component.errorMessage).toContain("decimales");
    expect(confirm.confirm).not.toHaveBeenCalled();
    component.setDiscount(0, "1.00");
    component.setPaymentAmount(0, "");
    expect(component.payments[0].amount).toBe(100);
    expect(component.payments[0].amountInput).toBe("");
    component.finalizeSale();
    expect(confirm.confirm).not.toHaveBeenCalled();
    component.setPaymentAmount(0, "100.001");
    expect(component.payments[0].amountInput).toBe("100.001");
    expect(Number.isNaN(component.paidTotal)).toBeTrue();
  });

  it("accepts thirty cents, rejects twenty-nine cents and displays an exact pending balance", async () => {
    await mount(); component.cart = [cart()[0]];
    Object.assign(component.cart[0], { salePrice: 0.10, quantity: 3, discountAmount: 0 });
    component.setPaymentAmount(0, "0.29");
    component.finalizeSale();
    expect(confirm.confirm).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain("total pagado");
    component.openCheckoutModal(); await render();
    expect(host().querySelector('[aria-label="Resumen de pagos"]')!.textContent).toContain("Pendiente: S/ 0.01");
    component.setPaymentAmount(0, "0.30"); component.finalizeSale(); await render();
    expect(component.total).toBe(0.30);
    expect(component.errorMessage).toBe("");
    expect(confirm.confirm).toHaveBeenCalledTimes(1);
  });

  it("restores a valid fractional draft for review without confirming its stale price or stock", async () => {
    const restored = cart();
    Object.assign(restored[0], { quantityPolicy: "DECIMAL_2", quantity: 0.25, salePrice: 10, discountAmount: 0.05 });
    await mount({ formatVersion: 2, userId: user.id, cashRegisterSessionId: cashSession.id,
      warehouseId: warehouse.id, lastWarehouseId: warehouse.id, code: "", query: "", searchResults: [],
      cart: restored, payments: [{ paymentMethod: "CASH", amount: 100, reference: "" }],
      lastSaleId: null, preliminaryTotal: "6.45" });
    expect(component.cart[0].quantity).toBe(0.25);
    expect(component.cart[0].salePrice).toBe(10);
    expect(component.cart[0].discountAmount).toBe(0.05);
    expect(component.total).toBe(6.45);
    expect(savedDraft().requiresRevalidation).toBeTrue();
    expect(savedDraft().preliminaryTotal).toBe("6.45");
    component.finalizeSale();
    expect(component.errorMessage).toContain("revalidación");
    expect(confirm.confirm).not.toHaveBeenCalled();
  });
});
