import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  ElectronicDocumentsReportResponse,
  REPORT_ELECTRONIC_DOCUMENT_STATUSES,
  ReportsElectronicDocumentStatus,
} from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-electronic-documents-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <h1>Reporte de comprobantes electronicos</h1>
        <p class="muted">Totales por estado y tipo de documento.</p>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

      <form
        class="filters"
        [formGroup]="filtersForm"
        (ngSubmit)="applyFilters()"
      >
        <label>
          Desde
          <input type="date" formControlName="from" />
        </label>

        <label>
          Hasta
          <input type="date" formControlName="to" />
        </label>

        <label>
          Estado
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statuses" [value]="status">
              {{ status }}
            </option>
          </select>
        </label>

        <div class="actions">
          <button type="submit" [disabled]="loading || !canView">
            Filtrar
          </button>
          <button
            type="button"
            class="secondary"
            [disabled]="loading || !canView"
            (click)="clearFilters()"
          >
            Limpiar
          </button>
        </div>
      </form>

      <section class="kpis" *ngIf="report">
        <article>
          <h2>Total</h2>
          <p>{{ report.totalDocuments }}</p>
        </article>
        <article>
          <h2>Aceptados</h2>
          <p>{{ report.acceptedCount }}</p>
        </article>
        <article>
          <h2>Rechazados</h2>
          <p>{{ report.rejectedCount }}</p>
        </article>
        <article>
          <h2>Error</h2>
          <p>{{ report.errorCount }}</p>
        </article>
        <article>
          <h2>Monto total</h2>
          <p>{{ numberOf(report.totalAmount) | number: "1.2-2" }}</p>
        </article>
      </section>

      <section *ngIf="report">
        <h2>Documentos por tipo</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of report.documentsByType">
              <td>{{ row.documentType }}</td>
              <td>{{ row.count }}</td>
            </tr>
            <tr *ngIf="report.documentsByType.length === 0">
              <td colspan="2" class="empty">
                Sin datos para los filtros seleccionados.
              </td>
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
      h1,
      h2 {
        margin: 0;
      }
      .muted {
        color: #6b7280;
        margin: 0.25rem 0 0;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 0.6rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      button {
        padding: 0.5rem 0.7rem;
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
        gap: 0.5rem;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(5, minmax(160px, 1fr));
        gap: 0.65rem;
      }
      .kpis article {
        border: 1px solid #e5e7eb;
        border-radius: 0.45rem;
        padding: 0.65rem;
      }
      .kpis p {
        margin: 0.3rem 0 0;
        font-size: 1.2rem;
        font-weight: 700;
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
      .empty {
        text-align: center;
        color: #6b7280;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      @media (max-width: 980px) {
        .filters,
        .kpis {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .filters,
        .kpis {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ElectronicDocumentsReportPageComponent implements OnInit {
  readonly statuses = REPORT_ELECTRONIC_DOCUMENT_STATUSES;

  readonly filtersForm = this.formBuilder.group({
    from: [""],
    to: [""],
    status: [""],
  });

  canView = false;
  loading = false;
  report: ElectronicDocumentsReportResponse | null = null;

  permissionMessage = "";
  errorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly reportsService: ReportsService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canView = user.roles.some((role) =>
          ["ADMIN", "SUPERVISOR"].includes(role),
        );

        if (!this.canView) {
          this.permissionMessage = "No tienes permisos para ver este reporte.";
          return;
        }

        this.loadReport();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  clearFilters(): void {
    this.filtersForm.reset({ from: "", to: "", status: "" });
    this.loadReport();
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private loadReport(): void {
    if (!this.canView) {
      return;
    }

    const raw = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.reportsService
      .electronicDocuments({
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
        status: raw.status
          ? (raw.status as ReportsElectronicDocumentStatus)
          : null,
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.report = {
            ...response,
            totalAmount: this.numberOf(response.totalAmount),
          };
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el reporte de comprobantes.",
          );
        },
      });
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
