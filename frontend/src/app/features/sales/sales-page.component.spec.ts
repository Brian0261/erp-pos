import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS } from "../../core/auth/bound-auth-context";
import { SalesService } from "./data/sales.service";
import { SalesListItem, SalesListPage, SalesListQuery } from "./data/sales.models";
import { SalesPageComponent } from "./sales-page.component";

describe("Sales list query and trusted document presentation", () => {
  let sales: jasmine.SpyObj<SalesService>;
  let token: string, roles: string[];
  let harness: RouterTestingHarness, page: SalesPageComponent;
  const row: SalesListItem = {
    id: 81, saleNumber: "V-SYN-0081", soldAt: "2033-01-01T04:59:59.999999Z", status: "COMPLETED",
    totalAmount: 150, createdBy: "synthetic", cashRegisterSessionId: 7,
    billingSummary: { hasElectronicDocument: false, documentId: null, documentType: null, fullNumber: null, status: null, environment: null },
  };
  const result = (query: SalesListQuery, items = [row], totalItems = items.length): SalesListPage => ({
    items, page: query.page, size: query.size, totalItems, totalPages: Math.ceil(totalItems / query.size),
  });
  const text = () => harness.routeNativeElement!.textContent!;
  const settle = async () => { await harness.fixture.whenStable(); harness.detectChanges(); };
  const request = () => sales.listPage.calls.mostRecent().args[0];

  beforeEach(async () => {
    roles = ["ADMIN"];
    token = "synthetic-list-token";
    sales = jasmine.createSpyObj("Sales", ["listPage", "listItems", "create", "voidSale"]);
    sales.listPage.and.callFake(query => of(result(query)));
    await TestBed.configureTestingModule({ providers: [
      provideZoneChangeDetection(), provideRouter([{ path: "ventas", component: SalesPageComponent }]),
      { provide: SalesService, useValue: sales },
      { provide: AuthService, useValue: { getToken: () => token, me: () => of({ id: "qa", username: "synthetic", roles }) } },
    ] }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  const open = async (url = "/ventas") => {
    page = await harness.navigateByUrl(url, SalesPageComponent);
    harness.detectChanges();
  };
  afterEach(() => {
    expect(sales.listItems).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
    expect(sales.voidSale).not.toHaveBeenCalled();
  });

  it("loads the first server page without dates and displays the commercial number", async () => {
    await open();
    expect(request()).toEqual(jasmine.objectContaining({ page: 0, size: 20, from: undefined, to: undefined }));
    expect(text()).toContain(row.saleNumber);
    expect(text()).not.toContain("Venta #81");
    expect(text()).toContain("Nota de venta");
    expect(text()).toContain("No fiscal · Sin comprobante electrónico");
    expect(text()).not.toContain("PDF");
    expect(sales.listPage.calls.mostRecent().args[1].get(BOUND_AUTH_CREDENTIALS)?.token).toBe(token);
  });

  it("shows fiscal truth independently of commercial status", async () => {
    sales.listPage.and.callFake(query => of(result(query, [{ ...row, status: "VOIDED", billingSummary: {
      hasElectronicDocument: true, documentId: 901, documentType: "INVOICE", fullNumber: "F-SYN-0001", status: "DRAFT", environment: "BETA",
    } }])));
    await open();
    const document = harness.routeNativeElement!.querySelector(".document-cell")!;
    const lines = Array.from(document.querySelectorAll(".document-identity, .document-state"), line => line.textContent?.trim());
    expect(lines).toEqual(["Factura · F-SYN-0001", "Borrador · no emitido · Beta · pruebas"]);
    expect(harness.routeNativeElement!.querySelector("tbody .state-column")!.textContent).toContain("Anulada");
    expect(harness.routeNativeElement!.querySelector("tbody")!.textContent).not.toContain("Aceptado");
    expect(text()).not.toContain("Nota de venta");
  });

  it("does not present an incomplete or contradictory fiscal summary as a note", async () => {
    const incomplete = { ...row, billingSummary: { hasElectronicDocument: false } as SalesListItem["billingSummary"] };
    const inconsistent = { ...row, id: 82, billingSummary: { ...row.billingSummary, documentId: 901 } };
    sales.listPage.and.callFake(query => of(result(query, [incomplete, inconsistent])));
    await open();
    const rows = Array.from(harness.routeNativeElement!.querySelectorAll("tbody tr"));
    expect(rows.length).toBe(2);
    for (const element of rows) expect(element.textContent).toContain("Información documental no verificable");
    expect(text()).not.toContain("Nota de venta");
  });

  it("applies combined filters on submit, resets page and retains the page size", async () => {
    sales.listPage.and.callFake(query => of(result(query, [row], 51)));
    await open("/ventas?salesPage=1&salesSize=50");
    sales.listPage.calls.reset();
    page.filterForm.patchValue({ search: " SYN ", mode: "prefix", status: "VOIDED", createdBy: " supervisor ",
      cashRegisterSessionId: 7, from: "2026-10-01", to: "2026-10-31", hasElectronicDocument: "true", documentStatus: "DRAFT" });
    expect(sales.listPage).not.toHaveBeenCalled();
    page.applyFilters(); await settle();
    expect(request()).toEqual(jasmine.objectContaining({ saleNumberPrefix: "SYN", status: "VOIDED", createdBy: "supervisor",
      cashRegisterSessionId: 7, from: "2026-10-01", to: "2026-10-31", hasElectronicDocument: true, documentStatus: "DRAFT", page: 0, size: 50 }));
    expect(TestBed.inject(Router).url).toContain("salesPrefix=SYN");
    page.resetFilters(); await settle();
    expect(TestBed.inject(Router).url).toBe("/ventas?salesSize=50");
  });

  it("disables and clears the fiscal state when selecting absence", async () => {
    await open();
    page.filterForm.controls.documentStatus.setValue("ACCEPTED");
    page.filterForm.controls.hasElectronicDocument.setValue("false");
    expect(page.filterForm.controls.documentStatus.disabled).toBeTrue();
    expect(page.filterForm.controls.documentStatus.value).toBe("");
    page.applyFilters(); await settle();
    expect(request().hasElectronicDocument).toBeFalse();
    expect(request().documentStatus).toBeUndefined();
  });

  it("restores query context and binds it to the detail link and explicit refresh", async () => {
    sales.listPage.and.callFake(query => of(result(query, [row], 48)));
    await open("/ventas?salesNumber=V-SYN-0081&salesStatus=VOIDED&salesCash=7&salesPage=1");
    expect(page.filterForm.value.status).toBe("VOIDED");
    expect(page.filterForm.value.cashRegisterSessionId).toBe(7);
    const href = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[data-sale-id="81"]')!.href;
    expect(href).toContain("salesStatus=VOIDED"); expect(href).toContain("salesPage=1");
    expect(text()).toContain("Página 2 de 3");
    page.refresh();
    expect(request().page).toBe(1);
    page.changeSize("100"); await settle();
    expect(request()).toEqual(jasmine.objectContaining({ page: 0, size: 100 }));
  });

  it("corrects an out-of-range page at most once after totals shrink", async () => {
    sales.listPage.and.callFake(query => of(query.page > 0 ? result(query, [], 1) : result(query)));
    await open("/ventas?salesPage=7");
    await settle();
    expect(sales.listPage.calls.allArgs().map(([query]) => query.page)).toEqual([7, 0]);
    expect(TestBed.inject(Router).url).toBe("/ventas");
  });

  it("cancels stale reads and keeps loading, empty and error distinct", async () => {
    await open();
    const first = new Subject<SalesListPage>(), second = new Subject<SalesListPage>();
    sales.listPage.and.returnValues(first, second);
    page.refresh(); harness.detectChanges();
    expect(text()).toContain("Consultando ventas");
    page.refresh(); second.next(result(request(), [])); first.next(result(request())); harness.detectChanges();
    expect(page.sales).toEqual([]); expect(text()).toContain("No hay ventas para los filtros");
    sales.listPage.and.returnValue(throwError(() => ({ status: 500 }))); page.refresh(); harness.detectChanges();
    expect(text()).toContain("No se pudo cargar"); expect(text()).not.toContain("No hay ventas para los filtros");
  });

  it("rejects invalid filters inline and does not send another request", async () => {
    await open(); sales.listPage.calls.reset();
    page.filterForm.patchValue({ search: "AB", mode: "prefix" }); page.applyFilters();
    expect(page.validationError).toContain("3");
    page.filterForm.patchValue({ search: "", from: "2026-10-31", to: "2026-10-01" }); page.applyFilters();
    expect(page.validationError).toContain("Desde");
    expect(sales.listPage).not.toHaveBeenCalled();
  });

  it("rejects malformed restored dates without falling back to an unbounded query", async () => {
    await open("/ventas?salesFrom=2032-02-30");
    expect(sales.listPage).not.toHaveBeenCalled(); expect(page.errorMessage).toContain("fechas válidas");
  });

  for (const status of [401, 403]) it("withdraws protected rows on HTTP " + status, async () => {
    await open();
    sales.listPage.and.returnValue(throwError(() => ({ status }))); page.refresh(); harness.detectChanges();
    expect(page.sales).toEqual([]); expect(harness.routeNativeElement!.querySelector("tbody")).toBeNull();
    expect(text()).toContain(status === 401 ? "Sesión vencida" : "No tienes permiso");
  });

  it("ignores an old response after credentials change", async () => {
    await open();
    const pending = new Subject<SalesListPage>(); sales.listPage.and.returnValue(pending); page.refresh();
    token = "different-synthetic-token"; harness.detectChanges(); pending.next(result(request())); harness.detectChanges();
    expect(page.sales).toEqual([]); expect(text()).toContain("La sesión cambió");
  });

  it("omits user filtering for mixed CAJERO and keeps Lima display at the microfraction boundary", async () => {
    roles = ["ADMIN", "CAJERO"];
    await open("/ventas?salesUser=another&salesFrom=2032-12-31&salesTo=2032-12-31");
    expect(page.cashier).toBeTrue(); expect(page.canFilterUser).toBeFalse(); expect(request().createdBy).toBeUndefined();
    expect(page.formatDate(row.soldAt)).toContain("31/12/2032");
  });
});
