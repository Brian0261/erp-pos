import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Observable } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  BILLING_ENVIRONMENTS,
  BillingSeriesRequest,
  BillingSeriesResponse,
  ELECTRONIC_DOCUMENT_TYPES,
  ElectronicDocumentType,
} from "./data/billing.models";
import { BillingSeriesService } from "./data/billing-series.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-billing-series-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card billing-series-page">
      <header class="ui-page-head">
        <div class="page-copy">
          <h1 class="ui-page-title">Series y numeracion tributaria</h1>
          <p class="ui-page-description page-copy-line">
            Gestiona series por ambiente para boleta y factura con control operativo de numeracion.
          </p>
          <p class="ui-page-description page-copy-line">
            Cada ambiente usa series propias y solo puede existir una serie vigente por tipo de comprobante y ambiente.
          </p>
        </div>
        <div class="head-actions" *ngIf="canManage">
          <span class="ui-badge mode-badge" [class.mode-badge--edit]="!!editingId">
            {{ editingId ? "Modo edicion" : "Formulario cerrado" }}
          </span>
          <button
            type="button"
            class="ui-button ui-button--primary"
            (click)="openCreateForm()"
            [disabled]="loading"
          >
            Nueva serie
          </button>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <section class="environment-strip" aria-label="Estado por ambiente">
        <span class="env-chip env-chip--local"><strong>LOCAL:</strong> simulacion local.</span>
        <span class="env-chip env-chip--beta"><strong>BETA:</strong> sandbox/mock.</span>
        <span class="env-chip env-chip--prod"><strong>PROD:</strong> produccion bloqueada.</span>
      </section>

      <section class="form-section" *ngIf="showForm">
        <header class="section-head">
          <h2>{{ editingId ? "Editar serie" : "Nueva serie" }}</h2>
          <p class="ui-page-description" *ngIf="editingContext">
            Editando serie {{ editingContext.series }} / ambiente {{ editingContext.environment }}.
          </p>
        </header>

        <form
          [formGroup]="form"
          class="form-grid form-grid--two"
          (ngSubmit)="submit()"
        >
          <label class="field">
            <span>Tipo documento *</span>
            <select formControlName="documentType">
              <option *ngFor="let type of documentTypes" [value]="type">
                {{ typeLabel(type) }}
              </option>
            </select>
            <small
              class="field-help"
              [ngClass]="{ 'field-help--error': isInvalid('documentType') }"
            >
              {{ isInvalid("documentType") ? "Selecciona el tipo de comprobante." : " " }}
            </small>
          </label>

          <label class="field">
            <span>Serie *</span>
            <input
              type="text"
              maxlength="4"
              formControlName="series"
              placeholder="F001 o B001"
            />
            <small
              class="field-help"
              [ngClass]="{ 'field-help--error': isInvalid('series') || seriesPatternInvalid() }"
            >
              {{
                isInvalid("series") || seriesPatternInvalid()
                  ? seriesValidationMessage()
                  : "Formato esperado por tipo: F### o B###."
              }}
            </small>
          </label>

          <label class="field">
            <span>Proximo correlativo *</span>
            <input
              type="number"
              min="1"
              step="1"
              formControlName="currentNumber"
            />
            <small
              class="field-help"
              [ngClass]="{ 'field-help--error': isInvalid('currentNumber') }"
            >
              {{
                isInvalid("currentNumber")
                  ? "El proximo correlativo debe ser mayor o igual que 1."
                  : "Es el siguiente numero que se emitira para esta serie."
              }}
            </small>
          </label>

          <label class="field">
            <span>Ambiente *</span>
            <select formControlName="environment">
              <option *ngFor="let env of environments" [value]="env">
                {{ env }}
              </option>
            </select>
            <small
              class="field-help"
              [ngClass]="{ 'field-help--error': isInvalid('environment') }"
            >
              {{ isInvalid("environment") ? "Selecciona un ambiente." : "Define donde se usara la serie." }}
            </small>
          </label>

          <label class="field field--inline full">
            <input type="checkbox" formControlName="active" />
            <span>Serie activa</span>
          </label>

          <div class="form-actions full">
            <button
              type="button"
              class="ui-button ui-button--secondary"
                (click)="closeForm()"
                [disabled]="loading"
              >
                Cancelar
              </button>
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="loading || !canManage"
            >
              {{ loading ? "Guardando..." : submitLabel }}
            </button>
          </div>
        </form>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Series registradas</h2>
        </header>

        <div class="filters-grid">
          <label class="field">
            <span>Tipo</span>
            <select [value]="typeFilter" (change)="onTypeFilterChange($any($event.target).value)">
              <option value="ALL">Todos</option>
              <option *ngFor="let type of documentTypes" [value]="type">
                {{ typeLabel(type) }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Ambiente</span>
            <select [value]="environmentFilter" (change)="onEnvironmentFilterChange($any($event.target).value)">
              <option value="ALL">Todos</option>
              <option *ngFor="let env of environments" [value]="env">
                {{ env }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Estado</span>
            <select [value]="statusFilter" (change)="onStatusFilterChange($any($event.target).value)">
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Vigentes</option>
              <option value="INACTIVE">Historicas</option>
            </select>
          </label>
        </div>

        <section class="series-group">
          <h3>Series vigentes</h3>
          <div class="ui-table-wrapper">
            <table class="ui-table series-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Serie</th>
                  <th>Proximo correlativo</th>
                  <th>Ambiente</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let series of activeRows">
                  <td>
                    <span
                      class="ui-badge type-badge"
                      [ngClass]="
                        series.documentType === 'INVOICE'
                          ? 'type-badge--invoice'
                          : 'type-badge--receipt'
                      "
                    >
                      {{ typeLabel(series.documentType) }}
                    </span>
                  </td>
                  <td><strong>{{ series.series }}</strong></td>
                  <td>{{ formatNumber(series.currentNumber) }}</td>
                  <td>{{ series.environment }}</td>
                  <td>
                    <span class="ui-badge ui-badge--success">ACTIVA</span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button
                        type="button"
                        class="ui-button ui-button--secondary action-btn"
                        (click)="edit(series)"
                        [disabled]="!canManage"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="ui-button ui-button--danger action-btn"
                        (click)="deactivate(series)"
                        [disabled]="!canManage || loading"
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!loading && activeRows.length === 0">
                  <td colspan="6" class="ui-table__empty">
                    <div class="ui-empty-state">
                      No hay series vigentes con los filtros seleccionados.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="series-group series-group--secondary">
          <div class="history-head">
            <h3>Series historicas</h3>
            <button
              type="button"
              class="ui-button ui-button--secondary action-btn"
              (click)="toggleHistorical()"
            >
              {{ showHistorical ? "Ocultar" : "Mostrar" }}
            </button>
          </div>
          <p class="ui-page-description">
            Una serie inactiva conserva la trazabilidad de comprobantes
            emitidos.
          </p>
          <div class="ui-table-wrapper" *ngIf="showHistorical">
            <table class="ui-table series-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Serie</th>
                  <th>Proximo correlativo</th>
                  <th>Ambiente</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let series of inactiveRows">
                  <td>
                    <span
                      class="ui-badge type-badge"
                      [ngClass]="
                        series.documentType === 'INVOICE'
                          ? 'type-badge--invoice'
                          : 'type-badge--receipt'
                      "
                    >
                      {{ typeLabel(series.documentType) }}
                    </span>
                  </td>
                  <td><strong>{{ series.series }}</strong></td>
                  <td>{{ formatNumber(series.currentNumber) }}</td>
                  <td>{{ series.environment }}</td>
                  <td>
                    <span class="ui-badge ui-badge--neutral">INACTIVA</span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button
                        type="button"
                        class="ui-button ui-button--secondary action-btn"
                        (click)="edit(series)"
                        [disabled]="!canManage"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="ui-button ui-button--primary action-btn"
                        (click)="activate(series)"
                        [disabled]="!canManage || loading"
                      >
                        Activar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!loading && inactiveRows.length === 0">
                  <td colspan="6" class="ui-table__empty">
                    <div class="ui-empty-state">
                      No hay series historicas con los filtros seleccionados.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </section>
  `,
  styles: [
    `
      .billing-series-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .mode-badge {
        background: #dbeafe;
        color: var(--color-info);
        font-weight: 700;
      }

      .mode-badge--edit {
        background: #ede9fe;
        color: #6d28d9;
      }

      .page-copy {
        display: grid;
        gap: 0.2rem;
      }

      .head-actions {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .page-copy-line {
        margin: 0;
      }

      .form-section,
      .data-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .environment-strip {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .env-chip {
        border-radius: 999px;
        padding: 0.35rem 0.65rem;
        font-size: var(--font-size-xs);
        border: 1px solid var(--color-border-default);
        white-space: nowrap;
      }

      .env-chip--local {
        background: rgba(59, 130, 246, 0.12);
        color: #93c5fd;
        border-color: rgba(59, 130, 246, 0.25);
      }

      .env-chip--beta {
        background: rgba(16, 185, 129, 0.12);
        color: #6ee7b7;
        border-color: rgba(16, 185, 129, 0.25);
      }

      .env-chip--prod {
        background: rgba(245, 158, 11, 0.12);
        color: #fcd34d;
        border-color: rgba(245, 158, 11, 0.25);
      }

      .section-head {
        border-bottom: 1px solid var(--color-border-default);
        padding-bottom: var(--space-2);
      }

      .form-grid {
        display: grid;
        gap: var(--space-3);
      }

      .form-grid--two {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
      }

      .full {
        grid-column: 1 / -1;
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field > span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .field--inline {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
      }

      .field--inline span {
        font-size: var(--font-size-sm);
      }

      .field--inline input {
        width: auto;
      }

      input,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .field-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .field-help {
        margin: 0;
        min-height: 1.1rem;
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .field-help--error {
        color: var(--color-danger);
        font-weight: 700;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .series-table {
        min-width: 860px;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(200px, 1fr));
        gap: var(--space-3);
      }

      .series-group {
        display: grid;
        gap: var(--space-2);
      }

      .series-group--secondary {
        border-top: 1px dashed var(--color-border-default);
        padding-top: var(--space-2);
      }

      .history-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
      }

      h3 {
        margin: var(--space-2) 0 0;
        font-size: 1rem;
      }

      .row-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .action-btn {
        padding: 0.4rem 0.65rem;
        font-size: var(--font-size-xs);
      }

      .type-badge {
        font-weight: 700;
      }

      .type-badge--invoice {
        background: #ede9fe;
        color: #6d28d9;
      }

      .type-badge--receipt {
        background: #dbeafe;
        color: var(--color-info);
      }

      .ui-badge--neutral {
        background: rgba(107, 114, 128, 0.12);
        color: #9ca3af;
        border: 1px solid rgba(107, 114, 128, 0.25);
      }

      .ui-badge--success {
        background: rgba(34, 197, 94, 0.12);
        color: #86efac;
        border: 1px solid rgba(34, 197, 94, 0.25);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .billing-series-page {
          padding: var(--space-4);
        }

        .form-grid--two {
          grid-template-columns: 1fr;
        }

        .filters-grid {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }

        .history-head {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      @media (min-width: 1100px) {
        .page-copy-line {
          white-space: nowrap;
        }
      }
    `,
  ],
})
export class BillingSeriesPageComponent implements OnInit {
  readonly environments = BILLING_ENVIRONMENTS;
  readonly documentTypes = ELECTRONIC_DOCUMENT_TYPES;

  readonly form = this.formBuilder.group({
    documentType: ["RECEIPT" as ElectronicDocumentType, Validators.required],
    series: ["", [Validators.required, Validators.maxLength(4)]],
    currentNumber: [1, [Validators.required, Validators.min(1)]],
    environment: ["LOCAL", Validators.required],
    active: [true],
  });

  canManage = false;
  seriesRows: BillingSeriesResponse[] = [];

  typeFilter: "ALL" | ElectronicDocumentType = "ALL";
  environmentFilter: "ALL" | (typeof BILLING_ENVIRONMENTS)[number] = "ALL";
  statusFilter: "ALL" | "ACTIVE" | "INACTIVE" = "ALL";

  editingId: number | null = null;
  private editingConcurrencyToken: string | null = null;
  showForm = false;
  showHistorical = false;
  editingContext: { series: string; environment: string } | null = null;
  loading = false;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly billingSeriesService: BillingSeriesService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  get activeRows(): BillingSeriesResponse[] {
    return this.filteredRows.filter((row) => row.active);
  }

  get inactiveRows(): BillingSeriesResponse[] {
    return this.filteredRows.filter((row) => !row.active);
  }

  get filteredRows(): BillingSeriesResponse[] {
    return this.seriesRows.filter((row) => {
      if (this.typeFilter !== "ALL" && row.documentType !== this.typeFilter) {
        return false;
      }
      if (
        this.environmentFilter !== "ALL" &&
        row.environment !== this.environmentFilter
      ) {
        return false;
      }
      if (this.statusFilter === "ACTIVE" && !row.active) {
        return false;
      }
      if (this.statusFilter === "INACTIVE" && row.active) {
        return false;
      }
      return true;
    });
  }

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.includes("ADMIN");
        if (!this.canManage) {
          this.permissionMessage =
            "Solo ADMIN puede gestionar series de facturacion.";
          this.form.disable();
          return;
        }
        this.form.enable();
        this.loadSeries();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
        this.form.disable();
      },
    });
  }

  get submitLabel(): string {
    return this.editingId ? "Actualizar serie" : "Crear serie";
  }

  openCreateForm(): void {
    this.showForm = true;
    this.editingId = null;
    this.editingConcurrencyToken = null;
    this.editingContext = null;
    this.form.reset({
      documentType: "RECEIPT",
      series: "",
      currentNumber: 1,
      environment: "LOCAL",
      active: true,
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  seriesPatternInvalid(): boolean {
    const seriesControl = this.form.controls.series;
    if (!(seriesControl.dirty || seriesControl.touched)) {
      return false;
    }

    return !this.isSeriesValid(
      this.form.controls.documentType.value,
      seriesControl.value,
    );
  }

  seriesValidationMessage(): string {
    const type = this.form.controls.documentType.value;
    return type === "INVOICE"
      ? "Para factura la serie debe cumplir F###."
      : "Para boleta la serie debe cumplir B###.";
  }

  async submit(): Promise<void> {
    if (!this.canManage || !this.showForm) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    if (this.form.invalid || this.seriesPatternInvalid()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: BillingSeriesRequest = {
      documentType: raw.documentType as ElectronicDocumentType,
      series: String(raw.series || "")
        .trim()
        .toUpperCase(),
      currentNumber: Number(raw.currentNumber),
      environment: raw.environment as any,
      active: !!raw.active,
    };

    if (payload.active) {
      const activeConfirmation = await this.confirmDialogService.confirm({
        title: this.editingId
          ? "Confirmar activacion de serie"
          : "Confirmar creacion de serie activa",
        description:
          "La serie quedara vigente para su tipo y ambiente. Si ya existe otra activa en la misma combinacion, la operacion sera bloqueada.",
        confirmText: this.editingId ? "Activar" : "Crear activa",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (!activeConfirmation) {
        return;
      }
    }

    this.loading = true;

    const editingId = this.editingId;
    const editingConcurrencyToken = this.editingConcurrencyToken;
    if (editingId !== null && !editingConcurrencyToken) {
      this.loading = false;
      this.errorMessage =
        "La serie está desactualizada. Vuelve a cargarla antes de editarla.";
      return;
    }

    const request$: Observable<unknown> = editingId !== null
      ? this.billingSeriesService.update(editingId, payload, editingConcurrencyToken as string)
      : this.billingSeriesService.create(payload);

    request$.subscribe({
      next: (response) => {
        this.loading = false;
        // The service captures the response ETag; the list reload provides the
        // next stable row token without optimistic local mutation.
        void response;
        this.successMessage = editingId !== null
          ? "Serie actualizada correctamente."
          : "Serie creada correctamente.";
        this.closeForm();
        this.loadSeries();
      },
      error: (error: unknown) => {
        if (this.isConcurrencyConflict(error)) {
          this.handleConcurrencyConflict();
          return;
        }
        this.loading = false;
        this.errorMessage = this.toOperationalSeriesError(
          error,
          "No se pudo guardar la serie.",
        );
      },
    });
  }

  edit(series: BillingSeriesResponse): void {
    this.showForm = true;
    this.editingId = series.id;
    this.editingConcurrencyToken = this.billingSeriesService.concurrencyToken(series);
    this.editingContext = {
      series: series.series,
      environment: series.environment,
    };
    this.form.patchValue({
      documentType: series.documentType,
      series: series.series,
      currentNumber: series.currentNumber,
      environment: series.environment,
      active: series.active,
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.editingConcurrencyToken = null;
    this.editingContext = null;
    this.form.reset({
      documentType: "RECEIPT",
      series: "",
      currentNumber: 1,
      environment: "LOCAL",
      active: true,
    });
  }

  toggleHistorical(): void {
    this.showHistorical = !this.showHistorical;
  }

  async deactivate(series: BillingSeriesResponse): Promise<void> {
    if (!this.canManage || !series.active) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Desactivar serie",
      description: `Se desactivara la serie ${series.series} (${this.typeLabel(series.documentType)} - ${series.environment}). La trazabilidad historica se conserva.`,
      confirmText: "Desactivar",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    const ifMatch = this.billingSeriesService.concurrencyToken(series);
    this.billingSeriesService.deactivate(series.id, ifMatch).subscribe({
      next: (response) => {
        this.loading = false;
        void response;
        this.successMessage = `Serie ${series.series} desactivada.`;
        this.loadSeries();
      },
      error: (error: unknown) => {
        if (this.isConcurrencyConflict(error)) {
          this.handleConcurrencyConflict();
          return;
        }
        this.loading = false;
        this.errorMessage = this.toOperationalSeriesError(
          error,
          "No se pudo desactivar la serie.",
        );
      },
    });
  }

  async activate(series: BillingSeriesResponse): Promise<void> {
    if (!this.canManage || series.active) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Activar serie historica",
      description: `Se activara la serie ${series.series} (${this.typeLabel(series.documentType)} - ${series.environment}). Antes de usarla valida que el proximo correlativo sea mayor al ultimo emitido.`,
      confirmText: "Activar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    const payload: BillingSeriesRequest = {
      documentType: series.documentType,
      series: series.series,
      currentNumber: series.currentNumber,
      environment: series.environment,
      active: true,
    };

    const ifMatch = this.billingSeriesService.concurrencyToken(series);
    this.billingSeriesService.update(series.id, payload, ifMatch).subscribe({
      next: (response) => {
        this.loading = false;
        void response;
        this.successMessage = `Serie ${series.series} activada.`;
        this.loadSeries();
      },
      error: (error: unknown) => {
        if (this.isConcurrencyConflict(error)) {
          this.handleConcurrencyConflict();
          return;
        }
        this.loading = false;
        this.errorMessage = this.toOperationalSeriesError(
          error,
          "No se pudo activar la serie.",
        );
      },
    });
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter = value === "ALL" ? "ALL" : (value as ElectronicDocumentType);
  }

  onEnvironmentFilterChange(value: string): void {
    this.environmentFilter = value === "ALL" ? "ALL" : (value as any);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter = value as "ALL" | "ACTIVE" | "INACTIVE";
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat("es-PE").format(value);
  }

  typeLabel(type: ElectronicDocumentType): string {
    return type === "INVOICE" ? "FACTURA" : "BOLETA";
  }

  private loadSeries(preserveError = false): void {
    if (!this.canManage) {
      return;
    }

    this.loading = true;
    if (!preserveError) {
      this.errorMessage = "";
    }

    this.billingSeriesService.list().subscribe({
      next: (rows) => {
        this.loading = false;
        this.seriesRows = rows;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = this.toOperationalSeriesError(
          error,
          "No se pudo cargar las series.",
        );
      },
    });
  }

  private toOperationalSeriesError(error: unknown, fallback: string): string {
    if (this.isConcurrencyConflict(error)) {
      return "La serie fue modificada por otro usuario o proceso desde que la cargaste. Tus cambios no fueron guardados. Revisa la información actual antes de intentarlo nuevamente.";
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const detail = String((error.error && (error.error.message || error.error)) || "");
      if (
        detail.includes("Ya existe una serie activa") ||
        detail.includes("active")
      ) {
        return "Conflicto operativo: ya existe una serie vigente para ese tipo y ambiente. Desactiva la actual antes de activar otra.";
      }
      if (
        detail.includes("proximo correlativo") ||
        detail.includes("correlativo") ||
        detail.includes("maxIssued")
      ) {
        return "Conflicto operativo: el proximo correlativo no es valido. Debe ser mayor al ultimo comprobante emitido de la serie.";
      }
    }
    return toHttpErrorMessage(error, fallback);
  }

  private isConcurrencyConflict(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 412;
  }

  private handleConcurrencyConflict(): void {
    this.loading = false;
    this.successMessage = "";
    this.errorMessage =
      "La serie fue modificada por otro usuario o proceso desde que la cargaste. Tus cambios no fueron guardados. Revisa la información actual antes de intentarlo nuevamente.";
    this.editingConcurrencyToken = null;
    if (this.editingId !== null) {
      this.closeForm();
    }
    this.loadSeries(true);
  }

  private isSeriesValid(
    type: ElectronicDocumentType | null,
    series: unknown,
  ): boolean {
    const value = String(series ?? "")
      .trim()
      .toUpperCase();

    if (!value || !type) {
      return false;
    }

    if (type === "INVOICE") {
      return /^F\d{3}$/.test(value);
    }

    return /^B\d{3}$/.test(value);
  }
}
