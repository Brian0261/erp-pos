import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
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
      { productId: 101, sku: "QA-A", barcode: null, name: "QA Product A", salePrice: 10, stockAvailable: 10 },
      { productId: 102, sku: "QA-B", barcode: null, name: "QA Product B", salePrice: 5, stockAvailable: 10 },
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
        { provide: AuthService, useValue: { me: () => of(user) } },
        { provide: WarehouseService, useValue: { list: () => of([warehouse]) } },
        { provide: CashRegisterService, useValue: cash },
        { provide: PosService, useValue: pos },
        { provide: PosStateService, useValue: draftState },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: SalesService, useValue: sales },
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

  const cart = () => [
    { productId: 101, sku: "QA-A", barcode: null, name: "QA Product A", salePrice: 10,
      stockAvailable: 10, quantity: 2, discountAmount: 15 },
    { productId: 102, sku: "QA-B", barcode: null, name: "QA Product B", salePrice: 5.25,
      stockAvailable: 10, quantity: 1, discountAmount: 1.25 },
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
        { provide: AuthService, useValue: { me: () => of(user) } },
        { provide: WarehouseService, useValue: { list: () => of([warehouse]) } },
        { provide: CashRegisterService, useValue: cash },
        { provide: PosService, useValue: pos },
        { provide: PosStateService, useValue: {
          load: () => draft === null ? null : structuredClone(draft),
          save: saveDraft, clearAll: () => { draft = null; },
        } },
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

  it("applies the stock limit before clamping and persists both effective values", async () => {
    await mount();
    component.cart = cart();
    Object.assign(component.cart[0], { quantity: 4, stockAvailable: 2, discountAmount: 35 });
    await render();
    const quantity = element<HTMLInputElement>(host(), 'app-pos-cart-item [aria-label="Cantidad del producto"]');
    input(quantity, "8");
    await render();

    expect(component.cart[0].quantity).toBe(2);
    expect(component.cart[0].discountAmount).toBe(20);
    expect(quantity.value).toBe("2");
    expect(savedDraft().cart[0].quantity).toBe(2);
    expect(savedDraft().cart[0].discountAmount).toBe(20);
    expect(component.cart[1].discountAmount).toBe(1.25);
    expect(component.errorMessage).toContain("Cantidad excede stock disponible");
    expect(element(host(), '[role="status"]').textContent).toContain("de S/ 35.00 a S/ 20.00");
    expect(component.total).toBe(4);
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
    expect(quantity.value).toBe("1");
    expect(component.cart.length).toBe(2);
    expect(component.cart[0].quantity).toBe(1);
    expect(component.cart[0].discountAmount).toBe(0);
    expect(saveDraft.calls.count()).toBe(savesBefore);
    expect(host().querySelector('[role="status"]')).toBeNull();
    component.finalizeSale();
    expect(component.errorMessage).toContain("Stock insuficiente");
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it("repairs and saves an isolated legacy draft once, preserving valid discounts on subsequent restore", async () => {
    const restoredCart = cart();
    restoredCart[0].discountAmount = 25;
    restoredCart.push({ ...restoredCart[1], productId: 103, name: "QA Invalid discount", discountAmount: Infinity });
    restoredCart.push({ ...restoredCart[1], productId: 104, name: "QA Negative discount", discountAmount: -2 });
    await mount({
      userId: user.id, cashRegisterSessionId: cashSession.id, warehouseId: warehouse.id,
      lastWarehouseId: warehouse.id, code: "", query: "", searchResults: [],
      cart: restoredCart, payments: [{ paymentMethod: "CASH", amount: 0, reference: "" }], lastSaleId: null,
    });
    expect(component.cart.map((item) => item.discountAmount)).toEqual([20, 1.25, 0, 0]);
    expect(savedDraft().cart.map((item) => item.discountAmount)).toEqual([20, 1.25, 0, 0]);
    expect(component.total).toBe(14.50);
    expect(component.total).toBe(component.cartLineTotals.reduce((sum, net) => sum + net, 0));
    expect(element(host(), '[role="status"]').textContent).toContain("QA Product A de S/ 25.00 a S/ 20.00");
    expect(component.discountAdjustmentMessage).toContain("restauración del borrador");
    expect(component.discountAdjustmentMessage).toContain("QA Invalid discount");
    expect(component.discountAdjustmentMessage).toContain("QA Negative discount");

    const repaired = savedDraft();
    fixture!.destroy();
    await mount(repaired);
    expect(component.cart.map((item) => item.discountAmount)).toEqual([20, 1.25, 0, 0]);
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
    expect(component.errorMessage).toContain("finitos");
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
      items: [
        { productId: 101, quantity: 1, discountAmount: 10 },
        { productId: 102, quantity: 1, discountAmount: 1.25 },
      ],
      payments: [{ paymentMethod: "CASH", amount: 10, reference: "QA payment" }],
    });
  });
});
