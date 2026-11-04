import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { SaleOperation, SaleOperationPage, SaleOperationsService } from "../data/sale-operations.service";
import { createOperationDouble, preparedOperation } from "../testing/sale-operation-double.spec";
import { SaleOperationRecoveryComponent } from "./sale-operation-recovery.component";

describe("A owner operation discovery", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SaleOperationRecoveryComponent>>, panel: SaleOperationRecoveryComponent;
  let operations: jasmine.SpyObj<SaleOperationsService>, auth: jasmine.SpyObj<AuthService>, http: HttpTestingController;
  let token: string;
  const row = (id = "00000000-0000-4000-8000-000000000001"): SaleOperation => preparedOperation({ protocolVersion: 1, origin: "POS", operationId: id,
    command: { operationId: id, warehouseId: 1, confirmedTotal: 10, items: [{ productId: 1, quantity: 1, confirmedUnitPrice: 10 }], payments: [{ paymentMethod: "CASH", amount: 10 }] },
    quoteId: null, quoteCommand: null, receiptIntent: { receiptType: "TICKET", payload: null } });
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  beforeEach(async () => {
    token = "synthetic-token"; operations = createOperationDouble(); auth = jasmine.createSpyObj<AuthService>("Auth", ["me", "getToken"]);
    auth.getToken.and.callFake(() => token); auth.me.and.returnValue(of({ id: "owner", username: "qa", email: "qa@example.test", roles: ["CAJERO"] }));
    await TestBed.configureTestingModule({ imports: [SaleOperationRecoveryComponent], providers: [provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: SaleOperationsService, useValue: operations }, { provide: AuthService, useValue: auth }] }).compileComponents();
    fixture = TestBed.createComponent(SaleOperationRecoveryComponent); panel = fixture.componentInstance; http = TestBed.inject(HttpTestingController); await settle();
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  it("opens with a paginated list without selecting or resuming any pending operation", async () => {
    const rows = [row(), row("00000000-0000-4000-8000-000000000002")];
    operations.list.and.returnValue(of({ items: rows, page: 0, size: 10, totalItems: 22, totalPages: 3 }));
    const resume = spyOn(panel.resume, "emit"), recover = spyOn(panel.recover, "emit");
    expect(operations.list).not.toHaveBeenCalled(); panel.toggle(); await settle();
    expect(panel.rows.length).toBe(2); expect(panel.selected).toBeNull(); expect(operations.get).not.toHaveBeenCalled();
    expect(operations.prepare).not.toHaveBeenCalled(); expect(resume).not.toHaveBeenCalled(); expect(recover).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Página 1 de 3");
    panel.load(1); await settle(); expect(operations.list.calls.mostRecent().args[0]).toBe(1);
  });
  it("loads one selected identity and emits resume only after the explicit button", async () => {
    operations.get.and.returnValue(of(row())); const resume = spyOn(panel.resume, "emit");
    panel.toggle(); panel.select(row().operationId); await settle(); expect(resume).not.toHaveBeenCalled();
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>("button")).find(b => b.textContent?.includes("Revisar y reanudar"))!;
    button.click(); expect(resume).toHaveBeenCalledOnceWith(row()); expect(operations.prepare).not.toHaveBeenCalled();
  });
  it("requires a separate cancellation confirmation and never cancels a completed result", async () => {
    operations.get.and.returnValue(of(row())); operations.cancel.and.returnValue(of({ ...row(), state: "CANCELLED", command: null }));
    panel.toggle(); panel.select(row().operationId); await settle(); panel.cancelSelected(); expect(operations.cancel).not.toHaveBeenCalled();
    panel.confirmCancel = true; panel.cancelSelected(); await settle(); expect(operations.cancel).toHaveBeenCalledTimes(1);
    panel.selected = { ...row(), state: "COMPLETED", saleId: 77 }; panel.confirmCancel = true; panel.cancelSelected();
    expect(operations.cancel).toHaveBeenCalledTimes(1);
  });
  it("filters prepared rows without enforcing a single pending operation", async () => {
    panel.open = true; panel.changeFilter("PREPARED"); await settle();
    expect(operations.list.calls.mostRecent().args[2]).toBe("PREPARED");
    expect(panel.error).toBe(""); expect((fixture.nativeElement as HTMLElement).textContent).toContain("No hay operaciones");
  });
  it("drops late responses after the credential changes and permits a verified reload", async () => {
    const response = new Subject<SaleOperationPage>(); operations.list.and.returnValue(response); panel.toggle();
    token = "other-credential"; response.next({ items: [row()], page: 0, size: 10, totalItems: 1, totalPages: 1 }); response.complete(); await settle();
    expect(panel.rows).toEqual([]); expect(panel.selected).toBeNull(); expect(panel.error).not.toBe("");
    operations.list.and.returnValue(of({ items: [], page: 0, size: 10, totalItems: 0, totalPages: 0 })); panel.load(0); await settle(); expect(panel.error).toBe("");
  });
  it("clears selected owner information when authorization or connectivity fails", async () => {
    panel.rows = [row()]; panel.selected = row(); operations.list.and.returnValue(throwError(() => new Error("Synthetic denied")));
    panel.load(0); await settle(); expect(panel.rows).toEqual([]); expect(panel.selected).toBeNull(); expect(panel.loading).toBeFalse(); expect(panel.error).not.toBe("");
  });
  it("invalidates already rendered rows immediately on logout or actor credential change", async () => {
    operations.list.and.returnValue(of({ items: [row()], page: 0, size: 10, totalItems: 1, totalPages: 1 }));
    operations.get.and.returnValue(of(row())); panel.toggle(); panel.select(row().operationId); await settle();
    expect(panel.rows.length).toBe(1); expect(panel.selected).not.toBeNull();
    token = "different-actor-token"; await settle();
    expect(panel.rows).toEqual([]); expect(panel.selected).toBeNull(); expect(panel.error).toContain("sesión cambió");
    panel.load(0); await settle(); expect(panel.rows.length).toBe(1);
    panel.onStorage({ key: "erp_pos_token" } as StorageEvent); await settle();
    expect(panel.rows).toEqual([]); expect(panel.selected).toBeNull();
  });
  it("routes a quote operation back to its original conversion rather than emitting a POS resume", async () => {
    panel.open = true; panel.selected = { ...row(), origin: "QUOTE", quoteId: 9 }; await settle();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('a[href="/cotizaciones/9/convertir"]')).not.toBeNull();
    expect(Array.from(host.querySelectorAll("button")).some(button => button.textContent?.includes("Revisar y reanudar"))).toBeFalse();
  });
  it("shows only a verified attention total and clears it on failed reads or changed session",async()=>{
    operations.list.and.returnValue(of({items:[row()],page:0,size:10,totalItems:12,totalPages:2}));
    panel.contextual=true;panel.open=true;panel.changeFilter("attention");await settle();
    expect(operations.list.calls.mostRecent().args[3]).toBeTrue();expect(panel.attentionCount).toBe(12);
    panel.toggle();await settle();expect(panel.attentionCount).toBe(12);
    token="changed-token";await settle();expect(panel.attentionCount).toBeNull();
    operations.list.and.returnValue(throwError(()=>new Error("Synthetic offline")));panel.load(0);await settle();
    expect(panel.attentionCount).toBeNull();expect(panel.error).not.toBe("");
  });

  it("prioritizes the real attention filter in contextual POS and treats a verified empty page explicitly",async()=>{
    panel.contextual=true;panel.toggle();await settle();
    expect(operations.list).not.toHaveBeenCalled();expect(panel.attentionCount).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Aún no hemos comprobado tus pendientes');
    expect(fixture.nativeElement.textContent).not.toContain('No se encontraron operaciones por atender');
    panel.load(0);await settle();
    expect(operations.list.calls.mostRecent().args).toEqual([0,jasmine.anything(),undefined,true]);
    expect(panel.attentionCount).toBe(0);expect(fixture.nativeElement.textContent).toContain('No se encontraron operaciones por atender');
    expect(fixture.nativeElement.textContent).toContain('no es monitoreo en tiempo real');
  });

  it("retains the verified attention count through secondary filters without representing their totals as pending",async()=>{
    panel.contextual=true;panel.toggle();
    operations.list.and.returnValue(of({items:[row()],page:0,size:10,totalItems:12,totalPages:2}));panel.load(0);await settle();
    operations.list.and.returnValue(of({items:[],page:0,size:10,totalItems:0,totalPages:0}));
    for(const filter of ['PREPARED','','COMPLETED','CANCELLED']){
      panel.changeFilter(filter);await settle();expect(operations.list.calls.mostRecent().args.slice(2)).toEqual([filter||undefined,false]);
      expect(panel.attentionCount).toBe(12);expect(panel.pendingLabel).toContain('12 en la última consulta');
    }
    panel.toggle();await settle();expect(panel.attentionCount).toBe(12);expect(fixture.nativeElement.querySelector('.pending-count').textContent).toContain('12');
  });
  it("keeps owner isolation even if a refreshed actor response changes without a token event",async()=>{
    panel.contextual=true;panel.toggle();operations.list.and.returnValue(of({items:[row()],page:0,size:10,totalItems:3,totalPages:1}));panel.load(0);await settle();
    expect(panel.attentionCount).toBe(3);
    auth.me.and.returnValue(of({id:'different-owner',username:'other',email:'other@example.test',roles:['CAJERO']}));
    operations.list.and.returnValue(of({items:[],page:0,size:10,totalItems:0,totalPages:0}));panel.changeFilter('COMPLETED');await settle();
    expect(panel.rows).toEqual([]);expect(panel.attentionCount).toBeNull();expect(panel.selected).toBeNull();
  });
  it("paginates the same attention query without replacing its total with page length",async()=>{
    panel.contextual=true;panel.toggle();operations.list.and.returnValue(of({items:[row()],page:1,size:10,totalItems:21,totalPages:3}));panel.load(1);await settle();
    expect(operations.list.calls.mostRecent().args).toEqual([1,jasmine.anything(),undefined,true]);expect(panel.page).toBe(1);expect(panel.totalPages).toBe(3);expect(panel.attentionCount).toBe(21);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 3');expect(operations.prepare).not.toHaveBeenCalled();
  });
  it("does not expose server details or claim zero on an error and retries the same owner-scoped query",async()=>{
    panel.contextual=true;panel.toggle();operations.list.and.returnValue(throwError(()=>new Error('SQL synthetic internal detail')));panel.load(0);await settle();
    expect(panel.attentionCount).toBeNull();expect(panel.hasListResult).toBeFalse();
    const host:HTMLElement=fixture.nativeElement;expect(host.textContent).toContain('No pudimos consultar las operaciones');
    expect(host.textContent).not.toContain('SQL');expect(host.textContent).not.toContain('No se encontraron operaciones por atender');
    expect(host.querySelector('.pending-count')).toBeNull();expect(panel.pendingLabel).toContain('no se pudo comprobar');
    operations.list.and.returnValue(of({items:[],page:0,size:10,totalItems:0,totalPages:0}));
    Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Reintentar')!.click();await settle();
    expect(panel.error).toBe('');expect(panel.attentionCount).toBe(0);expect(operations.list.calls.mostRecent().args[3]).toBeTrue();
  });
  it("keeps PREPARED inspection passive, cancels only on confirmation and omits nonexistent document references",async()=>{
    panel.contextual=true;panel.toggle();operations.get.and.returnValue(of(row()));
    const resume=spyOn(panel.resume,'emit'),recover=spyOn(panel.recover,'emit');panel.select(row().operationId);await settle();
    expect(resume).not.toHaveBeenCalled();expect(recover).not.toHaveBeenCalled();expect(operations.prepare).not.toHaveBeenCalled();expect(operations.cancel).not.toHaveBeenCalled();
    const host:HTMLElement=fixture.nativeElement;expect(host.textContent).toContain('Detalles técnicos');expect(host.textContent).not.toContain('Documento #');
    panel.closeSelection();await settle();expect(panel.selected).toBeNull();expect(operations.cancel).not.toHaveBeenCalled();
  });
  it("drops in-flight detail and list responses after closing, and invalidates counts on owner changes",async()=>{
    panel.contextual=true;panel.toggle();const pending=new Subject<SaleOperation>();operations.get.and.returnValue(pending);panel.select(row().operationId);panel.toggle();
    pending.next(row());await settle();expect(panel.selected).toBeNull();expect(panel.rows).toEqual([]);
    panel.toggle();const list=new Subject<SaleOperationPage>();operations.list.and.returnValue(list);panel.load(0);token='changed';await settle();
    list.next({items:[row()],page:0,size:10,totalItems:1,totalPages:1});await settle();expect(panel.rows).toEqual([]);expect(panel.attentionCount).toBeNull();
  });
  it("offers a resolved COMPLETED only as historical navigation without a recovery event",async()=>{
    panel.contextual=true;panel.open=true;const resolved={...row(),state:'COMPLETED' as const,saleId:77,command:null};
    operations.get.and.returnValue(of(resolved));const recover=spyOn(panel.recover,'emit'),resume=spyOn(panel.resume,'emit');
    panel.select(resolved.operationId);await settle();expect(panel.selected?.operationId).toBe(resolved.operationId);
    const host:HTMLElement=fixture.nativeElement;expect(host.querySelector('a[href="/ventas/77"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Continuar documento');expect(host.textContent).not.toContain('Consultar esta venta');
    expect(recover).not.toHaveBeenCalled();expect(resume).not.toHaveBeenCalled();expect(operations.prepare).not.toHaveBeenCalled();
  });
  it("keeps COMPLETED pending documents actionable without treating a linked rejection as a missing document",async()=>{
    panel.contextual=true;panel.open=true;panel.selected={...row(),state:'COMPLETED',saleId:77,command:null,
      receiptIntent:{receiptType:'INVOICE',payload:null},receiptState:'PENDING'};await settle();
    expect(fixture.nativeElement.textContent).toContain('Continuar documento');
    panel.selected={...panel.selected!,documentId:901,documentStatus:'REJECTED',receiptState:'LOCATED'};await settle();
    expect(fixture.nativeElement.textContent).not.toContain('Continuar documento');expect(fixture.nativeElement.querySelector('a[href="/ventas/77"]')).not.toBeNull();
  });

  it("uses one direct selector, contextual empty states and always reopens Pendientes on attention",async()=>{
    panel.contextual=true;panel.toggle();await settle();const host:HTMLElement=fixture.nativeElement;
    expect(host.querySelector('#operations-title')?.textContent).toBe('Operaciones');
    expect(host.querySelectorAll('select').length).toBe(1);expect(host.textContent).not.toContain('Consultar otras operaciones');expect(host.textContent).not.toContain('Filtro:');
    const cases=[['attention','No se encontraron operaciones por atender'],['','No se encontraron operaciones recientes'],['PREPARED','No se encontraron compras preparadas'],['COMPLETED','No se encontraron operaciones registradas'],['CANCELLED','No se encontraron operaciones canceladas']];
    for(const [filter,message] of cases){panel.changeFilter(filter);await settle();expect(host.textContent).toContain(message);
      expect(operations.list.calls.mostRecent().args.slice(2)).toEqual([filter==='attention'?undefined:filter||undefined,filter==='attention']);
      if(filter!=='attention')expect(host.querySelector('.query-caption')).toBeNull();
    }
    panel.toggle();panel.toggle();await settle();expect(panel.filter).toBe('attention');expect(panel.hasListResult).toBeFalse();
  });
  it("classifies completed TICKET only with unambiguous evidence and never asserts PDF generation",async()=>{
    const ticket={...row(),state:'COMPLETED' as const,saleId:77,command:null};
    expect(panel.documentLabel(ticket)).toBe('Nota de venta · No fiscal');
    for(const invalid of [{...ticket,receiptIntent:null},{...ticket,protocolVersion:0},{...ticket,documentId:9},{...ticket,receiptState:'REVIEW_REQUIRED' as const},
      {...ticket,receiptIntent:{receiptType:'TICKET' as const,payload:{documentType:'INVOICE' as const,billingSeriesId:1}}}])expect(panel.documentLabel(invalid)).toBe('Documento no verificado');
    panel.contextual=true;panel.open=true;panel.rows=[ticket];await settle();
    const host:HTMLElement=fixture.nativeElement;expect(host.textContent).toContain('Nota de venta');expect(host.textContent).not.toMatch(/PDF disponible|Nota de venta emitida|Sin solicitud|Sin comprobante/);
    expect(host.querySelector('.recovery-list button')).toBeNull();expect(host.querySelector('.recovery-list a')?.getAttribute('href')).toBe('/ventas/77');
    expect(operations.get).not.toHaveBeenCalled();expect(operations.prepare).not.toHaveBeenCalled();
  });
  for(const type of ['RECEIPT','INVOICE'] as const)it("distinguishes requested "+type+" from verified commercial completion",()=>{
    const electronic={...row(),state:'COMPLETED' as const,saleId:77,command:null,receiptIntent:{receiptType:type,payload:null},receiptState:'PENDING' as const};
    expect(panel.documentLabel(electronic)).toBe((type==='RECEIPT'?'Boleta electrónica':'Factura electrónica')+' · Solicitada');
    expect(panel.needsDocumentRecovery(electronic)).toBeTrue();
    expect(panel.documentLabel({...electronic,receiptState:'REVIEW_REQUIRED'})).toContain('En revisión');
    expect(panel.documentLabel({...electronic,receiptState:'LOCATED',documentId:9,documentStatus:null})).toContain('Estado no verificado');
  });
  for(const [status,label] of [['DRAFT','Borrador'],['GENERATED','Generada'],['SIGNED','Firmada'],['SENT','Enviada'],['ACCEPTED','Aceptación registrada; validez fiscal no verificada'],['REJECTED','Rechazada'],['ERROR','En revisión'],['CANCELLED','Cancelada']])it("uses the recorded document status "+status+" without inventing its environment",()=>{
    const document={...row(),state:'COMPLETED' as const,saleId:77,command:null,receiptIntent:{receiptType:'INVOICE' as const,payload:null},receiptState:'LOCATED' as const,documentId:9,documentStatus:status};
    expect(panel.documentLabel(document)).toBe('Factura electrónica · '+label+' · Ambiente no verificado');
    expect(panel.needsDocumentRecovery(document)).toBeFalse();expect(panel.documentLabel(document)).not.toContain('SUNAT');
  });
  it("does not infer a document type or acceptance from an unrecognized status",()=>{
    const completed={...row(),state:'COMPLETED' as const,saleId:77,command:null};
    expect(panel.documentLabel({...completed,receiptIntent:null,documentId:9,documentStatus:'ACCEPTED'})).toBe('Documento no verificado');
    expect(panel.documentLabel({...completed,receiptIntent:{receiptType:'INVOICE',payload:null},receiptState:'LOCATED',documentId:9,documentStatus:'UNKNOWN'})).toBe('Factura electrónica · Estado no verificado');
  });
  it("keeps resolved histories direct and confines original-cash instructions to recoverable contexts",async()=>{
    panel.contextual=true;panel.open=true;const completed={...row(),state:'COMPLETED' as const,saleId:77,command:null};panel.rows=[completed];await settle();
    const host:HTMLElement=fixture.nativeElement;expect(host.querySelector('.recovery-list a')?.textContent).toBe('Ver venta');expect(host.querySelector('.recovery-list button')).toBeNull();
    panel.selected=completed;await settle();expect(host.textContent).not.toContain('Conserva esta compra en su caja y almacén originales');
    panel.selected=row();await settle();expect(host.textContent).toContain('Conserva esta compra en su caja y almacén originales');
    expect(operations.get).not.toHaveBeenCalled();expect(operations.cancel).not.toHaveBeenCalled();
  });

});
