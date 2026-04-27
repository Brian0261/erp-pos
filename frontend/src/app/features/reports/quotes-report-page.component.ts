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
    <section class="card">
      <header>
        <h1>Reporte de cotizaciones</h1>
        <p class="muted">
          Consulta volumen total, conversiones, cancelaciones y tasa de
          conversion.
        </p>
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
          <h2>Total cotizaciones</h2>
          <p>{{ report.totalQuotes }}</p>
        </article>
        <article>
          <h2>Convertidas</h2>
          <p>{{ report.convertedQuotes }}</p>
        </article>
        <article>
          <h2>Canceladas</h2>
          <p>{{ report.cancelledQuotes }}</p>
        </article>
        <article>
          <h2>Tasa conversion (%)</h2>
          <p>{{ numberOf(report.conversionRate) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Monto convertido</h2>
          <p>{{ numberOf(report.totalConvertedAmount) | number: "1.2-2" }}</p>
        </article>
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
        margin: 0.25rem 0 0;
        color: #6b7280;
      }
      .filters {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        align-items: end;
        gap: 0.6rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
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
        grid-template-columns: repeat(5, minmax(170px, 1fr));
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
      .error {
        margin: 0;
        color: #b91c1c;
      }
      @media (max-width: 980px) {
        .kpis {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 720px) {
        .filters,
        .kpis {
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
