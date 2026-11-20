import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock, MockInstance, Mocked } from "vitest";
import { NgZone, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { Subject, of, throwError } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS } from "../../../core/auth/bound-auth-context";
import { SalesService } from "../data/sales.service";
import { SaleResponse } from "../data/sales.models";
import { NOTE_GENERATOR, NoteSession } from "./note-session";
import { NOTE_PROFILES, noteFilename, toInternalNote } from "./note-model";
import { noteDefinition } from "./note-pdf";
import type { generateNote } from "./note-pdf";
import { noteSale } from "./note-test-data";
import { InternalNotePageComponent } from "./internal-note-page.component";

type SalesDouble = Mocked<Pick<SalesService, "getById">>;
type GeneratorDouble = Mock<typeof generateNote>;

function drainMicrotasks(): Promise<void> {
  // A native browser task runs after the microtask checkpoint, without advancing the fake clock.
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

function globalsUnderTest() {
  return [
    Date, window.setTimeout, window.clearTimeout, window.setInterval, window.clearInterval,
    window.requestAnimationFrame, window.cancelAnimationFrame, window.open, window.fetch,
    window.removeEventListener, URL.createObjectURL, URL.revokeObjectURL, HTMLAnchorElement.prototype.click,
  ];
}

const realGlobals = globalsUnderTest();
function verifyRealGlobals(): void {
  if (vi.isFakeTimers() || globalsUnderTest().some((value, index) => value !== realGlobals[index])) {
    throw new Error("Internal note test leaked a fake clock or a global spy");
  }
}

beforeEach(verifyRealGlobals);
afterEach(verifyRealGlobals);

async function withNoteClock(run: () => Promise<void>, cleanup: () => void): Promise<void> {
  vi.useFakeTimers({
    toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  try {
    await run();
  } finally {
    try {
      cleanup();
      TestBed.resetTestingModule();
      await drainMicrotasks();
      const pendingTimers = vi.getTimerCount();
      if (pendingTimers !== 0) throw new Error("Internal note test leaked " + pendingTimers + " fake timer(s)");
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  }
}

describe("Internal note allow list and templates", () => {
  it("uses captured identity, exact quantity string and persisted amounts without arithmetic", () => {
    const sale = noteSale(); sale.items[0].quantityText = "9999999999999.999";
    const note = toInternalNote(sale);
    expect(note.lines[0].quantity).toBe("9999999999999.999"); expect(note.lines[0].name).not.toContain("MODIFICADO");
    expect(note.lines[0].total).toContain("24.01"); expect(note.total).toContain("150.00");
    expect(note.payments.length).toBe(2); expect(note.change).toContain("10.00");
  });
  it("labels catalog enrichment on old rows and never claims it was captured", () => {
    const sale = noteSale(); sale.items[0].productNameSnapshot = null; sale.items[0].skuSnapshot = null;
    const line = toInternalNote(sale).lines[0]; expect(line.name).toBe("CATÁLOGO MODIFICADO"); expect(line.source).toContain("catálogo actual");
    sale.items[0].productName = null; expect(toInternalNote(sale).lines[0].name).toContain("no disponible");
  });
  it("does not substitute catalog identity for captured whitespace or convert numeric quantity", () => {
    const sale = noteSale(); sale.items[0].productNameSnapshot = "  "; expect(toInternalNote(sale).lines[0].name).toContain("no disponible");
    delete sale.items[0].quantityText; expect(() => toInternalNote(sale)).toThrowError(/Cantidad exacta/);
  });
  it("excludes banking references, barcode, void reason and unrelated input properties", () => {
    const sale = { ...noteSale(), token: "NEVER_EXPORT_TOKEN" }; expect(JSON.stringify(toInternalNote(sale))).not.toContain("NEVER_EXPORT");
  });
  it("rejects a partial snapshot pair and treats catalog markup as plain text", () => {
    const sale = noteSale(); sale.items[0].skuSnapshot = null; expect(() => toInternalNote(sale)).toThrowError(/incompleta/);
    sale.items[0].skuSnapshot = "SKU"; sale.items[0].productNameSnapshot = '<img src=x onerror="alert(1)">';
    expect(toInternalNote(sale).lines[0].name).toBe(sale.items[0].productNameSnapshot);
    expect(JSON.stringify(noteDefinition(toInternalNote(sale),'a4','logo'))).not.toContain('"html":');
  });
  it("uses automatic section height without dynamic footers for short tickets", () => {
    const def=noteDefinition(toInternalNote(noteSale()),'ticket80','logo');
    expect((def.pageSize as {height:string}).height).toBe('auto');
    expect((def.content as unknown[]).length).toBe(1); expect(def.footer).toBeUndefined();
  });
  it("uses full-width labelled continuations for long numeric values without splitting digits", () => {
    const sale=noteSale(1); sale.items[0].quantityText='9999999999999.999'; const note=toInternalNote(sale);
    const def=noteDefinition(note,'a4','logo'); expect(JSON.stringify(def.content)).toContain('"colSpan":5');
    expect(JSON.stringify(def.content)).toContain('9999999999999.999'); expect(JSON.stringify(def.content)).toContain('Precio unitario');
    sale.items[0].quantityText='1.250'; expect(toInternalNote(sale).lines[0].quantity).toBe('1.25');
  });
  for (const format of ["a4", "ticket80", "ticket58"] as const) {
    it("builds paginated " + format + " with ANULADA on every page and unchanged totals", () => {
      const note = toInternalNote(noteSale(200,true)); const def = noteDefinition(note,format,"data:image/png;base64,synthetic");
      expect(def.pageSize).toEqual({ width: NOTE_PROFILES[format].width, height: format === 'a4' ? NOTE_PROFILES[format].height : 'auto' });
      if (format === 'a4') { expect(typeof def.footer).toBe('function'); if (typeof def.footer === "function") expect(JSON.stringify(def.footer(2,8,{width:595,height:842,orientation:"portrait"}))).toContain("ANULADA"); }
      else { expect((def.content as unknown[]).length).toBe(10); for(const section of def.content as unknown[]) expect(JSON.stringify(section)).toContain('ANULADA'); }
      expect(JSON.stringify(def.content)).toContain(note.total); expect(JSON.stringify(def.content)).toContain(note.lines[199].name);
      expect(JSON.stringify(def.content)).not.toContain("INK-SYN-200");
    });
  }
  it("sanitizes file names and marks annulled files", () => { const note = toInternalNote(noteSale(1,true)); note.number = "../../x\n"; expect(noteFilename(note,"a4")).toBe("InkToy-Nota-______x_-a4-ANULADA.pdf"); });
});

describe("Internal note isolated session", () => {
  let session: NoteSession; let token: string; let sales: SalesDouble; let generate: GeneratorDouble;
  function createSession(): void {
    token = "synthetic-session-one"; sales = { getById: vi.fn<SalesService["getById"]>() }; sales.getById.mockReturnValue(of(noteSale()));
    generate = vi.fn<typeof generateNote>().mockImplementation(() => Promise.resolve(new Blob(["%PDF-synthetic"],{type:"application/pdf"})));
    TestBed.configureTestingModule({ providers: [NoteSession,{provide:SalesService,useValue:sales},{provide:AuthService,useValue:{getToken:()=>token}},{provide:NOTE_GENERATOR,useValue:generate}] });
    vi.spyOn(URL, "createObjectURL").mockReturnValue(undefined!).mockReturnValueOnce("blob:one").mockReturnValueOnce("blob:two").mockReturnValueOnce("blob:three");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);
    session = TestBed.inject(NoteSession);
  }
  function sessionTest(name: string, run: () => Promise<void>): void {
    it(name, async () => {
      let initialized = false;
      await withNoteClock(async () => {
        createSession();
        initialized = true;
        await run();
      }, () => { if (initialized) session.ngOnDestroy(); });
    });
  }
  sessionTest("binds the GET credential, generates on demand and releases replaced URLs", async () => {
    void session.load(81); await drainMicrotasks(); expect(session.phase()).toBe("ready");
    expect(sales.getById.mock.lastCall![1]!.get(BOUND_AUTH_CREDENTIALS)?.token).toBe(token);
    void session.changeFormat("ticket58"); await drainMicrotasks(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:one"); expect(generate.mock.lastCall![1]).toBe("ticket58");
  });
  sessionTest("ignores late HTTP responses from an earlier session", async () => {
    const response = new Subject<SaleResponse>(); sales.getById.mockReturnValue(response);
    void session.load(81); token = "session-two"; response.next(noteSale()); response.complete(); await drainMicrotasks(); await vi.advanceTimersByTimeAsync(200);
    expect(session.note()).toBeNull(); expect(session.url()).toBeNull(); expect(generate).not.toHaveBeenCalled();
  });
  sessionTest("ignores an obsolete generation and revokes documents on same-tab credential change", async () => {
    let complete!: (blob:Blob)=>void; generate.mockReturnValue(new Promise<Blob>(resolve=>complete=resolve));
    void session.load(81); await drainMicrotasks(); token="changed"; await vi.advanceTimersByTimeAsync(200); complete(new Blob()); await drainMicrotasks(); expect(session.url()).toBeNull();
  });
  sessionTest("handles a rejected PDF promise without undoing a sale", async () => {
    generate.mockReturnValue(Promise.reject(new Error("PDF failed"))); void session.load(81); await drainMicrotasks(); expect(session.phase()).toBe("error"); expect(session.error()).toContain("permanece registrada");
    expect(sales.getById.mock.calls.length).toBe(1);
  });
  sessionTest("announces slow generation and recovers when it finishes", async () => {
    let complete!: (blob:Blob)=>void; generate.mockReturnValue(new Promise<Blob>(resolve=>complete=resolve)); void session.load(81); await drainMicrotasks(); await vi.advanceTimersByTimeAsync(2001); expect(session.phase()).toBe("slow");
    complete(new Blob()); await drainMicrotasks(); expect(session.phase()).toBe("ready");
  });
  sessionTest("requires a second explicit action if the authorized sale becomes annulled", async () => {
    void session.load(81); await drainMicrotasks(); sales.getById.mockReturnValue(of(noteSale(3,true))); void session.output("download"); await drainMicrotasks();
    expect(session.note()?.status).toBe("VOIDED"); expect(session.message()).toContain("vuelve a elegir"); expect(generate.mock.calls.length).toBe(2);
  });
  for(const status of [0,401,403,404,422]) sessionTest("clears the document after output revalidation returns " + status, async () => {
    void session.load(81); await drainMicrotasks(); sales.getById.mockReturnValue(throwError(()=>({status}))); void session.output("download"); await drainMicrotasks();
    expect(session.url()).toBeNull(); expect(session.note()).toBeNull(); expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  sessionTest("reports blocked popup and preserves download alternative", async () => { void session.load(81); await drainMicrotasks(); vi.spyOn(window,"open").mockReturnValue(null); void session.output("print"); await drainMicrotasks(); expect(session.message()).toContain("bloqueada"); expect(session.phase()).toBe("ready"); });
});

describe("Internal note route invalidation", () => {
  let harness: RouterTestingHarness;
  let sales: SalesDouble, generate: GeneratorDouble;
  let token: string, activeUrls: Set<string>, popup: Window;
  let popupClosed: Mock<Window["close"]>, opened: MockInstance<typeof window.open>, downloaded: MockInstance<HTMLAnchorElement["click"]>;
  const invalidMessage = "Identificador de venta no válido.";
  const pdf = (): Blob => new Blob(["%PDF-synthetic-route-test"], { type: "application/pdf" });
  const viewerResponse = (): Response => ({ blob: () => Promise.resolve(pdf()) } as Response);
  const saleB = (): SaleResponse => ({ ...noteSale(), id: 82, saleNumber: "V-SYN-0082" });
  function pending<T>() {
    let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  }
  function routeTest(name: string, run: () => Promise<void>): void {
    it(name, () => withNoteClock(run, () => {
      if (!harness.fixture.componentRef.hostView.destroyed) harness.fixture.destroy();
    }));
  }
  async function navigate(id: string): Promise<InternalNotePageComponent> {
    const page = await harness.navigateByUrl(
      id === "missing" ? "/missing" : "/ventas/" + id + "/nota",
      InternalNotePageComponent,
    );
    await drainMicrotasks();
    page.viewerUnavailable = false;
    harness.detectChanges();
    return page;
  }
  async function expectEmpty(page: InternalNotePageComponent, message = invalidMessage): Promise<void> {
    harness.detectChanges();
    expect(page.session.note()).toBeNull(); expect(page.session.url()).toBeNull(); expect(page.ready).toBe(false);
    expect(page.session.phase()).toBe("error"); expect(page.session.error()).toBe(message);
    const element = harness.routeNativeElement!;
    expect(element.textContent).not.toContain("V-SYN-0081");
    expect(element.querySelector("iframe")).toBeNull(); expect(element.querySelector(".accessible-note")).toBeNull();
    const actions = Array.from(element.querySelectorAll<HTMLButtonElement>("button"))
      .filter(button => ["Descargar PDF", "Imprimir", "Abrir PDF ↗"].includes(button.textContent!.trim()));
    expect(actions.length).toBe(3);
    for (const action of actions) { expect(action.disabled).toBe(true); action.click(); }
    const reads = sales.getById.mock.calls.length;
    for (const action of ["download", "open", "print"] as const) void page.session.output(action);
    await drainMicrotasks(); expect(sales.getById.mock.calls.length).toBe(reads);
    expect(downloaded).not.toHaveBeenCalled(); expect(activeUrls.size).toBe(0);
  }
  beforeEach(async () => {
    token = "synthetic-route-session"; activeUrls = new Set<string>();
    sales = { getById: vi.fn<SalesService["getById"]>() };
    sales.getById.mockImplementation(id => of(id === 82 ? saleB() : noteSale()));
    generate = vi.fn<typeof generateNote>().mockImplementation(() => Promise.resolve(pdf()));
    let nextUrl = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => { const url = "blob:synthetic-route-" + ++nextUrl; activeUrls.add(url); return url; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(url => { activeUrls.delete(url); });
    popupClosed = vi.fn<Window["close"]>();
    popup = { close: popupClosed, closed: false, opener: null, location: { replace: vi.fn<Location["replace"]>() } } as unknown as Window;
    opened = vi.spyOn(window, "open").mockReturnValue(popup);
    downloaded = vi.spyOn(HTMLAnchorElement.prototype, "click").mockReturnValue(undefined);
    await TestBed.configureTestingModule({ imports: [InternalNotePageComponent], providers: [
      provideZoneChangeDetection(), provideRouter([
        { path: "ventas/:id/nota", component: InternalNotePageComponent },
        { path: "missing", component: InternalNotePageComponent },
      ]),
      { provide: SalesService, useValue: sales }, { provide: AuthService, useValue: { getToken: () => token } },
      { provide: NOTE_GENERATOR, useValue: generate },
    ] }).compileComponents();
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => { if (!harness.fixture.componentRef.hostView.destroyed) harness.fixture.destroy(); expect(activeUrls.size).toBe(0); });

  routeTest("polls outside Angular and reenters only to visibly invalidate a changed credential", async () => {
    const page = await navigate("81"), url = page.session.url()!;
    const credential = vi.spyOn(TestBed.inject(AuthService), "getToken");
    const reentry = vi.spyOn(TestBed.inject(NgZone), "run");
    await vi.advanceTimersByTimeAsync(600); expect(credential).toHaveBeenCalledTimes(3); expect(reentry).not.toHaveBeenCalled();
    expect(page.ready).toBe(true);
    token = "changed-monitor-credential"; await vi.advanceTimersByTimeAsync(200);
    expect(reentry).toHaveBeenCalled();
    await expectEmpty(page, "La sesión cambió. Vuelve a abrir la venta con la sesión actual.");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url); expect(sales.getById).toHaveBeenCalledTimes(1);
  });
  routeTest("stops the monitor and removes its listeners and document URLs on destruction", async () => {
    const interval = vi.spyOn(window, "setInterval");
    const page = await navigate("81");
    const monitorIndex = interval.mock.calls.findIndex(([, delay]) => delay === 200);
    const monitor = interval.mock.results[monitorIndex].value;
    vi.spyOn(window, "fetch").mockReturnValue(Promise.resolve(viewerResponse()));
    void page.session.output("open"); await drainMicrotasks(); expect(activeUrls.size).toBe(2);
    const credential = vi.spyOn(TestBed.inject(AuthService), "getToken");
    const cleared = vi.spyOn(window, "clearInterval");
    const removed = vi.spyOn(window, "removeEventListener");
    harness.fixture.destroy();
    expect(cleared).toHaveBeenCalledWith(monitor);
    expect(removed).toHaveBeenCalledWith("storage", expect.any(Function)); expect(removed).toHaveBeenCalledWith("focus", expect.any(Function));
    token = "changed-after-destroy"; await vi.advanceTimersByTimeAsync(600); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new Event("focus"));
    expect(credential).not.toHaveBeenCalled(); expect(popupClosed).toHaveBeenCalled();
    expect(activeUrls.size).toBe(0); expect(page.session.note()).toBeNull(); expect(page.session.url()).toBeNull();
  });

  routeTest("clears a ready PDF and accessible HTML on an invalid ID in the same instance, then loads B normally", async () => {
    const page = await navigate("81"), oldUrl = page.session.url()!;
    expect(page.ready).toBe(true); expect(harness.routeNativeElement!.querySelector("iframe")).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector<HTMLTextAreaElement>("#note-reference")!.value).toBe("V-SYN-0081");
    expect(await navigate("0")).toBe(page); await expectEmpty(page);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldUrl); expect(opened).not.toHaveBeenCalled();
    expect(await navigate("82")).toBe(page); expect(page.ready).toBe(true); expect(page.session.note()?.id).toBe(82);
    expect(page.session.isReadyFor(81)).toBe(false); expect(activeUrls.size).toBe(1);
  });
  routeTest("prioritizes the PDF preview and keeps the accessible alternative available", async () => {
    const page = await navigate("81"), element = harness.routeNativeElement!;
    const details = element.querySelector<HTMLDetailsElement>(".accessible-note")!;
    expect(details.open).toBe(false);
    const src = element.querySelector<HTMLIFrameElement>("iframe")!.src;
    expect(src).toContain("#toolbar=1&navpanes=0&view=Fit");
    details.querySelector("summary")!.click(); expect(details.open).toBe(true);
    const reference = details.querySelector<HTMLTextAreaElement>("#note-reference")!;
    expect(reference.value).toBe("V-SYN-0081");
    expect(reference.readOnly).toBe(true);
    const header = element.querySelector(".ui-page-head")!;
    expect(header.textContent).toContain(page.session.note()!.date);
    expect(header.textContent).toContain("Venta registrada");
    expect(header.textContent).not.toContain(reference.value);
    page.viewerUnavailable = true; harness.detectChanges();
    expect(details.open).toBe(true); expect(element.querySelector("iframe")).toBeNull();
  });
  for (const failure of [false, true]) routeTest("discards a late GET " + (failure ? "error" : "response") + " after an invalid route", async () => {
    const response = new Subject<SaleResponse>(); sales.getById.mockReturnValue(response);
    const page = await navigate("81"); expect(page.session.phase()).toBe("reading"); expect(await navigate("invalid")).toBe(page);
    await expectEmpty(page);
    if (failure) response.error({ status: 403 }); else { response.next(noteSale()); response.complete(); }
    await drainMicrotasks(); await expectEmpty(page); expect(generate).not.toHaveBeenCalled(); expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  for (const failure of [false, true]) routeTest("discards a late PDF " + (failure ? "error" : "result") + " after an invalid route", async () => {
    const result = pending<Blob>(); generate.mockReturnValue(result.promise);
    const page = await navigate("81"); expect(page.session.phase()).toBe("generating"); await navigate("0"); await expectEmpty(page);
    if (failure) result.reject(new Error("obsolete generation")); else result.resolve(pdf());
    await drainMicrotasks(); await vi.advanceTimersByTimeAsync(2001); await expectEmpty(page); expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  for (const failure of [false, true]) routeTest("keeps B when A's GET completes out of order with " + (failure ? "an error" : "a response"), async () => {
    const a = new Subject<SaleResponse>(), b = new Subject<SaleResponse>();
    sales.getById.mockImplementation(id => id === 81 ? a : b);
    const page = await navigate("81"); expect(await navigate("82")).toBe(page);
    b.next(saleB()); b.complete(); await drainMicrotasks(); harness.detectChanges(); const currentUrl = page.session.url();
    if (failure) a.error({ status: 404 }); else { a.next(noteSale()); a.complete(); }
    await drainMicrotasks(); harness.detectChanges();
    expect(page.session.note()?.id).toBe(82); expect(page.session.url()).toBe(currentUrl); expect(page.ready).toBe(true);
    expect(page.session.error()).toBe(""); expect(generate.mock.calls.length).toBe(1); expect(activeUrls.size).toBe(1);
    expect(harness.routeNativeElement!.textContent).not.toContain("V-SYN-0081");
  });
  routeTest("keeps B's PDF when A's generation resolves after B", async () => {
    const a = pending<Blob>(), b = pending<Blob>(); generate.mockImplementation((note: ReturnType<typeof toInternalNote>) => note.id === 81 ? a.promise : b.promise);
    const page = await navigate("81"); expect(await navigate("82")).toBe(page);
    b.resolve(pdf()); await drainMicrotasks(); const currentUrl = page.session.url();
    a.resolve(pdf()); await drainMicrotasks(); harness.detectChanges();
    expect(page.session.note()?.id).toBe(82); expect(page.session.url()).toBe(currentUrl); expect(page.ready).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1); expect(activeUrls.size).toBe(1);
  });
  for (const action of ["download", "open", "print"] as const) routeTest("cancels pending " + action + " revalidation on route invalidation", async () => {
    const page = await navigate("81"), response = new Subject<SaleResponse>(); sales.getById.mockReturnValue(response);
    void page.session.output(action); await drainMicrotasks(); await navigate("0"); await expectEmpty(page);
    response.next(noteSale()); response.complete(); await drainMicrotasks(); await expectEmpty(page);
    expect(generate.mock.calls.length).toBe(1); expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    if (action !== "download") { expect(popupClosed).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); }
    else expect(opened).not.toHaveBeenCalled();
  });
  routeTest("closes a pending print viewer and discards its late PDF", async () => {
    const page = await navigate("81"), result = pending<Blob>(); generate.mockReturnValue(result.promise);
    void page.session.output("print"); await drainMicrotasks(); expect(generate.mock.calls.length).toBe(2);
    await navigate("0"); result.resolve(pdf()); await drainMicrotasks(); await expectEmpty(page);
    expect(popupClosed).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
  routeTest("revokes both preview and temporary viewer URLs and ignores a late viewer copy", async () => {
    const page = await navigate("81"); vi.spyOn(window, "fetch").mockReturnValue(Promise.resolve(viewerResponse()));
    void page.session.output("open"); await drainMicrotasks(); expect(activeUrls.size).toBe(2);
    await navigate("0"); await expectEmpty(page); expect(popupClosed).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    await navigate("81"); const result = pending<Response>(); vi.mocked(window.fetch).mockReturnValue(result.promise);
    vi.mocked(popup.location.replace).mockClear(); void page.session.output("open"); await drainMicrotasks(); await navigate("0");
    result.resolve(viewerResponse()); await drainMicrotasks(); await expectEmpty(page); expect(popup.location.replace).not.toHaveBeenCalled();
  });
  routeTest("requires the current credential and the PDF prepared for the requested sale", async () => {
    const page = await navigate("81"); expect(page.session.isReadyFor(82)).toBe(false);
    token = "different-synthetic-session"; expect(page.ready).toBe(false);
    void page.session.output("download"); await drainMicrotasks(); expect(downloaded).not.toHaveBeenCalled(); expect(activeUrls.size).toBe(0);
    token = "synthetic-route-session"; await navigate("82"); expect(page.ready).toBe(true);
    void page.session.load(82,false); await drainMicrotasks();
    expect(page.session.isReadyFor(82,false)).toBe(true); expect(page.ready).toBe(false);
  });
  routeTest("rejects missing, malformed and unsafe IDs without a GET, including retry", async () => {
    for (const id of ["invalid", "-1", "8e1", "0x51", "9007199254740992", "missing"]) {
      const page = await navigate(id); await expectEmpty(page); page.retry(); await drainMicrotasks(); await expectEmpty(page);
    }
    expect(sales.getById).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
  });
  routeTest("preserves destruction cleanup and discards a generation finishing after teardown", async () => {
    const page = await navigate("81"), result = pending<Blob>(); generate.mockReturnValue(result.promise);
    void page.session.output("print"); await drainMicrotasks(); harness.fixture.destroy();
    result.resolve(pdf()); await drainMicrotasks(); await vi.advanceTimersByTimeAsync(2001);
    expect(page.session.note()).toBeNull(); expect(page.session.url()).toBeNull(); expect(page.ready).toBe(false);
    expect(popupClosed).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); expect(activeUrls.size).toBe(0);
  });
});
