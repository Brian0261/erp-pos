import { describe, expect, it, beforeEach, afterEach, vi, type Mocked } from "vitest";
import { HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS } from "../../core/auth/bound-auth-context";
import { jwtInterceptor } from "../../core/interceptors/jwt.interceptor";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { ElectronicDocumentResponse } from "../billing/data/billing.models";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "./data/cash-register.service";
import { PosService } from "./data/pos.service";
import { PosDraftState, PosStateService } from "./data/pos-state.service";
import { CreateSaleRequest, PosProductResponse, SaleResponse } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import { PosPageComponent } from "./pos-page.component";
import { PrepareSaleOperationRequest, SaleOperation, SaleOperationsService } from "./data/sale-operations.service";
import { createOperationDouble, preparedOperation } from "./testing/sale-operation-double.vitest";

const nativeSetItem = Storage.prototype.setItem;
const draftKey = "erp_pos_sales_draft_v1";

function observeStorageWrites(storage: Storage) {
  // Chrome's named Storage properties require spying on the method on its prototype.
  // Keep the spy scoped to one receiver and forward the other receiver's writes unchanged.
  const write = vi.fn(nativeSetItem);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    return (this === storage ? write : nativeSetItem).call(this, key, value);
  });
  return write;
}

afterEach(() => {
  vi.restoreAllMocks();
  if (Storage.prototype.setItem !== nativeSetItem || vi.isFakeTimers() || sessionStorage.getItem(draftKey) !== null) {
    throw new Error("Checkout test leaked a storage spy, draft, or simulated clock");
  }
});

