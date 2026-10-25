import { CommonModule } from "@angular/common";
import { HttpContext } from "@angular/common/http";
import { Component, DoCheck, EventEmitter, HostListener, Input, OnDestroy, Output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { defer, Observable, Subscription, switchMap, map } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { BoundAuthSessionError, createBoundAuthContext } from "../../../core/auth/bound-auth-context";
import { SaleOperation, SaleOperationPage, SaleOperationsService } from "../data/sale-operations.service";
import { toHttpErrorMessage } from "../data/http-error-message";

@Component({
  selector: "app-sale-operation-recovery",
  imports: [CommonModule, RouterLink],
  template: `
    <button type="button" class="ui-button ui-button--secondary" (click)="toggle()" [attr.aria-expanded]="open">{{ open ? 'Ocultar operaciones' : 'Recuperar operaciones' }}</button>
    <section *ngIf="open" class="recovery" aria-label="Mis operaciones comerciales" [attr.aria-busy]="loading">
      <div class="recovery-header"><strong>Mis operaciones</strong>
        <select aria-label="Filtrar operaciones" [value]="filter" (change)="changeFilter($any($event.target).value)" [disabled]="loading">
          <option value="">Recientes y pendientes</option><option value="PREPARED">Preparadas</option><option value="COMPLETED">Completadas</option><option value="CANCELLED">Canceladas</option>
        </select>
        <button type="button" class="ui-button ui-button--secondary" (click)="load(0)" [disabled]="loading">Consultar servidor</button>
      </div>
      <p role="status" *ngIf="loading">Consultando operaciones…</p>
      <p role="alert" class="ui-alert ui-alert--error" *ngIf="error">{{ error }}</p>
      <p *ngIf="!loading && !error && !rows.length">No hay operaciones para este filtro.</p>
      <ul class="recovery-list">
        <li *ngFor="let row of rows">
          <button type="button" class="ui-button ui-button--secondary" [disabled]="loading" (click)="select(row.operationId)">
            {{ row.state === 'PREPARED' ? 'Preparada' : row.state === 'COMPLETED' ? 'Completada' : row.state === 'CANCELLED' ? 'Cancelada' : 'Resultado no disponible' }} · {{ row.origin === 'QUOTE' ? 'Cotización #' + row.quoteId : 'POS' }} · {{ row.createdAt | date:'short' }} · {{ row.operationId.slice(0, 8) }}
          </button>
          <span *ngIf="row.saleId">Venta #{{ row.saleId }}</span>
        </li>
      </ul>
      <nav aria-label="Páginas de operaciones" *ngIf="totalPages > 1">
        <button type="button" class="ui-button ui-button--secondary" [disabled]="loading || page === 0" (click)="load(page - 1)">Anterior</button>
        <span>Página {{ page + 1 }} de {{ totalPages }}</span>
        <button type="button" class="ui-button ui-button--secondary" [disabled]="loading || page + 1 >= totalPages" (click)="load(page + 1)">Siguiente</button>
      </nav>
      <div *ngIf="selected" class="recovery-detail" role="status" tabindex="-1">
        <strong>Operación {{ selected.operationId }}</strong>
        <p>Estado comercial: {{ selected.state }}. Caja original: {{ selected.cashRegisterSessionId ?? 'histórica' }}.</p>
        <p>Comprobante: {{ selected.receiptIntent?.receiptType ?? 'sin intención recuperable' }} · {{ selected.receiptState }}<span *ngIf="selected.documentId"> · #{{ selected.documentId }} ({{ selected.documentStatus }})</span></p>
        <p *ngIf="selected.documentStatus === 'DRAFT'">Borrador local; pendiente de procesamiento fiscal.</p>
        <p *ngIf="selected.state === 'PREPARED'">La venta aún no está confirmada. Reanudar requiere una acción explícita y conserva los importes originales.</p>
        <p *ngIf="selected.state === 'CANCELLED'">Esta identidad fue cancelada y no puede reutilizarse.</p>
        <p *ngIf="selected.state === 'RESULT_UNAVAILABLE'">El resultado no está disponible. Conserva esta referencia para revisión; no repitas el cobro.</p>
        <button *ngIf="selected.state === 'PREPARED' && applicable(selected)" type="button" class="ui-button ui-button--primary" (click)="resume.emit(selected)" [disabled]="loading">Revisar y reanudar esta operación</button>
        <button *ngIf="selected.state === 'COMPLETED' && applicable(selected)" type="button" class="ui-button ui-button--secondary" (click)="recover.emit(selected)" [disabled]="loading">Consultar esta venta</button>
        <a *ngIf="selected.origin === 'QUOTE' && !applicable(selected)" class="ui-button ui-button--secondary" [routerLink]="['/cotizaciones', selected.quoteId, 'convertir']">Abrir conversión de cotización</a>
        <a *ngIf="selected.saleId" class="ui-button ui-button--secondary" [routerLink]="['/ventas', selected.saleId]">Ver venta #{{ selected.saleId }}</a>
        <button *ngIf="selected.state === 'PREPARED' && !confirmCancel" type="button" class="ui-button ui-button--secondary" (click)="confirmCancel = true" [disabled]="loading">Cancelar preparación</button>
        <div *ngIf="confirmCancel"><p>¿Cancelar esta preparación? La identidad quedará cerrada sin ejecutar una venta.</p>
          <button type="button" class="ui-button ui-button--secondary" (click)="cancelSelected()" [disabled]="loading">Confirmar cancelación</button>
          <button type="button" class="ui-button ui-button--secondary" (click)="confirmCancel = false" [disabled]="loading">Conservar preparación</button>
        </div>
      </div>
    </section>
  `,
  styles: [`:host{display:block}.recovery{margin-top:.5rem;max-height:24rem;overflow:auto;padding:.75rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-bg-surface)}.recovery-header,nav,.recovery-list li{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.recovery-list{padding:0;list-style:none;display:grid;gap:.5rem}.recovery-detail{margin-top:.5rem;border-top:1px solid var(--color-border-default);padding-top:.5rem;overflow-wrap:anywhere}.recovery-detail .ui-button{margin:.2rem}.recovery-detail p{margin:.4rem 0}select{max-width:100%}`],
})
export class SaleOperationRecoveryComponent implements OnDestroy, DoCheck {
  @Input() origin: "POS" | "QUOTE" = "POS";
  @Input() quoteId: number | null = null;
  @Output() resume = new EventEmitter<SaleOperation>();
  @Output() recover = new EventEmitter<SaleOperation>();
  @Output() cancelled = new EventEmitter<SaleOperation>();
  open = false;
  loading = false;
  error = "";
  filter = "";
  rows: SaleOperation[] = [];
  selected: SaleOperation | null = null;
  page = 0;
  totalPages = 0;
  confirmCancel = false;
  private owner: string | null = null;
  private loadedToken: string | null = null;
  private generation = 0;
  private active = new Subscription();
  constructor(private readonly auth: AuthService, private readonly operations: SaleOperationsService) {}
  ngOnDestroy(): void { this.generation++; this.active.unsubscribe(); this.clear(); }
  ngDoCheck(): void {
    if (this.loadedToken && this.auth.getToken() !== this.loadedToken) this.invalidateSession();
  }
  @HostListener("window:storage", ["$event"])
  onStorage(event: StorageEvent): void {
    if (event.key === "erp_pos_token" || event.key === null) this.invalidateSession();
  }
  private invalidateSession(): void {
    this.generation++; this.active.unsubscribe(); this.clear();
    this.error = "La sesión cambió. Consulta nuevamente para ver solo las operaciones del usuario autenticado.";
  }
  toggle(): void { this.open = !this.open; if (this.open) this.load(0); else { this.generation++; this.active.unsubscribe(); this.clear(); } }
  changeFilter(filter: string): void { this.filter = filter; this.load(0); }
  applicable(row: SaleOperation): boolean { return row.origin === this.origin && (this.origin === "POS" || row.quoteId === this.quoteId); }
  load(page: number): void { this.query(context => this.operations.list(page, context, this.filter || undefined), result => { this.rows = result.items; this.page = result.page; this.totalPages = result.totalPages; }); }
  select(id: string): void { this.selected = null; this.confirmCancel = false; this.query(context => this.operations.get(id, context), row => this.selected = row); }
  cancelSelected(): void {
    const selected = this.selected;
    if (!selected || selected.state !== "PREPARED" || !this.confirmCancel) return;
    this.query(context => this.operations.cancel(selected.operationId, context), row => { this.selected = row; this.rows = this.rows.map(r => r.operationId === row.operationId ? row : r); this.confirmCancel = false; this.cancelled.emit(row); });
  }
  private clear(): void { this.rows = []; this.selected = null; this.owner = null; this.loadedToken = null; this.loading = false; this.confirmCancel = false; }
  private query<T>(request: (context: HttpContext) => Observable<T>, accept: (value: T) => void): void {
    this.active.unsubscribe(); this.active = new Subscription(); const generation = ++this.generation;
    this.loading = true; this.error = "";
    this.active.add(defer(() => {
      const token = this.auth.getToken(); const context = createBoundAuthContext(token);
      this.loadedToken = token;
      return this.auth.me(context).pipe(switchMap(actor => {
        if (this.owner !== actor.id) { this.rows = []; this.selected = null; this.owner = actor.id; }
        return request(context).pipe(map(value => {
          if (this.auth.getToken() !== token || generation !== this.generation) throw new BoundAuthSessionError();
          return value;
        }));
      }));
    }).subscribe({ next: value => { this.loading = false; accept(value); }, error: error => {
      this.loading = false; this.clear(); this.error = toHttpErrorMessage(error, "No se pudieron consultar tus operaciones. Verifica tu sesión y vuelve a consultar.");
    } }));
  }
}
