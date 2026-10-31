import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { DomSanitizer } from "@angular/platform-browser";
import { NOTE_CONFIG, NOTE_PROFILES, NoteFormat } from "./note-model";
import { NoteSession } from "./note-session";
import { filtersFromContext, salesContext } from "../sales-presentation";

@Component({
  selector: "app-internal-note-page", standalone: true, imports: [CommonModule, RouterLink], providers: [NoteSession],
  template: `
  <section class="note-page" aria-label="NOTA DE VENTA">
    <header class="ui-page-head">
      <div><p class="eyebrow">VENTAS</p><h1 #noteTitle tabindex="-1" class="ui-page-title">{{ config.heading }}</h1>
        <p class="ui-page-description">{{ session.note() ? session.note()!.number + ' · ' + session.note()!.date : 'Consulta autorizada de la venta' }}</p></div>
      <a class="ui-button ui-button--secondary" [routerLink]="backLink" [queryParams]="listContext">{{ fromPos ? 'Volver al POS' : 'Volver al detalle' }}</a>
    </header>
    <div class="note-status" *ngIf="session.note() as note" [class.cancelled]="note.status === 'VOIDED'">
      <strong>{{ note.status === 'VOIDED' ? 'ANULADA' : 'Venta registrada' }}</strong>
      <span>{{ note.status === 'VOIDED' ? 'Se conservan los importes originales.' : 'La nota no modifica la venta ni sus pagos.' }}</span>
    </div>
    <div class="note-toolbar" aria-label="Acciones de la nota">
      <label>Formato<select aria-label="Formato" [value]="isTicket ? 'ticket' : 'a4'" (change)="selectFormat($event)" [disabled]="busy">
        <option value="a4">A4</option><option value="ticket">Ticket térmico</option></select></label>
      <label *ngIf="isTicket">Perfil de papel<select aria-label="Perfil de papel" [value]="session.format" (change)="selectProfile($event)" [disabled]="busy">
        <option value="ticket80">80 mm · útil 72 mm</option><option value="ticket58">58 mm · útil 50 mm</option></select></label>
      <div class="toolbar-actions"><button class="ui-button ui-button--primary" (click)="session.output('download')" [disabled]="!ready">Descargar PDF</button>
        <button class="ui-button ui-button--secondary" (click)="session.output('print')" [disabled]="!ready">Imprimir</button>
        <button class="ui-button note-open" (click)="session.output('open')" [disabled]="!ready">Abrir PDF ↗</button></div>
    </div>
    <div aria-live="polite" role="status" class="note-feedback">
      <p *ngIf="session.phase() === 'reading'">Cargando venta autorizada…</p>
      <p *ngIf="session.phase() === 'generating'">Preparando PDF…</p>
      <p *ngIf="session.phase() === 'slow'">La generación está tardando. Puedes esperar o volver al detalle; la venta sigue registrada.</p>
      <p *ngIf="ready">PDF listo · {{ profiles[session.format].label }} · Vista previa del mismo documento descargable.</p>
      <p *ngIf="session.message()" class="ui-alert ui-alert--info">{{ session.message() }}</p>
    </div>
    <div *ngIf="session.error()" role="alert" class="ui-alert ui-alert--error"><p>{{ session.error() }}</p><button class="ui-button ui-button--secondary" (click)="retry()">Reintentar consulta</button></div>
    <div class="note-workspace" *ngIf="session.note() as note">
      <div class="preview-panel">
        <div class="preview-label"><span>VISTA PREVIA PDF</span><span>{{ profiles[session.format].label }}</span></div>
        <iframe *ngIf="safeUrl() && !viewerUnavailable" [src]="safeUrl()" title="Vista previa PDF de la nota de venta" (error)="viewerUnavailable = true"></iframe>
        <p class="preview-placeholder" *ngIf="!safeUrl() || viewerUnavailable">{{ viewerUnavailable ? 'Este navegador no ofrece un visor PDF integrado. Descarga el archivo o ábrelo en un visor compatible; los datos accesibles están disponibles debajo.' : 'Preparando el documento…' }}</p>
        <p class="viewer-help">{{ viewerUnavailable ? 'Visor no disponible. ' : '¿El visor está vacío o no responde? ' }}Usa Abrir PDF o Descargar PDF. El contenido accesible está disponible a continuación.</p>
      </div>
      <details class="accessible-note" [open]="viewerUnavailable">
        <summary>Ver datos de la venta <span>Alternativa accesible</span></summary>
        <article>
          <p class="eyebrow">{{ config.tradeName }} · {{ config.heading }}</p>
          <h2>{{ note.number }}</h2><strong *ngIf="note.status === 'VOIDED'" class="cancelled-text">ANULADA</strong>
          <p class="note-meta">{{ note.date }}</p>
          <p class="note-meta" *ngIf="note.voidedDate">Anulada: {{ note.voidedDate }}</p>
          <div class="note-table-scroll"><table><caption>{{ note.lines.length }} artículos · Importes persistidos</caption><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Dto.</th><th>Importe</th></tr></thead>
            <tbody><tr *ngFor="let line of note.lines"><td><strong>{{ line.name }}</strong><small *ngIf="line.source" class="history-note">{{ line.source }}</small></td><td>{{ line.quantity }}</td><td>{{ line.price }}</td><td>{{ line.discount }}</td><td>{{ line.total }}</td></tr></tbody></table></div>
          <dl class="note-totals"><div><dt>Subtotal</dt><dd>{{ note.subtotal }}</dd></div><div><dt>Descuento</dt><dd>{{ note.discount }}</dd></div>
            <div class="grand-total"><dt>Total</dt><dd>{{ note.total }}</dd></div>
            <div *ngFor="let payment of note.payments"><dt>{{ payment.method }}</dt><dd>{{ payment.amount }}</dd></div>
            <div><dt>Pagado</dt><dd>{{ note.paid }}</dd></div><div class="change-total"><dt>Vuelto</dt><dd>{{ note.change }}</dd></div></dl>
          <p>{{ config.thanks }}</p>
        </article>
      </details>
    </div>
  </section>`,
  styleUrl: "./internal-note-page.component.css",
})
export class InternalNotePageComponent implements AfterViewInit, OnDestroy {
  readonly config = NOTE_CONFIG; readonly profiles = NOTE_PROFILES;
  readonly safeUrl = computed(() => { const url = this.session.url(); return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url + "#toolbar=1&navpanes=0&view=Fit") : null; });
  readonly fromPos = this.route.snapshot.queryParamMap.get("from") === "pos";
  private id = 0;
  private routeId: string | null | undefined;
  @ViewChild("noteTitle") private noteTitle?: ElementRef<HTMLElement>;
  viewerUnavailable = !navigator.pdfViewerEnabled;
  private readonly params = this.route.paramMap.subscribe(params => {
    const routeId = params.get("id");
    if (routeId === this.routeId) return;
    this.session.invalidate(); this.routeId = routeId;
    this.id = routeId !== null && /^\d+$/.test(routeId) ? Number(routeId) : 0;
    if (Number.isSafeInteger(this.id) && this.id > 0) void this.session.load(this.id);
    else { this.session.error.set("Identificador de venta no válido."); this.session.phase.set("error"); }
  });
  constructor(readonly session: NoteSession, private readonly route: ActivatedRoute, private readonly sanitizer: DomSanitizer) {}
  get backLink(): (string | number)[] { return this.fromPos ? ["/pos"] : ["/ventas", this.id]; }
  get listContext() { return this.fromPos ? {} : salesContext(filtersFromContext(this.route.snapshot.queryParamMap)); }
  get busy(): boolean { return ["reading", "generating", "slow"].includes(this.session.phase()); }
  get ready(): boolean { return this.session.isReadyFor(this.id); }
  get isTicket(): boolean { return this.session.format !== "a4"; }
  selectFormat(event: Event): void { void this.session.changeFormat((event.target as HTMLSelectElement).value === "a4" ? "a4" : "ticket80"); }
  selectProfile(event: Event): void { const value = (event.target as HTMLSelectElement).value; if (value === "ticket80" || value === "ticket58") void this.session.changeFormat(value as NoteFormat); }
  retry(): void { void this.session.load(this.id); }
  ngAfterViewInit(): void {
    this.noteTitle?.nativeElement.focus({ preventScroll: true });
    if (window.innerWidth <= 1100) this.noteTitle?.nativeElement.closest(".note-page")?.scrollIntoView({ block: "start" });
  }
  ngOnDestroy(): void { this.params.unsubscribe(); }
}
