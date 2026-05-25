import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { CashRegisterService } from "./data/cash-register.service";
import { CashRegisterResponse } from "./data/sales.models";

@Component({
  selector: "app-cash-register-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card cash-page">
      <header class="ui-page-head">
        <div>
          <h1 class="ui-page-title">Caja</h1>
          <p class="ui-page-description">
            Consola operativa para apertura, seguimiento y cierre de caja.
          </p>
        </div>

        <div class="head-actions">
          <span
            class="ui-badge session-badge"
            [ngClass]="sessionBadgeClass()"
          >
            {{ sessionBadgeLabel() }}
          </span>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="loadCurrentSession()"
            [disabled]="loadingCurrent"
          >
            {{ loadingCurrent ? "Actualizando..." : "Actualizar" }}
          </button>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <article class="panel current-session-panel">
        <header class="block-head">
          <div class="summary-copy">
            <h2>{{ currentSessionTitle() }}</h2>
            <p class="summary-copy__secondary" *ngIf="currentSession">
              {{ currentSessionSubtitle() }}
            </p>
          </div>
        </header>

        <p class="ui-alert ui-alert--info" *ngIf="loadingCurrent">
          Cargando caja...
        </p>

        <ng-container *ngIf="currentSession && !loadingCurrent; else noCurrentSession">
          <div class="session-grid session-grid--summary">
            <article class="session-kv">
              <span class="session-kv__label">Estado</span>
              <strong>
                <span class="ui-badge session-status-badge" [ngClass]="statusBadgeClass(currentSession.status)">
                  {{ statusLabel(currentSession.status) }}
                </span>
              </strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Apertura</span>
              <strong class="session-kv__value">{{ formatDateTime(currentSession.openedAt) }}</strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Cierre</span>
              <strong class="session-kv__value">{{ closingLabel(currentSession.closedAt) }}</strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Saldo inicial</span>
              <strong class="session-kv__value">{{ formatMoney(currentSession.openingAmount) }}</strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Efectivo esperado en caja</span>
              <strong class="session-kv__value">{{ moneyOrPending(currentSession.expectedCashAmount) }}</strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Efectivo contado</span>
              <strong class="session-kv__value">{{ moneyOrPending(currentSession.countedAmount) }}</strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Diferencia de cierre</span>
              <strong class="session-kv__value">{{ moneyOrPending(currentSession.differenceAmount) }}</strong>
            </article>
            <article class="session-kv session-kv--full">
              <span class="session-kv__label">Notas</span>
              <strong class="session-kv__value">{{ notesLabel(currentSession.notes) }}</strong>
            </article>
          </div>

          <details class="technical-details">
            <summary class="technical-details__summary">Datos tecnicos</summary>
            <div class="technical-grid">
              <article class="session-kv">
                <span class="session-kv__label">ID interno</span>
                <strong class="session-kv__value">#{{ currentSession.id }}</strong>
              </article>
              <article class="session-kv">
                <span class="session-kv__label">Usuario apertura ID</span>
                <strong class="session-kv__value session-kv__value--mono">{{ currentSession.openedByUserId }}</strong>
              </article>
            </div>
          </details>
        </ng-container>
        <ng-template #noCurrentSession>
          <p class="ui-empty-state">
            Sin caja abierta. Registra el saldo inicial para comenzar una nueva sesion.
          </p>
        </ng-template>
      </article>

      <article class="panel panel--emphasis" *ngIf="hasOpenSession">
        <header class="block-head">
          <div class="summary-copy">
            <h2>Cerrar caja actual</h2>
            <p class="summary-copy__secondary">
              Registra el efectivo contado para finalizar la sesion operativa.
            </p>
          </div>
        </header>

        <p class="ui-page-description close-note">
          La diferencia final se calculara al cerrar la caja.
        </p>

        <form
          [formGroup]="closeForm"
          (ngSubmit)="closeCashRegister()"
          class="form-grid"
        >
          <label class="field">
            <span>Efectivo contado *</span>
            <input
              type="number"
              formControlName="countedAmount"
              min="0"
              step="0.01"
            />
          </label>

          <label class="field">
            <span>Notas de cierre</span>
            <textarea formControlName="notes" maxlength="400"></textarea>
          </label>

          <button
            type="submit"
            class="ui-button ui-button--danger"
            [disabled]="closing"
          >
            {{ closing ? "Cerrando..." : "Cerrar caja" }}
          </button>
        </form>
      </article>

      <article class="panel panel--compact" *ngIf="hasOpenSession">
        <header class="block-head">
          <div class="summary-copy">
            <h2>Abrir caja</h2>
          </div>
        </header>

        <p class="ui-page-description compact-note">
          Ya existe una caja abierta. Cierra la caja actual antes de abrir otra.
        </p>
      </article>

      <article class="panel panel--emphasis" *ngIf="!hasOpenSession">
        <header class="block-head">
          <div class="summary-copy">
            <h2>Abrir caja</h2>
            <p class="summary-copy__secondary">
              Registra el saldo inicial para iniciar una nueva sesion de caja.
            </p>
          </div>
        </header>

        <form
          [formGroup]="openForm"
          (ngSubmit)="openCashRegister()"
          class="form-grid"
        >
          <label class="field">
            <span>Saldo inicial *</span>
            <input
              type="number"
              formControlName="openingAmount"
              min="0"
              step="0.01"
            />
          </label>

          <label class="field">
            <span>Notas</span>
            <textarea formControlName="notes" maxlength="400"></textarea>
          </label>

          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="opening"
          >
            {{ opening ? "Abriendo..." : "Abrir caja" }}
          </button>
        </form>
      </article>

      <details class="panel panel--secondary lookup-panel">
        <summary class="lookup-panel__summary">
          <span>Consultar caja por ID</span>
          <span class="lookup-panel__summary-note">Accion secundaria</span>
        </summary>

        <form
          [formGroup]="lookupForm"
          (ngSubmit)="lookupById()"
          class="lookup-row"
        >
          <input
            type="number"
            formControlName="id"
            min="1"
            placeholder="ID de caja"
          />
          <button type="submit" class="ui-button ui-button--secondary">
            Buscar
          </button>
        </form>

        <div *ngIf="lookupSession" class="session-grid lookup-grid">
          <article class="session-kv">
            <span class="session-kv__label">Caja</span>
            <strong class="session-kv__value">Caja #{{ lookupSession.id }}</strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Estado</span>
            <strong>
              <span class="ui-badge session-status-badge" [ngClass]="statusBadgeClass(lookupSession.status)">
                {{ statusLabel(lookupSession.status) }}
              </span>
            </strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Apertura</span>
            <strong class="session-kv__value">{{ formatDateTime(lookupSession.openedAt) }}</strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Cierre</span>
            <strong class="session-kv__value">{{ closingLabel(lookupSession.closedAt) }}</strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Saldo inicial</span>
            <strong class="session-kv__value">{{ formatMoney(lookupSession.openingAmount) }}</strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Efectivo contado</span>
            <strong class="session-kv__value">{{ moneyOrPending(lookupSession.countedAmount) }}</strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Efectivo esperado en caja</span>
            <strong class="session-kv__value">{{ moneyOrPending(lookupSession.expectedCashAmount) }}</strong>
          </article>
          <article class="session-kv">
            <span class="session-kv__label">Diferencia de cierre</span>
            <strong class="session-kv__value">{{ moneyOrPending(lookupSession.differenceAmount) }}</strong>
          </article>
        </div>

        <details class="technical-details" *ngIf="lookupSession">
          <summary class="technical-details__summary">Datos tecnicos</summary>
          <div class="technical-grid">
            <article class="session-kv">
              <span class="session-kv__label">ID interno</span>
              <strong class="session-kv__value">#{{ lookupSession.id }}</strong>
            </article>
            <article class="session-kv">
              <span class="session-kv__label">Usuario apertura ID</span>
              <strong class="session-kv__value session-kv__value--mono">{{ lookupSession.openedByUserId }}</strong>
            </article>
          </div>
        </details>
      </details>
    </section>
  `,
  styles: [
    `
      .cash-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .current-session-panel,
      .panel--emphasis {
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .head-actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
      }

      .session-badge {
        font-weight: 700;
        border-width: 1px;
        border-style: solid;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .session-badge--open {
        background: rgba(34, 197, 94, 0.16);
        color: #14532d;
        border-color: rgba(34, 197, 94, 0.3);
      }

      .session-badge--closed {
        background: rgba(107, 114, 128, 0.14);
        color: #374151;
        border-color: rgba(107, 114, 128, 0.28);
      }

      .session-badge--idle {
        background: rgba(245, 158, 11, 0.14);
        color: #8a5a00;
        border-color: rgba(245, 158, 11, 0.28);
      }

      h1,
      h2 {
        margin: 0;
      }

      .summary-copy {
        display: grid;
        gap: 0.18rem;
      }

      .summary-copy__secondary {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .panel {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-bg-surface);
        display: grid;
        gap: var(--space-3);
      }

      .panel--emphasis {
        background: linear-gradient(
          180deg,
          rgba(18, 23, 184, 0.03),
          rgba(56, 189, 248, 0.02)
        );
      }

      .panel--compact {
        gap: var(--space-2);
      }

      .panel--secondary {
        background: rgba(15, 23, 42, 0.015);
      }

      .block-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .form-grid {
        display: grid;
        gap: var(--space-3);
      }

      .close-note,
      .compact-note {
        margin: 0;
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

      input,
      textarea {
        padding: 0.6rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      textarea {
        min-height: 88px;
        resize: vertical;
      }

      .ui-button {
        width: fit-content;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .lookup-row {
        display: grid;
        grid-template-columns: minmax(160px, 220px) auto;
        gap: var(--space-2);
        align-items: center;
      }

      .session-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: var(--space-2) var(--space-4);
      }

      .session-grid--summary {
        grid-template-columns: repeat(4, minmax(160px, 1fr));
      }

      .session-kv {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: rgba(15, 23, 42, 0.02);
        padding: 0.75rem 0.82rem;
        display: grid;
        gap: 0.35rem;
        min-width: 0;
      }

      .session-kv__label {
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 800;
      }

      .session-kv__value {
        display: block;
        line-height: 1.25;
        font-size: 0.96rem;
      }

      .session-kv__value--mono {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.82rem;
        overflow-wrap: anywhere;
      }

      .session-kv--full {
        grid-column: 1 / -1;
      }

      .session-status-badge {
        font-weight: 700;
        border-width: 1px;
        border-style: solid;
      }

      .session-status-badge--open {
        background: rgba(34, 197, 94, 0.12);
        color: #166534;
        border-color: rgba(34, 197, 94, 0.24);
      }

      .session-status-badge--closed {
        background: rgba(107, 114, 128, 0.12);
        color: #4b5563;
        border-color: rgba(107, 114, 128, 0.24);
      }

      .technical-details {
        display: grid;
        gap: var(--space-2);
        border-top: 1px dashed var(--color-border-default);
        padding-top: var(--space-2);
      }

      .technical-details__summary {
        cursor: pointer;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .technical-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: var(--space-2) var(--space-4);
      }

      .session-grid p {
        margin: 0;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .lookup-grid {
        border-top: 1px solid var(--color-border-default);
        padding-top: var(--space-3);
      }

      .lookup-panel__summary {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
        list-style: none;
        font-weight: 700;
      }

      .lookup-panel__summary::-webkit-details-marker {
        display: none;
      }

      .lookup-panel__summary-note {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 600;
      }

      .ui-empty-state {
        text-align: left;
        padding: 0;
      }

      :host-context(body[data-theme="dark"]) .panel--secondary,
      :host-context(body[data-theme="dark"]) .session-kv {
        background: rgba(15, 23, 42, 0.72);
        border-color: rgba(148, 163, 184, 0.16);
      }

      :host-context(body[data-theme="dark"]) .panel--emphasis {
        background: linear-gradient(
          180deg,
          rgba(18, 23, 184, 0.18),
          rgba(56, 189, 248, 0.08)
        );
      }

      :host-context(body[data-theme="dark"]) .summary-copy__secondary,
      :host-context(body[data-theme="dark"]) .session-kv__label,
      :host-context(body[data-theme="dark"]) .lookup-panel__summary-note,
      :host-context(body[data-theme="dark"]) .technical-details__summary {
        color: rgba(226, 232, 240, 0.72);
      }

      :host-context(body[data-theme="dark"]) .session-badge--open {
        background: rgba(34, 197, 94, 0.22);
        color: #bbf7d0;
        border-color: rgba(34, 197, 94, 0.34);
      }

      :host-context(body[data-theme="dark"]) .session-badge--closed {
        background: rgba(148, 163, 184, 0.18);
        color: #e2e8f0;
        border-color: rgba(148, 163, 184, 0.28);
      }

      :host-context(body[data-theme="dark"]) .session-badge--idle {
        background: rgba(245, 158, 11, 0.2);
        color: #fcd34d;
        border-color: rgba(245, 158, 11, 0.32);
      }

      :host-context(body[data-theme="dark"]) .session-status-badge--open {
        background: rgba(34, 197, 94, 0.16);
        color: #bbf7d0;
        border-color: rgba(34, 197, 94, 0.28);
      }

      :host-context(body[data-theme="dark"]) .session-status-badge--closed {
        background: rgba(148, 163, 184, 0.14);
        color: #e2e8f0;
        border-color: rgba(148, 163, 184, 0.24);
      }

      @media (max-width: 800px) {
        .cash-page {
          padding: var(--space-4);
        }

        .session-grid,
        .session-grid--summary,
        .technical-grid {
          grid-template-columns: 1fr;
        }

        .full-width {
          grid-column: auto;
        }

        .lookup-row {
          grid-template-columns: 1fr;
          align-items: stretch;
        }
      }
    `,
  ],
})
export class CashRegisterPageComponent implements OnInit {
  private readonly currencyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  readonly openForm = this.formBuilder.group({
    openingAmount: [0, [Validators.required, Validators.min(0)]],
    notes: [""],
  });

  readonly closeForm = this.formBuilder.group({
    countedAmount: [0, [Validators.required, Validators.min(0)]],
    notes: [""],
  });

  readonly lookupForm = this.formBuilder.group({
    id: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  currentSession: CashRegisterResponse | null = null;
  lookupSession: CashRegisterResponse | null = null;
  lastClosedSession: CashRegisterResponse | null = null;

  loadingCurrent = false;
  opening = false;
  closing = false;

  errorMessage = "";
  successMessage = "";

  get hasOpenSession(): boolean {
    return this.currentSession?.status === "OPEN";
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly cashRegisterService: CashRegisterService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentSession();
  }

  loadCurrentSession(): void {
    this.loadingCurrent = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.cashRegisterService.current().subscribe({
      next: (session) => {
        this.loadingCurrent = false;
        this.currentSession = session;
        this.lastClosedSession = session.status === "CLOSED" ? session : null;
      },
      error: (error: unknown) => {
        this.loadingCurrent = false;
        const message = this.humanizeErrorMessage(toHttpErrorMessage(
          error,
          "No se pudo consultar la caja actual.",
        ));

        if (message.startsWith("No encontrado:")) {
          this.currentSession = this.lastClosedSession;
          return;
        }

        this.errorMessage = message;
      },
    });
  }

  openCashRegister(): void {
    if (this.hasOpenSession) {
      this.errorMessage =
        "No puedes abrir una segunda caja mientras exista una abierta.";
      return;
    }

    if (this.openForm.invalid) {
      this.openForm.markAllAsTouched();
      this.errorMessage =
        "El saldo inicial es obligatorio y debe ser mayor o igual a 0.";
      return;
    }

    this.opening = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.openForm.getRawValue();
    this.cashRegisterService
      .open({
        openingAmount: Number(value.openingAmount ?? 0),
        notes: value.notes?.trim() ? value.notes.trim() : null,
      })
      .subscribe({
        next: (session) => {
          this.opening = false;
          this.currentSession = session;
          this.lastClosedSession = null;
          this.successMessage = `Caja #${session.id} abierta correctamente.`;
          this.openForm.reset({ openingAmount: 0, notes: "" });
        },
        error: (error: unknown) => {
          this.opening = false;
          this.errorMessage = this.humanizeErrorMessage(toHttpErrorMessage(
            error,
            "No se pudo abrir la caja.",
          ));
        },
      });
  }

  async closeCashRegister(): Promise<void> {
    if (!this.currentSession || !this.hasOpenSession) {
      this.errorMessage = "No hay caja abierta para cerrar.";
      return;
    }

    if (this.closeForm.invalid) {
      this.closeForm.markAllAsTouched();
      this.errorMessage =
        "El efectivo contado es obligatorio y debe ser mayor o igual a 0.";
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Cerrar caja actual",
      description:
        "Se registrara el efectivo contado y se finalizara la sesion de caja. Verifica el monto antes de confirmar.",
      confirmText: "Cerrar caja",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    this.closing = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.closeForm.getRawValue();

    this.cashRegisterService
      .close(this.currentSession.id, {
        countedAmount: Number(value.countedAmount ?? 0),
        notes: value.notes?.trim() ? value.notes.trim() : null,
      })
      .subscribe({
        next: (session) => {
          this.closing = false;
          this.currentSession = session;
          this.lastClosedSession = session;
          this.successMessage = `Caja #${session.id} cerrada correctamente.`;
          this.closeForm.reset({ countedAmount: 0, notes: "" });
        },
        error: (error: unknown) => {
          this.closing = false;
          this.errorMessage = this.humanizeErrorMessage(toHttpErrorMessage(
            error,
            "No se pudo cerrar la caja.",
          ));
        },
      });
  }

  lookupById(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      this.errorMessage = "Ingresa un ID de caja valido.";
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    const id = Number(this.lookupForm.value.id);
    this.cashRegisterService.getById(id).subscribe({
      next: (session) => {
      this.lookupSession = session;
      },
      error: (error: unknown) => {
        this.lookupSession = null;
        this.errorMessage = this.humanizeErrorMessage(toHttpErrorMessage(
          error,
          "No se pudo obtener la caja solicitada.",
        ));
      },
    });
  }

  formatMoney(value: number | null | undefined): string {
    return this.currencyFormatter.format(value ?? 0);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return "Pendiente";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Pendiente";
    }

    return this.dateTimeFormatter.format(date);
  }

  statusLabel(status: string | null | undefined): string {
    switch (status) {
      case "OPEN":
        return "Abierta";
      case "CLOSED":
        return "Cerrada";
      default:
        return status || "-";
    }
  }

  sessionBadgeLabel(): string {
    if (this.currentSession?.status === "OPEN") {
      return "Sesion abierta";
    }
    if (this.currentSession?.status === "CLOSED") {
      return "Sesion cerrada";
    }
    return "Sin caja abierta";
  }

  sessionBadgeClass(): string {
    if (this.currentSession?.status === "OPEN") {
      return "session-badge--open";
    }
    if (this.currentSession?.status === "CLOSED") {
      return "session-badge--closed";
    }
    return "session-badge--idle";
  }

  statusBadgeClass(status: string | null | undefined): string {
    return status === "OPEN"
      ? "session-status-badge--open"
      : "session-status-badge--closed";
  }

  currentSessionTitle(): string {
    if (!this.currentSession) {
      return "Caja actual";
    }
    return `Caja #${this.currentSession.id}`;
  }

  currentSessionSubtitle(): string {
    if (!this.currentSession) {
      return "";
    }

    return `ID interno #${this.currentSession.id}`;
  }

  closingLabel(value: string | null | undefined): string {
    return value ? this.formatDateTime(value) : "Pendiente";
  }

  moneyOrPending(value: number | null | undefined): string {
    return value === null || value === undefined
      ? "Pendiente"
      : this.formatMoney(value);
  }

  notesLabel(value: string | null | undefined): string {
    return value?.trim() ? value.trim() : "Sin notas";
  }

  private humanizeErrorMessage(message: string): string {
    return message
      .replace(/openingAmount/g, "saldo inicial")
      .replace(/countedAmount/g, "efectivo contado")
      .replace(/No OPEN cash register session for current user/g, "No hay caja abierta para el usuario actual")
      .replace(/Only OPEN cash register sessions can be closed/g, "Solo se puede cerrar una caja abierta");
  }
}
