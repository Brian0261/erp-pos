import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
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
import { SaleVoidAttempts, saleVoidAttemptKey } from "./sale-void-attempts";
describe("Sale detail consultation and conservative actions", () => {
  let sales: Mocked<Pick<SalesService, "getById" | "create" | "voidSale">>;
  let documents: Mocked<Pick<ElectronicDocumentService, "listBySaleId" | "createFromSale" | "sign" | "send">>;
  let harness: RouterTestingHarness, page: SaleDetailPageComponent, token: string, roles: string[], pending: Subject<ElectronicDocumentResponse[]>;
  const doc = (status = "DRAFT") => ({ id: 901, saleId: 81, documentType: "RECEIPT", fullNumber: "B-SYN-9", status, environment: "BETA",
    createdAt: "2026-10-28T02:20:00.000001Z" }) as ElectronicDocumentResponse;
  const text = () => harness.routeNativeElement!.textContent!;
  const hasLink = (name: string) => Array.from(harness.routeNativeElement!.querySelectorAll("a")).some(a => a.textContent?.trim() === name);
  beforeEach(async () => {
    token = "synthetic-detail-token"; roles = ["ADMIN"]; pending = new Subject();
    sales = {
      getById: vi.fn<SalesService["getById"]>(),
      create: vi.fn<SalesService["create"]>(),
      voidSale: vi.fn<SalesService["voidSale"]>(),
    };
    sales.getById.mockReturnValue(of(noteSale()));
    documents = {
      listBySaleId: vi.fn<ElectronicDocumentService["listBySaleId"]>(),
      createFromSale: vi.fn<ElectronicDocumentService["createFromSale"]>(),
      sign: vi.fn<ElectronicDocumentService["sign"]>(),
      send: vi.fn<ElectronicDocumentService["send"]>(),
    };
    documents.listBySaleId.mockReturnValue(pending);
    await TestBed.configureTestingModule({ providers: [provideZoneChangeDetection(), provideRouter([{path:"ventas/:id",component:SaleDetailPageComponent}]),
      {provide:SalesService,useValue:sales},{provide:ElectronicDocumentService,useValue:documents},
      {provide:AuthService,useValue:{getToken:()=>token,me:()=>of({id:"qa",username:"synthetic",email:"qa@example.invalid",roles})}}] }).compileComponents();
    harness=await RouterTestingHarness.create(); page=await harness.navigateByUrl("/ventas/81?salesStatus=COMPLETED",SaleDetailPageComponent); harness.detectChanges();
  });
  afterEach(() => {
    try {
      expect.soft(sales.create, "sales.create").not.toHaveBeenCalled();
      expect.soft(sales.voidSale, "sales.voidSale").not.toHaveBeenCalled();
      expect.soft(documents.createFromSale, "documents.createFromSale").not.toHaveBeenCalled();
      expect.soft(documents.sign, "documents.sign").not.toHaveBeenCalled();
      expect.soft(documents.send, "documents.send").not.toHaveBeenCalled();
    } finally {
      try {
        TestBed.resetTestingModule();
      } finally {
        vi.restoreAllMocks();
      }
    }
  });
  it("never offers emission or annulment while the fiscal read is pending", () => {
    expect(text()).toContain("Consultando documento electrónico"); expect(hasLink("Crear documento electrónico")).toBe(false);
    expect(page.canVoidSale()).toBe(false); expect(hasLink("Anular venta")).toBe(false);
  });
  it("allows existing actions only after successful empty verification and preserves context", () => {
    pending.next([]); harness.detectChanges(); expect(page.canIssue()).toBe(true); expect(page.canVoidSale()).toBe(true);
    expect(text()).toContain("Sin comprobante electrónico registrado"); expect(hasLink("Crear documento electrónico")).toBe(true);
    expect(text()).toContain("documento interno no fiscal"); expect(hasLink("Ver nota de venta")).toBe(true);
    expect(harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href^="/ventas?"]')!.href).toContain("salesStatus=COMPLETED");
    expect(harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href^="/ventas/81/nota"]')!.href).toContain("salesStatus=COMPLETED");
  });
  it("offers verification instead of another annulment while a local attempt is uncertain", () => {
    pending.next([]);
    TestBed.inject(SaleVoidAttempts).uncertain(saleVoidAttemptKey("qa", 81));
    harness.detectChanges();
    expect(page.canVoidSale()).toBe(false);
    expect(hasLink("Anular venta")).toBe(false);
    expect(hasLink("Consultar anulación")).toBe(true);
  });
  for(const status of ["DRAFT","GENERATED","SIGNED","SENT","ACCEPTED"]) it("keeps internal annulment blocked by " + status,()=>{
    pending.next([doc(status)]);harness.detectChanges();expect(page.canVoidSale()).toBe(false);expect(page.canIssue()).toBe(false);
    expect(hasLink("Ver documento electrónico")).toBe(true);expect(hasLink("Anular venta")).toBe(false);
    if(status==="DRAFT")expect(text()).toContain("Borrador · no emitido");
    if(status==="SENT")expect(text()).not.toContain("Aceptado");
  });
  for(const status of ["REJECTED","ERROR","CANCELLED"]) it("preserves existing nonblocking rule for " + status,()=>{
    pending.next([doc(status)]);harness.detectChanges();expect(page.canVoidSale()).toBe(true);expect(page.canIssue()).toBe(false);
    expect(page.sale!.status).toBe("COMPLETED");
  });
  for(const status of [0,500,403]) it("does not turn HTTP " + status + " into absence and supports retry",()=>{
    pending.error({status});harness.detectChanges();expect(page.documentPhase).toBe("error");
    expect(text()).not.toContain("Sin comprobante electrónico registrado");expect(page.canIssue()).toBe(false);expect(page.canVoidSale()).toBe(false);
    expect(hasLink("Crear documento electrónico")).toBe(false);expect(hasLink("Anular venta")).toBe(false);
    documents.listBySaleId.mockReturnValue(of([]));page.retryDocument();harness.detectChanges();expect(page.documentPhase).toBe("absent");expect(page.canIssue()).toBe(true);
  });
  it("clears commercial data too if a protected document read reports session expiry", () => {
    pending.error({ status: 401 }); harness.detectChanges();
    expect(page.sale).toBeNull(); expect(page.canIssue()).toBe(false);
    expect(text()).toContain("Sesión vencida"); expect(hasLink("Ver nota de venta")).toBe(false);
  });
  it("selects the latest document with full instant precision and ID tie break", () => {
    pending.next([doc("ERROR"), { ...doc("DRAFT"), id: 902 }, {
      ...doc("ERROR"), id: 903, createdAt: "2026-10-28T02:20:00Z",
    }]); harness.detectChanges();
    expect(page.billingDocument?.id).toBe(902); expect(page.canVoidSale()).toBe(false);
  });
  it("rejects inconsistent document identity or unknown status instead of authorizing absence",()=>{
    pending.next([{...doc(),saleId:82}]);harness.detectChanges();expect(page.documentPhase).toBe("error");expect(page.canVoidSale()).toBe(false);
    documents.listBySaleId.mockReturnValue(of([doc("UNKNOWN")]));page.retryDocument();expect(page.documentPhase).toBe("error");
  });
  it("ignores a late old document when the route changes",async()=>{
    const old=pending;documents.listBySaleId.mockReturnValue(of([]));sales.getById.mockReturnValue(of({...noteSale(),id:82}));
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);old.next([doc()]);harness.detectChanges();
    expect(page.sale!.id).toBe(82);expect(page.documentPhase).toBe("absent");expect(page.billingDocument).toBeNull();
  });
  it("does not retain protected sale/document data after credentials change",()=>{
    pending.next([doc()]);token="different-token";harness.detectChanges();expect(page.sale).toBeNull();expect(page.billingDocument).toBeNull();
    expect(text()).toContain("La sesión cambió");expect(hasLink("Ver nota de venta")).toBe(false);
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
    roles=["CAJERO"];sales.getById.mockReturnValue(of({...noteSale(),id:82}));documents.listBySaleId.mockReturnValue(of([]));
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);harness.detectChanges();expect(page.canVoidSale()).toBe(false);expect(page.canIssue()).toBe(true);
  });
  it("keeps voided sales consultable without creation or annulment actions",async()=>{
    sales.getById.mockReturnValue(of({...noteSale(1,true),id:82}));documents.listBySaleId.mockReturnValue(of([]));
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);harness.detectChanges();
    expect(text()).toContain("Anulada");expect(page.canIssue()).toBe(false);expect(page.canVoidSale()).toBe(false);expect(hasLink("Ver nota de venta")).toBe(true);
  });
  it("ignores late sale reads and refuses an invalid route",async()=>{
    const old=new Subject<SaleResponse>();sales.getById.mockReturnValue(old);
    page=await harness.navigateByUrl("/ventas/82",SaleDetailPageComponent);
    page=await harness.navigateByUrl("/ventas/invalid",SaleDetailPageComponent);old.next({...noteSale(),id:82});harness.detectChanges();
    expect(page.sale).toBeNull();expect(text()).toContain("Identificador de venta no válido");
  });
});
