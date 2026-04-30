import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
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
        <div>
          <p class="ui-page-kicker">Facturacion electronica MVP</p>
          <h1 class="ui-page-title">Series y correlativos</h1>
          <p class="ui-page-description">
            Gestiona series de boleta y factura manteniendo reglas de formato y
            correlativo actual.
          </p>
        </div>
        <span
          class="ui-badge mode-badge"
          [class.mode-badge--edit]="!!editingId"
        >
          {{ editingId ? "Modo edicion" : "Nueva serie" }}
        </span>
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

      <section class="form-section">
        <header class="section-head">
          <h2>Formulario de serie</h2>
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
            <small class="field-error" *ngIf="isInvalid('documentType')">
              documentType es obligatorio.
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
              class="field-error"
              *ngIf="isInvalid('series') || seriesPatternInvalid()"
            >
              {{ seriesValidationMessage() }}
            </small>
          </label>

          <label class="field">
            <span>Correlativo actual *</span>
            <input
              type="number"
              min="1"
              step="1"
              formControlName="currentNumber"
            />
            <small class="field-error" *ngIf="isInvalid('currentNumber')">
              currentNumber debe ser mayor o igual que 1.
            </small>
          </label>

          <label class="field">
            <span>Ambiente *</span>
            <select formControlName="environment">
              <option *ngFor="let env of environments" [value]="env">
                {{ env }}
              </option>
            </select>
            <small class="field-error" *ngIf="isInvalid('environment')">
              environment es obligatorio.
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
              (click)="cancelEdit()"
              [disabled]="loading"
            >
              Limpiar
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

        <div class="ui-table-wrapper">
          <table class="ui-table series-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Serie</th>
                <th>Correlativo actual</th>
                <th>Ambiente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let series of seriesRows">
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
                <td>
                  <strong>{{ series.series }}</strong>
                </td>
                <td>{{ series.currentNumber }}</td>
                <td>{{ series.environment }}</td>
                <td>
                  <span
                    class="ui-badge"
                    [ngClass]="
                      series.active ? 'ui-badge--success' : 'ui-badge--danger'
                    "
                  >
                    {{ series.active ? "ACTIVA" : "INACTIVA" }}
                  </span>
                </td>
                <td class="row-actions">
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
                    [disabled]="!canManage || !series.active"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
              <tr *ngIf="!loading && seriesRows.length === 0">
                <td colspan="6" class="ui-table__empty">
                  <div class="ui-empty-state">No hay series registradas.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

      .form-section,
      .data-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
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

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .series-table {
        min-width: 860px;
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

        .form-actions {
          justify-content: flex-start;
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

  editingId: number | null = null;
  loading = false;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly billingSeriesService: BillingSeriesService,
  ) {}

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

  submit(): void {
    if (!this.canManage) {
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

    this.loading = true;

    const request$ = this.editingId
      ? this.billingSeriesService.update(this.editingId, payload)
      : this.billingSeriesService.create(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = this.editingId
          ? "Serie actualizada correctamente."
          : "Serie creada correctamente.";
        this.cancelEdit();
        this.loadSeries();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo guardar la serie.",
        );
      },
    });
  }

  edit(series: BillingSeriesResponse): void {
    this.editingId = series.id;
    this.form.patchValue({
      documentType: series.documentType,
      series: series.series,
      currentNumber: series.currentNumber,
      environment: series.environment,
      active: series.active,
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({
      documentType: "RECEIPT",
      series: "",
      currentNumber: 1,
      environment: "LOCAL",
      active: true,
    });
  }

  deactivate(series: BillingSeriesResponse): void {
    if (!this.canManage || !series.active) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.billingSeriesService.deactivate(series.id).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = `Serie ${series.series} desactivada.`;
        this.loadSeries();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo desactivar la serie.",
        );
      },
    });
  }

  typeLabel(type: ElectronicDocumentType): string {
    return type === "INVOICE" ? "FACTURA" : "BOLETA";
  }

  private loadSeries(): void {
    if (!this.canManage) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.billingSeriesService.list().subscribe({
      next: (rows) => {
        this.loading = false;
        this.seriesRows = rows;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar las series.",
        );
      },
    });
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
