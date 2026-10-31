import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { ElectronicDocumentResponse } from "../billing/data/billing.models";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";
import { noteSale } from "./internal-note/note-test-data";
import { SaleDetailPageComponent } from "./sale-detail-page.component";
describe("Sale detail consultation and conservative actions", () => {
  let sales: jasmine.SpyObj<SalesService>, documents: jasmine.SpyObj<ElectronicDocumentService>;
  let harness: RouterTestingHarness, page: SaleDetailPageComponent, token: string, roles: string[], pending: Subject<ElectronicDocumentResponse[]>;
  const doc = (status = "DRAFT") => ({ id: 901, saleId: 81, documentType: "RECEIPT", fullNumber: "B-SYN-9", status, environment: "BETA" }) as ElectronicDocumentResponse;
  const text = () => harness.routeNativeElement!.textContent!;
  const hasLink = (name: string) => Array.from(harness.routeNativeElement!.querySelectorAll("a")).some(a => a.textContent?.trim() === name);
  beforeEach(async () => {
    token = "synthetic-detail-token"; roles = ["ADMIN"]; pending = new Subject();
    sales = jasmine.createSpyObj("Sales", ["getById","create","voidSale"]); sales.getById.and.returnValue(of(noteSale()));
    documents = jasmine.createSpyObj("Documents", ["listBySaleId","createFromSale","sign","send"]); documents.listBySaleId.and.returnValue(pending);
    await TestBed.configureTestingModule({ providers: [provideZoneChangeDetection(), provideRouter([{path:"ventas/:id",component:SaleDetailPageComponent}]),
      {provide:SalesService,useValue:sales},{provide:ElectronicDocumentService,useValue:documents},
      {provide:AuthService,useValue:{getToken:()=>token,me:()=>of({id:"qa",username:"synthetic",email:"qa@example.invalid",roles})}}] }).compileComponents();
    harness=await RouterTestingHarness.create(); page=await harness.navigateByUrl("/ventas/81?salesStatus=COMPLETED",SaleDetailPageComponent); harness.detectChanges();
  });
  afterEach(() => { expect(sales.create).not.toHaveBeenCalled(); expect(sales.voidSale).not.toHaveBeenCalled();
    expect(documents.createFromSale).not.toHaveBeenCalled(); expect(documents.sign).not.toHaveBeenCalled(); expect(documents.send).not.toHaveBeenCalled(); });
  it("never offers emission or annulment while the fiscal read is pending", () => {
    expect(text()).toContain("Consultando documento electrónico"); expect(hasLink("Crear documento electrónico")).toBeFalse();
    expect(page.canVoidSale()).toBeFalse(); expect(hasLink("Anular venta")).toBeFalse();
  });
  it("allows existing actions only after successful empty verification and preserves context", () => {
    pending.next([]); harness.detectChanges(); expect(page.canIssue()).toBeTrue(); expect(page.canVoidSale()).toBeTrue();
    expect(text()).toContain("Sin documento electrónico registrado"); expect(hasLink("Crear documento electrónico")).toBeTrue();
    expect(harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href^="/ventas?"]')!.href).toContain("salesStatus=COMPLETED");
    expect(harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href^="/ventas/81/nota"]')!.href).toContain("salesStatus=COMPLETED");
  });
  for(const status of ["DRAFT","GENERATED","SIGNED","SENT","ACCEPTED"]) it("keeps internal annulment blocked by " + status,()=>{
    pending.next([doc(status)]);harness.detectChanges();expect(page.canVoidSale()).toBeFalse();expect(page.canIssue()).toBeFalse();
    expect(hasLink("Ver documento electrónico")).toBeTrue();expect(hasLink("Anular venta")).toBeFalse();
    if(status==="DRAFT")expect(text()).toContain("Borrador · no emitido");
    if(status==="SENT")expect(text()).not.toContain("Aceptado");
  });
  for(const status of ["REJECTED","ERROR","CANCELLED"]) it("preserves existing nonblocking rule for " + status,()=>{
    pending.next([doc(status)]);harness.detectChanges();expect(page.canVoidSale()).toBeTrue();expect(page.canIssue()).toBeFalse();
    expect(page.sale!.status).toBe("COMPLETED");
  });
  for(const status of [0,500,401,403]) it("does not turn HTTP " + status + " into absence and supports retry",()=>{
    pending.error({status});harness.detectChanges();expect(page.documentPhase).toBe("error");
    expect(text()).not.toContain("Sin documento electrónico registrado");expect(page.canIssue()).toBeFalse();expect(page.canVoidSale()).toBeFalse();
    expect(hasLink("Crear documento electrónico")).toBeFalse();expect(hasLink("Anular venta")).toBeFalse();
    documents.listBySaleId.and.returnValue(of([]));page.retryDocument();harness.detectChanges();expect(page.documentPhase).toBe("absent");expect(page.canIssue()).toBeTrue();
  });
  it("rejects inconsistent document identity or unknown status instead of authorizing absence",()=>{
    pending.next([{...doc(),saleId:82}]);harness.detectChanges();expect(page.documentPhase).toBe("error");expect(page.canVoidSale()).toBeFalse();
    documents.listBySaleId.and.returnValue(of([doc("UNKNOWN")]));page.retryDocument();expect(page.documentPhase).toBe("error");
  });
  it("ignores a late old document when the route changes",async()=>{
    const old=pending;documents.listBySaleId.and.returnValue(of([]));sales.getById.and.returnValue(of({...noteSale(),id:82}));
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);old.next([doc()]);harness.detectChanges();
    expect(page.sale!.id).toBe(82);expect(page.documentPhase).toBe("absent");expect(page.billingDocument).toBeNull();
  });
  it("does not retain protected sale/document data after credentials change",()=>{
    pending.next([doc()]);token="different-token";harness.detectChanges();expect(page.sale).toBeNull();expect(page.billingDocument).toBeNull();
    expect(text()).toContain("La sesión cambió");expect(hasLink("Ver nota interna")).toBeFalse();
  });
  it("displays persisted money and historical exact quantities rather than recalculating",()=>{
    pending.next([]);harness.detectChanges();const sale=page.sale!;
    expect(text()).toContain(page.formatCurrency(sale.totalAmount));expect(text()).toContain(page.formatCurrency(sale.items[0].lineTotal));
    expect(text()).toContain("0.125");expect(text()).not.toContain("CATÁLOGO MODIFICADO");
    expect(text()).toContain("Descripción original de la venta");expect(page.settlementDisplayAmount(sale)).toBe(sale.changeAmount);
    const noncash={...sale,payments:sale.payments.filter(p=>p.paymentMethod!=="CASH"),paidAmount:sale.totalAmount};
    expect(page.settlementDisplayAmount(noncash)).toBeNull();
  });
  it("labels live catalog fallback as current, never original",()=>{
    const item={...page.sale!.items[0],productNameSnapshot:null,skuSnapshot:null};
    expect(page.productName(item)).toBe("CATÁLOGO MODIFICADO");expect(page.productSource(item)).toContain("Catálogo actual");
  });
  it("does not substitute a current SKU for a missing captured SKU",()=>{
    const item={...page.sale!.items[0],skuSnapshot:null};expect(page.productSource(item)).toContain("SKU original no disponible");expect(page.productSku(item)).toBeNull();
  });
  it("keeps CAJERO without annulment while retaining allowed document access",async()=>{
    roles=["CAJERO"];sales.getById.and.returnValue(of({...noteSale(),id:82}));documents.listBySaleId.and.returnValue(of([]));
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);harness.detectChanges();expect(page.canVoidSale()).toBeFalse();expect(page.canIssue()).toBeTrue();
  });
  it("keeps voided sales consultable without creation or annulment actions",async()=>{
    sales.getById.and.returnValue(of({...noteSale(1,true),id:82}));documents.listBySaleId.and.returnValue(of([]));
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);harness.detectChanges();
    expect(text()).toContain("Anulada");expect(page.canIssue()).toBeFalse();expect(page.canVoidSale()).toBeFalse();expect(hasLink("Ver nota interna")).toBeTrue();
  });
  it("ignores late sale reads and refuses an invalid route",async()=>{
    const old=new Subject<SaleResponse>();sales.getById.and.returnValue(old);
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);
    page=await harness.navigateByUrl("/ventas/invalid",SaleDetailPageComponent);old.next({...noteSale(),id:82});harness.detectChanges();
    expect(page.sale).toBeNull();expect(text()).toContain("Identificador de venta no válido");
  });
});
