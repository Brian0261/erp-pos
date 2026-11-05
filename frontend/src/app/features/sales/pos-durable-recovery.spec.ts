import { HttpContext, HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { NgZone, provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS } from "../../core/auth/bound-auth-context";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "./data/cash-register.service";
import { PosService } from "./data/pos.service";
import { PosStateService } from "./data/pos-state.service";
import { SaleOperation, SaleOperationsService } from "./data/sale-operations.service";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";
import { PosPageComponent } from "./pos-page.component";
import { createOperationDouble, preparedOperation } from "./testing/sale-operation-double.spec";

describe("A durable POS recovery", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>, page: PosPageComponent;
  let operations: jasmine.SpyObj<SaleOperationsService>, sales: jasmine.SpyObj<SalesService>;
  let auth: jasmine.SpyObj<AuthService>, documents: jasmine.SpyObj<ElectronicDocumentService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>, http: HttpTestingController;
  let token: string | null;
  let interval: jasmine.Spy;
  const owner = { id: "synthetic-owner", username: "qa", email: "qa@example.test", roles: ["CAJERO"] };
  const result = (): SaleResponse => ({ id: 77, saleNumber: "S-QA", cashRegisterSessionId: 7, warehouseId: 1,
    status: "COMPLETED", subtotalAmount: 10, discountAmount: 0, totalAmount: 10, paidAmount: 10, changeAmount: 0,
    soldAt: "2026-10-21T00:00:00Z", voidedAt: null, voidedByUserId: null, voidReason: null, createdBy: "qa", items: [], payments: [] });
  const rejected = (status: number, error?: unknown) => throwError(() => new HttpErrorResponse({ status, error }));
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const existing = (state: SaleOperation["state"] = "PREPARED"): SaleOperation => ({ ...preparedOperation({ protocolVersion: 1, origin: "POS",
    operationId: "00000000-0000-4000-8000-000000000001", quoteId: null, quoteCommand: null,
    command: { operationId: "00000000-0000-4000-8000-000000000001", warehouseId: 1, confirmedTotal: 10,
      items: [{ productId: 101, quantity: 1, discountAmount: 0, confirmedUnitPrice: 10 }], payments: [{ paymentMethod: "CASH", amount: 10 }] },
    receiptIntent: { receiptType: "TICKET", payload: null } }), state, saleId: state === "COMPLETED" ? 77 : null });
  beforeEach(async () => {
    sessionStorage.clear(); token = "synthetic-owner-token";
    auth = jasmine.createSpyObj<AuthService>("Auth", ["me", "getToken"]);
    auth.getToken.and.callFake(() => token); auth.me.and.returnValue(of(owner));
    operations = createOperationDouble(); sales = jasmine.createSpyObj<SalesService>("Sales", ["create", "getById"]);
    sales.create.and.returnValue(of(result()));
    sales.getById.and.returnValue(of(result()));
    documents = jasmine.createSpyObj<ElectronicDocumentService>("Documents", ["createFromSale", "listBySaleId", "generateXml", "sign", "send"]);
    confirm = jasmine.createSpyObj<ConfirmDialogService>("Confirm", ["confirm"]); confirm.confirm.and.returnValue(Promise.resolve(true));
    await TestBed.configureTestingModule({ imports: [PosPageComponent], providers: [provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth }, { provide: SaleOperationsService, useValue: operations }, { provide: SalesService, useValue: sales },
      { provide: WarehouseService, useValue: { list: () => of([{ id: 1, active: true, name: "Synthetic", code: "QA" }]) } },
      { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
      { provide: PosService, useValue: { search: () => of([]), snapshot: () => of([{ productId: 101, salePrice: 12, stockAvailable: 10, quantityPolicy: "WHOLE" }]) } },
      { provide: ConfirmDialogService, useValue: confirm }, { provide: BillingSeriesService, useValue: { list: () => of([]) } },
      { provide: ElectronicDocumentService, useValue: documents },
    ] }).compileComponents();
    interval = spyOn(window, "setInterval").and.callThrough();
    fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; http = TestBed.inject(HttpTestingController);
    await settle(); page.saleForm.controls.warehouseId.setValue(1); page.cart = [{ productId: 101, sku: "QA", barcode: null, name: "Synthetic", salePrice: 10,
      quantity: 1, discountAmount: 0, stockAvailable: 10, quantityPolicy: "WHOLE" }];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "" }];
  });
  afterEach(() => { http.verify(); fixture.destroy(); sessionStorage.clear(); });

  const anotherPurchase = () => {
    page.cart = [
      { productId: 201, sku: "B-1", name: "Synthetic B notebook", barcode: null, salePrice: 6, quantity: 2, discountAmount: 1, stockAvailable: 50, quantityPolicy: "WHOLE" },
      { productId: 202, sku: "B-2", name: "Synthetic B by measure", barcode: null, salePrice: 2.5, quantity: 1.25, discountAmount: .25, stockAvailable: 50, quantityPolicy: "DECIMAL_2" },
    ];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "B cash" }, { paymentMethod: "CARD", amount: 3.88, reference: "B card" }];
    return structuredClone({ cart: page.cart, payments: page.payments, warehouse: page.saleForm.value.warehouseId });
  };
  const expectPurchase = (before: ReturnType<typeof anotherPurchase>) => {
    expect(page.cart).toEqual(before.cart); expect(page.payments).toEqual(before.payments);
    expect(page.saleForm.value.warehouseId).toBe(before.warehouse);
  };

  it("P1 keeps completed historical consultation and its leave action separate from purchase B", async () => {
    const before = anotherPurchase(); page.lastSaleId = 88;
    const historical = { ...existing("COMPLETED"), command: null };
    operations.get.and.returnValue(of(historical)); page.selectServerOperation(historical, false); await settle();
    expect(page.receiptRecovery).toBeNull(); expect(page.pendingSaleRequest).toBeNull(); expect(page.lastSaleId).toBe(88);
    page.leaveOperationInServer(); await settle(); expectPurchase(before);
    expect(sales.create).not.toHaveBeenCalled(); expect(operations.prepare).not.toHaveBeenCalled(); expect(documents.createFromSale).not.toHaveBeenCalled();
  });

  it("P1 does not replace B when adoption of PREPARED A is declined", async () => {
    const before = anotherPurchase(); const operation = existing(); operations.get.and.returnValue(of(operation));
    confirm.confirm.and.returnValue(Promise.resolve(false)); page.selectServerOperation(operation, true); await settle();
    expect(fixture.nativeElement.textContent).toContain("Tienes otra compra en curso");
    const back = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: any) => button.textContent.trim() === "Volver a mi compra") as HTMLButtonElement;
    back.click(); await settle();
    expectPurchase(before); expect(page.pendingSaleRequest).toBeNull(); expect(page.receiptRecovery).toBeNull();
    expect(sales.create).not.toHaveBeenCalled(); expect(operations.prepare).not.toHaveBeenCalled();
  });

  it("P1 treats payments without products as purchase B when considering another preparation", async () => {
    page.cart = []; const payments = structuredClone(page.payments); const operation = existing();
    operations.get.and.returnValue(of(operation)); confirm.confirm.and.returnValue(Promise.resolve(false));
    page.selectServerOperation(operation, true); await settle();
    expect(page.cart).toEqual([]); expect(page.payments).toEqual(payments); expect(page.receiptRecovery).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("Tienes otra compra en curso"); expect(sales.create).not.toHaveBeenCalled();
  });

  it("P1 cannot finalize or abandon A after its bound purchase is replaced by B", async () => {
    sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle();
    const operationId = page.pendingSaleRequest!.operationId;
    operations.get.and.returnValue(of({ ...existing("COMPLETED"), operationId, command: null }));
    page.finalizeSale(); await settle(); expect(page.receiptRecovery?.operationId).toBe(operationId);
    const before = anotherPurchase(); page.finalizeSale(); await settle(); page.leaveOperationInServer(); await settle();
    expectPurchase(before); expect(page.receiptRecovery?.operationId).toBe(operationId);
    expect(sales.create).toHaveBeenCalledTimes(1); expect(operations.prepare).toHaveBeenCalledTimes(1); expect(documents.createFromSale).not.toHaveBeenCalled();
  });

  it("P1 discards only the unchanged B after explicit consent and a second verified preparation read", async () => {
    anotherPurchase(); const operation = existing(); operations.get.and.returnValue(of(operation));
    confirm.confirm.and.returnValue(Promise.resolve(false)); page.selectServerOperation(operation, true); await settle();
    expect(operations.get).toHaveBeenCalledTimes(1); expect(page.pendingSaleRequest).toBeNull();
    page.confirmRecoveryAdoption(); await settle();
    expect(operations.get).toHaveBeenCalledTimes(2); expect(page.pendingSaleRequest).toEqual(operation.command);
    expect(page.receiptRecovery?.operationId).toBe(operation.operationId); expect(page.preparedOnServer).toBeTrue();
    expect(page.cart.map(line=>line.productId)).toEqual([101]); expect(page.payments[0].amount).toBe(10);
    expect(confirm.confirm.calls.mostRecent().args[0].title).toBe("Reanudar preparación");
    expect(sales.create).not.toHaveBeenCalled(); expect(operations.prepare).not.toHaveBeenCalled();
  });

  for (const change of ["quantity", "token", "cash", "warehouse"] as const) {
    it("P1 refuses a stale discard decision after a change to " + change, async () => {
      anotherPurchase(); const operation = existing(); operations.get.and.returnValue(of(operation));
      page.selectServerOperation(operation, true); await settle();
      if(change==="quantity")page.cart[0].quantity=3;
      if(change==="token")token="other-session";
      if(change==="cash")page.currentCashSession={...page.currentCashSession!,id:8};
      if(change==="warehouse")page.saleForm.controls.warehouseId.setValue(2);
      const before=structuredClone({cart:page.cart,payments:page.payments,warehouse:page.saleForm.value.warehouseId});
      page.confirmRecoveryAdoption(); await settle();expectPurchase(before);
      expect(page.receiptRecovery).toBeNull();expect(operations.get).toHaveBeenCalledTimes(1);expect(sales.create).not.toHaveBeenCalled();
    });
  }

  it("P1 preserves B when the required second preparation read fails or changes identity", async () => {
    const before=anotherPurchase(),operation=existing();operations.get.and.returnValue(of(operation));
    page.selectServerOperation(operation,true);await settle();operations.get.and.returnValue(rejected(503));
    page.confirmRecoveryAdoption();await settle();expectPurchase(before);expect(page.receiptRecovery).toBeNull();
    operations.get.and.returnValue(of({...operation,operationId:"00000000-0000-4000-8000-000000000099"}));
    page.confirmRecoveryAdoption();await settle();expectPurchase(before);expect(page.receiptRecovery).toBeNull();expect(sales.create).not.toHaveBeenCalled();
  });

  it("P1 invalidates selection reads when its panel selection is closed or replaced", async () => {
    const before=anotherPurchase(),response=new Subject<SaleOperation>();operations.get.and.returnValue(response);
    page.selectServerOperation(existing(),true);page.cancelRecoverySelection();response.next(existing());response.complete();await settle();
    expectPurchase(before);expect(page.recoveryAdoption).toBeNull();expect(page.receiptRecovery).toBeNull();expect(sales.create).not.toHaveBeenCalled();
  });

  it("P1 keeps a different active recovery, its UUID and its frozen purchase", async () => {
    sales.create.and.returnValue(rejected(0));page.finalizeSale();await settle();
    const id=page.receiptRecovery!.operationId,before=structuredClone({cart:page.cart,payments:page.payments,warehouse:page.saleForm.value.warehouseId});
    page.selectServerOperation(existing(),true);await settle();expectPurchase(before);
    expect(page.receiptRecovery!.operationId).toBe(id);expect(operations.get).not.toHaveBeenCalled();expect(sales.create).toHaveBeenCalledTimes(1);
  });

  for(const action of ["finalize","leave"] as const){
    it("P1 rejects late "+action+" verification after B replaces the bound context",async()=>{
      sales.create.and.returnValue(rejected(0));page.finalizeSale();await settle();const id=page.pendingSaleRequest!.operationId;
      const completed={...existing("COMPLETED"),operationId:id,command:null};operations.get.and.returnValue(of(completed));page.finalizeSale();await settle();
      const response=new Subject<SaleOperation>();operations.get.and.returnValue(response);
      if(action==="finalize")page.finalizeSale();else page.leaveOperationInServer();
      const before=anotherPurchase();response.next(completed);response.complete();await settle();expectPurchase(before);
      expect(page.receiptRecovery?.operationId).toBe(id);expect(sales.create).toHaveBeenCalledTimes(1);expect(documents.createFromSale).not.toHaveBeenCalled();
    });
  }

  it("becomes stable with the confirmed note mounted and its credential monitor active", async () => {
    page.finalizeSale(); await settle();
    // The session stays mounted; only a confirmed event displays its delivery and starts the authorized read.
    await settle();
    expect(fixture.nativeElement.querySelector('app-pos-sale-note [role="dialog"]')?.textContent).toMatch(/Venta #77 · Registrada/);
    expect(fixture.nativeElement.textContent).toMatch(/Total confirmado: S\/\s*10\.00/);
    expect(interval.calls.allArgs().some(args => args[1] === 200)).toBeTrue();
    expect(fixture.isStable()).toBeTrue(); expect(TestBed.inject(NgZone).hasPendingMacrotasks).toBeFalse();
    expect(sales.getById).toHaveBeenCalledOnceWith(77, jasmine.any(HttpContext));
    expect(sales.getById.calls.first().args[1]!.get(BOUND_AUTH_CREDENTIALS)?.token).toBe("synthetic-owner-token");
    expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1);
    expect(documents.createFromSale).not.toHaveBeenCalled();
  });

  it("opens delivery only for a normal confirmed checkout and never restores it from the saved sale reference",async()=>{
    page.finalizeSale();await settle();expect(page.confirmedDelivery?.saleId).toBe(77);expect(page.confirmedDelivery?.totalAmount).toBe(10);
    expect(page.confirmedDelivery?.operationId).toBe(sales.create.calls.first().args[0].operationId);
    const beforeReads=sales.getById.calls.count();fixture.destroy();fixture=TestBed.createComponent(PosPageComponent);page=fixture.componentInstance;await settle();
    expect(page.lastSaleId).toBe(77);expect(page.confirmedDelivery).toBeNull();expect(fixture.nativeElement.querySelector('app-pos-sale-note [role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]')).toBeNull();
    expect(sales.getById.calls.count()).toBe(beforeReads);expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("does not present a recovered completed result as a new normal checkout event",async()=>{
    sales.create.and.returnValue(rejected(0));page.finalizeSale();await settle();expect(page.pendingPreparedVerified).toBeFalse();
    expect(page.checkoutButtonLabel).toBe('COMPROBAR RESULTADO');const id=page.pendingSaleRequest!.operationId;
    operations.get.and.returnValue(of({...existing('COMPLETED'),operationId:id,command:null}));page.finalizeSale();await settle();
    expect(page.confirmedDelivery).toBeNull();page.finalizeSale();await settle();expect(page.cart).toEqual([]);
    expect(page.confirmedDelivery).toBeNull();expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("P2-B shows the verified lost-checkout result and its sale link without repeating checkout", async () => {
    sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle();
    const operationId = page.pendingSaleRequest!.operationId;
    operations.get.and.returnValue(of({ ...existing("COMPLETED"), operationId, command: null }));
    page.finalizeSale(); await settle();
    fixture.nativeElement.querySelector('.checkout-button').click(); await settle();
    const notice: HTMLElement | null = fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]');
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain("Venta #77 recuperada y confirmada");
    expect(notice?.querySelector("a")?.getAttribute("href")).toBe("/ventas/77");
    expect(document.activeElement).toBe(notice);
    expect(page.confirmedDelivery).toBeNull(); expect(page.cart).toEqual([]);
    expect(sales.create).toHaveBeenCalledTimes(1); expect(operations.prepare).toHaveBeenCalledTimes(1);
    const before = anotherPurchase();
    notice?.querySelector("button")?.click(); await settle();
    expectPurchase(before); expect(fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]')).toBeNull();
  });
  it("P2-B shows a resumed prepared sale only after its verified checkout succeeds", async () => {
    page.cart = []; page.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    const operation = existing(); operations.get.and.returnValue(of(operation));
    page.selectServerOperation(operation, false); await settle();
    expect(fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]')).toBeNull();
    page.confirmPreparedResume(); await settle();
    const notice: HTMLElement | null = fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]');
    expect(notice?.textContent).toContain("Venta #77 recuperada y confirmada");
    expect(notice?.querySelector("a")?.getAttribute("href")).toBe("/ventas/77");
    expect(sales.create).toHaveBeenCalledOnceWith(operation.command!, jasmine.any(HttpContext));
    expect(operations.prepare).not.toHaveBeenCalled(); expect(page.confirmedDelivery).toBeNull();
    token = "synthetic-renewed-credential"; await settle();
    expect(fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]')).toBeNull();
  });
  for (const status of ["DRAFT", "REJECTED"] as const) {
    it("P2-B separates the recovered sale from its located " + status + " document", async () => {
      sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle();
      const operationId = page.pendingSaleRequest!.operationId;
      operations.get.and.returnValue(of({ ...existing("COMPLETED"), operationId, command: null,
        receiptIntent: { receiptType: "INVOICE", payload: null }, receiptState: "LOCATED", documentId: 901, documentStatus: status }));
      page.finalizeSale(); await settle(); page.finalizeSale(); await settle();
      const notice: HTMLElement | null = fixture.nativeElement.querySelector('[aria-label="Resultado de recuperación"]');
      expect(notice?.textContent).toContain("Venta #77 recuperada y confirmada");
      expect(notice?.textContent).toContain(status);
      expect(notice?.textContent).toContain(status === "DRAFT" ? "pendiente de procesamiento fiscal" : "no confirma aceptación fiscal");
      expect(page.receiptRecovery).toBeNull(); expect(sales.create).toHaveBeenCalledTimes(1);
      expect(documents.createFromSale).not.toHaveBeenCalled();
    });
  }
  it("P2-B cannot show a late result from another credential or passive history", async () => {
    page.selectServerOperation({ ...existing("COMPLETED"), command: null }, false); await settle();
    expect(page.visibleRecoveryResult).toBeNull(); expect(operations.get).not.toHaveBeenCalled();
    sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle();
    expect(page.visibleRecoveryResult).toBeNull();
    const operationId = page.pendingSaleRequest!.operationId, response = new Subject<SaleOperation>();
    operations.get.and.returnValue(response); page.finalizeSale();
    token = "synthetic-other-credential";
    response.next({ ...existing("COMPLETED"), operationId, command: null }); response.complete(); await settle();
    expect(page.visibleRecoveryResult).toBeNull(); expect(page.pendingSaleRequest?.operationId).toBe(operationId);
    expect(sales.create).toHaveBeenCalledTimes(1);
  });

  const rejectDefinitively = () => operations.prepare.and.callFake(body => rejected(422, {
    protocolVersion: 1, operationId: body.operationId, actorUserId: owner.id, origin: "POS",
    code: "OPERATION_PREPARATION_REJECTED", outcome: "NOT_STORED", reasonCode: "COMMAND_INVALID",
  }));

  it("requires explicit discard of a certified rejection and preserves the editable cart and receipt", async () => {
    page.billingSeriesRows = [{ id: 21, version: 0, documentType: "INVOICE", series: "F001", currentNumber: 1, environment: "LOCAL", active: true, createdAt: "", updatedAt: "" }];
    page.setReceiptType("INVOICE"); page.setReceiptSeriesId("21"); page.setReceiptCustomerDocument("20123456789");
    page.setReceiptCustomerName("Synthetic customer"); page.setReceiptCustomerAddress("Synthetic address");
    rejectDefinitively(); page.openCheckoutModal(); page.finalizeSale(); await settle();
    const identity = page.pendingSaleRequest!.operationId;
    expect(page.preparationRejected).toBeTrue(); expect(page.errorMessage).toContain("No se registró una venta");
    expect(page.isCheckoutModalOpen).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain("Descartar preparación rechazada y editar");
    expect(sales.create).not.toHaveBeenCalled(); expect(documents.createFromSale).not.toHaveBeenCalled();
    page.setQuantity(0, "2"); expect(page.cart[0].quantity).toBe(1);
    confirm.confirm.and.returnValue(Promise.resolve(false)); page.discardRejectedPreparation(); await settle();
    expect(page.pendingSaleRequest!.operationId).toBe(identity);
    confirm.confirm.and.returnValue(Promise.resolve(true)); page.discardRejectedPreparation(); await settle();
    expect(page.pendingSaleRequest).toBeNull(); expect(page.receiptRecovery).toBeNull();
    expect(page.cart[0].quantity).toBe(1); expect(page.cart[0].salePrice).toBe(10); expect(page.payments[0].amount).toBe(10);
    expect(page.receiptType).toBe("INVOICE"); expect(page.receiptSeriesId).toBe("21");
    expect(page.receiptCustomerDocument).toBe("20123456789"); expect(page.receiptCustomerName).toBe("Synthetic customer");
    expect(page.receiptCustomerAddress).toBe("Synthetic address");
    expect(page.needsRevalidation).toBeTrue();
    expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).not.toHaveBeenCalled();
    page.revalidateCart(); await settle();
    expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).not.toHaveBeenCalled();
    page.payments[0].amount = 12;
    page.finalizeSale(); await settle();
    expect(operations.prepare).toHaveBeenCalledTimes(2);
    expect(operations.prepare.calls.mostRecent().args[0].operationId).not.toBe(identity);
    expect(sales.create).not.toHaveBeenCalled();
  });

  for (const status of [0, 401, 403, 404, 409, 422, 500, 504]) {
    it("never releases an uncertified preparation after HTTP " + status, async () => {
      operations.prepare.and.returnValue(rejected(status)); page.finalizeSale(); await settle();
      const identity = page.pendingSaleRequest!.operationId;
      expect(page.preparationRejected).toBeFalse(); page.discardRejectedPreparation(); await settle();
      page.setQuantity(0, "2"); expect(page.cart[0].quantity).toBe(1);
      expect(page.pendingSaleRequest!.operationId).toBe(identity); expect(sales.create).not.toHaveBeenCalled();
      operations.get.and.returnValue(rejected(404)); page.finalizeSale(); await settle();
      expect(page.preparationMissing).toBeTrue(); expect(page.preparationRejected).toBeFalse();
      page.discardRejectedPreparation(); await settle(); expect(page.pendingSaleRequest!.operationId).toBe(identity);
      expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).not.toHaveBeenCalled();
    });
  }

  for (const mismatch of ["actorUserId", "operationId", "origin", "outcome", "reasonCode", "protocolVersion"]) {
    it("does not trust a rejection certificate with mismatched " + mismatch, async () => {
      operations.prepare.and.callFake(body => rejected(422, { protocolVersion: 1, operationId: body.operationId,
        actorUserId: owner.id, origin: "POS", code: "OPERATION_PREPARATION_REJECTED", outcome: "NOT_STORED",
        reasonCode: "COMMAND_INVALID", [mismatch]: "invalid" }));
      page.finalizeSale(); await settle();
      expect(page.preparationRejected).toBeFalse(); page.discardRejectedPreparation(); await settle();
      expect(page.pendingSaleRequest).not.toBeNull(); expect(sales.create).not.toHaveBeenCalled();
    });
  }

  it("does not reuse a certificate after reload or a credential change", async () => {
    rejectDefinitively(); page.finalizeSale(); await settle(); const identity = page.pendingSaleRequest!.operationId;
    token = "different-credential"; page.discardRejectedPreparation(); await settle();
    expect(page.pendingSaleRequest!.operationId).toBe(identity);
    fixture.destroy(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(page.preparationRejected).toBeFalse(); expect(page.pendingSaleRequest!.operationId).toBe(identity);
    page.discardRejectedPreparation(); await settle(); expect(page.pendingSaleRequest!.operationId).toBe(identity);
    expect(sales.create).not.toHaveBeenCalled();
  });

  it("never treats a checkout rejection as proof that its durable preparation is absent", async () => {
    sales.create.and.callFake(body => rejected(422, { protocolVersion: 1, operationId: body.operationId,
      actorUserId: owner.id, origin: "POS", code: "OPERATION_PREPARATION_REJECTED", outcome: "NOT_STORED", reasonCode: "COMMAND_INVALID" }));
    page.finalizeSale(); await settle();
    expect(page.preparedOnServer).toBeTrue(); expect(page.preparationRejected).toBeFalse();
    page.discardRejectedPreparation(); await settle(); expect(page.pendingSaleRequest).not.toBeNull();
    expect(sales.create).toHaveBeenCalledTimes(1);
  });

  it("confirms preparation before checkout and pins both requests to the same verified credential", async () => {
    const prepared = new Subject<SaleOperation>(); operations.prepare.and.returnValue(prepared);
    page.finalizeSale(); await settle(); expect(sales.create).not.toHaveBeenCalled();
    const call = operations.prepare.calls.mostRecent().args;
    expect(call[0].command!.confirmedTotal).toBe(10); expect(call[0].receiptIntent).toEqual({ receiptType: "TICKET", payload: null });
    expect(call[1].get(BOUND_AUTH_CREDENTIALS)?.token).toBe("synthetic-owner-token");
    prepared.next(preparedOperation(call[0])); prepared.complete(); await settle();
    expect(sales.create).toHaveBeenCalledOnceWith(call[0].command!, call[1]); expect(page.lastSaleId).toBe(77);
    expect(documents.createFromSale).not.toHaveBeenCalled();
  });
  it("does not checkout or replace the UUID when the preparation response is lost", async () => {
    operations.prepare.and.returnValue(rejected(504)); page.finalizeSale(); await settle();
    const identity = page.pendingSaleRequest!.operationId; expect(sales.create).not.toHaveBeenCalled();
    expect(page.errorMessage).toContain("No se envió el checkout");
    page.finalizeSale(); await settle(); expect(operations.get).toHaveBeenCalledOnceWith(identity, jasmine.any(HttpContext));
    expect(page.pendingSaleRequest!.operationId).toBe(identity); expect(sales.create).not.toHaveBeenCalled();
  });
  it("consults a lost checkout result and never repeats a completed commercial POST", async () => {
    sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle();
    const request = sales.create.calls.first().args[0];
    operations.get.and.returnValue(of({ ...existing("COMPLETED"), operationId: request.operationId }));
    page.finalizeSale(); await settle(); expect(page.lastSaleId).toBe(77); expect(page.pendingSaleRequest).toBeNull();
    expect(sales.create).toHaveBeenCalledTimes(1); expect(documents.createFromSale).not.toHaveBeenCalled();
  });
  it("recovers without any browser storage and resumes only after explicit selection and confirmation", async () => {
    sessionStorage.clear(); const operation = existing(); operations.get.and.returnValue(of(operation));
    page.cart = []; page.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    page.selectServerOperation(operation, false); await settle();
    expect(page.pendingSaleRequest).toEqual(operation.command); expect(sales.create).not.toHaveBeenCalled();
    expect(page.preparedOnServer).toBeTrue();
    page.confirmPreparedResume(); await settle(); expect(sales.create).toHaveBeenCalledOnceWith(operation.command!, jasmine.any(HttpContext));
    expect(operations.prepare).not.toHaveBeenCalled();
  });
  it("opens and reloads without executing commercial or document requests", async () => {
    fixture.destroy(); sessionStorage.clear(); fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; await settle();
    expect(operations.prepare).not.toHaveBeenCalled(); expect(sales.create).not.toHaveBeenCalled(); expect(documents.createFromSale).not.toHaveBeenCalled();
  });
  it("supports another purchase after explicitly preserving a pending operation in the server", async () => {
    sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle(); const first = page.pendingSaleRequest!.operationId;
    page.leaveOperationInServer(); await settle(); expect(page.pendingSaleRequest).toBeNull(); expect(page.cart).toEqual([]);
    page.cart = [{ productId: 101, sku: "QA", barcode: null, name: "Synthetic", salePrice: 10, quantity: 1, discountAmount: 0, stockAvailable: 10, quantityPolicy: "WHOLE" }];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "" }];
    page.finalizeSale(); await settle(); expect(operations.prepare).toHaveBeenCalledTimes(2);
    expect(operations.prepare.calls.mostRecent().args[0].operationId).not.toBe(first);
  });
  it("preserves the frozen receipt and requires explicit cancellation before price reconfirmation", async () => {
    page.billingSeriesRows = [{ id: 21, version: 0, documentType: "INVOICE", series: "F001", currentNumber: 1, environment: "LOCAL", active: true, createdAt: "", updatedAt: "" }];
    page.setReceiptType("INVOICE"); page.setReceiptCustomerDocument("20123456789"); page.setReceiptCustomerName("Synthetic customer");
    sales.create.and.returnValue(rejected(409, { code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10, proposedTotal: 12, changes: [] }));
    page.finalizeSale(); await settle(); const frozen = page.pendingSaleRequest;
    expect(page.receiptRecovery!.receiptType).toBe("INVOICE"); expect(page.preparedOnServer).toBeTrue();
    page.setPaymentAmount(0, "12"); expect(page.payments[0].amount).toBe(10); expect(page.pendingSaleRequest).toBe(frozen);
    page.cancelPendingPreparation(); await settle(); expect(operations.cancel).toHaveBeenCalledOnceWith(frozen!.operationId, jasmine.any(HttpContext));
    expect(page.pendingSaleRequest).toBeNull(); expect(page.cart[0].salePrice).toBe(10); expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it("does not expose a result delivered after an actor credential change", async () => {
    const response = new Subject<SaleResponse>(); sales.create.and.returnValue(response); page.finalizeSale(); await settle();
    token = "synthetic-other-token"; response.next(result()); response.complete(); await settle();
    expect(page.lastSaleId).toBeNull(); expect(page.pendingSaleRequest).not.toBeNull(); expect(documents.createFromSale).not.toHaveBeenCalled();
  });
  it("rejects another verified owner before recovering a selected operation", async () => {
    auth.me.and.returnValue(of({ ...owner, id: "other-owner" })); page.selectServerOperation(existing(), true); await settle();
    expect(operations.get).not.toHaveBeenCalled(); expect(sales.create).not.toHaveBeenCalled(); expect(page.lastSaleId).toBeNull();
  });
  it("keeps cancellation terminal and preserves unavailable result identities", async () => {
    for (const state of ["CANCELLED", "RESULT_UNAVAILABLE"] as const) {
      operations.get.and.returnValue(of(existing(state))); page.selectServerOperation(existing(state), true); await settle();
    }
    expect(sales.create).not.toHaveBeenCalled(); expect(operations.prepare).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("no repitas");
  });
  it("uses owner operation detail instead of the general billing listing during receipt recovery", async () => {
    sales.create.and.returnValue(rejected(0)); page.finalizeSale(); await settle();
    const operationId = page.pendingSaleRequest!.operationId;
    const operation: SaleOperation = { ...existing("COMPLETED"), receiptIntent: { receiptType: "INVOICE", payload: null },
      operationId, command: null, receiptState: "LOCATED", documentId: 901, documentStatus: "DRAFT" };
    operations.get.and.returnValue(of(operation)); page.finalizeSale(); await settle();
    expect(documents.listBySaleId).not.toHaveBeenCalled(); expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(page.lastSaleId).toBe(77); expect(page.successMessage).toContain("DRAFT");
  });
  it("continues via durable preparation if browser persistence is unavailable", async () => {
    spyOn(TestBed.inject(PosStateService), "save").and.returnValue(false); page.finalizeSale(); await settle();
    expect(operations.prepare).toHaveBeenCalledTimes(1); expect(sales.create).toHaveBeenCalledTimes(1); expect(page.lastSaleId).toBe(77);
  });
  for (const state of ["REVIEW_REQUIRED", "PENDING"] as const) {
    it("does not authorize electronic creation after a server intent requiring review: " + state, async () => {
      const intent = { receiptType: "INVOICE" as const, payload: { documentType: "INVOICE" as const,
        billingSeriesId: 21, customerName: "Synthetic customer", customerDocument: "20123456789" } };
      const operation: SaleOperation = { ...existing("COMPLETED"), receiptIntent: intent, receiptState: "PENDING" };
      page.cart = []; page.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
      operations.get.and.returnValue(of(operation)); page.selectServerOperation(operation, false); await settle();
      expect(documents.createFromSale).not.toHaveBeenCalled();
      operations.get.and.returnValue(of({ ...operation, receiptState: state, receiptIntent: {
        ...intent, payload: { ...intent.payload, billingSeriesId: 99 } } }));
      page.finalizeSale(); await settle();
      expect(page.receiptRecovery!.creationState).toBe("REVIEW_REQUIRED");
      page.finalizeSale(); await settle();
      expect(documents.createFromSale).not.toHaveBeenCalled(); expect(sales.create).not.toHaveBeenCalled();
      expect(page.warningMessage).toContain("No se repetirá su creación");
    });
  }
});