describe("P1-B immutable checkout and recovery", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>;
  let page: PosPageComponent;
  let sales: Mocked<Pick<SalesService, "create" | "getById">>;
  let pos: Mocked<Pick<PosService, "snapshot" | "search" | "lookup">>;
  let confirm: Mocked<Pick<ConfirmDialogService, "confirm">>;
  let state: PosStateService;
  let http: HttpTestingController;
  let documents: Mocked<Pick<ElectronicDocumentService, "createFromSale" | "listBySaleId" | "generateXml" | "sign" | "send">>;
  let operations: ReturnType<typeof createOperationDouble>;
  const live = (price = 10): PosProductResponse => ({ productId: 101, sku: "QA", barcode: null,
    name: "Synthetic", salePrice: price, stockAvailable: 10, quantityPolicy: "WHOLE" });
  const rejection = (status: number, error: unknown = { message: "Synthetic rejection" }) =>
    throwError(() => new HttpErrorResponse({ status, error }));
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const populate = () => { page.cart = [{ ...live(), quantity: 1, discountAmount: 0 }];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "QA" }]; };
  const sale = (): SaleResponse => ({ id: 77, saleNumber: "S-QA", cashRegisterSessionId: 7, warehouseId: 1,
    status: "COMPLETED", subtotalAmount: 10, discountAmount: 0, totalAmount: 10, paidAmount: 10, changeAmount: 0,
    soldAt: "2026-10-18T00:00:00Z", voidedAt: null, voidedByUserId: null, voidReason: null,
    createdBy: "qa", items: [], payments: [] });
  const receipt = (type: "RECEIPT" | "INVOICE") => {
    page.billingSeriesRows = [{ id: 21, version: 0, documentType: type, series: type === "INVOICE" ? "F001" : "B001",
      currentNumber: 1, environment: "LOCAL", active: true, createdAt: "", updatedAt: "" }];
    page.setReceiptType(type); page.setReceiptSeriesId("21");
    page.setReceiptCustomerDocument(type === "INVOICE" ? "20123456789" : "12345678");
    page.setReceiptCustomerName("Cliente sintético"); page.setReceiptCustomerAddress("Dirección sintética");
  };
  const issuedDocument = (type: "RECEIPT" | "INVOICE" = "RECEIPT"): ElectronicDocumentResponse => ({
    id: 901, saleId: 77, billingSeriesId: 21, documentType: type, status: "DRAFT", environment: "LOCAL",
    series: type === "INVOICE" ? "F001" : "B001", number: 1, fullNumber: type === "INVOICE" ? "F001-1" : "B001-1",
    customerName: "Cliente sintético", customerDocument: type === "INVOICE" ? "20123456789" : "12345678",
    subtotalAmount: 10, taxAmount: 0, totalAmount: 10, xmlGeneratedAt: null, signedAt: null, sentAt: null,
    providerTicket: null, providerMessage: null, createdAt: "", updatedAt: "", items: [] });
  const remount = async () => {
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
  };
  const lookupAndResume = async () => {
    page.finalizeSale(); await settle(); page.confirmPreparedResume(); await settle();
  };
  const completedOperation = (located = false): SaleOperation => ({
    ...preparedOperation(operations.prepare.mock.lastCall![0]), state: "COMPLETED", command: null,
    saleId: 77, documentId: located ? 901 : null, documentStatus: located ? "DRAFT" : null,
    receiptState: located ? "LOCATED" : page.receiptType === "TICKET" ? "NOT_REQUIRED" : "PENDING",
  });

  beforeEach(async () => {
    sessionStorage.removeItem("erp_pos_sales_draft_v1");
    sales = {
      create: vi.fn<SalesService["create"]>(),
      getById: vi.fn<SalesService["getById"]>(),
    };
    sales.create.mockReturnValue(rejection(422));
    sales.getById.mockReturnValue(of(sale()));
    pos = {
      snapshot: vi.fn<PosService["snapshot"]>(),
      search: vi.fn<PosService["search"]>(),
      lookup: vi.fn<PosService["lookup"]>(),
    };
    pos.snapshot.mockReturnValue(of([live()]));
    pos.search.mockReturnValue(of([]));
    confirm = {
      confirm: vi.fn<ConfirmDialogService["confirm"]>(),
    };
    confirm.confirm.mockReturnValue(Promise.resolve(true));
    documents = {
      createFromSale: vi.fn<ElectronicDocumentService["createFromSale"]>(),
      listBySaleId: vi.fn<ElectronicDocumentService["listBySaleId"]>(),
      generateXml: vi.fn<ElectronicDocumentService["generateXml"]>(),
      sign: vi.fn<ElectronicDocumentService["sign"]>(),
      send: vi.fn<ElectronicDocumentService["send"]>(),
    };
    documents.createFromSale.mockReturnValue(rejection(504)); documents.listBySaleId.mockReturnValue(of([]));
    operations = createOperationDouble();
    await TestBed.configureTestingModule({ imports: [PosPageComponent], providers: [
      provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => "synthetic-session", me: () => of({ id: "qa-checkout", roles: ["CAJERO"] }) } },
      { provide: WarehouseService, useValue: { list: () => of([{ id: 1, code: "QA", name: "Synthetic", active: true }]) } },
      { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
      { provide: PosService, useValue: pos }, { provide: SalesService, useValue: sales },
      { provide: ConfirmDialogService, useValue: confirm },
      { provide: BillingSeriesService, useValue: { list: () => of([]) } },
      { provide: ElectronicDocumentService, useValue: documents },
      { provide: SaleOperationsService, useValue: operations },
    ] }).compileComponents();
    state = TestBed.inject(PosStateService); http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance;
    await settle(); populate();
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      fixture.destroy();
      sessionStorage.removeItem(draftKey);
    }
  });

  it("never dispatches invalid payment input and does not cache its error after correction",async()=>{
    page.isCheckoutModalOpen=true;page.setPaymentAmount(0,'');page.finalizeSale(true);await settle();
    expect(page.checkoutReviewBlockedReason).not.toBe('');expect(page.errorMessage).toBe('');expect(page.payments[0].amountInput).toBe('');
    expect(operations.prepare).not.toHaveBeenCalled();expect(sales.create).not.toHaveBeenCalled();
    page.setPaymentAmount(0,'10');expect(page.checkoutReviewBlockedReason).toBe('');expect(page.errorMessage).toBe('');
    page.finalizeSale(true);page.finalizeSale(true);await settle();
    expect(operations.prepare).toHaveBeenCalledTimes(1);expect(sales.create).toHaveBeenCalledTimes(1);
    expect(sales.create.mock.calls[0][0].payments).toEqual([{paymentMethod:'CASH',amount:10,reference:'QA'}]);
  });
  it("rechecks a payment invalidated while awaiting confirmation without caching a stale field error",async()=>{
    let accept!:(value:boolean)=>void;confirm.confirm.mockReturnValue(new Promise<boolean>(resolve=>accept=resolve));
    page.isCheckoutModalOpen=true;page.finalizeSale();page.setPaymentAmount(0,'0.001');accept(true);await settle();
    expect(operations.prepare).not.toHaveBeenCalled();expect(sales.create).not.toHaveBeenCalled();expect(page.errorMessage).toBe('');
    page.setPaymentAmount(0,'10');await settle();expect(page.checkoutReviewBlockedReason).toBe('');expect(page.errorMessage).toBe('');
  });

  it("uses one explicit integrated review action and preserves the frozen durable request under double invocation",async()=>{
    page.isCheckoutModalOpen=true;expect(page.checkoutReviewBlockedReason).toBe('');page.finalizeSale(true);page.finalizeSale(true);await settle();
    expect(confirm.confirm).not.toHaveBeenCalled();expect(operations.prepare).toHaveBeenCalledTimes(1);expect(sales.create).toHaveBeenCalledTimes(1);
    const body=sales.create.mock.calls[0][0];expect(Object.isFrozen(body)).toBe(true);expect(Object.isFrozen(body.items[0])).toBe(true);
    expect(body).toEqual(operations.prepare.mock.calls[0][0].command!);expect(page.pendingSaleRequest?.operationId).toBe(body.operationId);
  });
  it("rejects integrated review without an open checkout and keeps failed validations outside the write protocol",async()=>{
    page.finalizeSale(true);await settle();expect(operations.prepare).not.toHaveBeenCalled();
    page.isCheckoutModalOpen=true;page.payments[0].amount=0;expect(page.checkoutReviewBlockedReason).toContain('pago');page.finalizeSale(true);await settle();
    expect(sales.create).not.toHaveBeenCalled();expect(operations.prepare).not.toHaveBeenCalled();
    page.payments[0].amount=10;receipt('INVOICE');page.receiptCustomerName='';expect(page.checkoutReviewBlockedReason).toContain('razón social');page.finalizeSale(true);await settle();expect(operations.prepare).not.toHaveBeenCalled();
  });
  it("rechecks the fingerprint and modal lifetime before dispatching the integrated review",async()=>{
    page.isCheckoutModalOpen=true;page.finalizeSale(true);page.cart[0].quantity=2;page.payments[0].amount=20;await settle();
    expect(operations.prepare).not.toHaveBeenCalled();expect(page.errorMessage).toContain('confirma nuevamente');
    page.finalizeSale(true);page.closeCheckoutModal();await settle();expect(operations.prepare).not.toHaveBeenCalled();expect(sales.create).not.toHaveBeenCalled();
  });

  it("sends the exact frozen snapshot with required confirmation fields", async () => {
    page.cart[0].salePrice = .1; page.cart[0].quantity = 3; page.payments[0].amount = .3;
    page.finalizeSale(); await settle();
    const body = sales.create.mock.lastCall![0];
    expect(body.operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.confirmedTotal).toBe(.3);
    expect(body.items[0]).toEqual({ productId: 101, quantity: 3, discountAmount: 0, confirmedUnitPrice: .1 });
    expect(body.payments[0].amount).toBe(.3);
    expect(Object.isFrozen(body)).toBe(true); expect(Object.isFrozen(body.items[0])).toBe(true);
  });
  for (const field of ["price", "quantity", "discount", "payment"]) {
    it("invalidates accepted snapshot after a valid " + field + " edit", async () => {
      let resolve!: (accepted: boolean) => void;
      confirm.confirm.mockReturnValue(new Promise<boolean>(r => resolve = r));
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
    confirm.confirm.mockReturnValue(new Promise<boolean>(r => resolve = r));
    page.finalizeSale(); page.finalizeSale(); resolve(true); await settle();
    expect(confirm.confirm).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("preserves the same operation and immutable body after an unknown transport outcome", async () => {
    sales.create.mockReturnValue(rejection(0));
    page.finalizeSale(); await settle();
    const original = sales.create.mock.calls[0][0];
    expect(state.load()!.pendingSaleRequest).toEqual(original);
    page.setQuantity(0, "2"); page.setPaymentAmount(0, "20"); page.cancelSale();
    expect(page.cart[0].quantity).toBe(1); expect(page.payments[0].amount).toBe(10);
    expect(sales.create).toHaveBeenCalledTimes(1);
    page.finalizeSale(); await settle();
    expect(operations.get).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    page.confirmPreparedResume(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(2);
    expect(sales.create.mock.lastCall![0]).toEqual(original);
  });
  it("restores pending identity after remount without requiring a second sale proposal", async () => {
    sales.create.mockReturnValue(rejection(504)); page.finalizeSale(); await settle();
    const body = sales.create.mock.calls[0][0];
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(page.pendingSaleRequest).toEqual(body);
    await lookupAndResume();
    expect(sales.create.mock.lastCall![0]).toEqual(body);
    expect(sales.create.mock.lastCall![0].operationId).toBe(body.operationId);
  });
  it("uses server preparation when optional session persistence fails", async () => {
    vi.spyOn(state, "save").mockReturnValue(false);
    page.finalizeSale(); await settle();
    expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(page.pendingSaleRequest!.operationId).toBe(operations.prepare.mock.calls[0][0].operationId);
  });
  it("fails closed on an existing operation identity conflict instead of releasing a new operation", async () => {
    sales.create.mockReturnValue(rejection(409, { code: "OPERATION_CONTENT_MISMATCH", message: "Requires review" }));
    page.finalizeSale(); await settle(); const body = sales.create.mock.calls[0][0];
    expect(page.pendingSaleRequest).toEqual(body); page.setQuantity(0, "2");
    expect(page.cart[0].quantity).toBe(1); expect(state.load()!.pendingSaleRequest!.operationId).toBe(body.operationId);
    expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("preserves another actor's identity without exposing or dispatching it", async () => {
    sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const body = sales.create.mock.calls[0][0];
    vi.spyOn(TestBed.inject(AuthService), "me").mockReturnValue(of({ id: "another-actor", username: "qa", email: "qa@example.test", roles: ["CAJERO"] }));
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(page.cart).toEqual([]); expect(page.pendingSaleRequest).toBeNull(); expect(page.receiptRecovery).toBeNull();
    page.addToCart(live()); page.saleForm.controls.code.setValue("query"); page.finalizeSale(); await settle();
    expect(page.cart.length).toBe(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(state.load()!.pendingSaleRequest).toEqual(body); expect(state.load()!.userId).toBe("qa-checkout");
  });
  it("preserves an unknown operation when user and cash reads temporarily fail", async () => {
    sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const body = sales.create.mock.calls[0][0];
    vi.spyOn(TestBed.inject(AuthService), "me").mockReturnValue(rejection(0));
    vi.spyOn(TestBed.inject(CashRegisterService), "current").mockReturnValue(rejection(0));
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(state.load()!.pendingSaleRequest).toEqual(body); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("recovers the pending operation even when the original cash session is no longer open", async () => {
    sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const body = sales.create.mock.calls[0][0];
    vi.spyOn(TestBed.inject(CashRegisterService), "current").mockReturnValue(rejection(404));
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(page.currentCashSession).toBeNull(); expect(page.pendingSaleRequest).toEqual(body);
    await lookupAndResume();
    expect(sales.create.mock.lastCall![0]).toEqual(body);
  });
  it("shows price conflict without replacing original amounts or automatically resubmitting", async () => {
    sales.create.mockReturnValue(rejection(409, { code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10,
      proposedTotal: 12, changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 }] }));
    page.finalizeSale(); await settle();
    expect(page.cart[0].salePrice).toBe(10); expect(page.needsRevalidation).toBe(true);
    expect(page.draftReviewMessage).toContain("10.00"); expect(page.draftReviewMessage).toContain("12.00");
    expect(page.pendingSaleRequest).not.toBeNull(); expect(sales.create).toHaveBeenCalledTimes(1);
    const first = sales.create.mock.calls[0][0].operationId;
    page.cancelPendingPreparation(); await settle(); expect(operations.cancel).toHaveBeenCalledTimes(1);
    pos.snapshot.mockReturnValue(of([live(12)])); confirm.confirm.mockReturnValue(Promise.resolve(false));
    page.revalidateCart(); await settle(); expect(page.cart[0].salePrice).toBe(10);
    confirm.confirm.mockReturnValue(Promise.resolve(true)); page.revalidateCart(); await settle();
    expect(page.cart[0].salePrice).toBe(12); expect(sales.create).toHaveBeenCalledTimes(1);
    page.setPaymentAmount(0, "12"); sales.create.mockReturnValue(rejection(422)); page.finalizeSale(); await settle();
    expect(sales.create.mock.lastCall![0].operationId).not.toBe(first);
    expect(sales.create.mock.lastCall![0].confirmedTotal).toBe(12);
  });
  it("replaces an open checkout with a visible price review action and safe focus after 409", async () => {
    // Render the re-enabled launcher before the deferred focus, as the application does.
    fixture.autoDetectChanges();
    sales.create.mockReturnValue(rejection(409, { code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10,
      proposedTotal: 12, changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 }] }));
    page.openCheckoutModal(); await settle();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.checkout-modal-backdrop')).not.toBeNull();
    const originalCart = structuredClone(page.cart), originalPayments = structuredClone(page.payments);
    page.finalizeSale(); await settle();
    page.cancelPendingPreparation(); await settle();
    const review = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === 'Comprobar condiciones')!;
    expect(host.querySelector('.checkout-modal-backdrop')).toBeNull();
    expect(host.querySelector('[aria-label="Condiciones de la compra"]')?.textContent).toContain('Comprueba las condiciones');
    expect(review.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(document.activeElement).toBe(review);
    expect(page.cart.map(({ requiresRevalidation, ...item }) => item)).toEqual(originalCart);
    expect(page.payments).toEqual(originalPayments);
    expect(sales.create).toHaveBeenCalledTimes(1);

    pos.snapshot.mockReturnValue(of([live(12)]));
    confirm.confirm.mockReturnValue(Promise.resolve(false));
    review.click(); await settle();
    const options = confirm.confirm.mock.lastCall![0];
    expect(options.title).toBe('Se actualizaron condiciones de tu compra');
    expect(options.cancelText).toBe('Volver al carrito sin aplicar cambios');
    expect(options.confirmText).toBe('Actualizar carrito con condiciones vigentes');
    expect(options.description).toContain('el cobro seguirá pendiente de verificación');
    expect(document.activeElement).toBe(review);
    expect(page.cart[0].salePrice).toBe(10); expect(page.needsRevalidation).toBe(true);
    page.finalizeSale(); await settle();
    page.cancelPendingPreparation(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(page.payments).toEqual(originalPayments);

    confirm.confirm.mockReturnValue(Promise.resolve(true));
    review.click(); await settle();
    expect(page.cart[0].salePrice).toBe(12); expect(page.priceReviewRequired).toBe(false);
    expect(page.payments).toEqual(originalPayments);
    expect(document.activeElement).toBe(host.querySelector('.checkout-button'));
    page.finalizeSale(); await settle(); // The original S/10 payment cannot cover S/12.
    expect(sales.create).toHaveBeenCalledTimes(1);
    page.setPaymentAmount(0, '12');
    page.finalizeSale(); await settle(); // A second concurrent conflict requires review again.
    expect(sales.create).toHaveBeenCalledTimes(2);
    expect(confirm.confirm.mock.lastCall![0].confirmText).toBe('Cobrar');
    expect(page.priceReviewRequired).toBe(true); expect(page.needsRevalidation).toBe(true);
    expect(page.isCheckoutModalOpen).toBe(false);
    expect(document.activeElement?.textContent?.trim()).toBe('REVISAR PREPARACIÓN');
  });

  it("compares multiple products without changing the approved draft until accepted", async () => {
    page.cart.push({ ...live(), productId: 102, name: 'Synthetic second', quantity: 2, discountAmount: 1 });
    page.payments[0].amount = 29;
    sales.create.mockReturnValue(rejection(409, { code: 'PRICE_CONFIRMATION_REQUIRED', confirmedTotal: 29,
      proposedTotal: 37, changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 },
        { productId: 102, confirmedUnitPrice: 10, currentUnitPrice: 13 }] }));
    page.finalizeSale(); await settle();
    page.cancelPendingPreparation(); await settle();
    const original = structuredClone(page.cart), payments = structuredClone(page.payments);
    pos.snapshot.mockReturnValue(of([live(12), { ...live(13), productId: 102 }]));
    confirm.confirm.mockReturnValue(Promise.resolve(false)); page.openCheckoutModal(); await settle();
    const options = confirm.confirm.mock.lastCall![0];
    expect(options.description).toContain('Synthetic: precio S/ 10.00 → S/ 12.00');
    expect(options.description).toContain('Synthetic second: precio S/ 10.00 → S/ 13.00');
    expect(options.description).toContain('Total propuesto: S/ 37.00');
    expect(page.cart).toEqual(original); expect(page.payments).toEqual(payments);
    expect(page.isCheckoutModalOpen).toBe(false); expect(sales.create).toHaveBeenCalledTimes(1);
  });

  it("leaves the checkout view and pending identity intact for an uncertain outcome", async () => {
    page.openCheckoutModal(); sales.create.mockReturnValue(rejection(0));
    page.finalizeSale(); await settle();
    expect(page.isCheckoutModalOpen).toBe(true); expect(page.priceReviewRequired).toBe(false);
    expect(page.pendingSaleRequest).not.toBeNull();
    const request = page.pendingSaleRequest!;
    page.finalizeSale(); await settle();
    expect(operations.get).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(page.pendingSaleRequest).toEqual(request);
    expect(page.isCheckoutModalOpen).toBe(true);
  });
  it("revalidates a legacy draft only after explicit acceptance without changing quantity or discount", async () => {
    page.cart[0].salePrice = 8; page.cart[0].quantity = 2; page.cart[0].discountAmount = 1;
    page.cart[0].quantityPolicy = undefined; page.cart[0].requiresRevalidation = true;
    page.revalidateCart(); await settle();
    expect(pos.snapshot).toHaveBeenCalledExactlyOnceWith([101], 1, expect.any(HttpContext));
    expect(pos.snapshot.mock.lastCall![2]!.get(BOUND_AUTH_CREDENTIALS)?.token).toBe("synthetic-session");
    expect(page.cart[0].quantity).toBe(2); expect(page.cart[0].discountAmount).toBe(1);
    expect(page.cart[0].salePrice).toBe(10); expect(String(page.cart[0].quantityPolicy)).toBe("WHOLE");
    expect(page.total).toBe(19); expect(page.needsRevalidation).toBe(false);
    expect(sales.create).not.toHaveBeenCalled();
  });
  it("does not repair a quantity incompatible with the current policy or stock", async () => {
    page.cart[0].quantity = .125; page.cart[0].requiresRevalidation = true;
    pos.snapshot.mockReturnValue(of([{ ...live(), quantityPolicy: "DECIMAL_2", stockAvailable: .1 }]));
    page.revalidateCart(); await settle();
    expect(page.cart[0].quantity).toBe(.125); expect(page.needsRevalidation).toBe(true);
    expect(confirm.confirm).not.toHaveBeenCalled(); expect(sales.create).not.toHaveBeenCalled();
  });
  it("preserves fractional quantity and discount under a valid batch snapshot", async () => {
    page.cart[0].quantity = .25; page.cart[0].discountAmount = .05; page.cart[0].requiresRevalidation = true;
    pos.snapshot.mockReturnValue(of([{ ...live(), quantityPolicy: "DECIMAL_2", stockAvailable: .255 }]));
    page.revalidateCart(); await settle();
    expect(page.cart[0].quantity).toBe(.25); expect(page.cart[0].discountAmount).toBe(.05);
    expect(page.total).toBe(2.45); expect(page.needsRevalidation).toBe(false);
  });
  it("rejects stale batch responses after the cart changes", async () => {
    const response = new Subject<PosProductResponse[]>(); pos.snapshot.mockReturnValue(response);
    page.cart[0].requiresRevalidation = true; page.revalidateCart(); page.cart[0].quantity = 2;
    response.next([live(12)]); response.complete(); await settle();
    expect(page.cart[0].salePrice).toBe(10); expect(page.needsRevalidation).toBe(true);
    expect(confirm.confirm).not.toHaveBeenCalled();
  });
  it("leaves the draft unchanged if a product is missing from the live snapshot", async () => {
    page.cart[0].requiresRevalidation = true; const original = structuredClone(page.cart);
    pos.snapshot.mockReturnValue(of([])); page.revalidateCart(); await settle();
    expect(page.cart).toEqual(original); expect(page.cartVerificationMessage).toContain("no está disponible");
  });

  it("recovers a pending ticket with the same request and no electronic creation", async () => {
    sales.create.mockReturnValue(rejection(504)); page.finalizeSale(); await settle();
    const request = sales.create.mock.calls[0][0];
    expect(state.load()!.receiptRecovery!.receiptType).toBe("TICKET");
    await remount(); operations.get.mockReturnValue(of(completedOperation())); page.finalizeSale(); await settle();
    expect(sales.create.mock.lastCall![0]).toEqual(request); expect(sales.create).toHaveBeenCalledTimes(1);
    page.finalizeSale(); await settle();
    expect(documents.createFromSale).not.toHaveBeenCalled(); expect(page.lastSaleId).toBe(77);
    expect(page.cart).toEqual([]); expect(state.load()!.receiptRecovery).toBeNull();
  });

  for (const type of ["RECEIPT", "INVOICE"] as const) {
    it("restores the original " + type + " intent after remount and replays only the same sale", async () => {
      receipt(type); sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
      const request = sales.create.mock.calls[0][0], intent = state.load()!.receiptRecovery!;
      expect(Object.isFrozen(page.receiptRecovery)).toBe(true); expect(Object.isFrozen(page.receiptRecovery!.payload)).toBe(true);
      await remount(); expect(page.receiptType).toBe(type); expect(page.receiptSeriesId).toBe("21");
      expect(page.receiptCustomerName).toBe("Cliente sintético"); expect(page.receiptCustomerDocument).toBe(intent.payload!.customerDocument!);
      expect(page.receiptCustomerAddress).toBe("Dirección sintética");
      sales.create.mockReturnValue(of(sale())); documents.createFromSale.mockReturnValue(of(issuedDocument(type)));
      await lookupAndResume();
      expect(sales.create.mock.lastCall![0]).toEqual(request);
      expect(documents.createFromSale).toHaveBeenCalledExactlyOnceWith(77, intent.payload!, expect.any(HttpContext));
      expect(documents.generateXml).not.toHaveBeenCalled(); expect(documents.sign).not.toHaveBeenCalled(); expect(documents.send).not.toHaveBeenCalled();
      expect(page.receiptRecovery).toBeNull(); expect(page.cart).toEqual([]);
    });
    it("preserves normal " + type + " checkout and records the marker before creation", async () => {
      receipt(type); sales.create.mockReturnValue(of(sale()));
      documents.createFromSale.mockImplementation((saleId, payload) => {
        const saved = state.load()!.receiptRecovery!;
        expect(saved.saleId).toBe(saleId); expect(saved.creationState).toBe("POSSIBLY_SENT");
        expect(saved.payload).toEqual(payload); expect(saved.userId).toBe("qa-checkout");
        return of(issuedDocument(type));
      });
      page.finalizeSale(); await settle();
      expect(page.successMessage).toContain(issuedDocument(type).fullNumber);
      page.finalizeSale(); await settle();
      expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
    });
  }

  it("uses the frozen receipt payload even if live fields change while the sale response is pending", async () => {
    receipt("INVOICE"); const response = new Subject<SaleResponse>(); sales.create.mockReturnValue(response);
    documents.createFromSale.mockReturnValue(of(issuedDocument("INVOICE"))); page.finalizeSale(); await settle();
    page.receiptType = "TICKET"; page.receiptSeriesId = "999"; page.receiptCustomerName = "Cambio no confirmado";
    response.next(sale()); response.complete(); await settle();
    expect(documents.createFromSale).toHaveBeenCalledExactlyOnceWith(77, { documentType: "INVOICE", billingSeriesId: 21,
      customerName: "Cliente sintético", customerDocument: "20123456789" }, expect.any(HttpContext));
  });

  it("blocks receipt edits while recovering an unknown sale result", async () => {
    receipt("INVOICE"); sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const context = state.load()!.receiptRecovery!;
    page.setReceiptType("TICKET"); page.setReceiptSeriesId("999"); page.setReceiptCustomerDocument("99999999999");
    page.setReceiptCustomerName("Otro"); page.setReceiptCustomerAddress("Otra dirección");
    expect(page.receiptType).toBe("INVOICE"); expect(page.receiptSeriesId).toBe("21");
    expect(page.receiptCustomerDocument).toBe("20123456789"); expect(page.receiptCustomerName).toBe("Cliente sintético");
    expect(page.receiptCustomerAddress).toBe("Dirección sintética"); expect(state.load()!.receiptRecovery).toEqual(context);
  });

  it("preserves an existing pending identity when persistence fails before its replay", async () => {
    receipt("INVOICE"); sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const request = page.pendingSaleRequest, context = page.receiptRecovery;
    vi.spyOn(state, "save").mockReturnValue(false); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(page.pendingSaleRequest).toEqual(request);
    expect(page.receiptRecovery!.operationId).toBe(context!.operationId);
    expect(page.receiptRecovery!.payload).toEqual(context!.payload); expect(documents.createFromSale).not.toHaveBeenCalled();
  });

  it("prepares the sale durably when browser receipt persistence is unavailable", async () => {
    receipt("INVOICE"); observeStorageWrites(sessionStorage).mockImplementation(() => { throw new Error("Synthetic storage failure"); });
    page.finalizeSale(); await settle();
    expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(documents.createFromSale).not.toHaveBeenCalled(); expect(page.pendingSaleRequest).not.toBeNull();
  });

  it("uses the server receipt intent and one document POST when browser marker persistence fails", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale()));
    documents.createFromSale.mockImplementation((saleId, payload) => {
      expect(page.receiptRecovery!.creationState).toBe("POSSIBLY_SENT");
      expect(operations.prepare.mock.calls[0][0].receiptIntent!.payload).toEqual(payload);
      expect(saleId).toBe(77); return of(issuedDocument());
    });
    const save = state.save.bind(state);
    vi.spyOn(state, "save").mockImplementation(draft => draft.receiptRecovery?.creationState === "POSSIBLY_SENT" ? false : save(draft));
    page.finalizeSale(); await settle();
    expect(documents.createFromSale).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(page.lastSaleId).toBe(77); expect(page.successMessage).toContain("creado como borrador");
    expect(page.receiptRecovery).toBeNull();
  });

  it("keeps a confirmed sale across a closed cash session and never repeats its sale POST", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); const save = state.save.bind(state);
    const saveSpy = vi.spyOn(state, "save").mockImplementation(draft => draft.receiptRecovery?.creationState === "POSSIBLY_SENT" ? false : save(draft));
    page.finalizeSale(); await settle(); saveSpy.mockImplementation(save);
    vi.spyOn(TestBed.inject(CashRegisterService), "current").mockReturnValue(rejection(404)); await remount();
    operations.get.mockReturnValue(of(completedOperation(true))); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
    expect(page.lastSaleId).toBe(77);
  });

  it("retains an uncertain electronic result through retries, cancellation and reset", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); page.finalizeSale(); await settle();
    const context = state.load()!.receiptRecovery!;
    expect(context.creationState).toBe("POSSIBLY_SENT"); expect(context.saleId).toBe(77);
    page.setReceiptType("TICKET"); page.setReceiptSeriesId("999"); page.setReceiptCustomerName("Cambio");
    page.setQuantity(0, "2"); page.cancelSale();
    page["resetDraftAfterCheckout"](false); state.clearDraft();
    expect(state.load()!.receiptRecovery).toEqual(context); expect(page.receiptType).toBe("RECEIPT");
    expect(page.cart[0].quantity).toBe(1); expect(page.successMessage).toBe("");
    page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
    expect(operations.get).toHaveBeenCalledTimes(2); expect(documents.listBySaleId).not.toHaveBeenCalled();
  });

  it("restores a possibly sent creation and recovers a matching document only by GET", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale()));
    const response = new Subject<ElectronicDocumentResponse>(); documents.createFromSale.mockReturnValue(response);
    page.finalizeSale(); await settle(); await remount();
    expect(page.receiptRecovery!.creationState).toBe("POSSIBLY_SENT"); expect(page.pendingSaleRequest).toBeNull();
    expect(page.draftReviewMessage).toBe("");
    expect(documents.listBySaleId).not.toHaveBeenCalled();
    operations.get.mockReturnValue(of(completedOperation(true))); page.finalizeSale(); await settle();
    expect(operations.get).toHaveBeenCalledExactlyOnceWith(page.receiptRecovery?.operationId ?? operations.prepare.mock.calls[0][0].operationId, expect.any(HttpContext));
    expect(documents.listBySaleId).not.toHaveBeenCalled();
    expect(documents.createFromSale).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(page.successMessage).toContain("localizado"); expect(page.lastSaleId).toBe(77);
    page.finalizeSale(); await settle(); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
  });

  it("ignores late sale responses from a destroyed component and keeps its pending request", async () => {
    receipt("INVOICE"); const response = new Subject<SaleResponse>(); sales.create.mockReturnValue(response);
    page.finalizeSale(); await settle(); await remount();
    const saved = sessionStorage.getItem("erp_pos_sales_draft_v1"); response.next(sale()); response.complete(); await settle();
    expect(sessionStorage.getItem("erp_pos_sales_draft_v1")).toBe(saved);
    expect(documents.createFromSale).not.toHaveBeenCalled(); expect(page.pendingSaleRequest).not.toBeNull();
  });

  it("ignores late document responses from a destroyed component without erasing recovered context", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); const response = new Subject<ElectronicDocumentResponse>();
    documents.createFromSale.mockReturnValue(response); page.finalizeSale(); await settle(); await remount();
    const saved = sessionStorage.getItem("erp_pos_sales_draft_v1"); response.next(issuedDocument()); response.complete(); await settle();
    expect(sessionStorage.getItem("erp_pos_sales_draft_v1")).toBe(saved);
    expect(page.receiptRecovery!.creationState).toBe("POSSIBLY_SENT"); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
  });

  for (const mismatch of ["sale", "series", "type", "customer", "identity", "status", "incomplete", "multiple"] as const) {
    it("keeps an uncertain result for review when creation response is " + mismatch, async () => {
      receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); const candidate = issuedDocument();
      if (mismatch === "sale") candidate.saleId = 78;
      if (mismatch === "series") candidate.billingSeriesId = 22;
      if (mismatch === "type") candidate.documentType = "INVOICE";
      if (mismatch === "customer") candidate.customerName = "Otro cliente";
      if (mismatch === "identity") candidate.customerDocument = "87654321";
      if (mismatch === "status") candidate.status = "CANCELLED";
      if (mismatch === "incomplete") delete (candidate as Partial<ElectronicDocumentResponse>).fullNumber;
      documents.createFromSale.mockReturnValue(of(mismatch === "multiple" ? [candidate, issuedDocument()] as unknown as ElectronicDocumentResponse : candidate));
      page.finalizeSale(); await settle();
      expect(page.receiptRecovery!.creationState).toBe("POSSIBLY_SENT"); expect(page.successMessage).toBe("");
      expect(page.showGoToBillingAction).toBe(true); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
      expect(sales.create).toHaveBeenCalledTimes(1);
    });
  }

  it("preserves context when the receipt lookup fails and does not poll or reissue", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); operations.get.mockReturnValue(rejection(0));
    page.finalizeSale(); await settle(); await settle();
    expect(operations.get).toHaveBeenCalledTimes(1); expect(documents.listBySaleId).not.toHaveBeenCalled(); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
    expect(page.receiptRecovery!.creationState).toBe("POSSIBLY_SENT"); expect(page.warningMessage).toContain("No se pudo consultar");
  });

  it("completes a server-confirmed document despite optional browser persistence failure", async () => {
    receipt("INVOICE"); sales.create.mockReturnValue(of(sale())); documents.createFromSale.mockReturnValue(of(issuedDocument("INVOICE")));
    const save = state.save.bind(state); const saveSpy = vi.spyOn(state, "save").mockImplementation(draft =>
      draft.receiptRecovery?.creationState === "CONFIRMED" ? false : save(draft));
    page.finalizeSale(); await settle(); expect(page.receiptRecovery).toBeNull();
    expect(page.successMessage).toContain("creado como borrador"); saveSpy.mockImplementation(save); await remount();
    operations.get.mockReturnValue(of(completedOperation(true))); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
    expect(page.receiptRecovery).toBeNull();
  });

  it("recovers a historical pending sale without assuming a ticket or issuing a document", async () => {
    sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const request = sales.create.mock.calls[0][0]; const raw = JSON.parse(sessionStorage.getItem("erp_pos_sales_draft_v1")!);
    delete raw.receiptRecovery; sessionStorage.setItem("erp_pos_sales_draft_v1", JSON.stringify(raw)); await remount();
    expect(page.receiptTypeLabel).toBe("Comprobante original desconocido");
    operations.get.mockReturnValue(of({ ...completedOperation(), receiptIntent: null, receiptState: "REVIEW_REQUIRED" }));
    page.finalizeSale(); await settle();
    expect(sales.create.mock.lastCall![0]).toEqual(request); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(documents.createFromSale).not.toHaveBeenCalled(); expect(page.receiptRecovery!.saleId).toBe(77);
    expect(page.warningMessage).toContain("desconocida"); expect(page.checkoutButtonLabel).toBe("REVISAR COMPROBANTE");
  });

  it("recovers only the same sale when its saved electronic intent is incomplete", async () => {
    receipt("INVOICE"); sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const raw = JSON.parse(sessionStorage.getItem("erp_pos_sales_draft_v1")!); delete raw.receiptRecovery.payload.billingSeriesId;
    sessionStorage.setItem("erp_pos_sales_draft_v1", JSON.stringify(raw)); await remount();
    const original = completedOperation();
    operations.get.mockReturnValue(of({ ...original, receiptState: "REVIEW_REQUIRED", receiptIntent: { receiptType: "INVOICE", payload: null } }));
    page.finalizeSale(); await settle();
    expect(page.receiptRecovery!.creationState).toBe("REVIEW_REQUIRED"); expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(page.lastSaleId).toBe(77); expect(page.receiptType).toBe("INVOICE");
    expect(sales.create).toHaveBeenCalledTimes(1); expect(page.receiptRecovery!.receiptType).toBe("INVOICE");
  });

  it("blocks a receipt context associated with a different operation instead of substituting its identity", async () => {
    receipt("INVOICE"); sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
    const raw = JSON.parse(sessionStorage.getItem("erp_pos_sales_draft_v1")!);
    raw.receiptRecovery.operationId = "00000000-0000-4000-8000-000000000099";
    sessionStorage.setItem("erp_pos_sales_draft_v1", JSON.stringify(raw)); const original = sessionStorage.getItem("erp_pos_sales_draft_v1");
    await remount(); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("erp_pos_sales_draft_v1")).toBe(original);
  });

  for (const actor of ["different", "unverifiable", "context-mismatch"] as const) {
    it("preserves electronic recovery and blocks every dispatch for actor " + actor, async () => {
      receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); page.finalizeSale(); await settle();
      if (actor === "context-mismatch") {
        const raw = JSON.parse(sessionStorage.getItem("erp_pos_sales_draft_v1")!); raw.receiptRecovery.userId = "another-actor";
        sessionStorage.setItem("erp_pos_sales_draft_v1", JSON.stringify(raw));
      } else vi.spyOn(TestBed.inject(AuthService), "me").mockReturnValue(actor === "different"
        ? of({ id: "another-actor", username: "qa", email: "qa@example.test", roles: ["CAJERO"] }) : rejection(0));
      const raw = sessionStorage.getItem("erp_pos_sales_draft_v1"); const queries = documents.listBySaleId.mock.calls.length;
      await remount(); page.finalizeSale(); page.cancelSale(); await settle();
      expect(sessionStorage.getItem("erp_pos_sales_draft_v1")).toBe(raw);
      expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
      expect(documents.listBySaleId.mock.calls.length).toBe(queries);
    });
  }

  it("never replays a known sale or recreates a saved confirmed document", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale())); page.finalizeSale(); await settle();
    const raw = JSON.parse(sessionStorage.getItem("erp_pos_sales_draft_v1")!);
    raw.receiptRecovery.creationState = "CONFIRMED"; raw.receiptRecovery.documentId = 901;
    sessionStorage.setItem("erp_pos_sales_draft_v1", JSON.stringify(raw)); await remount();
    operations.get.mockReturnValue(of(completedOperation(true))); page.finalizeSale(); await settle();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).toHaveBeenCalledTimes(1);
    expect(operations.get).toHaveBeenCalledTimes(2); expect(documents.listBySaleId).not.toHaveBeenCalled(); expect(page.receiptRecovery).toBeNull();
  });

  for (const status of [400, 404, 409, 422, 429]) {
    it("does not discard a previously uncertain operation after an inconclusive replay rejection " + status, async () => {
      receipt("INVOICE"); sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle();
      const request = page.pendingSaleRequest, recovery = page.receiptRecovery;
      sales.create.mockReturnValue(rejection(status)); await lookupAndResume();
      expect(page.pendingSaleRequest).toEqual(request); expect(page.receiptRecovery!.payload).toEqual(recovery!.payload);
      expect(state.load()!.pendingSaleRequest).toEqual(request); expect(state.load()!.receiptRecovery!.payload).toEqual(recovery!.payload);
      expect(sales.create).toHaveBeenCalledTimes(2); expect(documents.createFromSale).not.toHaveBeenCalled();
    });
  }
  it("keeps a rejected preparation frozen until explicit cancellation permits editing", async () => {
    sales.create.mockReturnValue(rejection(422)); page.finalizeSale(); await settle();
    expect(page.pendingSaleRequest).not.toBeNull(); expect(page.receiptRecovery).not.toBeNull();
    page.setQuantity(0, "2"); expect(page.cart[0].quantity).toBe(1);
    page.cancelPendingPreparation(); await settle(); expect(operations.cancel).toHaveBeenCalledTimes(1);
    expect(page.pendingSaleRequest).toBeNull(); expect(page.receiptRecovery).toBeNull();
    page.setQuantity(0, "2"); expect(page.cart[0].quantity).toBe(2);
    expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("queries first and requires a separate explicit confirmation before resuming", async () => {
    sales.create.mockReturnValue(rejection(0)); page.finalizeSale(); await settle(); page.finalizeSale(); await settle();
    expect(operations.get).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    page.confirmPreparedResume(); await settle(); const dialog = confirm.confirm.mock.lastCall![0];
    expect(dialog.title).toBe("Reanudar preparación"); expect(dialog.description).toContain("importes originales");
    expect(dialog.confirmText).toBe("Reanudar mismo cobro"); expect(sales.create).toHaveBeenCalledTimes(2);
  });
  it("distinguishes the first electronic creation, uncertain lookup and DRAFT result", async () => {
    receipt("RECEIPT"); sales.create.mockReturnValue(of(sale()));
    const responses = [
      of({ id: "qa-checkout", username: "qa", email: "qa@example.test", roles: ["CAJERO"] }),
      rejection(401),
    ];
    const auth = vi.spyOn(TestBed.inject(AuthService), "me").mockImplementation(() => responses.shift()!);
    page.finalizeSale(); await settle();
    expect(page.checkoutButtonLabel).toBe("CREAR COMPROBANTE"); expect(page.receiptRecoveryActionLabel).toBe("Crear comprobante pendiente");
    expect(page.receiptRecoveryMessage).toContain("pendiente de creación");
    auth.mockReturnValue(of({ id: "qa-checkout", username: "qa", email: "qa@example.test", roles: ["CAJERO"] }));
    operations.get.mockReturnValue(of(completedOperation()));
    page.finalizeSale(); await settle();
    expect(operations.get).toHaveBeenCalledTimes(1);
    expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(page.checkoutButtonLabel).toBe("CREAR COMPROBANTE");
    page.finalizeSale(); await settle();
    expect(page.checkoutButtonLabel).toBe("CONSULTAR COMPROBANTE");
    expect(page.receiptRecoveryActionLabel).toBe("Consultar comprobante de venta registrada");
    expect(page.receiptRecoveryMessage).toContain("resultado incierto"); expect(page.successMessage).toBe("");
    operations.get.mockReturnValue(of(completedOperation(true))); page.finalizeSale(); await settle();
    expect(page.successMessage).toContain("localizado"); expect(page.successMessage).toContain("pendiente de procesamiento fiscal");
    expect(page.successMessage).not.toContain("generado"); expect(page.successMessage).not.toContain("emitido correctamente");
    expect(documents.createFromSale).toHaveBeenCalledTimes(1);
  });
});

