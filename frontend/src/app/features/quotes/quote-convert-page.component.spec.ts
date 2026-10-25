import { HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { ProductService } from "../catalog/data/product.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "../sales/data/cash-register.service";
import { PosService } from "../sales/data/pos.service";
import { QuoteService } from "./data/quote.service";
import { QuoteResponse } from "./data/quotes.models";
import { QuoteConvertPageComponent } from "./quote-convert-page.component";
import { AuthService } from "../../core/auth/auth.service";
import { SaleOperationsService } from "../sales/data/sale-operations.service";
import { createOperationDouble, preparedOperation } from "../sales/testing/sale-operation-double.spec";

describe("P1-B quote confirmation and recovery", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<QuoteConvertPageComponent>>;
  let page: QuoteConvertPageComponent;
  let quotes: jasmine.SpyObj<QuoteService>;
  let pos: jasmine.SpyObj<PosService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  let http: HttpTestingController;
  let operations: jasmine.SpyObj<SaleOperationsService>;
  const quote = (): QuoteResponse => ({ id: 9, quoteNumber: "Q-QA", customerName: "Synthetic", customerDocument: null,
    customerEmail: null, customerPhone: null, status: "DRAFT", issueDate: "2026-10-17", expiresAt: "2099-01-01",
    sentAt: null, convertedSaleId: null, subtotalAmount: 8, discountAmount: 0, totalAmount: 8,
    notes: null, createdBy: "qa", items: [{ id: 91, productId: 101, quantity: 1, unitPrice: 8, discountAmount: 0, lineTotal: 8 }] });
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  beforeEach(async () => {
    sessionStorage.removeItem("erp_quote_conversion_pending_9");
    quotes = jasmine.createSpyObj<QuoteService>("Quotes", ["getById", "convertToSale"]);
    quotes.getById.and.returnValue(of(quote()));
    quotes.convertToSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { message: "Synthetic" } })));
    pos = jasmine.createSpyObj<PosService>("Pos", ["snapshot"]);
    pos.snapshot.and.returnValue(of([{ productId: 101, sku: "QA", name: "Synthetic", barcode: null, salePrice: 10,
      quantityPolicy: "WHOLE", stockAvailable: 10 }]));
    confirm = jasmine.createSpyObj<ConfirmDialogService>("Confirm", ["confirm"]);
    confirm.confirm.and.returnValue(Promise.resolve(true));
    operations = createOperationDouble();
    await TestBed.configureTestingModule({ imports: [QuoteConvertPageComponent], providers: [
      provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => "9" } } } },
      { provide: QuoteService, useValue: quotes }, { provide: PosService, useValue: pos },
      { provide: ProductService, useValue: { list: () => of({ content: [] }) } },
      { provide: WarehouseService, useValue: { list: () => of([{ id: 1, active: true, code: "QA", name: "Synthetic" }]) } },
      { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
      { provide: ConfirmDialogService, useValue: confirm },
      { provide: SaleOperationsService, useValue: operations },
      { provide: AuthService, useValue: { getToken: () => "synthetic-quote-token", me: () => of({ id: "quote-owner", roles: ["CAJERO"] }) } },
    ] }).compileComponents();
    http = TestBed.inject(HttpTestingController); fixture = TestBed.createComponent(QuoteConvertPageComponent); page = fixture.componentInstance;
    await settle(); page.form.controls.warehouseId.setValue(1); page.setPaymentAmount(0, "10");
  });
  afterEach(() => { http.verify(); fixture.destroy(); sessionStorage.removeItem("erp_quote_conversion_pending_9"); });

  it("requires live proposal and preserves historical quote amounts", async () => {
    page.convert(); await settle(); expect(quotes.convertToSale).not.toHaveBeenCalled();
    page.refreshProposal(); await settle();
    expect(page.quote!.totalAmount).toBe(8); expect(page.quote!.items[0].unitPrice).toBe(8); expect(page.proposalTotal).toBe(10);
    page.convert(); await settle();
    const body = quotes.convertToSale.calls.mostRecent().args[1];
    expect(body.confirmedTotal).toBe(10); expect(body.items).toEqual([{ quoteItemId: 91, quantity: 1, discountAmount: 0, confirmedUnitPrice: 10 }]);
    expect(Object.isFrozen(body)).toBeTrue(); expect(page.quote!.totalAmount).toBe(8);
  });
  it("does not truncate invalid payment precision", async () => {
    page.refreshProposal(); page.setPaymentAmount(0, "10.001"); page.normalizePaymentAmountOnBlur(0); page.convert(); await settle();
    expect(page.payments[0].amount).toBe("10.001"); expect(quotes.convertToSale).not.toHaveBeenCalled();
  });
  it("enforces electronic payment ceiling against proposed not historical total", async () => {
    page.refreshProposal(); page.setPaymentMethod(0, "CARD"); page.setPaymentAmount(0, "10.01"); page.convert(); await settle();
    expect(quotes.convertToSale).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("electrónicos");
  });
  it("invalidates confirmation after edits while the dialog is open", async () => {
    page.refreshProposal(); let resolve!: (ok: boolean) => void;
    confirm.confirm.and.returnValue(new Promise<boolean>(r => resolve = r));
    page.convert(); page.setPaymentAmount(0, "11"); resolve(true); await settle();
    expect(quotes.convertToSale).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("confirma nuevamente");
  });
  it("keeps the same operation after a response is lost", async () => {
    page.refreshProposal(); quotes.convertToSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    page.convert(); await settle(); const first = quotes.convertToSale.calls.first().args[1];
    page.setPaymentAmount(0, "20"); expect(page.payments[0].amount).toBe("10");
    page.convert(); await settle();
    expect(quotes.convertToSale.calls.count()).toBe(1); expect(operations.get).toHaveBeenCalledTimes(1);
    page.resumePreparedConversion(); await settle();
    expect(quotes.convertToSale.calls.count()).toBe(2); expect(quotes.convertToSale.calls.mostRecent().args[1]).toEqual(first);
    expect(page.pendingRequest!.operationId).toBe(first.operationId);
  });
  it("requires new live review after a price conflict without changing quote history", async () => {
    page.refreshProposal();
    quotes.convertToSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: {
      code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10, proposedTotal: 12,
      changes: [{ productId: 101, confirmedUnitPrice: 10, currentUnitPrice: 12 }] } })));
    page.convert(); await settle();
    expect(page.proposalTotal).toBeNull(); expect(page.pendingRequest).not.toBeNull();
    expect(page.quote!.totalAmount).toBe(8); expect(page.errorMessage).toContain("10 → 12");
    page.convert(); await settle(); expect(quotes.convertToSale).toHaveBeenCalledTimes(1);
  });
  it("restores an uncertain conversion with the original body and amounts after remount", async () => {
    page.refreshProposal(); quotes.convertToSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 504 })));
    page.convert(); await settle(); const first = quotes.convertToSale.calls.first().args[1];
    fixture.destroy(); fixture = TestBed.createComponent(QuoteConvertPageComponent); page = fixture.componentInstance; await settle();
    expect(page.pendingRequest).toBeNull(); expect(quotes.convertToSale).toHaveBeenCalledTimes(1);
    const operation = preparedOperation(operations.prepare.calls.first().args[0]);
    page.recoverOperation(operation, false); await settle();
    expect(page.pendingRequest).toEqual(first); expect(page.payments[0].amount).toBe("10.00");
    expect(page.form.disabled).toBeTrue(); page.resumePreparedConversion(); await settle();
    expect(quotes.convertToSale.calls.mostRecent().args[1]).toEqual(first); expect(quotes.convertToSale).toHaveBeenCalledTimes(2);
  });
  it("invalidates proposal when the warehouse changes", async () => {
    page.refreshProposal(); expect(page.proposalTotal).toBe(10);
    page.form.controls.warehouseId.setValue(2); page.convert(); await settle();
    expect(page.proposalTotal).toBeNull(); expect(quotes.convertToSale).not.toHaveBeenCalled();
  });
  it("does not release an operation whose persisted result requires review", async () => {
    page.refreshProposal(); quotes.convertToSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409,
      error: { code: "OPERATION_RESULT_UNAVAILABLE", message: "Requires review" } })));
    page.convert(); await settle(); const body = quotes.convertToSale.calls.first().args[1];
    expect(page.pendingRequest).toEqual(body); page.setPaymentAmount(0, "20");
    expect(page.payments[0].amount).toBe("10"); expect(quotes.convertToSale).toHaveBeenCalledTimes(1);
  });

  it("prepares the original quote command before conversion without inventing receipt intent", async () => {
    const prepared = new Subject<ReturnType<typeof preparedOperation>>(); operations.prepare.and.returnValue(prepared);
    page.refreshProposal(); page.convert(); await settle(); expect(quotes.convertToSale).not.toHaveBeenCalled();
    const request = operations.prepare.calls.mostRecent().args[0];
    expect(request.origin).toBe("QUOTE"); expect(request.quoteId).toBe(9); expect(request.command).toBeNull(); expect(request.receiptIntent).toBeNull();
    expect(request.quoteCommand!.operationId).toBe(request.operationId);
    prepared.next(preparedOperation(request)); prepared.complete(); await settle();
    expect(quotes.convertToSale).toHaveBeenCalledOnceWith(9, request.quoteCommand!, jasmine.anything());
  });
  it("never converts after a lost preparation response and retains the same identity for a server query", async () => {
    operations.prepare.and.returnValue(throwError(() => new HttpErrorResponse({ status: 504 })));
    page.refreshProposal(); page.convert(); await settle(); const request = page.pendingRequest;
    expect(quotes.convertToSale).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("No se envió la conversión");
    page.convert(); await settle(); expect(operations.get.calls.mostRecent().args[0]).toBe(request!.operationId);
    expect(page.pendingRequest).toBe(request); expect(quotes.convertToSale).not.toHaveBeenCalled();
  });
  it("queries a completed conversion without dispatching another commercial request", async () => {
    page.refreshProposal(); page.convert(); await settle(); const request = operations.prepare.calls.first().args[0];
    const operation = { ...preparedOperation(request), state: "COMPLETED" as const, saleId: 77, quoteCommand: null };
    operations.get.and.returnValue(of(operation)); page.recoverOperation(operation, true); await settle();
    expect(page.quote!.convertedSaleId).toBe(77); expect(page.pendingRequest).toBeNull(); expect(quotes.convertToSale).toHaveBeenCalledTimes(1);
  });
  it("keeps the frozen price-conflict operation until cancellation is explicitly confirmed", async () => {
    page.refreshProposal(); quotes.convertToSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: {
      code: "PRICE_CONFIRMATION_REQUIRED", confirmedTotal: 10, proposedTotal: 12, changes: [] } })));
    page.convert(); await settle(); const request = page.pendingRequest;
    page.setPaymentAmount(0, "12"); expect(page.payments[0].amount).toBe("10"); expect(page.pendingRequest).toBe(request);
    page.cancelPreparation(); await settle(); expect(operations.cancel.calls.mostRecent().args[0]).toBe(request!.operationId);
    expect(page.pendingRequest).toBeNull(); expect(page.proposalTotal).toBeNull(); expect(page.quote!.totalAmount).toBe(8);
  });
});
