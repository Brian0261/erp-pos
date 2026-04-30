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
    <section class="ui-card ui-module-page electronic-documents-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria comercial</p>
          <h1 class="ui-page-title">Comprobantes electronicos</h1>
          <p class="ui-page-description">
            Consulta volumen por estado y tipo de comprobante en el periodo
            seleccionado.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Filtros de comprobantes</h2>
        </header>

        <form
          class="ui-filter-grid documents-filters"
          [formGroup]="filtersForm"
          (ngSubmit)="applyFilters()"
        >
          <label class="ui-field">
            <span>Desde</span>
            <input type="date" formControlName="from" />
          </label>

          <label class="ui-field">
            <span>Hasta</span>
            <input type="date" formControlName="to" />
          </label>

          <label class="ui-field">
            <span>Estado</span>
            <select formControlName="status">
              <option value="">Todos</option>
              <option *ngFor="let status of statuses" [value]="status">
                {{ status }}
              </option>
            </select>
          </label>

          <div class="ui-filter-actions documents-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="loading || !canView"
            >
              Filtrar
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              [disabled]="loading || !canView"
              (click)="clearFilters()"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section class="ui-kpi-grid" *ngIf="report">
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Total</p>
          <p class="ui-kpi-value">{{ report.totalDocuments }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Aceptados</p>
          <p class="ui-kpi-value">{{ report.acceptedCount }}</p>
          <p class="status-chip-wrap">
            <span class="ui-chip ui-chip--success">ACCEPTED</span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Rechazados</p>
          <p class="ui-kpi-value">{{ report.rejectedCount }}</p>
          <p class="status-chip-wrap">
            <span class="ui-chip ui-chip--warning">REJECTED</span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Error</p>
          <p class="ui-kpi-value">{{ report.errorCount }}</p>
          <p class="status-chip-wrap">
            <span class="ui-chip ui-chip--danger">ERROR</span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Monto total</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.totalAmount) | number: "1.2-2" }}
          </p>
        </article>
      </section>

      <section class="ui-module-section" *ngIf="report">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Documentos por tipo</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table documents-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of report.documentsByType">
                <td>
                  <span class="ui-chip ui-chip--info">{{
                    row.documentType
                  }}</span>
                </td>
                <td>{{ row.count }}</td>
              </tr>
              <tr *ngIf="report.documentsByType.length === 0">
                <td colspan="2" class="ui-table__empty">
                  <div class="ui-empty-state">
                    Sin datos para los filtros seleccionados.
                  </div>
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
      .documents-filters {
        grid-template-columns: 1fr 1fr minmax(180px, 240px) auto;
      }

      .documents-actions {
        align-self: end;
      }

      .status-chip-wrap {
        margin: 0;
      }

      .documents-table {
        min-width: 420px;
      }

      @media (max-width: 760px) {
        .documents-filters {
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
