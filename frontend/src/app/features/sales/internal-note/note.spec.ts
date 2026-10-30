import { TestBed, fakeAsync, flushMicrotasks, tick } from "@angular/core/testing";
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
import { noteSale } from "./note-test-data";
import { InternalNotePageComponent } from "./internal-note-page.component";

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
  let session: NoteSession; let token: string; let sales: jasmine.SpyObj<SalesService>; let generate: jasmine.Spy;
  beforeEach(() => {
    token = "synthetic-session-one"; sales = jasmine.createSpyObj<SalesService>("Sales",["getById"]); sales.getById.and.returnValue(of(noteSale()));
    generate = jasmine.createSpy("generate").and.callFake(() => Promise.resolve(new Blob(["%PDF-synthetic"],{type:"application/pdf"})));
    TestBed.configureTestingModule({ providers: [NoteSession,{provide:SalesService,useValue:sales},{provide:AuthService,useValue:{getToken:()=>token}},{provide:NOTE_GENERATOR,useValue:generate}] });
    spyOn(URL,"createObjectURL").and.returnValues("blob:one","blob:two","blob:three"); spyOn(URL,"revokeObjectURL");
    session = TestBed.inject(NoteSession);
  });
  afterEach(() => session.ngOnDestroy());
  it("binds the GET credential, generates on demand and releases replaced URLs", fakeAsync(() => {
    void session.load(81); flushMicrotasks(); expect(session.phase()).toBe("ready");
    expect(sales.getById.calls.mostRecent().args[1]!.get(BOUND_AUTH_CREDENTIALS)?.token).toBe(token);
    void session.changeFormat("ticket58"); flushMicrotasks(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:one"); expect(generate.calls.mostRecent().args[1]).toBe("ticket58");
  }));
  it("ignores late HTTP responses from an earlier session", fakeAsync(() => {
    const response = new Subject<SaleResponse>(); sales.getById.and.returnValue(response);
    void session.load(81); token = "session-two"; response.next(noteSale()); response.complete(); flushMicrotasks(); tick(200);
    expect(session.note()).toBeNull(); expect(session.url()).toBeNull(); expect(generate).not.toHaveBeenCalled();
  }));
  it("ignores an obsolete generation and revokes documents on same-tab credential change", fakeAsync(() => {
    let complete!: (blob:Blob)=>void; generate.and.returnValue(new Promise<Blob>(resolve=>complete=resolve));
    void session.load(81); flushMicrotasks(); token="changed"; tick(200); complete(new Blob()); flushMicrotasks(); expect(session.url()).toBeNull();
  }));
  it("handles a rejected PDF promise without undoing a sale", fakeAsync(() => {
    generate.and.returnValue(Promise.reject(new Error("PDF failed"))); void session.load(81); flushMicrotasks(); expect(session.phase()).toBe("error"); expect(session.error()).toContain("permanece registrada");
    expect(sales.getById.calls.count()).toBe(1);
  }));
  it("announces slow generation and recovers when it finishes", fakeAsync(() => {
    let complete!: (blob:Blob)=>void; generate.and.returnValue(new Promise<Blob>(resolve=>complete=resolve)); void session.load(81); flushMicrotasks(); tick(2001); expect(session.phase()).toBe("slow");
    complete(new Blob()); flushMicrotasks(); expect(session.phase()).toBe("ready");
  }));
  it("requires a second explicit action if the authorized sale becomes annulled", fakeAsync(() => {
    void session.load(81); flushMicrotasks(); sales.getById.and.returnValue(of(noteSale(3,true))); void session.output("download"); flushMicrotasks();
    expect(session.note()?.status).toBe("VOIDED"); expect(session.message()).toContain("vuelve a elegir"); expect(generate.calls.count()).toBe(2);
  }));
  for(const status of [0,401,403,404,422]) it("clears the document after output revalidation returns " + status, fakeAsync(() => {
    void session.load(81); flushMicrotasks(); sales.getById.and.returnValue(throwError(()=>({status}))); void session.output("download"); flushMicrotasks();
    expect(session.url()).toBeNull(); expect(session.note()).toBeNull(); expect(URL.revokeObjectURL).toHaveBeenCalled();
  }));
  it("reports blocked popup and preserves download alternative", fakeAsync(() => { void session.load(81); flushMicrotasks(); spyOn(window,"open").and.returnValue(null); void session.output("print"); flushMicrotasks(); expect(session.message()).toContain("bloqueada"); expect(session.phase()).toBe("ready"); }));
});

