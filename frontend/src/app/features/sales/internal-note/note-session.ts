import { Injectable, InjectionToken, OnDestroy, inject, signal } from "@angular/core";
import { firstValueFrom, timeout } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { createBoundAuthContext } from "../../../core/auth/bound-auth-context";
import { SalesService } from "../data/sales.service";
import { InternalNote, NoteFormat, noteFilename, toInternalNote } from "./note-model";
import { generateNote } from "./note-pdf";

export type NotePhase = "idle" | "reading" | "generating" | "slow" | "ready" | "error";
export const NOTE_GENERATOR = new InjectionToken<typeof generateNote>("Internal note PDF generator", { providedIn: "root", factory: () => generateNote });
@Injectable()
export class NoteSession implements OnDestroy {
  readonly note = signal<InternalNote | null>(null);
  readonly url = signal<string | null>(null);
  readonly phase = signal<NotePhase>("idle");
  readonly error = signal(""); readonly message = signal("");
  format: NoteFormat = "a4";
  private credential = this.auth.getToken();
  private version = 0; private destroyed = false;
  private requestedSaleId: number | null = null;
  private documentSaleId: number | null = null;
  private readonly generate = inject(NOTE_GENERATOR);
  private readonly windows = new Map<Window, string | null>();
  private readonly watch = setInterval(() => this.checkSession(), 200);
  private readonly storageListener = () => this.checkSession();
  constructor(private readonly sales: SalesService, private readonly auth: AuthService) {
    window.addEventListener("storage", this.storageListener);
    window.addEventListener("focus", this.storageListener);
  }
  private checkSession(): void {
    if (this.credential !== this.auth.getToken()) {
      this.version++; this.clear(); this.credential = this.auth.getToken();
      this.error.set("La sesión cambió. Vuelve a abrir la venta con la sesión actual."); this.phase.set("error");
    }
    for (const [win, url] of this.windows) if (win.closed) { if (url) URL.revokeObjectURL(url); this.windows.delete(win); }
  }
  private valid(version: number, token: string): boolean { return !this.destroyed && version === this.version && token === this.auth.getToken(); }
  invalidate(): void {
    this.version++; this.requestedSaleId = null; this.clear();
    this.error.set(""); this.message.set(""); this.phase.set("idle");
  }
  isReadyFor(id: number, requirePdf = true): boolean {
    return !this.destroyed && Number.isSafeInteger(id) && id > 0 && this.requestedSaleId === id
      && this.note()?.id === id && this.phase() === "ready" && !this.error()
      && !!this.credential && this.credential === this.auth.getToken()
      && (!requirePdf || (this.documentSaleId === id && !!this.url()));
  }
  private clear(): void {
    const old = this.url(); if (old) URL.revokeObjectURL(old); this.url.set(null); this.note.set(null); this.documentSaleId = null;
    for (const [win,url] of this.windows) { win.close(); if (url) URL.revokeObjectURL(url); } this.windows.clear();
  }
  async load(id: number, preparePdf = true): Promise<void> {
    this.invalidate();
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.error.set("Identificador de venta no válido."); this.phase.set("error"); return;
    }
    const version = this.version, token = this.auth.getToken(); this.credential = token; this.requestedSaleId = id;
    this.phase.set("reading");
    if (!token) { this.failed({ status: 401 }); return; }
    try {
      const sale = await firstValueFrom(this.sales.getById(id, createBoundAuthContext(token)).pipe(timeout(15000)));
      if (!this.valid(version, token)) return;
      if (sale.id !== id) throw new Error("La respuesta no corresponde a la venta solicitada.");
      const note = toInternalNote(sale); this.note.set(note);
      if (preparePdf) await this.build(note, version, token); else this.phase.set("ready");
    } catch (e) { if (this.valid(version, token)) this.failed(e); }
  }
  async changeFormat(format: NoteFormat): Promise<void> { this.format = format; const id = this.note()?.id; if (id) await this.load(id); }
  private async build(note: InternalNote, version: number, token: string): Promise<void> {
    this.phase.set("generating"); const slow = setTimeout(() => { if (this.valid(version,token)) this.phase.set("slow"); }, 2000);
    try {
      const blob = await this.generate(note, this.format);
      if (!this.valid(version,token)) return;
      const old = this.url(); if (old) URL.revokeObjectURL(old);
      this.url.set(URL.createObjectURL(blob)); this.documentSaleId = note.id; this.phase.set("ready");
    } finally { clearTimeout(slow); }
  }
  async output(action: "download" | "open" | "print"): Promise<void> {
    this.checkSession(); const previous = this.note(); if (!previous || !this.isReadyFor(previous.id,false)) return;
    const win = action === "download" ? null : window.open("", "_blank");
    if (action !== "download" && !win) { this.message.set("Ventana bloqueada. Permite ventanas de este sitio o descarga el PDF."); return; }
    if (win) { win.opener = null; this.windows.set(win, null); }
    const version = ++this.version, token = this.auth.getToken();
    if (!token) { this.failed({ status: 401 }); return; }
    this.phase.set("reading"); this.error.set(""); this.message.set("");
    try {
      const sale = await firstValueFrom(this.sales.getById(previous.id, createBoundAuthContext(token)).pipe(timeout(15000)));
      if (!this.valid(version, token)) { win?.close(); return; }
      if (sale.id !== previous.id) throw new Error("La respuesta no corresponde a la venta solicitada.");
      const fresh = toInternalNote(sale);
      if (JSON.stringify(fresh) !== JSON.stringify(previous)) {
        win?.close(); this.note.set(fresh); await this.build(fresh,version,token);
        if (this.valid(version,token)) this.message.set("La venta cambió. Se actualizó la nota; revísala y vuelve a elegir la acción."); return;
      }
      if (!this.url()) await this.build(fresh,version,token);
      if (!this.valid(version,token)) { win?.close(); return; }
      if (action === "download") {
        const link = document.createElement("a"); link.href = this.url()!; link.download = noteFilename(fresh,this.format); link.click();
        this.message.set("Descarga solicitada. Si el navegador la bloqueó, permite descargas o abre el PDF.");
      } else if (win) {
        let url = this.url()!;
        if (action === "print") {
          this.phase.set("generating"); const blob = await this.generate(fresh,this.format,true);
          if (!this.valid(version,token)) { win.close(); return; } url = URL.createObjectURL(blob);
        } else {
          // Separate URL lifetime for the temporary viewer, still revoked on session change/destroy.
          const response = await fetch(url); const blob = await response.blob();
          if (!this.valid(version,token)) { win.close(); return; } url = URL.createObjectURL(blob);
        }
        this.windows.set(win,url); win.location.replace(url);
        this.message.set(action === "print" ? "Impresión solicitada al visor. Si cancelaste el diálogo o no salió papel, vuelve a intentar o descarga. El navegador no confirma el estado de la impresora; usa Imprimir en el visor si el diálogo no aparece." : "PDF abierto. Si el visor no está disponible, utiliza Descargar PDF.");
      }
      this.phase.set("ready");
    } catch (e) { win?.close(); if (this.valid(version,token)) this.failed(e); }
  }
  private failed(error: unknown): void {
    const status = (error as { status?: number })?.status;
    const text = status === 401 ? "Sesión vencida. Inicia sesión para consultar esta venta." : status === 403 || status === 422 ? "No tienes permiso para consultar esta venta." : status === 404 ? "La venta no existe o ya no está disponible." : status === 0 ? "Error de red. Comprueba la conexión y vuelve a intentar." : "No se pudo preparar la nota. Reintenta; la venta permanece registrada.";
    this.clear(); this.error.set(text); this.phase.set("error");
  }
  ngOnDestroy(): void { this.destroyed = true; this.version++; clearInterval(this.watch); window.removeEventListener("storage",this.storageListener); window.removeEventListener("focus",this.storageListener); this.clear(); }
}
