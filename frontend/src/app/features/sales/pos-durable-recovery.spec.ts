import { HttpContext, HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
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
    operations = createOperationDouble(); sales = jasmine.createSpyObj<SalesService>("Sales", ["create"]);
    sales.create.and.returnValue(of(result()));
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
    fixture = TestBed.createComponent(PosPageComponent); page = fixture.componentInstance; http = TestBed.inject(HttpTestingController);
    await settle(); page.saleForm.controls.warehouseId.setValue(1); page.cart = [{ productId: 101, sku: "QA", barcode: null, name: "Synthetic", salePrice: 10,
      quantity: 1, discountAmount: 0, stockAvailable: 10, quantityPolicy: "WHOLE" }];
    page.payments = [{ paymentMethod: "CASH", amount: 10, reference: "" }];
  });
  afterEach(() => { http.verify(); fixture.destroy(); sessionStorage.clear(); });

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
    const operation: SaleOperation = { ...existing("COMPLETED"), receiptIntent: { receiptType: "INVOICE", payload: null },
      receiptState: "LOCATED", documentId: 901, documentStatus: "DRAFT" };
    operations.get.and.returnValue(of(operation)); page.selectServerOperation(operation, false); await settle();
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
