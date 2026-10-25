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
});
