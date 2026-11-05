import { CommonModule } from "@angular/common";
import { Component, DoCheck, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { createBoundAuthContext } from "../../../core/auth/bound-auth-context";
import { ElectronicDocumentService } from "../../billing/data/electronic-document.service";
import { PosDialogFocusDirective } from "../components/pos-dialog-focus.directive";
import { documentView, DocumentView } from "../sales-presentation";
import { NoteFormat } from "./note-model";
import { NoteSession } from "./note-session";

/** A transient presentation event from a verified normal checkout, never reconstructed from a draft. */
export interface PosConfirmedDelivery {
  readonly operationId: string;
  readonly saleId: number;
  readonly totalAmount: number;
  readonly credential: string;
  readonly receiptType: "TICKET" | "RECEIPT" | "INVOICE" | "UNKNOWN";
}

@Component({
  selector: "app-pos-sale-note", standalone: true,
  imports: [CommonModule, RouterLink, PosDialogFocusDirective], providers: [NoteSession],
  template: `
    <div class="delivery-backdrop" *ngIf="visible && current as delivery" role="dialog" aria-modal="true"
      aria-labelledby="delivery-title" aria-describedby="delivery-total" appPosDialogFocus (posDialogClose)="close()">
      <section class="ui-card delivery-card">
        <header><h2 id="delivery-title">Venta #{{ delivery.saleId }} · Registrada</h2>
          <button type="button" class="ui-button close-delivery" aria-label="Cerrar entrega de nota" (click)="close()">×</button></header>
        <p id="delivery-total" class="confirmed-total">Total confirmado: {{ formatTotal(delivery.totalAmount) }}</p>
        <section *ngIf="delivery.receiptType !== 'TICKET'" class="electronic-state" aria-label="Estado del documento electrónico" aria-live="polite">
          <h3 *ngIf="!documentPresentation">{{ delivery.receiptType === 'INVOICE' ? 'Factura electrónica' : delivery.receiptType === 'RECEIPT' ? 'Boleta electrónica' : 'Documento no verificado' }}</h3>
          <p *ngIf="documentPhase === 'idle'">Estado documental no verificado. Actualiza para consultar su estado y ambiente.</p>
          <p *ngIf="documentPhase === 'reading'">Consultando estado documental…</p>
          <p *ngIf="documentPhase === 'pending'">Venta registrada; documento pendiente.</p>
          <p *ngIf="documentPhase === 'error'" role="alert">El estado documental no pudo verificarse. La venta conserva su resultado.</p>
          <p *ngIf="documentPresentation as document">{{ document.type }} · {{ document.status }}<ng-container *ngIf="!document.status.includes(document.environment)"> · {{ document.environment }}</ng-container></p>
          <button type="button" class="ui-button ui-button--secondary" [disabled]="documentPhase === 'reading'" (click)="refreshDocument()">Actualizar estado documental</button>
        </section>
        <section class="note-delivery" aria-labelledby="delivery-note-title">
          <h3 id="delivery-note-title">{{ delivery.receiptType === 'TICKET' ? 'Nota de venta · No fiscal' : 'Nota interna de la venta · No fiscal' }}</h3>
          <label>Formato de nota<select aria-label="Formato de nota" [value]="session.format" [disabled]="busy" (change)="changeFormat($any($event.target).value)">
            <option value="a4">A4</option><option value="ticket58">Ticket 58 mm</option><option value="ticket80">Ticket 80 mm</option>
          </select></label>
          <p role="status" *ngIf="busy">{{ session.phase() === 'reading' ? 'Consultando la venta autorizada…' : 'Preparando nota…' }}</p>
          <p role="alert" *ngIf="session.error()">{{ session.error() }}</p>
          <button type="button" class="ui-button ui-button--secondary" *ngIf="session.error()" (click)="retryNote()">Reintentar nota</button>
          <p role="status" *ngIf="session.note()?.status === 'VOIDED'">La venta fue anulada. La nota conservará los importes originales y la indicación ANULADA.</p>
          <div class="note-actions">
            <button type="button" class="ui-button ui-button--secondary" [disabled]="!ready" (click)="output('print')">Imprimir</button>
            <button type="button" class="ui-button ui-button--secondary" [disabled]="!ready" (click)="output('download')">Descargar PDF</button>
            <a class="ui-button ui-button--secondary" [routerLink]="['/ventas',delivery.saleId]">Ver detalle</a>
          </div>
          <p role="status" *ngIf="session.message()">{{ session.message() }}</p>
        </section>
        <button type="button" class="ui-button ui-button--primary new-sale" (click)="close(true)">Nueva venta</button>
      </section>
    </div>`,
  styles: [`:host{display:contents}.delivery-backdrop{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:1rem;box-sizing:border-box}.delivery-card{width:min(34rem,100%);max-height:calc(100dvh - 2rem);overflow:auto;padding:1rem;box-sizing:border-box;display:grid;gap:.85rem;overflow-wrap:anywhere}.delivery-card header{display:flex;justify-content:space-between;gap:.6rem;align-items:center}.delivery-card h2{font-size:1.25rem;margin:0}.delivery-card h3{font-size:1rem;margin:0}.delivery-card p{margin:0;font-size:.875rem;line-height:1.5}.confirmed-total{font-size:1.1rem!important;font-variant-numeric:tabular-nums}.close-delivery{min-width:44px;flex-shrink:0;background:transparent;border:1px solid var(--color-border-default);font-size:1.35rem}.note-delivery{display:grid;gap:.7rem;border-block:1px solid var(--color-border-default);padding-block:.8rem}.note-delivery label{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}.note-delivery select{min-height:44px;max-width:100%;background:var(--color-bg-surface);color:var(--color-text-primary);border:1px solid var(--color-border-default);border-radius:var(--radius-sm);padding:.45rem}.note-actions{display:flex;gap:.5rem;flex-wrap:wrap}.delivery-card .ui-button{min-height:44px;white-space:normal}.electronic-state{display:grid;gap:.6rem;color:var(--color-text-secondary)}.electronic-state .ui-button{justify-self:start}.new-sale{width:100%}@media(max-width:360px){.delivery-backdrop{padding:.5rem}.delivery-card{padding:.75rem;max-height:calc(100dvh - 1rem)}.note-actions>*{flex:1 1 100%}.delivery-card h2{font-size:1.1rem}}`],
})
export class PosSaleNoteComponent implements DoCheck, OnDestroy {
  current: PosConfirmedDelivery | null = null;
  visible = false;
  documentPhase: "idle" | "reading" | "pending" | "present" | "error" = "idle";
  documentPresentation: DocumentView | null = null;
  private previousKey = "";
  private generation = 0;
  private reads = new Subscription();
  private focusTimer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  private readonly currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  @Output() readonly newSale = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();
  @Input() set delivery(value: PosConfirmedDelivery | null) {
    if (!value) { this.visible = false; return; }
    if (value.credential !== this.auth.getToken()) return;
    const key = JSON.stringify([value.credential, value.operationId, value.saleId]);
    if (key === this.previousKey) return;
    this.previousKey = key; this.current = value; this.visible = true;
    this.reads.unsubscribe(); this.reads = new Subscription(); this.generation++;
    this.documentPresentation = null; this.documentPhase = "idle";
    this.session.format = "a4"; void this.session.load(value.saleId, false);
  }
  constructor(readonly session: NoteSession, private readonly auth: AuthService, private readonly documents: ElectronicDocumentService) {}
  ngDoCheck(): void {
    if (this.current && this.current.credential !== this.auth.getToken()) {
      this.generation++; this.reads.unsubscribe(); this.current = null; this.visible = false; this.documentPresentation = null; this.documentPhase = "idle";
    }
  }
  private valid(generation: number, delivery: PosConfirmedDelivery): boolean {
    return !this.destroyed && this.current === delivery && this.generation === generation && delivery.credential === this.auth.getToken();
  }
  get busy(): boolean { return ["reading", "generating", "slow"].includes(this.session.phase()); }
  get ready(): boolean { return !!this.current && this.current.credential === this.auth.getToken() && this.session.isReadyFor(this.current.saleId, false); }
  formatTotal(total: number): string { return this.currency.format(total); }
  close(startNew = false): void {
    this.visible = false;
    // Keep NoteSession mounted: closing this presentation must not revoke a viewer's PDF or cancel its print dialog.
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => { if (!this.destroyed) { if (startNew) this.newSale.emit(); else this.closed.emit(); } }, 0);
  }
  changeFormat(value: string): void { if (["a4", "ticket58", "ticket80"].includes(value) && this.current?.credential === this.auth.getToken()) void this.session.changeFormat(value as NoteFormat); }
  output(action: "print" | "download"): void { if (this.ready) void this.session.output(action); }
  retryNote(): void { if (this.current?.credential === this.auth.getToken()) void this.session.load(this.current.saleId, false); }
  refreshDocument(): void {
    this.reads.unsubscribe(); this.reads = new Subscription(); const generation = ++this.generation, delivery = this.current;
    this.documentPresentation = null; this.documentPhase = "idle";
    if (!delivery || delivery.receiptType === "TICKET" || delivery.credential !== this.auth.getToken()) return;
    this.documentPhase = "reading";
    this.reads.add(this.documents.listBySaleId(delivery.saleId, createBoundAuthContext(delivery.credential)).subscribe({
      next: rows => {
        if (!this.valid(generation, delivery)) return;
        if (!Array.isArray(rows)) { this.documentPhase = "error"; return; }
        if (!rows.length) { this.documentPhase = "pending"; return; }
        const document = rows[0];
        if (!document) { this.documentPhase = "error"; return; }
        const view = documentView({ hasElectronicDocument:true, documentId:document.id, documentType:document.documentType,
          fullNumber:document.fullNumber, status:document.status, environment:document.environment });
        if (document.saleId !== delivery.saleId || view.kind !== "present" || !view.knownStatus
            || !["LOCAL", "BETA", "PROD"].includes(document.environment) || !["RECEIPT", "INVOICE"].includes(document.documentType)
            || (delivery.receiptType !== "UNKNOWN" && document.documentType !== delivery.receiptType)) {
          this.documentPhase = "error"; return;
        }
        this.documentPresentation = view; this.documentPhase = "present";
      }, error: () => { if (this.valid(generation, delivery)) { this.documentPresentation = null; this.documentPhase = "error"; } },
    }));
  }
  ngOnDestroy(): void { this.destroyed = true; this.generation++; this.reads.unsubscribe(); clearTimeout(this.focusTimer); }
}
