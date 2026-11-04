import { HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { fakeAsync, tick, TestBed } from "@angular/core/testing";
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
import { createOperationDouble, preparedOperation } from "./testing/sale-operation-double.spec";

describe("RV cart verification", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>;
  let page: PosPageComponent;
  let sales: jasmine.SpyObj<SalesService>;
  let pos: jasmine.SpyObj<PosService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  let state: PosStateService;
  let http: HttpTestingController;
  let documents: jasmine.SpyObj<ElectronicDocumentService>;
  let operations: jasmine.SpyObj<SaleOperationsService>;
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
    ...preparedOperation(operations.prepare.calls.mostRecent().args[0]), state: "COMPLETED", command: null,
    saleId: 77, documentId: located ? 901 : null, documentStatus: located ? "DRAFT" : null,
    receiptState: located ? "LOCATED" : page.receiptType === "TICKET" ? "NOT_REQUIRED" : "PENDING",
  });

  beforeEach(async () => {
    sessionStorage.removeItem("erp_pos_sales_draft_v1");
    sales = jasmine.createSpyObj<SalesService>("Sales", ["create", "getById"]);
    sales.create.and.returnValue(rejection(422));
    sales.getById.and.returnValue(of(sale()));
    pos = jasmine.createSpyObj<PosService>("Pos", ["snapshot", "search", "lookup"]);
    pos.snapshot.and.returnValue(of([live()]));
    pos.search.and.returnValue(of([]));
    confirm = jasmine.createSpyObj<ConfirmDialogService>("Confirm", ["confirm"]);
    confirm.confirm.and.returnValue(Promise.resolve(true));
    documents = jasmine.createSpyObj<ElectronicDocumentService>("Documents", ["createFromSale", "listBySaleId", "generateXml", "sign", "send"]);
    documents.createFromSale.and.returnValue(rejection(504)); documents.listBySaleId.and.returnValue(of([]));
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
  afterEach(() => { http.verify(); fixture.destroy(); sessionStorage.removeItem("erp_pos_sales_draft_v1"); });

  it("RV-01 resolves identical valid conditions without a decision or commercial request", async()=>{
    page.cart[0].requiresRevalidation=true; const payments=structuredClone(page.payments);
    page.revalidateCart(); await settle();
    expect(confirm.confirm).not.toHaveBeenCalled(); expect(page.needsRevalidation).toBeFalse();
    expect(page.payments).toEqual(payments); expect(sales.create).not.toHaveBeenCalled();
  });
  it("RV-15 checks a pending draft before opening checkout", async()=>{
    const response=new Subject<PosProductResponse[]>(); pos.snapshot.and.returnValue(response);
    page.cart[0].requiresRevalidation=true; page.openCheckoutModal(); await settle();
    expect(pos.snapshot).toHaveBeenCalled(); expect(page.isCheckoutModalOpen).toBeFalse();
    response.next([live()]);response.complete(); await settle(); expect(page.isCheckoutModalOpen).toBeTrue();
    expect(confirm.confirm).not.toHaveBeenCalled(); expect(sales.create).not.toHaveBeenCalled();
  });
  it("RV-18 cannot accept a proposal from an earlier credential", async()=>{
    let resolve!:(value:boolean)=>void; confirm.confirm.and.returnValue(new Promise<boolean>(r=>resolve=r));
    page.cart[0].requiresRevalidation=true;pos.snapshot.and.returnValue(of([live(12)]));page.revalidateCart();
    spyOn(TestBed.inject(AuthService),'getToken').and.returnValue('synthetic-changed');resolve(true);await settle();
    expect(page.cart[0].salePrice).toBe(10);expect(page.needsRevalidation).toBeTrue();expect(sales.create).not.toHaveBeenCalled();
  });
  it("RV-10 reports a failed verification once and preserves products and payments", async()=>{
    page.cart[0].requiresRevalidation=true;const before=structuredClone({cart:page.cart,payments:page.payments});
    pos.snapshot.and.returnValue(rejection(503));page.revalidateCart();await settle();
    expect(fixture.nativeElement.textContent).toContain('No pudimos verificar tu compra');
    expect(page.cart).toEqual(before.cart);expect(page.payments).toEqual(before.payments);expect(sales.create).not.toHaveBeenCalled();
  });
  it("RV-02 automatically checks restored drafts once and preserves exact decimal inputs and payments",async()=>{
    page.cart[0].quantity=2;page.cart[0].discountAmount=1;page.payments=[{paymentMethod:'CASH',amount:10,reference:'cash'},{paymentMethod:'CARD',amount:9,reference:'card'}];
    (page as any).persistDraftState();const before=state.load()!;confirm.confirm.calls.reset();await remount();
    expect(page.needsRevalidation).toBeFalse();expect(confirm.confirm).not.toHaveBeenCalled();expect(pos.snapshot).toHaveBeenCalledTimes(1);
    expect(page.cart[0].quantity).toBe(2);expect(page.cart[0].discountAmount).toBe(1);expect(state.load()!.payments).toEqual(before.payments);
    page.openCheckoutModal();await settle();expect(pos.snapshot).toHaveBeenCalledTimes(1);expect(page.isCheckoutModalOpen).toBeTrue();
  });
  for(const change of ['quantity','add','remove','discount','payment','warehouse','cash','owner','credential']){
    it('RV-12/18/19 rejects late reads after '+change,async()=>{
      const response=new Subject<PosProductResponse[]>();pos.snapshot.and.returnValue(response);page.cart[0].requiresRevalidation=true;page.revalidateCart();
      if(change==='quantity')page.cart[0].quantity=2;
      if(change==='add')page.cart.push({...page.cart[0],productId:102});
      if(change==='remove')page.cart=[];
      if(change==='discount')page.cart[0].discountAmount=1;
      if(change==='payment')page.payments[0].reference='later';
      if(change==='warehouse')page.saleForm.patchValue({warehouseId:2});
      if(change==='cash')page.currentCashSession={...page.currentCashSession!,id:8};
      if(change==='owner')page.currentUserId='different-owner';
      if(change==='credential')spyOn(TestBed.inject(AuthService),'getToken').and.returnValue('different-token');
      const before=structuredClone({cart:page.cart,payments:page.payments});response.next([live(12)]);response.complete();await settle();
      expect(page.cart).toEqual(before.cart);expect(page.payments).toEqual(before.payments);expect(confirm.confirm).not.toHaveBeenCalled();expect(sales.create).not.toHaveBeenCalled();
    });
  }
  it('RV-03/08 applies only a current explicit price decision and preserves payments and discounts',async()=>{
    page.cart[0].requiresRevalidation=true;page.cart[0].quantity=2;page.cart[0].discountAmount=1;const payments=structuredClone(page.payments);
    pos.snapshot.and.returnValue(of([live(12)]));page.revalidateCart();await settle();
    const options=confirm.confirm.calls.mostRecent().args[0];expect(options.variant).toBe('info');expect(options.title).toBe('Se actualizaron condiciones de tu compra');
    expect(options.description).toContain('precio S/ 10.00 → S/ 12.00');expect(options.description).not.toContain('stock');expect(options.description).toContain('Saldo pendiente: S/ 13.00');
    expect(page.cart[0].salePrice).toBe(12);expect(page.cart[0].discountAmount).toBe(1);expect(page.total).toBe(23);expect(page.payments).toEqual(payments);expect(sales.create).not.toHaveBeenCalled();
  });
  it('RV-09 rejection keeps originals and blocks commercial confirmation',async()=>{
    confirm.confirm.and.returnValue(Promise.resolve(false));page.cart[0].requiresRevalidation=true;pos.snapshot.and.returnValue(of([live(12)]));
    const original=structuredClone({cart:page.cart,payments:page.payments});page.revalidateCart();await settle();expect(page.cart).toEqual(original.cart);expect(page.payments).toEqual(original.payments);
    expect(page.checkoutButtonLabel).toBe('Revisar cambios');page.finalizeSale();await settle();expect(sales.create).not.toHaveBeenCalled();expect(page.isCheckoutModalOpen).toBeFalse();
  });
  it('RV-04 valid stock-only changes refresh availability without a commercial decision',async()=>{
    page.cart[0].requiresRevalidation=true;pos.snapshot.and.returnValue(of([{...live(),stockAvailable:5}]));page.revalidateCart();await settle();
    expect(page.cart[0].stockAvailable).toBe(5);expect(page.needsRevalidation).toBeFalse();expect(confirm.confirm).not.toHaveBeenCalled();
  });
  for(const issue of ['stock','quantity','discount','missing','policy','unknown-stock']){
    it('RV-05/06/07 does not repair incompatible '+issue,async()=>{
      page.cart[0].requiresRevalidation=true;let product=live();
      if(issue==='stock')product.stockAvailable=0;
      if(issue==='quantity'){page.cart[0].quantity=.25;page.cart[0].quantityPolicy='DECIMAL_2';}
      if(issue==='discount'){page.cart[0].discountAmount=8;product.salePrice=5;}
      if(issue==='policy')product.quantityPolicy=undefined;
      if(issue==='unknown-stock')product.stockAvailable=NaN;
      pos.snapshot.and.returnValue(of(issue==='missing'?[]:[product]));const before=structuredClone({cart:page.cart,payments:page.payments});page.revalidateCart();await settle();
      expect(page.cart).toEqual(before.cart);expect(page.payments).toEqual(before.payments);expect(page.needsRevalidation).toBeTrue();expect(confirm.confirm).not.toHaveBeenCalled();
      if(issue==='unknown-stock')expect(page.cartVerificationMessage).not.toContain('agotado');expect(sales.create).not.toHaveBeenCalled();
    });
  }
  it('RV-06 translates legacy policy in a required explicit proposal',async()=>{
    page.cart[0].requiresRevalidation=true;pos.snapshot.and.returnValue(of([{...live(),quantityPolicy:'LEGACY_UNCLASSIFIED'}]));page.revalidateCart();await settle();
    expect(confirm.confirm.calls.mostRecent().args[0].description).toContain('clasificación pendiente');expect(confirm.confirm.calls.mostRecent().args[0].description).not.toContain('LEGACY_UNCLASSIFIED');
  });
  it('RV-11 times out the read and ignores a late answer without a new operation',fakeAsync(()=>{
    const response=new Subject<PosProductResponse[]>();pos.snapshot.and.returnValue(response);page.cart[0].requiresRevalidation=true;page.revalidateCart();
    tick(15001);expect(page.cartCheckPhase).toBe('error');expect(page.cart[0].salePrice).toBe(10);response.next([live(99)]);tick();
    expect(page.cart[0].salePrice).toBe(10);expect(operations.prepare).not.toHaveBeenCalled();expect(sales.create).not.toHaveBeenCalled();
  }));
  it('RV-13 rejects a decision from an earlier generation after a newer verification',async()=>{
    let resolve!:(v:boolean)=>void;confirm.confirm.and.returnValue(new Promise<boolean>(r=>resolve=r));pos.snapshot.and.returnValue(of([live(12)]));
    page.cart[0].requiresRevalidation=true;page.revalidateCart();pos.snapshot.and.returnValue(of([live()]));page.revalidateCart();resolve(true);await settle();
    expect(page.cart[0].salePrice).toBe(10);expect(page.needsRevalidation).toBeFalse();expect(sales.create).not.toHaveBeenCalled();
  });
  it('RV-16 retries only a read after failure and opens checkout only on success',async()=>{
    page.cart[0].requiresRevalidation=true;pos.snapshot.and.returnValue(rejection(503));page.openCheckoutModal();await settle();expect(page.isCheckoutModalOpen).toBeFalse();
    pos.snapshot.and.returnValue(of([live()]));page.openCheckoutModal();await settle();expect(page.isCheckoutModalOpen).toBeTrue();expect(sales.create).not.toHaveBeenCalled();expect(operations.prepare).not.toHaveBeenCalled();
  });
  it('RV-22 blocks a new invalidation inside checkout with a visible reason',async()=>{
    page.openCheckoutModal();await settle();page.saleForm.patchValue({warehouseId:2});await settle();
    expect(fixture.nativeElement.querySelector('.checkout-modal__notice')?.textContent).toContain('almacén');
    pos.snapshot.and.returnValue(of([{...live(),stockAvailable:0}]));page.finalizeSale();await settle();expect(sales.create).not.toHaveBeenCalled();expect(page.needsRevalidation).toBeTrue();
  });
  it('RV-23 never revalidates or rewrites a durable uncertain operation',async()=>{
    page.finalizeSale();await settle();const pending=page.pendingSaleRequest;const calls=pos.snapshot.calls.count();page.revalidateCart();await settle();
    expect(pos.snapshot.calls.count()).toBe(calls);expect(page.pendingSaleRequest).toBe(pending);expect(sales.create).toHaveBeenCalledTimes(1);
  });
  it('RV-12 ignores a read after navigating away',async()=>{
    const response=new Subject<PosProductResponse[]>();pos.snapshot.and.returnValue(response);page.cart[0].requiresRevalidation=true;page.revalidateCart();fixture.destroy();
    response.next([live(12)]);response.complete();expect(page.cart[0].salePrice).toBe(10);expect(confirm.confirm).not.toHaveBeenCalled();
  });
  it('T-03 keeps a persistent accessible status without a checking card or empty grid row',async()=>{
    const response=new Subject<PosProductResponse[]>();pos.snapshot.and.returnValue(response);fixture.detectChanges();
    const host:HTMLElement=fixture.nativeElement,live=host.querySelector('.pos-verification-status')!;
    const search=host.querySelector<HTMLInputElement>('app-pos-search-panel input')!;search.focus();const payments=structuredClone(page.payments);
    page.cart[0].requiresRevalidation=true;page.revalidateCart();fixture.detectChanges();
    expect(host.querySelector('.cart-verification')).toBeNull();expect(host.querySelector('.message-stack')).toBeNull();
    expect(live.closest('[aria-live="polite"]')).not.toBeNull();expect(live.getAttribute('aria-atomic')).toBe('true');expect(live.textContent).toContain('Verificando condiciones');
    expect(getComputedStyle(live).position).toBe('absolute');expect(live.getAttribute('tabindex')).toBeNull();expect(document.activeElement).toBe(search);
    const main=host.querySelector<HTMLButtonElement>('.checkout-button')!;expect(main.disabled).toBeTrue();expect(main.textContent).toContain('Verificando compra');
    response.next([{ productId:101,sku:"QA",barcode:null,name:"Synthetic",salePrice:10,stockAvailable:10,quantityPolicy:"WHOLE" }]);response.complete();await settle();
    expect(host.querySelector('.pos-verification-status')).toBe(live);expect(live.textContent).toContain('Puedes revisar el cobro');
    expect(host.querySelector('.message-stack')).toBeNull();expect(main.disabled).toBeFalse();expect(document.activeElement).toBe(search);
    expect(page.payments).toEqual(payments);expect(sales.create).not.toHaveBeenCalled();expect(operations.prepare).not.toHaveBeenCalled();
  });
  it('T-04 preserves other warnings during checking and shows the real error only once',async()=>{
    const response=new Subject<PosProductResponse[]>();pos.snapshot.and.returnValue(response);page.cart[0].requiresRevalidation=true;
    page.warningMessage='Advertencia legítima conservada';page.revalidateCart();fixture.detectChanges();const host:HTMLElement=fixture.nativeElement;
    expect(host.querySelector('.message-stack')?.textContent).toContain('Advertencia legítima');expect(host.querySelector('.cart-verification')).toBeNull();
    response.error(new HttpErrorResponse({status:503}));await settle();
    expect(host.querySelector('.cart-verification [role="alert"]')?.textContent).toContain('No pudimos verificar');
    expect(host.querySelectorAll('.cart-verification [role="alert"]').length).toBe(1);expect(host.querySelector('.pos-verification-status')?.textContent?.trim()).toBe('');
    expect(host.querySelector('.message-stack')?.textContent).toContain('Advertencia legítima');expect(page.needsRevalidation).toBeTrue();expect(sales.create).not.toHaveBeenCalled();
  });
  it('keeps a genuine price proposal visible without duplicating its accessible message',async()=>{
    page.cart[0].requiresRevalidation=true;pos.snapshot.and.returnValue(of([live(12)]));confirm.confirm.and.returnValue(Promise.resolve(false));
    const before=structuredClone({cart:page.cart,payments:page.payments});page.revalidateCart();await settle();const host:HTMLElement=fixture.nativeElement;
    expect(host.querySelector('.cart-verification')?.textContent).toContain('Hay cambios pendientes');expect(page.cart).toEqual(before.cart);expect(page.payments).toEqual(before.payments);
    expect(host.querySelector('.pos-verification-status')?.textContent?.trim()).toBe('');expect(confirm.confirm.calls.mostRecent().args[0].title).toBe('Se actualizaron condiciones de tu compra');
  });
});
