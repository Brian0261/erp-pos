import { HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideZoneChangeDetection, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { CashRegisterService } from "./data/cash-register.service";
import { PosService } from "./data/pos.service";
import { SalesService } from "./data/sales.service";
import { SaleOperationsService } from "./data/sale-operations.service";
import { PosPageComponent } from "./pos-page.component";
import { createOperationDouble } from "./testing/sale-operation-double.spec";
import { PosConfirmedDelivery, PosSaleNoteComponent } from "./internal-note/pos-sale-note.component";
import { NoteSession } from "./internal-note/note-session";
import { noteSale } from "./internal-note/note-test-data";
import { toInternalNote } from "./internal-note/note-model";

describe("UX POS workspace presentation", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>, page: PosPageComponent;
  let cash: jasmine.SpyObj<CashRegisterService>, pos: jasmine.SpyObj<PosService>, confirm: jasmine.SpyObj<ConfirmDialogService>;
  let token: string;
  const product = {productId:1,name:"Synthetic notebook",sku:"SYN-1",barcode:null,salePrice:5,stockAvailable:20,quantityPolicy:"WHOLE" as const};
  const settle = async () => {fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
  beforeEach(async () => {
    sessionStorage.clear(); token="synthetic-pos-presentation";
    cash=jasmine.createSpyObj("Cash",["current"]);cash.current.and.returnValue(of({id:7,status:"OPEN",openedByUserId:"synthetic-owner",openedAt:"2026-10-31T13:00:00Z",closedAt:null,openingAmount:0,countedAmount:null,expectedCashAmount:null,differenceAmount:null,notes:null}));
    pos=jasmine.createSpyObj("Pos",["search","lookup"]);pos.search.and.returnValue(of([]));pos.lookup.and.returnValue(of(product));
    confirm=jasmine.createSpyObj("Confirm",["confirm"]);confirm.confirm.and.returnValue(Promise.resolve(false));
    await TestBed.configureTestingModule({imports:[PosPageComponent],providers:[provideZoneChangeDetection(),provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
      {provide:AuthService,useValue:{getToken:()=>token,me:()=>of({id:"synthetic-owner",roles:["CAJERO"]})}},
      {provide:WarehouseService,useValue:{list:()=>of([{id:1,code:"SYN",name:"Synthetic store",active:true}])}},
      {provide:CashRegisterService,useValue:cash},{provide:PosService,useValue:pos},{provide:ConfirmDialogService,useValue:confirm},
      {provide:SalesService,useValue:jasmine.createSpyObj("Sales",["create"])},
      {provide:SaleOperationsService,useValue:createOperationDouble()},
      {provide:BillingSeriesService,useValue:{list:()=>of([])}},{provide:ElectronicDocumentService,useValue:{}}]}).compileComponents();
    fixture=TestBed.createComponent(PosPageComponent);page=fixture.componentInstance;await settle();
  });
  afterEach(()=>{fixture.destroy();sessionStorage.clear();});
  const paymentDialog = () => fixture.nativeElement.querySelector('app-pos-checkout-modal [role="dialog"]') as HTMLElement;
  const paymentInput = (index=0) => paymentDialog().querySelectorAll<HTMLInputElement>('.payment-line input[type="number"]')[index];
  const paymentConfirm = () => Array.from(paymentDialog().querySelectorAll('button')).find(button=>button.textContent?.trim()==='Confirmar venta')!;
  const openPaymentReview = async () => {page.addToCart(product);page.openCheckoutModal();await settle();};
  it("keeps payment edit errors field-local and immediately resolves them without moving focus",async()=>{
    await openPaymentReview();expect(paymentDialog().querySelectorAll('.payment-amount-error').length).toBe(0);
    const input=paymentInput();input.focus();input.value='';input.dispatchEvent(new Event('input'));await settle();
    expect(page.payments[0].amountInput).toBe('');expect(page.errorMessage).toBe('');expect(paymentConfirm().disabled).toBeTrue();
    expect(input.getAttribute('aria-invalid')).toBe('true');const description=input.getAttribute('aria-describedby')!;
    expect(document.getElementById(description)?.textContent).toContain('Ingresa un monto válido');
    expect(paymentDialog().querySelectorAll('[role="alert"]').length).toBe(0);expect(document.activeElement).toBe(input);
    input.value='5';input.dispatchEvent(new Event('input'));await settle();
    expect(page.payments[0]).toEqual({paymentMethod:'CASH',amount:5,reference:''});expect(paymentConfirm().disabled).toBeFalse();
    expect(input.getAttribute('aria-invalid')).toBeNull();expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(paymentDialog().querySelectorAll('.payment-amount-error').length).toBe(0);expect(document.activeElement).toBe(input);
    expect(TestBed.inject(SalesService).create).not.toHaveBeenCalled();expect(TestBed.inject(SaleOperationsService).prepare).not.toHaveBeenCalled();
  });
  it("preserves strict decimal and negative checks, insufficient payment and electronic overpayment rules",async()=>{
    await openPaymentReview();
    for(const invalid of ['0.001','-1','NaN','1e1001']){page.setPaymentAmount(0,invalid);await settle();expect(paymentConfirm().disabled).toBeTrue();expect(paymentInput().getAttribute('aria-invalid')).toBe('true');}
    page.setPaymentAmount(0,'3');await settle();expect(paymentInput().getAttribute('aria-invalid')).toBeNull();expect(paymentConfirm().disabled).toBeTrue();expect(page.checkoutReviewBlockedReason).toContain('mayor o igual');
    page.setPaymentAmount(0,'5');await settle();expect(page.paidTotal).toBe(5);expect(page.change).toBe(0);expect(paymentConfirm().disabled).toBeFalse();
    page.setPaymentAmount(0,'7');await settle();expect(page.change).toBe(2);expect(paymentConfirm().disabled).toBeFalse();
    page.setPaymentMethod(0,'CARD');await settle();expect(paymentConfirm().disabled).toBeTrue();expect(page.checkoutReviewBlockedReason).toContain('electrónicos');
    page.setPaymentAmount(0,'5');await settle();expect(paymentConfirm().disabled).toBeFalse();expect(page.errorMessage).toBe('');
  });
  it("recalculates mixed payments and removes only the current line's error",async()=>{
    await openPaymentReview();page.setPaymentAmount(0,'2');page.addPaymentLine();page.setPaymentMethod(1,'CARD');page.setPaymentAmount(1,'');await settle();
    expect(paymentInput(0).getAttribute('aria-invalid')).toBeNull();expect(paymentInput(1).getAttribute('aria-invalid')).toBe('true');expect(paymentConfirm().disabled).toBeTrue();
    page.setPaymentAmount(1,'3');await settle();expect(page.paidTotal).toBe(5);expect(paymentConfirm().disabled).toBeFalse();
    page.setPaymentAmount(0,'');await settle();expect(paymentInput(0).getAttribute('aria-invalid')).toBe('true');expect(paymentInput(1).getAttribute('aria-invalid')).toBeNull();
    page.removePaymentLine(0);await settle();expect(page.payments).toEqual([{paymentMethod:'CARD',amount:3,reference:''}]);expect(paymentDialog().querySelectorAll('.payment-amount-error').length).toBe(0);expect(paymentConfirm().disabled).toBeTrue();
    page.setPaymentAmount(0,'5');await settle();expect(paymentConfirm().disabled).toBeFalse();expect(TestBed.inject(SalesService).create).not.toHaveBeenCalled();
  });
  it("retains valid cart and payments across closing and reopening without leaking field errors to POS",async()=>{
    await openPaymentReview();page.setPaymentAmount(0,'');await settle();page.closeCheckoutModal();await settle();
    expect(fixture.nativeElement.querySelector('.message-stack [role="alert"]')).toBeNull();page.openCheckoutModal();await settle();
    expect(paymentInput().getAttribute('aria-invalid')).toBe('true');expect(paymentConfirm().disabled).toBeTrue();page.setPaymentAmount(0,'5');await settle();
    const before=structuredClone({cart:page.cart,payments:page.payments});page.closeCheckoutModal();await settle();page.openCheckoutModal();await settle();
    expect({cart:page.cart,payments:page.payments}).toEqual(before);expect(paymentDialog().querySelectorAll('.payment-amount-error,[role="alert"]').length).toBe(0);expect(paymentConfirm().disabled).toBeFalse();
  });
  it("does not clear an unrelated error or a genuine stock blocker while correcting payments",async()=>{
    await openPaymentReview();page.errorMessage='No se pudo consultar la operación; comprueba su resultado.';page.cart[0].quantity=21;
    page.setPaymentAmount(0,'');await settle();page.setPaymentAmount(0,'105');await settle();
    expect(page.errorMessage).toBe('No se pudo consultar la operación; comprueba su resultado.');expect(paymentDialog().querySelector('[role="alert"]')?.textContent).toContain('comprueba su resultado');
    expect(page.checkoutReviewBlockedReason).toContain('Stock insuficiente');expect(paymentConfirm().disabled).toBeTrue();expect(paymentInput().getAttribute('aria-invalid')).toBeNull();
  });
  it("derives errors from the current payment context, not a previous line, operation or late read",async()=>{
    await openPaymentReview();page.setPaymentAmount(0,'');await settle();const old=page.payments[0];
    const response=new Subject<any>();cash.current.and.returnValue(response);page.refreshCashSession();
    page.payments=[{paymentMethod:'TRANSFER',amount:5,reference:'new-context'}];await settle();old.amountInput='-1';
    response.next({id:7,status:'OPEN',openedByUserId:'synthetic-owner',openedAt:'2026-10-31T13:00:00Z'});response.complete();await settle();
    expect(paymentDialog().querySelectorAll('.payment-amount-error,[role="alert"]').length).toBe(0);expect(paymentConfirm().disabled).toBeFalse();
    token='different-session';(page as any).pendingOwnerBlocked=true;page.setPaymentAmount(0,'');await settle();
    expect(page.payments).toEqual([{paymentMethod:'TRANSFER',amount:5,reference:'new-context'}]);expect(paymentConfirm().disabled).toBeTrue();expect(page.checkoutReviewBlockedReason).toContain('otra identidad');
    expect(TestBed.inject(SalesService).create).not.toHaveBeenCalled();expect(TestBed.inject(SaleOperationsService).prepare).not.toHaveBeenCalled();
  });
  it("renders one compact verified cash session and disclosure without additional cash requests",async()=>{
    const header:HTMLElement=fixture.nativeElement.querySelector('.pos-utility-header');
    expect(header.textContent).toContain('Caja abierta · Sesión #7');expect(header.textContent).toContain('Almacén de salida:');
    expect(header.textContent).not.toContain('Venta actual');expect(header.textContent).not.toContain('OPERACIÓN / POS');
    const details=header.querySelector<HTMLDetailsElement>('details.pos-cash-details')!;expect(details.open).toBeFalse();
    const count=cash.current.calls.count();details.querySelector('summary')!.click();await settle();
    expect(details.open).toBeTrue();expect(details.textContent).toContain('Apertura:');expect(details.querySelector('a')!.getAttribute('href')).toBe('/caja');
    details.querySelector('summary')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();
    expect(details.open).toBeFalse();expect(document.activeElement).toBe(details.querySelector('summary'));expect(cash.current.calls.count()).toBe(count);
  });
  it("never presents a known session for unverified or closed cash and retains retry",async()=>{
    cash.current.and.returnValue(throwError(()=>new HttpErrorResponse({status:503})));page.refreshCashSession();await settle();
    const header:HTMLElement=fixture.nativeElement.querySelector('.pos-utility-header');expect(header.textContent).not.toContain('Sesión #7');
    expect(header.textContent).toContain('No se pudo verificar la caja');expect(header.textContent).toContain('Reintentar caja');
    cash.current.and.returnValue(throwError(()=>new HttpErrorResponse({status:404,error:{message:'No OPEN cash register session for current user'}})));page.refreshCashSession();await settle();
    expect(header.textContent).toContain('Caja cerrada');expect(header.textContent).not.toContain('Sesión #');expect(page.checkoutDisabled).toBeTrue();
  });
  it("keeps an empty cart and discard disabled, independently of the open cash session",()=>{
    expect(page.cashPhase).toBe("open");expect(page.checkoutDisabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.checkout-button').disabled).toBeTrue();
    expect(Array.from(fixture.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.trim()==="Descartar carrito")).toBeDefined();
  });
  it("keeps full-cart edits focused and does not duplicate a SKU used also as barcode",async()=>{
    page.addToCart({...product,barcode:'SYN-1',quantityPolicy:'DECIMAL_2'});page.openFullCart();await settle();const modal:HTMLElement=fixture.nativeElement.querySelector('app-pos-full-cart-modal [role="dialog"]');
    expect(modal.textContent).not.toContain('Sin código');expect((modal.querySelector('.full-cart-product-meta-row')!.textContent!.match(/SYN-1/g)||[]).length).toBe(1);
    const input=modal.querySelector<HTMLInputElement>('input[aria-label="Cantidad del producto"]')!;input.focus();input.value='1.25';input.dispatchEvent(new Event('input'));await settle();
    expect(input.isConnected).toBeTrue();expect(document.activeElement).toBe(input);expect(page.cart[0].quantity).toBe(1.25);
    const before=structuredClone(page.cart);page.closeFullCart();await settle();expect(page.cart).toEqual(before);
  });
  it("reflects the existing auto-selected billing series in the native selector when its options change",async()=>{
    page.billingSeriesRows=[{id:22,version:0,documentType:'RECEIPT',series:'B-SYN',currentNumber:1,environment:'BETA',active:true,createdAt:'',updatedAt:''}];
    page.addToCart(product);page.isCheckoutModalOpen=true;page.setReceiptType('RECEIPT');await settle();const select=fixture.nativeElement.querySelector('app-pos-checkout-receipt-section select') as HTMLSelectElement;
    expect(page.receiptSeriesId).toBe('22');expect(select.value).toBe('22');page.setReceiptSeriesId('');await settle();expect(select.value).toBe('');expect(page.receiptSeriesInvalid).toBeTrue();
  });
  it("distinguishes loading, certified closed cash, malformed data and connectivity failure",async()=>{
    const response=new Subject<any>();cash.current.and.returnValue(response);page.refreshCashSession();await settle();
    expect(page.cashPhase).toBe("loading");expect(page.checkoutDisabled).toBeTrue();
    response.error(new HttpErrorResponse({status:503}));await settle();expect(page.cashPhase).toBe("error");expect(page.currentCashSession).toBeNull();
    cash.current.and.returnValue(throwError(()=>new HttpErrorResponse({status:404,error:{message:"No OPEN cash register session for current user"}})));
    page.refreshCashSession();await settle();expect(page.cashPhase).toBe("closed");expect(page.checkoutDisabled).toBeTrue();
    cash.current.and.returnValue(of({id:7} as any));page.refreshCashSession();await settle();expect(page.cashPhase).toBe("error");
    cash.current.and.returnValue(throwError(()=>new HttpErrorResponse({status:404,error:{message:"Unknown resource"}})));
    page.refreshCashSession();await settle();expect(page.cashPhase).toBe("error");
  });
  it("renders initial, loading, empty and failed search without showing stale results",async()=>{
    expect(page.hasSearched).toBeFalse();const response=new Subject<any>();pos.search.and.returnValue(response);
    page.searchUnifiedText("synthetic");await settle();expect(fixture.nativeElement.textContent).toContain("Buscando productos");
    response.next([]);response.complete();await settle();expect(page.searchFailed).toBeFalse();expect(fixture.nativeElement.textContent).toContain("Sin coincidencias");
    pos.search.and.returnValue(throwError(()=>new HttpErrorResponse({status:503})));page.searchUnifiedText("synthetic");await settle();
    expect(page.searchFailed).toBeTrue();expect(fixture.nativeElement.textContent).toContain("No se pudo consultar");
  });
  it("keeps the historical confirmation reference separate when the next cart starts",()=>{
    page.lastSaleId=81;page.addToCart(product);
    expect(page.lastSaleId).toBe(81);expect(page.cart.length).toBe(1);expect(page.pendingSaleRequest).toBeNull();expect(page.receiptRecovery).toBeNull();
    expect(TestBed.inject(SalesService).create).not.toHaveBeenCalled();
  });
  it("keeps one warehouse selector bound to the original guarded control",async()=>{
    page.warehouses.push({id:2,code:"SYN-2",name:"Synthetic second",active:true,type:"STORE",createdAt:"",updatedAt:""});
    page.addToCart(product);await settle();
    const selectors=fixture.nativeElement.querySelectorAll('select[formControlName="warehouseId"]');expect(selectors.length).toBe(1);
    const select=selectors[0] as HTMLSelectElement;expect(select.closest('.pos-utility-header')).not.toBeNull();
    select.selectedIndex=2;select.dispatchEvent(new Event("change"));await settle();
    expect(page.saleForm.value.warehouseId).toBe(2);expect(page.cart[0].requiresRevalidation).toBeTrue();
    page.pendingSaleRequest={operationId:"00000000-0000-4000-8000-000000000001",warehouseId:1,items:[],payments:[],confirmedTotal:5};await settle();
    expect(select.disabled).toBeTrue();page.saleForm.controls.warehouseId.setValue(2);expect(page.saleForm.value.warehouseId).toBe(1);
    expect(TestBed.inject(SalesService).create).not.toHaveBeenCalled();
  });
  it("keeps three initial quick terms and a keyboard-closeable disclosure for the remainder",async()=>{
    const panel=fixture.nativeElement.querySelector('app-pos-search-panel') as HTMLElement;
    expect(panel.querySelectorAll('.quick-search__buttons button').length).toBe(3);
    const details=panel.querySelector('details')!;const summary=details.querySelector('summary')!;
    details.open=true;await settle();const first=details.querySelector('button')!;first.click();await settle();
    expect(pos.search).toHaveBeenCalledTimes(1);expect(page.cart).toEqual([]);expect(details.open).toBeFalse();
    details.open=true;summary.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();
    expect(details.open).toBeFalse();expect(document.activeElement).toBe(summary);
  });
  it("labels the existing absolute per-line discount in soles without changing calculations or invalid inputs",async()=>{
    page.addToCart(product);page.increaseQuantity(0);page.setDiscount(0,"1");await settle();
    expect(page.total).toBe(9);expect(fixture.nativeElement.textContent).toContain("Descuento (S/)");
    const discount=fixture.nativeElement.querySelector('app-pos-cart-panel input[aria-label="Descuento del producto"]') as HTMLInputElement;
    expect(discount.value).toBe("1");page.setDiscount(0,"0.001");await settle();
    expect(discount.value).toBe("0.001");expect(page.checkoutDisabled).toBeTrue();
  });
  it("requires explicit discard confirmation and cancels without changing the cart",async()=>{
    page.addToCart(product);const before=structuredClone(page.cart);await page.confirmDiscardCart();await settle();
    expect(page.cart).toEqual(before);expect(confirm.confirm).toHaveBeenCalledTimes(1);
    confirm.confirm.and.returnValue(Promise.resolve(true));await page.confirmDiscardCart();await settle();expect(page.cart).toEqual([]);
  });
  it("does not discard a newer cart or changed actor after an asynchronous confirmation",async()=>{
    page.addToCart(product);let accept!:(v:boolean)=>void;confirm.confirm.and.returnValue(new Promise<boolean>(resolve=>accept=resolve));
    const task=page.confirmDiscardCart();page.increaseQuantity(0);accept(true);await task;expect(page.cart[0].quantity).toBe(2);
    confirm.confirm.and.returnValue(new Promise<boolean>(resolve=>accept=resolve));const second=page.confirmDiscardCart();token="other-actor";accept(true);await second;expect(page.cart.length).toBe(1);
  });
  it("shows one recovery continuation, keeps the warning outside the operations panel and never submits on render",async()=>{
    page.pendingSaleRequest={operationId:"00000000-0000-4000-8000-000000000001",warehouseId:1,items:[],payments:[],confirmedTotal:5};await settle();
    expect(fixture.nativeElement.textContent).toContain("No repitas el cobro");
    const actions=Array.from(fixture.nativeElement.querySelectorAll('button')).filter((b:any)=>b.textContent.trim()==="COMPROBAR RESULTADO");expect(actions.length).toBe(1);
    expect(TestBed.inject(SalesService).create).not.toHaveBeenCalled();
  });
});

describe("UX POS event-bound delivery",()=>{
  let fixture:ReturnType<typeof TestBed.createComponent<PosSaleNoteComponent>>, component:PosSaleNoteComponent;
  let token:string, documents:jasmine.SpyObj<ElectronicDocumentService>;
  let session:any;
  const delivery=(receiptType:PosConfirmedDelivery['receiptType']='TICKET'):PosConfirmedDelivery=>({saleId:81,totalAmount:150,
    operationId:'00000000-0000-4000-8000-000000000081',credential:'delivery-token',receiptType});
  const doc=(status='DRAFT',environment='LOCAL')=>({id:901,saleId:81,documentType:'INVOICE',fullNumber:'F-SYN-1',status,environment});
  const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
  const open=async(receiptType:PosConfirmedDelivery['receiptType']='TICKET')=>{fixture.componentRef.setInput('delivery',delivery(receiptType));await settle();};
  beforeEach(async()=>{
    token='delivery-token';const sale=noteSale(2);sale.id=81;
    session={note:signal(toInternalNote(sale)),phase:signal('ready'),error:signal(''),message:signal(''),format:'a4',
      load:jasmine.createSpy('load').and.returnValue(Promise.resolve()),output:jasmine.createSpy('output').and.returnValue(Promise.resolve()),
      changeFormat:jasmine.createSpy('changeFormat'),invalidate:jasmine.createSpy('invalidate'),
      isReadyFor:(id:number)=>id===81&&session.phase()==='ready'&&!session.error()};
    session.changeFormat.and.callFake((format:string)=>{session.format=format;return Promise.resolve();});
    documents=jasmine.createSpyObj('Documents',['listBySaleId']);documents.listBySaleId.and.returnValue(of([]));
    await TestBed.configureTestingModule({imports:[PosSaleNoteComponent],providers:[provideZoneChangeDetection(),provideRouter([]),
      {provide:AuthService,useValue:{getToken:()=>token}},{provide:ElectronicDocumentService,useValue:documents}]})
      .overrideComponent(PosSaleNoteComponent,{set:{providers:[{provide:NoteSession,useValue:session}]}}).compileComponents();
    fixture=TestBed.createComponent(PosSaleNoteComponent);component=fixture.componentInstance;await settle();
  });
  afterEach(()=>fixture.destroy());
  it('does not open because a note exists or a PDF completes without a checkout event',async()=>{
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();expect(session.load).not.toHaveBeenCalled();
    session.note.set({...session.note(),total:'S/ 999.00'});await settle();expect(component.visible).toBeFalse();
  });
  it('uses the persisted checkout total, loads only its sale and offers the three existing note formats',async()=>{
    await open();expect(fixture.nativeElement.textContent).toContain('Venta #81 · Registrada');
    expect(fixture.nativeElement.textContent).toMatch(/Total confirmado: S\/\s*150\.00/);
    expect(session.load).toHaveBeenCalledOnceWith(81,false);expect(documents.listBySaleId).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('option').length).toBe(3);
    for(const format of ['a4','ticket58','ticket80']){component.changeFormat(format);expect(session.changeFormat).toHaveBeenCalledWith(format);}
    component.output('print');component.output('download');expect(session.output.calls.allArgs()).toEqual([['print'],['download']]);
  });
  for(const close of ['x','escape','new'] as const){
    it('closes with '+close+' without invalidating the note or an open viewer',async()=>{
      await open();const emitted=spyOn(component.newSale,'emit');
      if(close==='escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      else if(close==='x')fixture.nativeElement.querySelector('[aria-label="Cerrar entrega de nota"]').click();
      else fixture.nativeElement.querySelector('.new-sale').click();
      await settle();expect(component.visible).toBeFalse();expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
      expect(session.invalidate).not.toHaveBeenCalled();expect(session.output).not.toHaveBeenCalled();expect(emitted.calls.count()).toBe(close==='new'?1:0);
      session.note.set({...session.note(),total:'S/ 999.00'});fixture.componentRef.setInput('delivery',{...delivery()});await settle();
      expect(component.visible).toBeFalse();expect(session.load).toHaveBeenCalledTimes(1);
    });
  }
  it('retries only the authorized note after a failed PDF or download',async()=>{
    await open();session.error.set('Synthetic PDF failure');await settle();expect(component.ready).toBeFalse();
    component.output('download');expect(session.output).not.toHaveBeenCalled();component.retryNote();expect(session.load).toHaveBeenCalledTimes(2);
    expect(session.load.calls.mostRecent().args).toEqual([81,false]);
  });
  it('contains Tab and Shift+Tab in the compact delivery and restores focus after Escape',async()=>{
    const launcher=document.createElement('button');document.body.append(launcher);launcher.focus();await open();
    const first=fixture.nativeElement.querySelector('[aria-label="Cerrar entrega de nota"]') as HTMLButtonElement;
    const last=fixture.nativeElement.querySelector('.new-sale') as HTMLButtonElement;expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}));expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();expect(document.activeElement).toBe(launcher);launcher.remove();
  });
  for(const status of ['DRAFT','SENT','ACCEPTED','REJECTED']){
    it('shows only the queried '+status+' with its test environment and no fiscal output actions',async()=>{
      documents.listBySaleId.and.returnValue(of([doc(status,'BETA')] as any));await open('INVOICE');
      expect(documents.listBySaleId).not.toHaveBeenCalled();component.refreshDocument();await settle();
      const text=fixture.nativeElement.textContent;expect(text).toContain('Beta · pruebas');
      expect(text).not.toContain('SUNAT');expect(text).not.toContain('CDR');expect(text).not.toContain('PDF fiscal');
      if(status==='DRAFT')expect(text).toContain('Borrador · no emitido');
      if(status==='SENT')expect(text).toContain('consultar resultado');
      if(status==='ACCEPTED')expect(text).toContain('Aceptado · Beta · pruebas');
      if(status==='REJECTED')expect(text).toContain('Rechazado');
    });
  }
  it('distinguishes pending, failed, denied and malformed document reads without inventing absence',async()=>{
    await open('INVOICE');expect(component.documentPhase).toBe('idle');component.refreshDocument();await settle();expect(component.documentPhase).toBe('pending');
    for(const status of [0,403,500]){documents.listBySaleId.and.returnValue(throwError(()=>new HttpErrorResponse({status})));component.refreshDocument();await settle();
      expect(component.documentPhase).toBe('error');expect(fixture.nativeElement.textContent).toContain('no pudo verificarse');expect(fixture.nativeElement.textContent).not.toContain('No se solicitó');}
    documents.listBySaleId.and.returnValue(of([{...doc(),saleId:99}] as any));component.refreshDocument();await settle();expect(component.documentPhase).toBe('error');
  });
  it('rejects stale credential events and clears late document responses when the actor changes',async()=>{
    const response=new Subject<any[]>();documents.listBySaleId.and.returnValue(response);await open('INVOICE');component.refreshDocument();
    token='different-actor';await settle();response.next([doc('ACCEPTED','PROD')]);response.complete();await settle();
    expect(component.current).toBeNull();expect(component.visible).toBeFalse();expect(component.documentPresentation).toBeNull();
    fixture.componentRef.setInput('delivery',{...delivery()});await settle();expect(component.visible).toBeFalse();
  });
});