describe("Internal note route invalidation", () => {
  let harness: RouterTestingHarness;
  let sales: jasmine.SpyObj<SalesService>, generate: jasmine.Spy;
  let token: string, activeUrls: Set<string>, popup: Window;
  let popupClosed: jasmine.Spy, opened: jasmine.Spy, downloaded: jasmine.Spy;
  const invalidMessage = "Identificador de venta no válido.";
  const pdf = (): Blob => new Blob(["%PDF-synthetic-route-test"], { type: "application/pdf" });
  const viewerResponse = (): Response => ({ blob: () => Promise.resolve(pdf()) } as Response);
  const saleB = (): SaleResponse => ({ ...noteSale(), id: 82, saleNumber: "V-SYN-0082" });
  function pending<T>() {
    let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  }
  function routeTest(name: string, run: () => void): void {
    it(name, fakeAsync(() => {
      try { run(); } finally { if (!harness.fixture.componentRef.hostView.destroyed) harness.fixture.destroy(); }
    }));
  }
  function navigate(id: string): InternalNotePageComponent {
    let page!: InternalNotePageComponent;
    void harness.navigateByUrl(id === "missing" ? "/missing" : "/ventas/" + id + "/nota", InternalNotePageComponent).then(value => page = value);
    flushMicrotasks(); page.viewerUnavailable = false; harness.detectChanges(); return page;
  }
  function expectEmpty(page: InternalNotePageComponent, message = invalidMessage): void {
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
    const reads = sales.getById.calls.count();
    for (const action of ["download", "open", "print"] as const) void page.session.output(action);
    flushMicrotasks(); expect(sales.getById.calls.count()).toBe(reads);
    expect(downloaded).not.toHaveBeenCalled(); expect(activeUrls.size).toBe(0);
  }
  beforeEach(async () => {
    token = "synthetic-route-session"; activeUrls = new Set<string>();
    sales = jasmine.createSpyObj<SalesService>("Sales", ["getById"]);
    sales.getById.and.callFake(id => of(id === 82 ? saleB() : noteSale()));
    generate = jasmine.createSpy("generate").and.callFake(() => Promise.resolve(pdf()));
    let nextUrl = 0;
    spyOn(URL, "createObjectURL").and.callFake(() => { const url = "blob:synthetic-route-" + ++nextUrl; activeUrls.add(url); return url; });
    spyOn(URL, "revokeObjectURL").and.callFake(url => { activeUrls.delete(url); });
    popupClosed = jasmine.createSpy("close");
    popup = { close: popupClosed, closed: false, opener: null, location: { replace: jasmine.createSpy("replace") } } as unknown as Window;
    opened = spyOn(window, "open").and.returnValue(popup);
    downloaded = spyOn(HTMLAnchorElement.prototype, "click");
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

  routeTest("polls outside Angular and reenters only to visibly invalidate a changed credential", () => {
    const page = navigate("81"), url = page.session.url()!;
    const credential = spyOn(TestBed.inject(AuthService), "getToken").and.callThrough();
    const reentry = spyOn(TestBed.inject(NgZone), "run").and.callThrough();
    tick(600); expect(credential).toHaveBeenCalledTimes(3); expect(reentry).not.toHaveBeenCalled();
    expect(page.ready).toBe(true);
    token = "changed-monitor-credential"; tick(200);
    expect(reentry).toHaveBeenCalled();
    expectEmpty(page, "La sesión cambió. Vuelve a abrir la venta con la sesión actual.");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url); expect(sales.getById).toHaveBeenCalledTimes(1);
  });
  routeTest("stops the monitor and removes its listeners and document URLs on destruction", () => {
    const interval = spyOn(window, "setInterval").and.callThrough();
    const page = navigate("81"), monitor = interval.calls.all().find(call => call.args[1] === 200)!.returnValue;
    spyOn(window, "fetch").and.returnValue(Promise.resolve(viewerResponse()));
    void page.session.output("open"); flushMicrotasks(); expect(activeUrls.size).toBe(2);
    const credential = spyOn(TestBed.inject(AuthService), "getToken").and.callThrough();
    const cleared = spyOn(window, "clearInterval").and.callThrough();
    const removed = spyOn(window, "removeEventListener").and.callThrough();
    harness.fixture.destroy();
    expect(cleared).toHaveBeenCalledWith(monitor);
    expect(removed).toHaveBeenCalledWith("storage", jasmine.any(Function)); expect(removed).toHaveBeenCalledWith("focus", jasmine.any(Function));
    token = "changed-after-destroy"; tick(600); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new Event("focus"));
    expect(credential).not.toHaveBeenCalled(); expect(popupClosed).toHaveBeenCalled();
    expect(activeUrls.size).toBe(0); expect(page.session.note()).toBeNull(); expect(page.session.url()).toBeNull();
  });

  routeTest("clears a ready PDF and accessible HTML on an invalid ID in the same instance, then loads B normally", () => {
    const page = navigate("81"), oldUrl = page.session.url()!;
    expect(page.ready).toBe(true); expect(harness.routeNativeElement!.querySelector("iframe")).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector(".accessible-note")!.textContent).toContain("V-SYN-0081");
    expect(navigate("0")).toBe(page); expectEmpty(page);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldUrl); expect(opened).not.toHaveBeenCalled();
    expect(navigate("82")).toBe(page); expect(page.ready).toBe(true); expect(page.session.note()?.id).toBe(82);
    expect(page.session.isReadyFor(81)).toBe(false); expect(activeUrls.size).toBe(1);
  });
  routeTest("prioritizes the PDF preview and keeps the accessible alternative available", () => {
    const page = navigate("81"), element = harness.routeNativeElement!;
    const details = element.querySelector<HTMLDetailsElement>(".accessible-note")!;
    expect(details.open).toBe(false);
    const src = element.querySelector<HTMLIFrameElement>("iframe")!.src;
    expect(src).toContain("#toolbar=1&navpanes=0&view=Fit");
    details.querySelector("summary")!.click(); expect(details.open).toBe(true);
    expect(details.textContent).toContain("V-SYN-0081");
    page.viewerUnavailable = true; harness.detectChanges();
    expect(details.open).toBe(true); expect(element.querySelector("iframe")).toBeNull();
  });
  for (const failure of [false, true]) routeTest("discards a late GET " + (failure ? "error" : "response") + " after an invalid route", () => {
    const response = new Subject<SaleResponse>(); sales.getById.and.returnValue(response);
    const page = navigate("81"); expect(page.session.phase()).toBe("reading"); expect(navigate("invalid")).toBe(page);
    expectEmpty(page);
    if (failure) response.error({ status: 403 }); else { response.next(noteSale()); response.complete(); }
    flushMicrotasks(); expectEmpty(page); expect(generate).not.toHaveBeenCalled(); expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  for (const failure of [false, true]) routeTest("discards a late PDF " + (failure ? "error" : "result") + " after an invalid route", () => {
    const result = pending<Blob>(); generate.and.returnValue(result.promise);
    const page = navigate("81"); expect(page.session.phase()).toBe("generating"); navigate("0"); expectEmpty(page);
    if (failure) result.reject(new Error("obsolete generation")); else result.resolve(pdf());
    flushMicrotasks(); tick(2001); expectEmpty(page); expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  for (const failure of [false, true]) routeTest("keeps B when A's GET completes out of order with " + (failure ? "an error" : "a response"), () => {
    const a = new Subject<SaleResponse>(), b = new Subject<SaleResponse>();
    sales.getById.and.callFake(id => id === 81 ? a : b);
    const page = navigate("81"); expect(navigate("82")).toBe(page);
    b.next(saleB()); b.complete(); flushMicrotasks(); harness.detectChanges(); const currentUrl = page.session.url();
    if (failure) a.error({ status: 404 }); else { a.next(noteSale()); a.complete(); }
    flushMicrotasks(); harness.detectChanges();
    expect(page.session.note()?.id).toBe(82); expect(page.session.url()).toBe(currentUrl); expect(page.ready).toBe(true);
    expect(page.session.error()).toBe(""); expect(generate.calls.count()).toBe(1); expect(activeUrls.size).toBe(1);
    expect(harness.routeNativeElement!.textContent).not.toContain("V-SYN-0081");
  });
  routeTest("keeps B's PDF when A's generation resolves after B", () => {
    const a = pending<Blob>(), b = pending<Blob>(); generate.and.callFake((note: ReturnType<typeof toInternalNote>) => note.id === 81 ? a.promise : b.promise);
    const page = navigate("81"); expect(navigate("82")).toBe(page);
    b.resolve(pdf()); flushMicrotasks(); const currentUrl = page.session.url();
    a.resolve(pdf()); flushMicrotasks(); harness.detectChanges();
    expect(page.session.note()?.id).toBe(82); expect(page.session.url()).toBe(currentUrl); expect(page.ready).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1); expect(activeUrls.size).toBe(1);
  });
  for (const action of ["download", "open", "print"] as const) routeTest("cancels pending " + action + " revalidation on route invalidation", () => {
    const page = navigate("81"), response = new Subject<SaleResponse>(); sales.getById.and.returnValue(response);
    void page.session.output(action); flushMicrotasks(); navigate("0"); expectEmpty(page);
    response.next(noteSale()); response.complete(); flushMicrotasks(); expectEmpty(page);
    expect(generate.calls.count()).toBe(1); expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    if (action !== "download") { expect(popupClosed).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); }
    else expect(opened).not.toHaveBeenCalled();
  });
  routeTest("closes a pending print viewer and discards its late PDF", () => {
    const page = navigate("81"), result = pending<Blob>(); generate.and.returnValue(result.promise);
    void page.session.output("print"); flushMicrotasks(); expect(generate.calls.count()).toBe(2);
    navigate("0"); result.resolve(pdf()); flushMicrotasks(); expectEmpty(page);
    expect(popupClosed).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
  routeTest("revokes both preview and temporary viewer URLs and ignores a late viewer copy", () => {
    const page = navigate("81"); spyOn(window, "fetch").and.returnValue(Promise.resolve(viewerResponse()));
    void page.session.output("open"); flushMicrotasks(); expect(activeUrls.size).toBe(2);
    navigate("0"); expectEmpty(page); expect(popupClosed).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    navigate("81"); const result = pending<Response>(); (window.fetch as jasmine.Spy).and.returnValue(result.promise);
    (popup.location.replace as jasmine.Spy).calls.reset(); void page.session.output("open"); flushMicrotasks(); navigate("0");
    result.resolve(viewerResponse()); flushMicrotasks(); expectEmpty(page); expect(popup.location.replace).not.toHaveBeenCalled();
  });
  routeTest("requires the current credential and the PDF prepared for the requested sale", () => {
    const page = navigate("81"); expect(page.session.isReadyFor(82)).toBe(false);
    token = "different-synthetic-session"; expect(page.ready).toBe(false);
    void page.session.output("download"); flushMicrotasks(); expect(downloaded).not.toHaveBeenCalled(); expect(activeUrls.size).toBe(0);
    token = "synthetic-route-session"; navigate("82"); expect(page.ready).toBe(true);
    void page.session.load(82,false); flushMicrotasks();
    expect(page.session.isReadyFor(82,false)).toBe(true); expect(page.ready).toBe(false);
  });
  routeTest("rejects missing, malformed and unsafe IDs without a GET, including retry", () => {
    for (const id of ["invalid", "-1", "8e1", "0x51", "9007199254740992", "missing"]) {
      const page = navigate(id); expectEmpty(page); page.retry(); flushMicrotasks(); expectEmpty(page);
    }
    expect(sales.getById).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
  });
  routeTest("preserves destruction cleanup and discards a generation finishing after teardown", () => {
    const page = navigate("81"), result = pending<Blob>(); generate.and.returnValue(result.promise);
    void page.session.output("print"); flushMicrotasks(); harness.fixture.destroy();
    result.resolve(pdf()); flushMicrotasks(); tick(2001);
    expect(page.session.note()).toBeNull(); expect(page.session.url()).toBeNull(); expect(page.ready).toBe(false);
    expect(popupClosed).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); expect(activeUrls.size).toBe(0);
  });
});
