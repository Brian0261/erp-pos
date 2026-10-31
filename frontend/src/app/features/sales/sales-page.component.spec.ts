import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS } from "../../core/auth/bound-auth-context";
import { SalesService } from "./data/sales.service";
import { SalesListItem } from "./data/sales.models";
import { SalesPageComponent } from "./sales-page.component";
describe("Sales list query and trusted document presentation", () => {
  let sales: jasmine.SpyObj<SalesService>, token: string, harness: RouterTestingHarness, page: SalesPageComponent;
  const actor = { id: "qa", username: "synthetic", email: "qa@example.invalid", roles: ["ADMIN"] };
  const row: SalesListItem = { id: 81, saleNumber: "S-SYN-00000000-0000-4000-8000-000000000081", soldAt: "2026-10-28T12:00:00Z",
    status: "COMPLETED", totalAmount: 150, createdBy: "synthetic", cashRegisterSessionId: 7,
    billingSummary: { hasElectronicDocument: false, documentId: null, documentType: null, fullNumber: null, status: null, environment: null } };
  const text = () => harness.routeNativeElement!.textContent!;
  beforeEach(async () => {
    token = "synthetic-list-token"; sales = jasmine.createSpyObj("Sales", ["listItems", "create", "voidSale"]);
    sales.listItems.and.returnValue(of([structuredClone(row)]));
    await TestBed.configureTestingModule({ providers: [provideZoneChangeDetection(), provideRouter([{ path: "ventas", component: SalesPageComponent }]),
      { provide: SalesService, useValue: sales }, { provide: AuthService, useValue: { getToken: () => token, me: () => of(actor) } }] }).compileComponents();
    harness = await RouterTestingHarness.create(); page = await harness.navigateByUrl("/ventas", SalesPageComponent); harness.detectChanges();
  });
  it("shows short identity, full reference access and honest document absence", () => {
    expect(text()).toContain("Venta #81"); expect(text()).toContain(row.saleNumber); expect(text()).toContain("Registrada");
    expect(text()).toContain("Sin documento electrónico registrado"); expect(text()).not.toContain("Pendiente");
    expect(sales.listItems.calls.mostRecent().args[1]!.get(BOUND_AUTH_CREDENTIALS)?.token).toBe(token);
    expect(sales.create).not.toHaveBeenCalled(); expect(sales.voidSale).not.toHaveBeenCalled();
  });
  it("renders document types, fiscal states and environments independently from commercial annulment", () => {
    const states = ["DRAFT","GENERATED","SIGNED","SENT","ACCEPTED","REJECTED","ERROR","CANCELLED"] as const;
    const environments = ["LOCAL","BETA","PROD"] as const;
    const rows: SalesListItem[] = states.flatMap((status,index) => environments.map((environment,offset) => ({...row,id:100+index*3+offset,
      billingSummary:{hasElectronicDocument:true,documentId:900+index*3+offset,documentType:"INVOICE" as const,fullNumber:"F-SYN-"+index+offset,status,environment}})));
    rows.push({...row,status:"VOIDED"}); sales.listItems.and.returnValue(of(rows)); page.applyFilters(); harness.detectChanges();
    const rendered = Array.from(harness.routeNativeElement!.querySelectorAll('tbody tr'));
    expect(rendered.length).toBe(25); expect(rendered[0].textContent).toContain('Factura electrónica'); expect(rendered[0].textContent).toContain('F-SYN-00');
    expect(rendered[0].textContent).toContain('Borrador · no emitido'); expect(rendered[9].textContent).toContain('Envío registrado · consultar resultado');
    expect(rendered[12].textContent).toContain('Aceptado · Local · pruebas'); expect(rendered[13].textContent).toContain('Aceptado · Beta · pruebas');
    expect(rendered[14].textContent).toContain('Aceptado · Producción'); expect(rendered[15].textContent).toContain('Rechazado');
    expect(rendered[18].textContent).toContain('Error de procesamiento · revisar'); expect(rendered[21].textContent).toContain('Documento anulado');
    expect(rendered[24].textContent).toContain('Anulada'); expect(rendered[24].textContent).toContain('Sin documento electrónico registrado');
  });
  it("applies all filters only on Filtrar, and clears filters and URL together", async () => {
    sales.listItems.calls.reset();
    page.filterForm.patchValue({ status: "VOIDED", createdBy: " supervisor ", cashRegisterSessionId: 7, from: "2026-10-01", to: "2026-10-31" });
    expect(sales.listItems).not.toHaveBeenCalled();
    page.applyFilters(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(sales.listItems.calls.mostRecent().args[0]).toEqual({ status: "VOIDED", createdBy: "supervisor", cashRegisterSessionId: 7, from: "2026-10-01", to: "2026-10-31" });
    expect(TestBed.inject(Router).url).toContain("salesStatus=VOIDED");
    page.resetFilters(); await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe("/ventas"); expect(page.listContext).toEqual({});
  });
  it("restores query context and places it on the detail link", async () => {
    // Recreate the route so restoration is tested rather than retaining the same component.
    await harness.navigateByUrl("/");
    page = await harness.navigateByUrl("/ventas?salesStatus=VOIDED&salesCash=7", SalesPageComponent); harness.detectChanges();
    expect(page.filterForm.value.status).toBe("VOIDED"); expect(page.filterForm.value.cashRegisterSessionId).toBe(7);
    expect(harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[aria-label="Ver detalle de venta #81"]')!.href).toContain("salesStatus=VOIDED");
  });
  it("discards old results and separates loading, empty and error", () => {
    const first = new Subject<SalesListItem[]>(), second = new Subject<SalesListItem[]>();
    sales.listItems.and.returnValues(first, second); page.applyFilters(); harness.detectChanges();
    expect(text()).toContain("Consultando ventas");
    page.applyFilters(); second.next([]); first.next([row]); harness.detectChanges();
    expect(page.sales).toEqual([]); expect(text()).toContain("No hay ventas para los filtros");
    sales.listItems.and.returnValue(throwError(() => ({ status: 500 }))); page.applyFilters(); harness.detectChanges();
    expect(text()).toContain("No se pudo cargar"); expect(text()).not.toContain("No hay ventas para los filtros");
  });
  it("rejects invalid filter ranges without sending requests", () => {
    sales.listItems.calls.reset(); page.filterForm.patchValue({ from: "2026-10-31", to: "2026-10-01" }); page.applyFilters();
    expect(sales.listItems).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("Desde");
  });
  it("does not render a malformed successful response as an empty result", () => {
    sales.listItems.and.returnValue(of([null] as unknown as SalesListItem[])); page.applyFilters(); harness.detectChanges();
    expect(text()).toContain("No se pudo verificar el listado recibido"); expect(text()).not.toContain("No hay ventas para los filtros");
  });
  for (const status of [401,403]) it("clears protected rows after HTTP " + status, () => {
    sales.listItems.and.returnValue(throwError(() => ({status}))); page.applyFilters(); harness.detectChanges();
    expect(page.sales).toEqual([]); expect(harness.routeNativeElement!.querySelector("tbody")).toBeNull();
    expect(text()).toContain(status === 401 ? "Sesión vencida" : "No tienes permiso");
  });
  it("withdraws rows and ignores late results after credentials change", () => {
    const pending = new Subject<SalesListItem[]>(); sales.listItems.and.returnValue(pending); page.applyFilters();
    token = "different-synthetic-token"; harness.detectChanges(); pending.next([row]); harness.detectChanges();
    expect(page.sales).toEqual([]); expect(text()).toContain("La sesión cambió");
  });
});
