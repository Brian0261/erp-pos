import { HttpErrorResponse } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { afterNextRender, Component, DestroyRef, DoCheck, ElementRef, HostListener, inject, Injector, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { firstValueFrom, forkJoin, Observable, Subject, Subscription, takeUntil, timeout } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { createBoundAuthContext } from "../../core/auth/bound-auth-context";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { formatCommercialInstant } from "../../shared/utils/commercial-date";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { CashRegisterService } from "./data/cash-register.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";
import { blocksInternalVoid, latestSaleDocument } from "./sale-document-verification";
import { filtersFromContext, salesContext, saleStatusLabel } from "./sales-presentation";
import { SaleVoidAttempt, SaleVoidAttempts, saleVoidAttemptKey } from "./sale-void-attempts";

interface VoidScope {
  readonly id: number;
  readonly token: string;
  readonly session: symbol;
  readonly cancelled: Subject<void>;
}

@Component({
    selector: "app-sale-void-page",
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <section class="ui-card sale-void-page">
      <header class="ui-page-head">
        <div>
          <h1 #voidTitle class="ui-page-title" tabindex="-1">Anular venta</h1>
          <p class="ui-page-description">
            Verifica la venta y registra el motivo de anulación.
          </p>
        </div>
        <a class="ui-button ui-button--secondary" [routerLink]="saleId ? ['/ventas', saleId] : ['/ventas']"
          [queryParams]="listContext">{{ saleId ? 'Volver al detalle' : 'Volver al listado' }}</a>
      </header>

      <p role="alert" class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p role="status" class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p role="status" class="ui-alert ui-alert--info" *ngIf="loading">Verificando venta, caja y comprobante…</p>
      <div *ngIf="attemptState === 'uncertain'" class="ui-alert ui-alert--warning">
        <strong>Resultado por verificar</strong>
        <p role="status">{{ verificationMessage }}</p>
        <button class="ui-button ui-button--secondary" type="button" [disabled]="verifying" (click)="verifyOutcome()">Consultar estado</button>
        <p>Si no puedes confirmar el resultado aquí, vuelve al detalle y verifica con el responsable de caja antes de intentar otra anulación.</p>
      </div>
      <p role="status" class="ui-alert ui-alert--info" *ngIf="attemptState === 'sending'">Anulación en curso…</p>
      <button *ngIf="canReload" type="button" class="ui-button ui-button--secondary" (click)="reload()">Reintentar verificación</button>

      <ng-container *ngIf="sale && !loading">
        <article class="summary">
          <div class="summary-head">
            <h2>Venta objetivo</h2>
            <span
              class="ui-badge"
              [class.ui-badge--success]="sale.status === 'COMPLETED'"
              [class.ui-badge--danger]="sale.status !== 'COMPLETED'"
            >
              {{ saleStatusLabel(sale.status) }}
            </span>
          </div>

          <div class="summary-grid">
            <p>
              <strong>Venta:</strong> {{ sale.saleNumber }} (#{{ sale.id }})
            </p>
            <p>
              <strong>Total:</strong> {{ formatCurrency(sale.totalAmount) }}
            </p>
            <p>
              <strong>Fecha:</strong>
              {{ formatDateTime(sale.soldAt) }}
            </p>
          </div>
        </article>

        <article class="warning-panel">
          <p>
            Venta {{ sale.saleNumber }}. {{ voidEffects }}
          </p>
          <p class="warning-panel__secondary">
            Un comprobante electrónico activo bloquea la anulación interna.
          </p>
        </article>

        <form *ngIf="sale.status === 'COMPLETED' && !attemptState" [formGroup]="voidForm" (ngSubmit)="voidSale()" class="void-form">
          <label class="field">
            <span>Motivo *</span>
            <textarea
              formControlName="reason"
              maxlength="400"
              placeholder="Describe brevemente por qué se anula la venta"
            ></textarea>
          </label>

          <div class="actions">
            <a
              class="ui-button ui-button--secondary"
              [routerLink]="['/ventas', sale.id]"
              [queryParams]="listContext"
              >Cancelar</a
            >
            <button
              #confirmTrigger
              type="submit"
              class="ui-button ui-button--danger"
              [disabled]="submitting || !canVoidSale()"
            >
              Confirmar anulación
            </button>
          </div>
        </form>

        <p class="ui-alert ui-alert--info" *ngIf="blockedReason">{{ blockedReason }}</p>
      </ng-container>
    </section>
  `,
    styles: [
        `
      .sale-void-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h1 {
        margin: 0;
      }

      .summary {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .summary-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: var(--space-2);
      }

      .summary p {
        margin: 0;
      }

      .warning-panel {
        border: 1px solid #fecaca;
        background: #fff1f2;
        color: #881337;
        border-radius: var(--radius-md);
        padding: var(--space-3);
      }

      .warning-panel p {
        margin: 0;
        font-weight: 700;
      }

      .warning-panel__secondary {
        margin-top: var(--space-2);
        font-weight: 600;
      }

      .void-form {
        display: grid;
        gap: var(--space-3);
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      textarea,
      input {
        padding: 0.6rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .sale-void-page {
          padding: var(--space-4);
        }

        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
    ]
})
export class SaleVoidPageComponent implements OnInit, DoCheck, OnDestroy {
  @ViewChild("voidTitle") private voidTitle?: ElementRef<HTMLHeadingElement>;
  @ViewChild("confirmTrigger") private confirmTrigger?: ElementRef<HTMLButtonElement>;
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly voidEffects = "Se repondrán las cantidades vendidas al inventario y la venta dejará de computar en el cálculo de su sesión de caja. Los pagos históricos se conservan. Esta operación no realiza reembolsos automáticos ni anula el comprobante electrónico.";
  readonly voidForm = this.formBuilder.nonNullable.group({
    reason: ["", [Validators.required, Validators.maxLength(400)]],
  });
  readonly saleStatusLabel = saleStatusLabel;
  readonly formatDateTime = formatCommercialInstant;
  private readonly currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
  private readonly subscriptions = new Subscription();
  private credential: string | null = null;
  private scope: VoidScope | null = null;
  private key: string | null = null;
  private eligible = false;
  private expired = false;
  saleId: number | null = null;
  sale: SaleResponse | null = null;
  loading = true;
  submitting = false;
  verifying = false;
  canReload = false;
  errorMessage = "";
  successMessage = "";
  blockedReason = "";
  verificationMessage = "Consulta el estado antes de considerar otra acción.";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly salesService: SalesService,
    private readonly cashRegisters: CashRegisterService,
    private readonly documents: ElectronicDocumentService,
    private readonly authService: AuthService,
    private readonly confirmDialogService: ConfirmDialogService,
    private readonly attempts: SaleVoidAttempts,
  ) {}

  get listContext() { return salesContext(filtersFromContext(this.route.snapshot.queryParamMap)); }
  get attemptState() { return this.key ? this.attempts.get(this.key) : undefined; }
  formatCurrency(value: number): string { return Number.isFinite(value) ? this.currency.format(value) : "No disponible"; }

  ngOnInit(): void {
    this.credential = this.authService.getToken();
    this.subscriptions.add(this.route.paramMap.subscribe(params => {
      this.clearProtected();
      const raw = params.get("id");
      const id = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
      this.saleId = Number.isSafeInteger(id) && id > 0 ? id : null;
      void this.reload();
    }));
  }

  ngDoCheck(): void { this.checkSession(); }
  @HostListener("window:storage")
  @HostListener("window:focus")
  checkSession(): void {
    const token = this.authService.getToken();
    if (this.credential === token) return;
    this.attempts.sessionFor(token);
    this.clearProtected();
    this.errorMessage = "La sesión cambió. Vuelve a abrir la venta con la sesión actual.";
  }

  private clearProtected(): void {
    this.cancelScope();
    this.sale = null;
    this.key = null;
    this.eligible = false;
    this.loading = this.submitting = this.verifying = this.canReload = false;
    this.successMessage = this.blockedReason = "";
    this.voidForm.reset();
  }

  private cancelScope(): void {
    const scope = this.scope;
    this.scope = null;
    scope?.cancelled.next();
    scope?.cancelled.complete();
  }

  private current(scope: VoidScope): boolean {
    return !this.expired && this.scope === scope && this.authService.getToken() === scope.token;
  }

  private read<T>(request: Observable<T>, scope: VoidScope): Promise<T> {
    return firstValueFrom(request.pipe(timeout(15_000), takeUntil(scope.cancelled)));
  }

  private async verifyEligibility(scope: VoidScope, retryRejected?: SaleVoidAttempt): Promise<void> {
    this.eligible = false;
    const context = createBoundAuthContext(scope.token);
    const actor = await this.read(this.authService.me(context), scope);
    if (!this.current(scope)) return;
    if (typeof actor?.id !== "string" || !actor.id || !Array.isArray(actor.roles)
      || !actor.roles.some(role => role === "ADMIN" || role === "SUPERVISOR")) {
      this.blockedReason = "No tienes permiso para anular ventas."; return;
    }
    const sale = await this.read(this.salesService.getById(scope.id, context), scope);
    if (!this.current(scope)) return;
    if (sale?.id !== scope.id || !Number.isSafeInteger(sale.cashRegisterSessionId) || sale.cashRegisterSessionId <= 0
      || (sale.status !== "VOIDED" && sale.status !== "COMPLETED")) throw new Error("Invalid sale");
    if (actor.roles.includes("CAJERO") && (!actor.username || sale.createdBy !== actor.username)) {
      this.blockedReason = "Esta venta no pertenece al ámbito de tu sesión."; return;
    }
    const key = saleVoidAttemptKey(actor.id, scope.id);
    this.key = key;
    this.sale = sale;
    if (sale.status === "VOIDED") {
      const confirmed = this.attempts.state(key)?.kind === "confirmed";
      this.attempts.finish(key);
      this.successMessage = "Anulación confirmada.";
      this.blockedReason = "La venta ya está anulada.";
      if (confirmed) this.returnToDetail(scope);
      return;
    }
    if (this.recoverSharedAttempt(scope, key, retryRejected)) return;
    const { cash, documents } = await this.read(forkJoin({
      cash: this.cashRegisters.getById(sale.cashRegisterSessionId, context),
      documents: this.documents.listBySaleId(scope.id, context),
    }), scope);
    if (!this.current(scope)) return;
    if (this.recoverSharedAttempt(scope, key, retryRejected)) return;
    if (cash?.id !== sale.cashRegisterSessionId || !["OPEN", "CLOSED"].includes(cash.status)) throw new Error("Invalid cash session");
    const document = latestSaleDocument(documents, scope.id);
    if (retryRejected && this.attempts.state(key) === retryRejected) this.attempts.finish(key);
    if (cash.status === "CLOSED") this.blockedReason = "La sesión de caja de esta venta está cerrada.";
    else if (blocksInternalVoid(document)) this.blockedReason = "El comprobante electrónico activo impide la anulación interna.";
    else {
      this.blockedReason = "";
      this.eligible = true;
    }
  }

  private recoverSharedAttempt(scope: VoidScope, key: string, retryRejected?: SaleVoidAttempt): boolean {
    const attempt = this.attempts.state(key);
    if (!attempt || attempt === retryRejected) return false;

    // Replay the latest outcome after the actor and sale checks, even if it arrived during loading.
    this.attempts.observe(key).pipe(takeUntil(scope.cancelled)).subscribe(outcome => {
      if (!outcome || !this.current(scope) || this.key !== key) return;
      this.eligible = false;
      if (outcome.kind === "confirmed") void this.verifyOutcome();
      if (outcome.kind === "rejected") {
        if (outcome.session === scope.session) this.showRejection(scope, new HttpErrorResponse({ status: outcome.status }));
        else {
          this.canReload = true;
          this.errorMessage = "El intento anterior terminó. Verifica la venta con la sesión actual.";
        }
      }
      if (outcome.kind === "uncertain") {
        this.verificationMessage = "La venta aún figura registrada. El resultado del intento sigue por verificar.";
      }
    });
    return true;
  }

  async reload(): Promise<void> {
    if (this.submitting || this.verifying) return;
    const previousAttempt = this.canReload && this.key ? this.attempts.state(this.key) : undefined;
    this.clearProtected();
    this.errorMessage = "";
    if (!this.saleId || !this.credential || this.expired || this.credential !== this.authService.getToken()) {
      this.errorMessage = this.saleId ? "Inicia sesión para consultar esta venta." : "Identificador de venta no válido.";
      return;
    }
    const scope: VoidScope = { id: this.saleId, token: this.credential,
      session: this.attempts.sessionFor(this.credential), cancelled: new Subject<void>() };
    this.scope = scope;
    this.loading = true;
    try {
      await this.verifyEligibility(scope, previousAttempt?.kind === "rejected" ? previousAttempt : undefined);
    } catch (error) {
      this.readFailure(scope, error);
    } finally {
      if (this.current(scope)) this.loading = false;
    }
  }

  private readFailure(scope: VoidScope, error: unknown): void {
    if (!this.current(scope)) return;
    const status = (error as { status?: number } | null)?.status;
    if (status === 401) {
      this.expired = true;
      this.clearProtected();
      this.errorMessage = "Sesión vencida. Inicia sesión para verificar la venta.";
      return;
    }
    this.eligible = false;
    this.canReload = ![403, 404, 422].includes(status ?? 0);
    this.errorMessage = status === 403 || status === 422 ? "No tienes permiso para verificar la anulación de esta venta."
      : "No se pudieron verificar la venta, la caja y el comprobante. La anulación está bloqueada.";
  }

  private showRejection(scope: VoidScope, error: HttpErrorResponse): void {
    this.eligible = false;
    if ([401, 403, 404].includes(error.status) && this.key) this.attempts.finish(this.key);
    if (error.status === 401) this.readFailure(scope, error);
    else {
      this.canReload = ![403, 404].includes(error.status);
      this.errorMessage = toHttpErrorMessage(error, "El servidor rechazó la anulación.");
    }
  }

  canVoidSale(): boolean {
    return !!this.scope && this.current(this.scope) && !this.loading && this.eligible && !this.attemptState && this.sale?.status === "COMPLETED";
  }

  async voidSale(): Promise<void> {
    const scope = this.scope;
    const key = this.key;
    const sale = this.sale;
    if (!scope || !key || !sale || this.submitting || !this.canVoidSale()) return;
    const reason = this.voidForm.controls.reason.value.trim();
    if (!reason || this.voidForm.invalid) {
      this.voidForm.markAllAsTouched();
      this.errorMessage = "Ingresa un motivo válido de hasta 400 caracteres.";
      return;
    }
    this.submitting = true;
    this.errorMessage = "";
    let restoreFocus = true;
    try {
      const confirmed = await this.confirmDialogService.confirm({
        title: "Anular venta",
        description: "Vas a anular la venta " + sale.saleNumber + ". " + this.voidEffects,
        confirmText: "Anular", cancelText: "Cancelar", variant: "danger",
      });
      if (!confirmed || !this.current(scope)) return;
      try {
        await this.verifyEligibility(scope);
      } catch (error) {
        this.readFailure(scope, error);
        return;
      }
      if (!this.current(scope) || this.key !== key || !this.canVoidSale() || !this.attempts.claim(key)) return;
      restoreFocus = false;
      // Keep the attempt tracked if the operator navigates away after the POST begins.
      try {
        const updated = await firstValueFrom(this.salesService.voidSale(scope.id, { reason }, createBoundAuthContext(scope.token))
          .pipe(timeout(20_000)));
        if (updated?.id !== scope.id || updated.status !== "VOIDED") throw new Error("Unverified void response");
        this.attempts.confirm(key);
        if (this.current(scope)) {
          this.attempts.finish(key);
          this.returnToDetail(scope);
        }
      } catch (error) {
        if (error instanceof HttpErrorResponse && [400, 401, 403, 404, 409, 422].includes(error.status)) {
          this.attempts.reject(key, error.status, scope.session);
          if (this.current(scope)) this.showRejection(scope, error);
        } else {
          this.attempts.uncertain(key);
          if (this.current(scope)) await this.verifyOutcome();
        }
      }
    } finally {
      if (this.current(scope)) this.submitting = false;
      if (restoreFocus) this.restoreConfirmationFocus(scope);
    }
  }

  private restoreConfirmationFocus(scope: VoidScope): void {
    if (this.destroyRef.destroyed) return;
    afterNextRender(() => {
      if (this.confirmDialogService.currentState) return;
      const trigger = this.confirmTrigger?.nativeElement;
      if (this.current(scope) && this.canVoidSale() && trigger && !trigger.disabled) {
        trigger.focus();
      } else {
        this.voidTitle?.nativeElement.focus();
      }
    }, { injector: this.injector });
  }

  async verifyOutcome(): Promise<void> {
    const scope = this.scope;
    const key = this.key;
    if (!scope || !key || !this.current(scope) || this.verifying || this.attemptState !== "uncertain") return;
    this.verifying = true;
    this.verificationMessage = "Consultando el estado actual de la venta…";
    try {
      const sale = await this.read(this.salesService.getById(scope.id, createBoundAuthContext(scope.token)), scope);
      if (!this.current(scope)) return;
      if (sale?.id !== scope.id || !["COMPLETED", "VOIDED"].includes(sale.status)) throw new Error("Unverified sale status");
      if (sale.status === "VOIDED") {
        this.attempts.finish(key);
        this.returnToDetail(scope);
      } else this.verificationMessage = "La venta aún figura registrada. El resultado del intento sigue por verificar.";
    } catch (error) {
      if (!this.current(scope)) return;
      if ((error as { status?: number } | null)?.status === 401) this.readFailure(scope, error);
      else this.verificationMessage = "No se pudo verificar el estado de la venta. Puedes consultar de nuevo.";
    } finally {
      if (this.current(scope)) this.verifying = false;
    }
  }

  private returnToDetail(scope: VoidScope): void {
    this.eligible = false;
    void this.router.navigate(["/ventas", scope.id], { queryParams: { ...this.listContext, status: "voided" } });
  }

  ngOnDestroy(): void { this.cancelScope(); this.subscriptions.unsubscribe(); }
}
