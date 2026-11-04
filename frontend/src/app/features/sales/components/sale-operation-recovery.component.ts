import { CommonModule } from "@angular/common";
import { HttpContext } from "@angular/common/http";
import { Component, DoCheck, EventEmitter, HostListener, Input, OnDestroy, Output } from "@angular/core";
import { PosDialogFocusDirective } from "./pos-dialog-focus.directive";
import { RouterLink } from "@angular/router";
import { defer, Observable, Subscription, switchMap, map } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { BoundAuthSessionError, createBoundAuthContext } from "../../../core/auth/bound-auth-context";
import { SaleOperation, SaleOperationPage, SaleOperationsService } from "../data/sale-operations.service";
import { toHttpErrorMessage } from "../data/http-error-message";

@Component({
  selector: "app-sale-operation-recovery",
  imports: [CommonModule, RouterLink, PosDialogFocusDirective],
  template: `
    <button type="button" class="ui-button ui-button--secondary" [class.pending-launcher]="contextual" (click)="toggle()" [attr.aria-expanded]="open"
      [attr.aria-label]="contextual ? pendingLabel : null" [title]="contextual ? pendingLabel : ''">
      {{ contextual ? 'Pendientes' : open ? 'Ocultar operaciones' : 'Recuperar operaciones' }}
      <span *ngIf="contextual && attentionCount !== null && attentionCount > 0 && !error" class="pending-count">{{ attentionCount }}</span>
      <span *ngIf="contextual && error" class="pending-error">Sin comprobar</span>
    </button>
    <div *ngIf="open && contextual" class="operations-backdrop" role="dialog" aria-modal="true" aria-labelledby="operations-title" appPosDialogFocus (posDialogClose)="toggle()">
      <div class="operations-drawer"><header class="drawer-head"><h2 id="operations-title">Operaciones</h2><button type="button" class="ui-button ui-button--secondary" (click)="toggle()">Cerrar operaciones</button></header><ng-container *ngTemplateOutlet="content"></ng-container></div>
    </div>
    <ng-container *ngIf="open && !contextual"><ng-container *ngTemplateOutlet="content"></ng-container></ng-container>
    <ng-template #content><section class="recovery" [class.contextual]="contextual" aria-label="Mis operaciones comerciales" [attr.aria-busy]="loading">
      <div *ngIf="contextual" class="filter-heading"><ng-container *ngTemplateOutlet="filters"></ng-container>
        <button type="button" class="ui-button ui-button--secondary" (click)="load(0)" [disabled]="loading">Actualizar</button>
      </div>
      <div *ngIf="!contextual" class="recovery-header"><strong>Mis operaciones</strong><ng-container *ngTemplateOutlet="filters"></ng-container>
        <button type="button" class="ui-button ui-button--secondary" (click)="load(0)" [disabled]="loading">Consultar servidor</button>
      </div>
      <ng-template #filters>
        <select aria-label="Filtrar operaciones" [value]="filter" (change)="changeFilter($any($event.target).value)" [disabled]="loading">
          <option *ngIf="contextual" value="attention">Por atender</option><option value="">{{ contextual ? 'Recientes' : 'Recientes y pendientes' }}</option><option *ngIf="!contextual" value="attention">Necesitan atención</option><option value="PREPARED">Preparadas</option><option value="COMPLETED">{{ contextual ? 'Registradas/completadas' : 'Completadas' }}</option><option value="CANCELLED">Canceladas</option>
        </select>
      </ng-template>
      <p role="status" *ngIf="loading">Consultando operaciones…</p>
      <div *ngIf="contextual && !hasListResult && !selected && !loading && !error" class="query-notice" role="status">
        <p>{{ filter === 'attention' ? attentionCount === null ? 'Aún no hemos comprobado tus pendientes' : 'Actualiza para comprobar tus pendientes' : 'Actualiza para consultar estas operaciones' }}</p>
      </div>
      <p class="query-caption" *ngIf="contextual && filter === 'attention' && hasListResult && !error && !selected">Última consulta de Por atender; no es monitoreo en tiempo real ni incluye todos los problemas fiscales.</p>
      <div role="alert" class="ui-alert ui-alert--error" *ngIf="error"><p>{{ contextual ? 'No pudimos consultar las operaciones' : error }}</p><button *ngIf="contextual" type="button" class="ui-button ui-button--secondary" (click)="load(0)" [disabled]="loading">Reintentar</button></div>
      <p *ngIf="(!contextual || hasListResult) && !selected && !loading && !error && !rows.length" class="query-notice" role="status">{{ contextual ? emptyMessage : 'No hay operaciones para este filtro.' }}</p>
      <ul class="recovery-list" *ngIf="!contextual || !selected">
        <li *ngFor="let row of rows" [attr.data-operation-id]="row.operationId">
          <ng-container *ngIf="contextual; else legacyRow">
            <div class="operation-copy"><strong>{{ stateLabel(row) }}</strong><span *ngIf="row.state === 'COMPLETED'" class="operation-document">{{ documentLabel(row) }}</span><span *ngIf="row.state === 'PREPARED'">Aún no se ha confirmado la venta</span><span *ngIf="row.state === 'RESULT_UNAVAILABLE'">Todavía no sabemos si esta compra se registró</span><time>{{ row.createdAt | date:'short' }}</time></div>
            <a *ngIf="row.state === 'COMPLETED' && !needsDocumentRecovery(row) && row.saleId; else inspectRow" class="ui-button ui-button--secondary" [routerLink]="['/ventas', row.saleId]" [attr.aria-label]="'Ver venta #' + row.saleId">Ver venta</a>
            <ng-template #inspectRow><button type="button" class="ui-button ui-button--secondary" [disabled]="loading" (click)="select(row.operationId)">{{ row.state === 'PREPARED' ? 'Revisar preparación' : row.state === 'RESULT_UNAVAILABLE' ? 'Comprobar resultado' : row.state === 'COMPLETED' && needsDocumentRecovery(row) && applicable(row) ? 'Continuar documento' : 'Ver detalles' }}</button></ng-template>
          </ng-container>
          <ng-template #legacyRow><button type="button" class="ui-button ui-button--secondary" [disabled]="loading" (click)="select(row.operationId)">{{ stateLabel(row) }} · {{ row.origin === 'QUOTE' ? 'Cotización #' + row.quoteId : 'POS' }} · {{ row.createdAt | date:'short' }}</button><span *ngIf="row.saleId">Venta #{{ row.saleId }}</span></ng-template>
        </li>
      </ul>
      <nav aria-label="Páginas de operaciones" *ngIf="totalPages > 1 && (!contextual || !selected)">
        <button type="button" class="ui-button ui-button--secondary" [disabled]="loading || page === 0" (click)="load(page - 1)">Anterior</button>
        <span>Página {{ page + 1 }} de {{ totalPages }}</span>
        <button type="button" class="ui-button ui-button--secondary" [disabled]="loading || page + 1 >= totalPages" (click)="load(page + 1)">Siguiente</button>
      </nav>
      <div *ngIf="selected" class="recovery-detail" role="status" tabindex="-1" [attr.data-operation-id]="selected.operationId">
        <button *ngIf="contextual" type="button" class="ui-button ui-button--secondary" (click)="closeSelection()" [disabled]="loading">Volver a operaciones</button>
        <strong>{{ stateLabel(selected) }}</strong>
        <p *ngIf="!contextual || selected.state !== 'COMPLETED' || needsDocumentRecovery(selected)">Caja original: {{ selected.cashRegisterSessionId ?? 'histórica' }}. Conserva esta compra en su caja y almacén originales.</p>
        <p>{{ contextual ? documentLabel(selected) : receiptLabel(selected) }}</p><details><summary>{{ contextual ? 'Detalles técnicos' : 'Referencias para soporte' }}</summary><p>Operación: {{ selected.operationId }}</p><p>{{ selected.state }} · {{ selected.receiptIntent?.receiptType }} · {{ selected.receiptState }}</p><p *ngIf="contextual && selected.cashRegisterSessionId">Caja original: #{{ selected.cashRegisterSessionId }}</p><p *ngIf="selected.documentId">Documento #{{ selected.documentId }}<span *ngIf="selected.documentStatus"> · {{ selected.documentStatus }}</span></p></details>
        <p *ngIf="selected.documentStatus === 'DRAFT'">Borrador local; pendiente de procesamiento fiscal.</p>
        <p *ngIf="selected.state === 'PREPARED'">La venta aún no está confirmada. Reanudar requiere una acción explícita y conserva los importes originales.</p>
        <p *ngIf="selected.state === 'CANCELLED'">Esta identidad fue cancelada y no puede reutilizarse.</p>
        <p *ngIf="selected.state === 'RESULT_UNAVAILABLE'">El resultado no está disponible. Conserva esta referencia para revisión; no repitas el cobro.</p>
        <button *ngIf="contextual && selected.state === 'RESULT_UNAVAILABLE'" type="button" class="ui-button ui-button--secondary" (click)="select(selected.operationId)" [disabled]="loading">Comprobar resultado</button>
        <button *ngIf="selected.state === 'PREPARED' && applicable(selected)" type="button" class="ui-button ui-button--primary" (click)="resume.emit(selected)" [disabled]="loading">{{ contextual ? 'Revisar preparación' : 'Revisar y reanudar esta operación' }}</button>
        <button *ngIf="selected.state === 'COMPLETED' && applicable(selected) && (!contextual || needsDocumentRecovery(selected))" type="button" class="ui-button ui-button--secondary" (click)="recover.emit(selected)" [disabled]="loading">{{ contextual ? 'Continuar documento' : 'Consultar esta venta' }}</button>
        <a *ngIf="selected.origin === 'QUOTE' && !applicable(selected)" class="ui-button ui-button--secondary" [routerLink]="['/cotizaciones', selected.quoteId, 'convertir']">Abrir conversión de cotización</a>
        <a *ngIf="selected.saleId" class="ui-button ui-button--secondary" [routerLink]="['/ventas', selected.saleId]" [attr.aria-label]="'Ver venta #' + selected.saleId">{{ contextual ? 'Ver venta' : 'Ver venta #' + selected.saleId }}</a>
        <button *ngIf="selected.state === 'PREPARED' && !confirmCancel" type="button" class="ui-button ui-button--secondary" (click)="confirmCancel = true" [disabled]="loading">Cancelar preparación</button>
        <div *ngIf="confirmCancel"><p>¿Cancelar esta preparación? La identidad quedará cerrada sin ejecutar una venta.</p>
          <button type="button" class="ui-button ui-button--secondary" (click)="cancelSelected()" [disabled]="loading">Confirmar cancelación</button>
          <button type="button" class="ui-button ui-button--secondary" (click)="confirmCancel = false" [disabled]="loading">Conservar preparación</button>
        </div>
      </div>
    </section></ng-template>
  `,
  styles: [`:host{display:block}.recovery{margin-top:.5rem;max-height:24rem;overflow:auto;padding:.75rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-bg-surface)}.recovery-header,nav,.recovery-list li{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.recovery-list{padding:0;list-style:none;display:grid;gap:.5rem}.recovery-detail{margin-top:.5rem;border-top:1px solid var(--color-border-default);padding-top:.5rem;overflow-wrap:anywhere}.recovery-detail .ui-button{margin:.2rem}.recovery-detail p{margin:.4rem 0}select{max-width:100%;min-height:44px}.ui-button{min-height:44px}.operations-backdrop{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.12);display:flex;justify-content:flex-end}.operations-drawer{width:min(520px,100%);height:100%;overflow:auto;padding:1rem;background:var(--color-bg-surface);color:var(--color-text-primary)}.drawer-head{display:flex;justify-content:space-between;gap:1rem;align-items:center}.drawer-head h2{font-size:1.25rem}.operations-drawer .recovery{max-height:none;overflow:visible;border:0;padding:0}.recovery-list li{border-bottom:1px solid var(--color-border-default);padding-block:.6rem}.recovery-list .ui-button{white-space:normal;text-align:left}.recovery-detail summary{min-height:44px;cursor:pointer}.operations-drawer{box-sizing:border-box;box-shadow:-8px 0 32px #0003}.drawer-head{position:sticky;top:-1rem;background:var(--color-bg-surface);z-index:1;padding-block:.5rem;border-bottom:1px solid var(--color-border-default)}.drawer-head h2{margin:0;font-size:1.15rem}.drawer-head button{padding:.45rem .65rem;font-size:.8rem}.filter-heading{display:flex;justify-content:space-between;align-items:center;gap:.5rem;min-height:44px;margin-top:.75rem;margin-bottom:var(--space-4)}.filter-heading select{flex:1;min-width:0;width:0;padding:.5rem;background:var(--color-bg-surface);color:var(--color-text-primary);border:1px solid var(--color-border-default);border-radius:var(--radius-md)}.query-caption,.operation-copy time,.operation-copy>span{font-size:.8rem;color:var(--color-text-secondary);line-height:1.5}.query-notice{padding:1rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);line-height:1.5}.query-notice p{margin:0}.contextual .recovery-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem .75rem;padding-block:.85rem;align-items:center}.operation-copy{display:grid;gap:.25rem;overflow-wrap:anywhere}.contextual .recovery-list .ui-button{font-size:.8rem;max-width:145px;text-align:center;justify-content:center;padding:.5rem .65rem}.contextual .recovery-detail>strong{display:block;margin-block:.75rem}.pending-launcher{white-space:normal;gap:.4rem}.pending-count{border-radius:999px;padding:.05rem .45rem;background:var(--color-bg-surface);color:var(--color-text-primary);font-size:.8rem}.pending-error{font-size:.75rem}.operations-drawer .ui-button:focus-visible,.pending-launcher:focus-visible,.contextual summary:focus-visible,.contextual select:focus-visible{outline:2px solid var(--color-text-primary);outline-offset:2px}@media(max-width:360px){.operations-drawer{padding:.75rem}.contextual .recovery-list li{grid-template-columns:minmax(0,1fr)}.contextual .recovery-list .ui-button{justify-self:start;max-width:100%}}`],
})
export class SaleOperationRecoveryComponent implements OnDestroy, DoCheck {
  @Input() contextual = false;
  attentionCount: number | null = null;
  @Input() origin: "POS" | "QUOTE" = "POS";
  @Input() quoteId: number | null = null;
  @Output() resume = new EventEmitter<SaleOperation>();
  @Output() recover = new EventEmitter<SaleOperation>();
  @Output() cancelled = new EventEmitter<SaleOperation>();
  @Output() selectionChange = new EventEmitter<void>();
  open = false;
  loading = false;
  hasListResult = false;
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
    this.selectionChange.emit();
    this.generation++; this.active.unsubscribe(); this.clear();
    this.error = "La sesión cambió. Consulta nuevamente para ver solo las operaciones del usuario autenticado.";
  }
  toggle(): void {
    this.selectionChange.emit();
    this.open = !this.open;
    if (this.open) {
      if (this.contextual) { if (this.filter !== 'attention') this.error = ''; this.filter = 'attention'; }
      if (!this.contextual) this.load(0);
    }
    else {
      const attention = this.attentionCount, token = this.loadedToken, owner = this.owner;
      this.generation++; this.active.unsubscribe(); this.clear();
      // Keep only the last verified count. The session watchdog still invalidates it on credential change.
      this.attentionCount = attention; this.loadedToken = token; this.owner = owner;
    }
  }
  changeFilter(filter: string): void { this.selectionChange.emit(); this.filter = filter; this.selected = null; this.load(0); }
  closeSelection(): void { this.selectionChange.emit(); this.selected = null; this.confirmCancel = false; }
  get emptyMessage(): string {
    return this.filter === 'attention' ? 'No se encontraron operaciones por atender' : this.filter === 'PREPARED' ? 'No se encontraron compras preparadas'
      : this.filter === 'COMPLETED' ? 'No se encontraron operaciones registradas' : this.filter === 'CANCELLED' ? 'No se encontraron operaciones canceladas' : 'No se encontraron operaciones recientes';
  }
  get pendingLabel(): string {
    return this.error ? 'Pendientes: no se pudo comprobar el estado' : this.attentionCount === null ? 'Pendientes: estado no verificado'
      : 'Pendientes: ' + this.attentionCount + ' en la última consulta';
  }
  applicable(row: SaleOperation): boolean { return row.origin === this.origin && (this.origin === "POS" || row.quoteId === this.quoteId); }
  stateLabel(row: SaleOperation): string {
    if (this.contextual) return row.state === "PREPARED" ? "Compra preparada"
      : row.state === "COMPLETED" ? row.saleId ? 'Venta #' + row.saleId + ' · Registrada' : "Venta registrada"
      : row.state === "CANCELLED" ? "Preparación cancelada" : "Venta por verificar";
    return row.state === "PREPARED" ? "Preparación conservada" : row.state === "COMPLETED" ? "Venta registrada" : row.state === "CANCELLED" ? "Preparación cancelada" : "Resultado no disponible";
  }
  needsDocumentRecovery(row: SaleOperation): boolean { return row.protocolVersion === 1 && row.state === 'COMPLETED' && !!row.saleId && ['PENDING','REVIEW_REQUIRED'].includes(row.receiptState); }
  documentLabel(row: SaleOperation): string {
    const type = row.receiptIntent?.receiptType;
    if (type === 'TICKET') return row.protocolVersion === 1 && row.receiptState === 'NOT_REQUIRED' && !row.receiptIntent?.payload && !row.documentId && !row.documentStatus
      ? 'Nota de venta · No fiscal' : 'Documento no verificado';
    if (type !== 'RECEIPT' && type !== 'INVOICE') return 'Documento no verificado';
    const name = type === 'RECEIPT' ? 'Boleta electrónica' : 'Factura electrónica';
    if (row.receiptState === 'PENDING' && !row.documentId && !row.documentStatus) return name + ' · Solicitada';
    if (row.receiptState === 'REVIEW_REQUIRED') return name + ' · En revisión';
    if (row.receiptState !== 'LOCATED' || !row.documentId) return name + ' · Estado no verificado';
    // The operation projection carries document status, but no environment. Never imply SUNAT production acceptance.
    const status = row.documentStatus === 'DRAFT' ? 'Borrador' : row.documentStatus === 'GENERATED' ? 'Generada'
      : row.documentStatus === 'SIGNED' ? 'Firmada' : row.documentStatus === 'SENT' ? 'Enviada'
      : row.documentStatus === 'ACCEPTED' ? 'Aceptación registrada; validez fiscal no verificada'
      : row.documentStatus === 'REJECTED' ? 'Rechazada' : row.documentStatus === 'CANCELLED' ? 'Cancelada'
      : row.documentStatus === 'ERROR' ? 'En revisión' : null;
    return name + ' · ' + (status ? status + ' · Ambiente no verificado' : 'Estado no verificado');
  }
  receiptLabel(row: SaleOperation): string {
    return row.receiptState === "NOT_REQUIRED" ? "Sin solicitud de documento electrónico" : row.receiptState === "LOCATED" ? "Documento localizado; consulta su estado fiscal por separado" : row.receiptState === "REVIEW_REQUIRED" ? "Se requiere revisión documental; no se inferirá una intención fiscal" : "Venta registrada; documento por resolver. Consulta antes de continuar";
  }
  load(page: number): void { this.selectionChange.emit(); this.selected = null; this.hasListResult = false; this.query(context => this.operations.list(page, context, this.filter === "attention" ? undefined : this.filter || undefined, this.filter === "attention"), result => { if (this.filter === "attention") this.attentionCount = result.totalItems; this.hasListResult = true; this.rows = result.items; this.page = result.page; this.totalPages = result.totalPages; }); }
  select(id: string): void { this.selectionChange.emit(); this.selected = null; this.confirmCancel = false; this.query(context => this.operations.get(id, context), row => this.selected = row); }
  cancelSelected(): void {
    const selected = this.selected;
    if (!selected || selected.state !== "PREPARED" || !this.confirmCancel) return;
    this.query(context => this.operations.cancel(selected.operationId, context), row => { this.selected = row; this.rows = this.rows.map(r => r.operationId === row.operationId ? row : r); this.confirmCancel = false; this.cancelled.emit(row); });
  }
  private clear(): void { this.attentionCount = null; this.hasListResult = false; this.rows = []; this.selected = null; this.owner = null; this.loadedToken = null; this.loading = false; this.confirmCancel = false; }
  private query<T>(request: (context: HttpContext) => Observable<T>, accept: (value: T) => void): void {
    this.active.unsubscribe(); this.active = new Subscription(); const generation = ++this.generation;
    this.loading = true; this.error = "";
    this.active.add(defer(() => {
      const token = this.auth.getToken(); const context = createBoundAuthContext(token);
      this.loadedToken = token;
      return this.auth.me(context).pipe(switchMap(actor => {
        if (this.owner !== actor.id) { this.attentionCount = null; this.hasListResult = false; this.rows = []; this.selected = null; this.owner = actor.id; }
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