describe("P1-B POS authentication binding with the real HTTP interceptor", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>;
  let page: PosPageComponent; let http: HttpTestingController; let auth: AuthService;
  let token: string | null;
  let preparation: PrepareSaleOperationRequest;
  const firstToken = "synthetic-pos-original-credential", otherToken = "synthetic-pos-other-credential", renewedToken = "synthetic-pos-renewed-credential";
  const owner = { id: "qa-bound-owner", username: "qa", email: "qa@example.test", roles: ["CAJERO"] };
  const other = { ...owner, id: "qa-bound-other" };
  const sale = (): SaleResponse => ({ id: 77, saleNumber: "S-QA", cashRegisterSessionId: 7, warehouseId: 1,
    status: "COMPLETED", subtotalAmount: 10, discountAmount: 0, totalAmount: 10, paidAmount: 10, changeAmount: 0,
    soldAt: "2026-10-19T00:00:00Z", voidedAt: null, voidedByUserId: null, voidReason: null, createdBy: "qa", items: [], payments: [] });
  const document = (): ElectronicDocumentResponse => ({ id: 901, saleId: 77, billingSeriesId: 21, documentType: "INVOICE",
    status: "DRAFT", environment: "LOCAL", series: "F001", number: 1, fullNumber: "F001-00000001",
    customerName: "Cliente sintético", customerDocument: "20123456789", subtotalAmount: 10, taxAmount: 0, totalAmount: 10,
    xmlGeneratedAt: null, signedAt: null, sentAt: null, providerTicket: null, providerMessage: null, createdAt: "", updatedAt: "", items: [] });
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const me = () => http.expectOne(r => r.url.endsWith("/auth/me"));
  const salePost = () => http.expectOne(r => r.url.endsWith("/sales") && r.method === "POST");
  const preparePost = () => http.expectOne(r => r.url.endsWith("/sales/operations") && r.method === "POST");
  const operationGet = () => http.expectOne(r => r.url.includes("/sales/operations/") && r.method === "GET");
  const confirmPreparation = () => {
    const request = preparePost(); preparation = request.request.body;
    request.flush(preparedOperation(preparation)); return request;
  };
  const serverResult = (located = false): SaleOperation => ({ ...preparedOperation(preparation), state: "COMPLETED", command: null,
    saleId: 77, documentId: located ? 901 : null, documentStatus: located ? "DRAFT" : null, receiptState: located ? "LOCATED" : "PENDING" });
  const resume = async () => { page.confirmPreparedResume(); await settle(); me().flush(owner); return salePost(); };
  const noPost = () => http.expectNone(r => r.method === "POST");
  const settleConfirmedNote = async (expectedToken: string, denied = false) => {
    fixture.detectChanges();
    if (!page.confirmedDelivery || page.confirmedDelivery.credential !== expectedToken) {
      http.expectNone(r => r.method === "GET" && r.url.endsWith("/sales/77"));
      expect(fixture.nativeElement.querySelector('app-pos-sale-note [role="dialog"]')).toBeNull();
      await settle(); return;
    }
    const read = http.expectOne(r => r.method === "GET" && r.url.endsWith("/sales/77"));
    expect(read.request.headers.get("Authorization")).toBe(`Bearer ${expectedToken}`);
    expect(read.request.context.get(BOUND_AUTH_CREDENTIALS)?.token).toBe(expectedToken);
    if (denied) read.flush({}, { status: 403, statusText: "Synthetic note access denied" });
    else read.flush(sale());
    await settle();
    const note = fixture.nativeElement.querySelector('app-pos-sale-note [role="dialog"]');
    expect(note?.textContent).toMatch(/Venta #77 · Registrada/);
    expect(note?.textContent).toMatch(/Total confirmado: S\/\s*10\.00/);
    if (denied) expect(note?.textContent).toContain("No tienes permiso");
  };
  const rawDraft = () => sessionStorage.getItem("erp_pos_sales_draft_v1");
  const invoice = () => {
    page.billingSeriesRows = [{ id: 21, version: 0, documentType: "INVOICE", series: "F001", currentNumber: 1,
      environment: "LOCAL", active: true, createdAt: "", updatedAt: "" }];
    page.setReceiptType("INVOICE"); page.setReceiptSeriesId("21");
    page.setReceiptCustomerDocument("20123456789"); page.setReceiptCustomerName("Cliente sintético");
  };
  const startSale = async () => {
    page.finalizeSale(); await settle(); const verification = me(); verification.flush(owner); confirmPreparation(); return salePost();
  };
  beforeEach(async () => {
    sessionStorage.removeItem("erp_pos_sales_draft_v1"); token = firstToken;
    await TestBed.configureTestingModule({ imports: [PosPageComponent], providers: [
      provideZoneChangeDetection(), provideRouter([]), provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(),
      { provide: WarehouseService, useValue: { list: () => of([{ id: 1, code: "QA", name: "Synthetic", active: true }]) } },
      { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
      { provide: BillingSeriesService, useValue: { list: () => of([]) } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
    ] }).compileComponents();
    auth = TestBed.inject(AuthService); vi.spyOn(auth, "getToken").mockImplementation(() => token);
    http = TestBed.inject(HttpTestingController); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance;
    fixture.detectChanges(); me().flush(owner); await settle();
    page.cart = [{ productId: 101, sku: "QA", barcode: null, name: "Synthetic", salePrice: 10, stockAvailable: 10,
      quantity: 1, discountAmount: 0, quantityPolicy: "WHOLE" }];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "QA" }];
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      fixture.destroy();
      sessionStorage.removeItem(draftKey);
    }
  });

  it("blocks a changed actor at integrated-review verification without dispatching preparation or checkout",async()=>{
    page.isCheckoutModalOpen=true;page.finalizeSale(true);await settle();me().flush(other);await settle();noPost();expect(page.pendingSaleRequest?.operationId).toBeTruthy();
    expect(rawDraft()).not.toContain(firstToken);expect(page.errorMessage).not.toBe('');
  });
  it("dispatches verification and checkout with the same credential without persisting it", async () => {
    const localWrite = observeStorageWrites(localStorage);
    page.finalizeSale(); await settle(); const verification = me();
    expect(verification.request.headers.get("Authorization")).toBe(`Bearer ${firstToken}`); verification.flush(owner);
    const preparationRequest = confirmPreparation();
    expect(preparationRequest.request.context).toBe(verification.request.context);
    expect(preparationRequest.request.headers.get("Authorization")).toBe(verification.request.headers.get("Authorization"));
    const request = salePost();
    expect(request.request.headers.get("Authorization")).toBe(verification.request.headers.get("Authorization"));
    expect(request.request.context).toBe(verification.request.context);
    expect(JSON.stringify(request.request.body)).not.toContain(firstToken); expect(rawDraft()).not.toContain(firstToken);
    token = otherToken; expect(request.request.headers.get("Authorization")).toBe(`Bearer ${firstToken}`);
    request.flush(sale()); await settle();
    expect(page.cart.length).toBe(1); expect(page.lastSaleId).toBeNull(); expect(page.pendingSaleRequest).not.toBeNull();
    expect(localWrite).not.toHaveBeenCalled();
    noPost(); expect(rawDraft()).not.toContain(firstToken); expect(rawDraft()).not.toContain(otherToken);
  });
  it("blocks an actor changed in another tab and allows the original owner with a newly verified token", async () => {
    const first = await startSale(); const request = first.request.body;
    first.error(new ProgressEvent("error")); await settle(); const pending = rawDraft();
    token = otherToken; page.finalizeSale(); await settle(); const verification = me();
    expect(verification.request.headers.get("Authorization")).toBe(`Bearer ${otherToken}`); verification.flush(other); await settle();
    noPost(); expect(rawDraft()).toBe(pending); expect(page.errorMessage).toContain("usuario original");
    token = renewedToken; page.finalizeSale(); await settle(); const renewed = me(); renewed.flush(owner);
    const lookup = operationGet(); expect(lookup.request.headers.get("Authorization")).toBe(renewed.request.headers.get("Authorization"));
    lookup.flush(preparedOperation(preparation)); await settle(); noPost(); const replay = await resume(); expect(replay.request.body).toEqual(request);
    expect(replay.request.body.operationId).toBe(request.operationId);
    expect(replay.request.headers.get("Authorization")).toBe(renewed.request.headers.get("Authorization"));
    replay.flush(sale()); await settleConfirmedNote(renewedToken); expect(page.pendingSaleRequest).toBeNull(); expect(page.cart).toEqual([]);
  });
  it("blocks a session substitution at the verification-to-dispatch boundary without losing the operation", async () => {
    page.finalizeSale(); await settle(); const verification = me(); const pending = rawDraft();
    token = otherToken; verification.flush(owner); await settle();
    noPost(); expect(rawDraft()).toBe(pending); expect(page.pendingSaleRequest).not.toBeNull();
    expect(page.errorMessage).not.toContain(firstToken); expect(page.errorMessage).not.toContain(otherToken);
  });
  for (const status of [0, 401, 403]) {
    it("blocks dispatch and preserves the pending operation if effective identity cannot be verified: " + status, async () => {
      const first = await startSale(); first.error(new ProgressEvent("error")); await settle(); const pending = rawDraft();
      page.finalizeSale(); await settle(); const verification = me();
      if (status === 0) verification.error(new ProgressEvent("error"));
      else verification.flush({}, { status, statusText: "Synthetic unauthorized verification" });
      await settle(); noPost(); expect(rawDraft()).toBe(pending); expect(page.pendingSaleRequest).not.toBeNull();
      expect(page.errorMessage).toContain("sesión válida del usuario original");
    });
  }
  for (const status of [401, 403]) {
    it("preserves a lost-response sale across a later HTTP " + status + " and recovers only its original request", async () => {
      invoice(); const first = await startSale(); const original = first.request.body;
      first.error(new ProgressEvent("error")); await settle(); const pending = rawDraft();
      page.finalizeSale(); await settle(); me().flush(owner); const denied = operationGet();
      denied.flush({}, { status, statusText: "Synthetic unauthorized replay" }); await settle();
      expect(rawDraft()).toBe(pending); expect(page.pendingSaleRequest!.operationId).toBe(original.operationId);
      expect(page.receiptRecovery!.receiptType).toBe("INVOICE"); expect(page.errorMessage).toContain("usuario original"); noPost();
      token = renewedToken; page.finalizeSale(); await settle(); const verification = me(); verification.flush(owner);
      operationGet().flush(preparedOperation(preparation)); await settle(); noPost();
      const replay = await resume(); expect(replay.request.body).toEqual(original);
      expect(replay.request.headers.get("Authorization")).toBe(`Bearer ${renewedToken}`);
      replay.flush(sale()); const docVerification = me(); docVerification.flush(owner);
      const creation = http.expectOne(r => r.url.endsWith("/billing/documents/from-sale/77"));
      expect(creation.request.headers.get("Authorization")).toBe(docVerification.request.headers.get("Authorization"));
      expect(creation.request.context).toBe(docVerification.request.context);
      creation.flush(document()); await settleConfirmedNote(renewedToken); expect(page.receiptRecovery).toBeNull(); noPost();
    });
  }
  it("blocks a missing credential before verification or any POST without losing a pending sale", async () => {
    const first = await startSale(); first.error(new ProgressEvent("error")); await settle(); const pending = rawDraft();
    token = null; page.finalizeSale(); await settle(); http.expectNone(() => true);
    expect(rawDraft()).toBe(pending); expect(page.pendingSaleRequest).not.toBeNull();
  });
  it("verifies the original owner again before the first electronic POST and accurately labels a DRAFT", async () => {
    invoice(); const first = await startSale(); first.flush(sale());
    const wrongOwner = me(); token = otherToken; wrongOwner.flush(other); await settleConfirmedNote(otherToken, true); noPost();
    expect(page.receiptRecovery!.creationState).toBe("NOT_STARTED"); expect(page.lastSaleId).toBe(77);
    expect(page.checkoutButtonLabel).toBe("CREAR COMPROBANTE");
    token = renewedToken; page.finalizeSale(); await settle(); me().flush(owner);
    const lookup = operationGet();
    expect(lookup.request.method).toBe("GET");
    lookup.flush(serverResult()); await settle(); noPost();
    page.finalizeSale(); await settle(); const verification = me(); verification.flush(owner);
    const creation = http.expectOne(r => r.url.endsWith("/billing/documents/from-sale/77"));
    expect(creation.request.headers.get("Authorization")).toBe(verification.request.headers.get("Authorization"));
    expect(creation.request.context).toBe(verification.request.context);
    expect(JSON.parse(rawDraft()!).receiptRecovery.creationState).toBe("POSSIBLY_SENT");
    expect(creation.request.body).toEqual({ documentType: "INVOICE", billingSeriesId: 21,
      customerName: "Cliente sintético", customerDocument: "20123456789" });
    creation.flush(document()); await settle(); expect(page.successMessage).toContain("creado como borrador");
    expect(page.successMessage).toContain("Pendiente de procesamiento fiscal");
    expect(page.successMessage).not.toContain("generado"); noPost();
  });
  it("binds electronic recovery GETs, retains POSSIBLY_SENT on failure and never reissues", async () => {
    invoice(); const first = await startSale(); first.flush(sale()); me().flush(owner);
    http.expectOne(r => r.url.endsWith("/billing/documents/from-sale/77")).flush({}, { status: 504, statusText: "Synthetic lost response" });
    const verification = me(); verification.flush(owner);
    const lookup = operationGet();
    expect(lookup.request.method).toBe("GET"); expect(lookup.request.url).toContain(preparation.operationId);
    expect(lookup.request.context).toBe(verification.request.context);
    expect(lookup.request.headers.get("Authorization")).toBe(verification.request.headers.get("Authorization"));
    lookup.flush(serverResult()); await settleConfirmedNote(firstToken); const pending = rawDraft();
    expect(page.receiptRecovery!.creationState).toBe("POSSIBLY_SENT"); expect(page.successMessage).toBe("");
    token = otherToken; page.finalizeSale(); await settle(); me().flush(other); await settle();
    http.expectNone(() => true); expect(rawDraft()).toBe(pending);
    token = renewedToken; page.finalizeSale(); await settle(); const renewed = me(); renewed.flush(owner);
    const recovered = operationGet();
    expect(recovered.request.headers.get("Authorization")).toBe(`Bearer ${renewedToken}`);
    recovered.error(new ProgressEvent("error")); await settle();
    expect(rawDraft()).toBe(pending); noPost();
    page.finalizeSale(); await settle(); me().flush(owner);
    operationGet().flush(serverResult(true)); await settle();
    expect(page.cart).toEqual([]); expect(page.successMessage).toContain("localizado");
    expect(page.successMessage).toContain("pendiente de procesamiento fiscal"); noPost();
  });
});
