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
    <section class="card">
      <header class="header">
        <div>
          <h1>Facturacion - Series y correlativos</h1>
          <p class="muted">Crea, edita y desactiva series de comprobantes.</p>
        </div>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
        <label>
          Tipo documento *
          <select formControlName="documentType">
            <option *ngFor="let type of documentTypes" [value]="type">
              {{ typeLabel(type) }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('documentType')">
            documentType es obligatorio.
          </small>
        </label>

        <label>
          Serie *
          <input
            type="text"
            maxlength="4"
            formControlName="series"
            placeholder="F001 o B001"
          />
          <small
            class="error"
            *ngIf="isInvalid('series') || seriesPatternInvalid()"
          >
            {{ seriesValidationMessage() }}
          </small>
        </label>

        <label>
          Correlativo actual *
          <input
            type="number"
            min="1"
            step="1"
            formControlName="currentNumber"
          />
          <small class="error" *ngIf="isInvalid('currentNumber')">
            currentNumber debe ser mayor o igual que 1.
          </small>
        </label>

        <label>
          Ambiente *
          <select formControlName="environment">
            <option *ngFor="let env of environments" [value]="env">
              {{ env }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('environment')">
            environment es obligatorio.
          </small>
        </label>

        <label class="inline">
          <input type="checkbox" formControlName="active" />
          Serie activa
        </label>

        <div class="actions full">
          <button
            type="button"
            class="secondary"
            (click)="cancelEdit()"
            [disabled]="loading"
          >
            Limpiar
          </button>
          <button type="submit" [disabled]="loading || !canManage">
            {{ loading ? "Guardando..." : submitLabel }}
          </button>
        </div>
      </form>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Serie</th>
              <th>Correlativo actual</th>
              <th>Ambiente</th>
              <th>Activa</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let series of seriesRows">
              <td>{{ typeLabel(series.documentType) }}</td>
              <td>{{ series.series }}</td>
              <td>{{ series.currentNumber }}</td>
              <td>{{ series.environment }}</td>
              <td>{{ series.active ? "SI" : "NO" }}</td>
              <td class="row-actions">
                <button
                  type="button"
                  class="link-btn"
                  (click)="edit(series)"
                  [disabled]="!canManage"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="link-btn danger"
                  (click)="deactivate(series)"
                  [disabled]="!canManage || !series.active"
                >
                  Desactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="!loading && seriesRows.length === 0">
              <td colspan="6" class="empty">No hay series registradas.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  `,
  styles: [
    `
      .card {
        background: #fff;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        display: grid;
        gap: 1rem;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      h1 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.65rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      .inline {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      button {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.45rem;
        border-bottom: 1px solid #e5e7eb;
      }
      .row-actions {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }
      .link-btn {
        padding: 0.35rem 0.55rem;
        border-radius: 0.3rem;
        background: #1f2937;
        color: #fff;
        border: 0;
        cursor: pointer;
      }
      .danger {
        background: #b91c1c;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 900px) {
        .form-grid {
          grid-template-columns: 1fr;
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
