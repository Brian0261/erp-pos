import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuotesReportResponse } from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-quotes-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card ui-module-page quotes-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria comercial</p>
          <h1 class="ui-page-title">Reporte de cotizaciones</h1>
          <p class="ui-page-description">
            Consulta volumen total, conversiones, cancelaciones y tasa de
            conversion.
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
          <h2 class="ui-module-section__title">Filtros de periodo</h2>
        </header>

        <form
          class="ui-filter-grid quotes-filters"
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

          <div class="ui-filter-actions quotes-actions">
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
          <p class="ui-kpi-label">Total cotizaciones</p>
          <p class="ui-kpi-value">{{ report.totalQuotes }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Convertidas</p>
          <p class="ui-kpi-value">{{ report.convertedQuotes }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Canceladas</p>
          <p class="ui-kpi-value">{{ report.cancelledQuotes }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Tasa de conversion (%)</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.conversionRate) | number: "1.2-2" }}
          </p>
          <p class="quotes-rate-chip">
            <span
              class="ui-chip"
              [ngClass]="conversionChipClass(report.conversionRate)"
            >
              {{ conversionLabel(report.conversionRate) }}
            </span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Monto convertido</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.totalConvertedAmount) | number: "1.2-2" }}
          </p>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .quotes-filters {
        grid-template-columns: 1fr 1fr auto;
      }

      .quotes-actions {
        align-self: end;
      }

      .quotes-rate-chip {
        margin: 0;
      }

      @media (max-width: 760px) {
        .quotes-filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class QuotesReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    from: [""],
    to: [""],
  });

  canView = false;
  loading = false;
  report: QuotesReportResponse | null = null;

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
    this.filtersForm.reset({ from: "", to: "" });
    this.loadReport();
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  conversionChipClass(value: unknown): string {
    const rate = this.numberOf(value);
    if (rate >= 60) {
      return "ui-chip--success";
    }
    if (rate >= 30) {
      return "ui-chip--warning";
    }
    return "ui-chip--danger";
  }

  conversionLabel(value: unknown): string {
    const rate = this.numberOf(value);
    if (rate >= 60) {
      return "Conversion alta";
    }
    if (rate >= 30) {
      return "Conversion media";
    }
    return "Conversion baja";
  }

  private loadReport(): void {
    if (!this.canView) {
      return;
    }

    const raw = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.reportsService
      .quotes({
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.report = {
            ...response,
            conversionRate: this.numberOf(response.conversionRate),
            totalConvertedAmount: this.numberOf(response.totalConvertedAmount),
          };
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el reporte de cotizaciones.",
          );
        },
      });
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
