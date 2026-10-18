import { HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "./data/cash-register.service";
import { PosService } from "./data/pos.service";
import { PosDraftState, PosStateService } from "./data/pos-state.service";
import { CreateSaleRequest, PosProductResponse, SaleResponse } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import { PosPageComponent } from "./pos-page.component";

describe("P1-B immutable checkout and recovery", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>;
  let page: PosPageComponent;
  let sales: jasmine.SpyObj<SalesService>;
  let pos: jasmine.SpyObj<PosService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  let state: PosStateService;
  let http: HttpTestingController;
  const live = (price = 10): PosProductResponse => ({ productId: 101, sku: "QA", barcode: null,
    name: "Synthetic", salePrice: price, stockAvailable: 10, quantityPolicy: "WHOLE" });
  const rejection = (status: number, error: unknown = { message: "Synthetic rejection" }) =>
    throwError(() => new HttpErrorResponse({ status, error }));
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const populate = () => { page.cart = [{ ...live(), quantity: 1, discountAmount: 0 }];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "QA" }]; };

  beforeEach(async () => {
    sessionStorage.removeItem("erp_pos_sales_draft_v1");
    sales = jasmine.createSpyObj<SalesService>("Sales", ["create"]);
    sales.create.and.returnValue(rejection(422));
    pos = jasmine.createSpyObj<PosService>("Pos", ["snapshot", "search", "lookup"]);
    pos.snapshot.and.returnValue(of([live()]));
    pos.search.and.returnValue(of([]));
    confirm = jasmine.createSpyObj<ConfirmDialogService>("Confirm", ["confirm"]);
    confirm.confirm.and.returnValue(Promise.resolve(true));
    await TestBed.configureTestingModule({ imports: [PosPageComponent], providers: [
      provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { me: () => of({ id: "qa-checkout", roles: ["CAJERO"] }) } },
      { provide: WarehouseService, useValue: { list: () => of([{ id: 1, code: "QA", name: "Synthetic", active: true }]) } },
      { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
      { provide: PosService, useValue: pos }, { provide: SalesService, useValue: sales },
      { provide: ConfirmDialogService, useValue: confirm },
      { provide: BillingSeriesService, useValue: { list: () => of([]) } },
      { provide: ElectronicDocumentService, useValue: jasmine.createSpyObj("Documents", ["createFromSale","generateXml","sign","send"]) },
    ] }).compileComponents();
    state = TestBed.inject(PosStateService); http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance;
    await settle(); populate();
  });
  afterEach(() => { http.verify(); fixture.destroy(); sessionStorage.removeItem("erp_pos_sales_draft_v1"); });

  it("sends the exact frozen snapshot with required confirmation fields", async () => {
    page.cart[0].salePrice = .1; page.cart[0].quantity = 3; page.payments[0].amount = .3;
    page.finalizeSale(); await settle();
    const body = sales.create.calls.mostRecent().args[0];
    expect(body.operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.confirmedTotal).toBe(.3);
    expect(body.items[0]).toEqual({ productId: 101, quantity: 3, discountAmount: 0, confirmedUnitPrice: .1 });
    expect(body.payments[0].amount).toBe(.3);
    expect(Object.isFrozen(body)).toBeTrue(); expect(Object.isFrozen(body.items[0])).toBeTrue();
  });
  for (const field of ["price", "quantity", "discount", "payment"]) {
    it("invalidates accepted snapshot after a valid " + field + " edit", async () => {
      let resolve!: (accepted: boolean) => void;
      confirm.confirm.and.returnValue(new Promise<boolean>(r => resolve = r));
      page.finalizeSale();
      if (field === "price") page.cart[0].salePrice = 9;
      if (field === "quantity") { page.cart[0].quantity = 2; page.payments[0].amount = 20; }
      if (field === "discount") page.setDiscount(0, "1");
      if (field === "payment") page.setPaymentAmount(0, "11");
      resolve(true); await settle();
      expect(sales.create).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("confirma nuevamente");
    });
  }
  it("does not dispatch twice while the same confirmation is pending", async () => {
    let resolve!: (accepted: boolean) => void;
    confirm.confirm.and.returnValue(new Promise<boolean>(r => resolve = r));
    page.finalizeSale(); page.finalizeSale(); resolve(true); await settle();
    expect(confirm.confirm).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("preserves the same operation and immutable body after an unknown transport outcome", async () => {
    sales.create.and.returnValue(rejection(0));
    page.finalizeSale(); await settle();
    const original = sales.create.calls.first().args[0];
    expect(state.load()!.pendingSaleRequest).toEqual(original);
    page.setQuantity(0, "2"); page.setPaymentAmount(0, "20"); page.cancelSale();
    expect(page.cart[0].quantity).toBe(1); expect(page.payments[0].amount).toBe(10);
    expect(sales.create).toHaveBeenCalledTimes(1);
    page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(2);
    expect(sales.create.calls.mostRecent().args[0]).toBe(original);
  });
  it("restores pending identity after remount without requiring a second sale proposal", async () => {
    sales.create.and.returnValue(rejection(504)); page.finalizeSale(); await settle();
    const body = sales.create.calls.first().args[0];
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(page.pendingSaleRequest).toEqual(body);
    page.finalizeSale(); await settle();
    expect(sales.create.calls.mostRecent().args[0]).toEqual(body);
    expect(sales.create.calls.mostRecent().args[0].operationId).toBe(body.operationId);
  });
  it("rejects dispatch when durable session persistence fails", async () => {
    spyOn(state, "save").and.returnValue(false);
    page.finalizeSale(); await settle();
    expect(sales.create).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("No se envió");
  });
  it("fails closed on an existing operation identity conflict instead of releasing a new operation", async () => {
    sales.create.and.returnValue(rejection(409, { code: "OPERATION_CONTENT_MISMATCH", message: "Requires review" }));
    page.finalizeSale(); await settle(); const body = sales.create.calls.first().args[0];
    expect(page.pendingSaleRequest).toEqual(body); page.setQuantity(0, "2");
    expect(page.cart[0].quantity).toBe(1); expect(state.load()!.pendingSaleRequest!.operationId).toBe(body.operationId);
    expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("does not discard another actor's pending identity or let it become a new checkout", async () => {
    sales.create.and.returnValue(rejection(0)); page.finalizeSale(); await settle();
    const body = sales.create.calls.first().args[0];
    spyOn(TestBed.inject(AuthService), "me").and.returnValue(of({ id: "another-actor", username: "qa", email: "qa@example.test", roles: ["CAJERO"] }));
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    page.addToCart(live()); page.saleForm.controls.code.setValue("query"); page.finalizeSale(); await settle();
    expect(page.cart).toEqual([]); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(state.load()!.pendingSaleRequest).toEqual(body); expect(state.load()!.userId).toBe("qa-checkout");
  });
  it("preserves an unknown operation when user and cash reads temporarily fail", async () => {
    sales.create.and.returnValue(rejection(0)); page.finalizeSale(); await settle();
    const body = sales.create.calls.first().args[0];
    spyOn(TestBed.inject(AuthService), "me").and.returnValue(rejection(0));
    spyOn(TestBed.inject(CashRegisterService), "current").and.returnValue(rejection(0));
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(state.load()!.pendingSaleRequest).toEqual(body); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("recovers the pending operation even when the original cash session is no longer open", async () => {
    sales.create.and.returnValue(rejection(0)); page.finalizeSale(); await settle();
    const body = sales.create.calls.first().args[0];
    spyOn(TestBed.inject(CashRegisterService), "current").and.returnValue(rejection(404));
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(page.currentCashSession).toBeNull(); expect(page.pendingSaleRequest).toEqual(body);
    page.finalizeSale(); await settle();
    expect(sales.create.calls.mostRecent().args[0]).toEqual(body);
  });
  it("shows price conflict without replacing original amounts or automatically resubmitting", async () => {
    sales.create.and.returnValue(rejection(409, { code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10,
      proposedTotal: 12, changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 }] }));
    page.finalizeSale(); await settle();
    expect(page.cart[0].salePrice).toBe(10); expect(page.needsRevalidation).toBeTrue();
    expect(page.draftReviewMessage).toContain("10.00"); expect(page.draftReviewMessage).toContain("12.00");
    expect(page.pendingSaleRequest).toBeNull(); expect(sales.create).toHaveBeenCalledTimes(1);
    const first = sales.create.calls.first().args[0].operationId;
    pos.snapshot.and.returnValue(of([live(12)])); confirm.confirm.and.returnValue(Promise.resolve(false));
    page.revalidateCart(); await settle(); expect(page.cart[0].salePrice).toBe(10);
    confirm.confirm.and.returnValue(Promise.resolve(true)); page.revalidateCart(); await settle();
    expect(page.cart[0].salePrice).toBe(12); expect(sales.create).toHaveBeenCalledTimes(1);
    page.setPaymentAmount(0, "12"); sales.create.and.returnValue(rejection(422)); page.finalizeSale(); await settle();
    expect(sales.create.calls.mostRecent().args[0].operationId).not.toBe(first);
    expect(sales.create.calls.mostRecent().args[0].confirmedTotal).toBe(12);
  });
  it("replaces an open checkout with a visible price review action and safe focus after 409", async () => {
    sales.create.and.returnValue(rejection(409, { code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10,
      proposedTotal: 12, changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 }] }));
    page.openCheckoutModal(); await settle();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.checkout-modal-backdrop')).not.toBeNull();
    const originalCart = structuredClone(page.cart), originalPayments = structuredClone(page.payments);
    page.finalizeSale(); await settle();
    const review = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === 'Revisar precios')!;
    expect(host.querySelector('.checkout-modal-backdrop')).toBeNull();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Los precios de esta venta cambiaron');
    expect(review.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(document.activeElement).toBe(review);
    expect(page.cart.map(({ requiresRevalidation, ...item }) => item)).toEqual(originalCart);
    expect(page.payments).toEqual(originalPayments);
    expect(sales.create).toHaveBeenCalledTimes(1);

    pos.snapshot.and.returnValue(of([live(12)]));
    confirm.confirm.and.returnValue(Promise.resolve(false));
    review.click(); await settle();
    const options = confirm.confirm.calls.mostRecent().args[0];
    expect(options.title).toBe('Los precios de esta venta cambiaron');
    expect(options.cancelText).toBe('Mantener carrito');
    expect(options.confirmText).toBe('Aceptar nuevos precios');
    expect(options.description).toContain('Si mantienes el carrito, no podrás cobrar hasta revisar los precios actualizados');
    expect(document.activeElement).toBe(review);
    expect(page.cart[0].salePrice).toBe(10); expect(page.needsRevalidation).toBeTrue();
    page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(page.payments).toEqual(originalPayments);

    confirm.confirm.and.returnValue(Promise.resolve(true));
    review.click(); await settle();
    expect(page.cart[0].salePrice).toBe(12); expect(page.priceReviewRequired).toBeFalse();
    expect(page.payments).toEqual(originalPayments);
    expect(document.activeElement).toBe(host.querySelector('.checkout-button'));
    page.finalizeSale(); await settle(); // The original S/10 payment cannot cover S/12.
    expect(sales.create).toHaveBeenCalledTimes(1);
    page.setPaymentAmount(0, '12');
    page.finalizeSale(); await settle(); // A second concurrent conflict requires review again.
    expect(sales.create).toHaveBeenCalledTimes(2);
    expect(confirm.confirm.calls.mostRecent().args[0].confirmText).toBe('Cobrar');
    expect(page.priceReviewRequired).toBeTrue(); expect(page.needsRevalidation).toBeTrue();
    expect(page.isCheckoutModalOpen).toBeFalse();
    expect(document.activeElement?.textContent?.trim()).toBe('Revisar precios');
  });

  it("compares multiple products without changing the approved draft until accepted", async () => {
    page.cart.push({ ...live(), productId: 102, name: 'Synthetic second', quantity: 2, discountAmount: 1 });
    page.payments[0].amount = 29;
    sales.create.and.returnValue(rejection(409, { code: 'PRICE_CONFIRMATION_REQUIRED', confirmedTotal: 29,
      proposedTotal: 37, changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 },
        { productId: 102, confirmedUnitPrice: 10, currentUnitPrice: 13 }] }));
    page.finalizeSale(); await settle();
    const original = structuredClone(page.cart), payments = structuredClone(page.payments);
    pos.snapshot.and.returnValue(of([live(12), { ...live(13), productId: 102 }]));
    confirm.confirm.and.returnValue(Promise.resolve(false)); page.openCheckoutModal(); await settle();
    const options = confirm.confirm.calls.mostRecent().args[0];
    expect(options.description).toContain('Synthetic: precio 10 → 12');
    expect(options.description).toContain('Synthetic second: precio 10 → 13');
    expect(options.description).toContain('Total propuesto: S/ 37.00');
    expect(page.cart).toEqual(original); expect(page.payments).toEqual(payments);
    expect(page.isCheckoutModalOpen).toBeFalse(); expect(sales.create).toHaveBeenCalledTimes(1);
  });

  it("leaves the checkout view and pending identity intact for an uncertain outcome", async () => {
    page.openCheckoutModal(); sales.create.and.returnValue(rejection(0));
    page.finalizeSale(); await settle();
    expect(page.isCheckoutModalOpen).toBeTrue(); expect(page.priceReviewRequired).toBeFalse();
    expect(page.pendingSaleRequest).not.toBeNull();
    const request = page.pendingSaleRequest!;
    page.finalizeSale(); await settle();
    expect(sales.create.calls.mostRecent().args[0]).toBe(request);
    expect(page.isCheckoutModalOpen).toBeTrue();
  });
  it("revalidates a legacy draft only after explicit acceptance without changing quantity or discount", async () => {
    page.cart[0].salePrice = 8; page.cart[0].quantity = 2; page.cart[0].discountAmount = 1;
    page.cart[0].quantityPolicy = undefined; page.cart[0].requiresRevalidation = true;
    page.revalidateCart(); await settle();
    expect(pos.snapshot).toHaveBeenCalledOnceWith([101], 1);
    expect(page.cart[0].quantity).toBe(2); expect(page.cart[0].discountAmount).toBe(1);
    expect(page.cart[0].salePrice).toBe(10); expect(String(page.cart[0].quantityPolicy)).toBe("WHOLE");
    expect(page.total).toBe(19); expect(page.needsRevalidation).toBeFalse();
    expect(sales.create).not.toHaveBeenCalled();
  });
  it("does not repair a quantity incompatible with the current policy or stock", async () => {
    page.cart[0].quantity = .125; page.cart[0].requiresRevalidation = true;
    pos.snapshot.and.returnValue(of([{ ...live(), quantityPolicy: "DECIMAL_2", stockAvailable: .1 }]));
    page.revalidateCart(); await settle();
    expect(page.cart[0].quantity).toBe(.125); expect(page.needsRevalidation).toBeTrue();
    expect(confirm.confirm).not.toHaveBeenCalled(); expect(sales.create).not.toHaveBeenCalled();
  });
  it("preserves fractional quantity and discount under a valid batch snapshot", async () => {
    page.cart[0].quantity = .25; page.cart[0].discountAmount = .05; page.cart[0].requiresRevalidation = true;
    pos.snapshot.and.returnValue(of([{ ...live(), quantityPolicy: "DECIMAL_2", stockAvailable: .255 }]));
    page.revalidateCart(); await settle();
    expect(page.cart[0].quantity).toBe(.25); expect(page.cart[0].discountAmount).toBe(.05);
    expect(page.total).toBe(2.45); expect(page.needsRevalidation).toBeFalse();
  });
  it("rejects stale batch responses after the cart changes", async () => {
    const response = new Subject<PosProductResponse[]>(); pos.snapshot.and.returnValue(response);
    page.cart[0].requiresRevalidation = true; page.revalidateCart(); page.cart[0].quantity = 2;
    response.next([live(12)]); response.complete(); await settle();
    expect(page.cart[0].salePrice).toBe(10); expect(page.needsRevalidation).toBeTrue();
    expect(confirm.confirm).not.toHaveBeenCalled();
  });
  it("leaves the draft unchanged if a product is missing from the live snapshot", async () => {
    page.cart[0].requiresRevalidation = true; const original = structuredClone(page.cart);
    pos.snapshot.and.returnValue(of([])); page.revalidateCart(); await settle();
    expect(page.cart).toEqual(original); expect(page.errorMessage).toContain("no está disponible");
  });
});
