import { HttpErrorResponse } from "@angular/common/http";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { finalize, of, Subject, throwError, TimeoutError } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS } from "../../core/auth/bound-auth-context";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { CashRegisterService } from "./data/cash-register.service";
import { CashRegisterResponse, SaleResponse } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import { noteSale } from "./internal-note/note-test-data";
import { SaleVoidAttempts } from "./sale-void-attempts";
import { SaleVoidPageComponent } from "./sale-void-page.component";

describe("Sale void verification and recovery", () => {
  let sales: jasmine.SpyObj<SalesService>, cash: jasmine.SpyObj<CashRegisterService>;
  let documents: jasmine.SpyObj<ElectronicDocumentService>, dialog: jasmine.SpyObj<ConfirmDialogService>;
  let token: string, actorId: string, roles: string[];
  let harness: RouterTestingHarness, page: SaleVoidPageComponent;
  const sale = noteSale();
  const verifiedCash = { id: sale.cashRegisterSessionId, status: "OPEN" } as CashRegisterResponse;
  const contextUrl = "/ventas/81/anular?salesPrefix=SYN&salesPage=1&salesSize=50";

  beforeEach(async () => {
    token = "synthetic-void"; actorId = "actor"; roles = ["ADMIN"];
    sales = jasmine.createSpyObj("Sales", ["getById", "voidSale"]);
    sales.getById.and.returnValue(of(sale));
    cash = jasmine.createSpyObj("Cash", ["getById"]); cash.getById.and.returnValue(of(verifiedCash));
    documents = jasmine.createSpyObj("Documents", ["listBySaleId"]); documents.listBySaleId.and.returnValue(of([]));
    dialog = jasmine.createSpyObj("ConfirmDialog", ["confirm"]); dialog.confirm.and.resolveTo(true);
    await TestBed.configureTestingModule({ providers: [
      provideZoneChangeDetection(),
      provideRouter([{ path: "ventas/:id/anular", component: SaleVoidPageComponent }, { path: "ventas/:id", children: [] }]),
      { provide: SalesService, useValue: sales }, { provide: CashRegisterService, useValue: cash },
      { provide: ElectronicDocumentService, useValue: documents }, { provide: ConfirmDialogService, useValue: dialog },
      { provide: AuthService, useValue: { getToken: () => token, me: () => of({ id: actorId, username: sale.createdBy, roles }) } },
    ] }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  async function open(url = contextUrl) {
    page = await harness.navigateByUrl(url, SaleVoidPageComponent);
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.voidForm.controls.reason.setValue("Motivo sintético");
  }

  async function startPendingVoid() {
    await open();
    const response = new Subject<SaleResponse>();
    let notifySent!: () => void;
    const sent = new Promise<void>(resolve => notifySent = resolve);
    sales.voidSale.and.callFake(() => { notifySent(); return response; });
    const completion = page.voidSale();
    await sent;
    return { response, completion };
  }

  async function reopenPendingVoid() {
    await harness.navigateByUrl("/ventas/81");
    page = await harness.navigateByUrl(contextUrl, SaleVoidPageComponent);
    harness.detectChanges();
  }

  it("verifies cash and documents before accepting a confirmation and binds a single v1 attempt", async () => {
    await open();
    expect(page.canVoidSale()).toBeTrue();
    expect(cash.getById).toHaveBeenCalledWith(sale.cashRegisterSessionId, jasmine.anything());
    expect(documents.listBySaleId).toHaveBeenCalledWith(81, jasmine.anything());
    let confirm!: (value: boolean) => void;
    dialog.confirm.and.returnValue(new Promise(resolve => confirm = resolve));
    sales.voidSale.and.returnValue(of(noteSale(1, true)));
    const first = page.voidSale();
    await page.voidSale();
    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    const warning = harness.routeNativeElement!.querySelector(".warning-panel")!.textContent!;
    const copy = dialog.confirm.calls.mostRecent().args[0].description as string;
    for (const message of [warning, copy]) {
      expect(message).toContain(sale.saleNumber);
      expect(message).toContain("Se repondrán las cantidades vendidas al inventario");
      expect(message).toContain("dejará de computar en el cálculo de su sesión de caja");
      expect(message).toContain("Los pagos históricos se conservan");
      expect(message).toContain("no realiza reembolsos automáticos ni anula el comprobante electrónico");
    }
    confirm(true); await first; await harness.fixture.whenStable();
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
    const [id, payload, context] = sales.voidSale.calls.mostRecent().args;
    expect(id).toBe(81); expect(payload).toEqual({ reason: "Motivo sintético" });
    expect(context?.get(BOUND_AUTH_CREDENTIALS)?.token).toBe(token);
    expect(TestBed.inject(Router).url).toContain("salesPage=1");
    expect(TestBed.inject(Router).url).toContain("status=voided");
  });

  it("blocks direct-route submission for closed cash, unknown documents, and unprivileged actor", async () => {
    cash.getById.and.returnValue(of({ ...verifiedCash, status: "CLOSED" }));
    await open(); expect(page.blockedReason).toContain("cerrada"); await page.voidSale();
    cash.getById.and.returnValue(of(verifiedCash));
    documents.listBySaleId.and.returnValue(throwError(() => ({ status: 503 })));
    await page.reload(); expect(page.errorMessage).toContain("bloqueada"); await page.voidSale();
    roles = ["CAJERO"]; await page.reload(); expect(page.blockedReason).toContain("permiso"); await page.voidSale();
    expect(dialog.confirm).not.toHaveBeenCalled(); expect(sales.voidSale).not.toHaveBeenCalled();
  });

  it("blocks an active verified document and rejects whitespace-only reasons", async () => {
    await open();
    page.voidForm.controls.reason.setValue("   "); await page.voidSale();
    expect(dialog.confirm).not.toHaveBeenCalled();
    documents.listBySaleId.and.returnValue(of([{ id: 7, saleId: 81, status: "DRAFT", documentType: "RECEIPT",
      environment: "BETA", createdAt: "2032-01-01T10:00:00Z" } as never]));
    await page.reload(); expect(page.blockedReason).toContain("activo");
    await page.voidSale(); expect(sales.voidSale).not.toHaveBeenCalled();
  });

  it("does not write after cancellation, replacement of the actor or a changed route during confirmation", async () => {
    await open();
    dialog.confirm.and.resolveTo(false); await page.voidSale();
    let confirm!: (value: boolean) => void;
    dialog.confirm.and.returnValue(new Promise(resolve => confirm = resolve));
    const first = page.voidSale();
    await open("/ventas/82/anular");
    confirm(true); await first;
    expect(sales.voidSale).not.toHaveBeenCalled();
    await open();
    dialog.confirm.and.returnValue(new Promise(resolve => confirm = resolve));
    const second = page.voidSale();
    token = "different-actor"; harness.detectChanges();
    confirm(true); await second;
    expect(page.sale).toBeNull(); expect(sales.voidSale).not.toHaveBeenCalled();
  });

  for (const change of ["permission", "cash state"] as const) {
    it(`focuses the heading when revalidation blocks confirmation after a change in ${change}`, async () => {
      await open();
      let confirm!: (value: boolean) => void;
      dialog.confirm.and.returnValue(new Promise(resolve => confirm = resolve));
      const attempt = page.voidSale();
      harness.detectChanges();
      if (change === "permission") roles = ["CAJERO"];
      else cash.getById.and.returnValue(of({ ...verifiedCash, status: "CLOSED" }));

      confirm(true);
      await attempt;
      harness.detectChanges();
      await harness.fixture.whenStable();

      expect(page.blockedReason).toContain(change === "permission" ? "permiso" : "cerrada");
      expect(page.canVoidSale()).toBeFalse();
      expect(document.activeElement).toBe(harness.routeNativeElement!.querySelector("h1"));
      expect(sales.voidSale).not.toHaveBeenCalled();
    });
  }

  it("reads after a 5xx, retains uncertainty across navigation and never retries the POST", async () => {
    await open();
    sales.voidSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await page.voidSale();
    expect(sales.getById).toHaveBeenCalledTimes(3);
    expect(page.attemptState).toBe("uncertain"); expect(page.canVoidSale()).toBeFalse();
    await harness.navigateByUrl("/ventas/81");
    await open();
    expect(page.attemptState).toBe("uncertain");
    await page.voidSale(); expect(sales.voidSale).toHaveBeenCalledTimes(1);
    sales.getById.and.returnValue(of(noteSale(1, true)));
    await page.verifyOutcome(); await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain("status=voided");
  });

  it("treats an ambiguous success and failed verification as uncertain", async () => {
    await open();
    sales.getById.and.returnValues(of(sale), throwError(() => ({ status: 0 })));
    sales.voidSale.and.returnValue(of({ ...noteSale(1, true), id: 90 }));
    await page.voidSale();
    expect(page.attemptState).toBe("uncertain");
    expect(page.verificationMessage).toContain("No se pudo verificar");
    await page.voidSale(); expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("treats a timeout as uncertain and only reads to verify it", async () => {
    await open();
    sales.voidSale.and.returnValue(throwError(() => new TimeoutError()));
    await page.voidSale();
    expect(sales.getById).toHaveBeenCalledTimes(3);
    expect(page.attemptState).toBe("uncertain");
    expect(page.canVoidSale()).toBeFalse();
    await page.verifyOutcome();
    expect(sales.getById).toHaveBeenCalledTimes(4);
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("keeps a 409 rejection distinct from uncertainty and requires re-verification", async () => {
    await open();
    const rejection = "Rechazo sintético del servidor.";
    sales.voidSale.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: rejection } })));
    await page.voidSale();
    expect(page.attemptState).toBeUndefined();
    expect(page.errorMessage).toContain(rejection);
    expect(page.canReload).toBeTrue();
    expect(page.canVoidSale()).toBeFalse();
    await page.voidSale();
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
    expect(sales.getById).toHaveBeenCalledTimes(2);
  });

  it("blocks a reopened page while the original POST is pending and confirms its result with a GET", async () => {
    const { response, completion } = await startPendingVoid();
    const original = page;
    await reopenPendingVoid();
    expect(page).not.toBe(original);
    expect(page.attemptState).toBe("sending");
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain("Anulación en curso…");
    expect(page.canVoidSale()).toBeFalse();
    await page.voidSale();

    const reads = sales.getById.calls.count();
    sales.getById.and.returnValue(of(noteSale(1, true)));
    response.next(noteSale(1, true));
    await completion;
    await harness.fixture.whenStable();
    expect(sales.getById).toHaveBeenCalledTimes(reads + 1);
    expect(sales.getById.calls.mostRecent().args[1]?.get(BOUND_AUTH_CREDENTIALS)?.token).toBe(token);
    expect(TestBed.inject(Router).url).toContain("salesPage=1");
    expect(TestBed.inject(Router).url).toContain("status=voided");
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("recovers a rejection without sharing its payload and checks current eligibility before another confirmation", async () => {
    const { response, completion } = await startPendingVoid();
    await reopenPendingVoid();
    response.error(new HttpErrorResponse({ status: 409, error: { message: "Datos privados del intento" } }));
    await completion;
    harness.detectChanges();
    expect(page.errorMessage).toContain("Conflicto de datos");
    expect(page.errorMessage).not.toContain("Datos privados");
    expect(page.canReload).toBeTrue();
    expect(page.canVoidSale()).toBeFalse();
    await page.voidSale();

    const checks = [sales.getById, cash.getById, documents.listBySaleId].map(spy => spy.calls.count());
    await page.reload();
    expect([sales.getById, cash.getById, documents.listBySaleId].map(spy => spy.calls.count())).toEqual(checks.map(count => count + 1));
    expect(page.errorMessage).toBe("");
    expect(page.canVoidSale()).toBeTrue();
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("keeps a reopened timeout blocked when a manual GET still returns COMPLETED", async () => {
    const { response, completion } = await startPendingVoid();
    await reopenPendingVoid();
    response.error(new TimeoutError());
    await completion;
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain("Resultado por verificar");
    const reads = sales.getById.calls.count();
    await page.verifyOutcome();
    await page.voidSale();
    expect(sales.getById).toHaveBeenCalledTimes(reads + 1);
    expect(page.attemptState).toBe("uncertain");
    expect(page.canVoidSale()).toBeFalse();
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("preserves the permission denial and hides retry on a reopened page", async () => {
    const { response, completion } = await startPendingVoid();
    await reopenPendingVoid();
    response.error(new HttpErrorResponse({ status: 403 }));
    await completion;
    expect(page.errorMessage).toBe("No tienes permisos para esta accion.");
    expect(page.canReload).toBeFalse();
    expect(page.canVoidSale()).toBeFalse();
    await page.voidSale();
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("offers manual verification if a confirmed POST is followed by a failed or stale GET", async () => {
    const { response, completion } = await startPendingVoid();
    await reopenPendingVoid();
    sales.getById.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    response.next(noteSale(1, true));
    await completion;
    await harness.fixture.whenStable();
    expect(page.verificationMessage).toContain("No se pudo verificar");
    expect(page.canVoidSale()).toBeFalse();

    sales.getById.and.returnValue(of(sale));
    await page.verifyOutcome();
    expect(page.verificationMessage).toContain("aún figura registrada");
    expect(page.canVoidSale()).toBeFalse();
    sales.getById.and.returnValue(of(noteSale(1, true)));
    await page.verifyOutcome();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain("status=voided");
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("replays success received while the reopened page's initial GET is pending", async () => {
    const { response, completion } = await startPendingVoid();
    await harness.navigateByUrl("/ventas/81");
    const initialRead = new Subject<SaleResponse>();
    sales.getById.and.returnValues(initialRead, of(noteSale(1, true)));
    const reads = sales.getById.calls.count();
    page = await harness.navigateByUrl(contextUrl, SaleVoidPageComponent);
    expect(page.loading).toBeTrue();
    expect(sales.getById).toHaveBeenCalledTimes(reads + 1);

    response.next(noteSale(1, true));
    await completion;
    initialRead.next(sale);
    await harness.fixture.whenStable();
    expect(sales.getById).toHaveBeenCalledTimes(reads + 2);
    expect(TestBed.inject(Router).url).toContain("status=voided");
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  it("reconciles success received before the reopened page starts its initial GET", async () => {
    const { response, completion } = await startPendingVoid();
    await harness.navigateByUrl("/ventas/81");
    response.next(noteSale(1, true));
    await completion;

    const reads = sales.getById.calls.count();
    sales.getById.and.returnValue(of(noteSale(1, true)));
    await harness.navigateByUrl(contextUrl);
    await harness.fixture.whenStable();
    expect(sales.getById).toHaveBeenCalledTimes(reads + 1);
    expect(TestBed.inject(Router).url).toContain("status=voided");
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });

  for (const change of ["sale", "actor", "destruction"] as const) {
    it(`unsubscribes and ignores the pending outcome after ${change}`, async () => {
      const attempts = TestBed.inject(SaleVoidAttempts);
      const observe = attempts.observe.bind(attempts);
      const unsubscribed = jasmine.createSpy("unsubscribed");
      spyOn(attempts, "observe").and.callFake(key => observe(key).pipe(finalize(unsubscribed)));
      const { response, completion } = await startPendingVoid();
      await reopenPendingVoid();
      expect(attempts.observe).toHaveBeenCalledTimes(1);

      if (change === "sale") {
        sales.getById.and.returnValue(of({ ...sale, id: 82 }));
        page = await harness.navigateByUrl("/ventas/82/anular", SaleVoidPageComponent);
      } else if (change === "actor") {
        token = "other-credential"; actorId = "other-actor";
        harness.detectChanges();
        await reopenPendingVoid();
        expect(page.attemptState).toBeUndefined();
      } else await harness.navigateByUrl("/ventas/81");
      const reads = sales.getById.calls.count();
      const route = TestBed.inject(Router).url;
      expect(unsubscribed).toHaveBeenCalledTimes(1);

      response.next(noteSale(1, true));
      await completion;
      await harness.fixture.whenStable();
      expect(sales.getById).toHaveBeenCalledTimes(reads);
      expect(TestBed.inject(Router).url).toBe(route);
      expect(sales.voidSale).toHaveBeenCalledTimes(1);
    });
  }

  it("does not apply a rejection from old credentials to a new session for the same actor", async () => {
    const { response, completion } = await startPendingVoid();
    await harness.navigateByUrl("/ventas/81");
    token = "renewed-credential";
    page = await harness.navigateByUrl(contextUrl, SaleVoidPageComponent);
    response.error(new HttpErrorResponse({ status: 401 }));
    await completion;
    await harness.fixture.whenStable();
    expect(page.errorMessage).toContain("sesión actual");
    expect(page.canReload).toBeTrue();
    expect(page.canVoidSale()).toBeFalse();
    await page.reload();
    expect(page.canVoidSale()).toBeTrue();
    expect(sales.voidSale).toHaveBeenCalledTimes(1);
  });
});
