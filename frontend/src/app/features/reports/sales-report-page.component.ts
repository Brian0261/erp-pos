import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PaymentMethodAmountResponse,
  SalesByDayResponse,
  SalesReportResponse,
} from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-sales-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card ui-module-page sales-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria comercial</p>
          <h1 class="ui-page-title">Reporte de ventas</h1>
          <p class="ui-page-description">
            Analiza monto vendido, volumen de tickets y comportamiento diario.
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
          <h2 class="ui-module-section__title">Filtros</h2>
        </header>

        <form
          class="ui-filter-grid sales-filters"
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

          <div class="ui-filter-actions sales-filter-actions">
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
              (click)="clearFilters()"
              [disabled]="loading || !canView"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section class="ui-kpi-grid" *ngIf="report">
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Total vendido</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.totalSalesAmount) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Cantidad de ventas</p>
          <p class="ui-kpi-value">{{ report.totalSalesCount }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Ticket promedio</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.averageTicket) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Ventas anuladas</p>
          <p class="ui-kpi-value">{{ report.voidedSalesCount }}</p>
        </article>
      </section>

      <section class="ui-module-section" *ngIf="report">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Ventas por metodo de pago</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table sales-table">
            <thead>
              <tr>
                <th>Metodo</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of report.salesByPaymentMethod">
                <td>{{ row.paymentMethod }}</td>
                <td>{{ numberOf(row.amount) | number: "1.2-2" }}</td>
              </tr>
              <tr *ngIf="report.salesByPaymentMethod.length === 0">
                <td colspan="2" class="ui-table__empty">
                  <div class="ui-empty-state">
                    Sin datos en el rango seleccionado.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ui-module-section" *ngIf="report">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Ventas por dia</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table sales-table">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Cantidad</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of report.salesByDay">
                <td>{{ row.day }}</td>
                <td>{{ row.salesCount }}</td>
                <td>{{ numberOf(row.totalAmount) | number: "1.2-2" }}</td>
              </tr>
              <tr *ngIf="report.salesByDay.length === 0">
                <td colspan="3" class="ui-table__empty">
                  <div class="ui-empty-state">
                    Sin datos en el rango seleccionado.
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
      .sales-filters {
        grid-template-columns: 1fr 1fr auto;
      }

      .sales-filter-actions {
        align-self: end;
      }

      .sales-table {
        min-width: 560px;
      }

      @media (max-width: 760px) {
        .sales-filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SalesReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    from: [""],
    to: [""],
  });

  canView = false;
  loading = false;
  report: SalesReportResponse | null = null;

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
      .sales({
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.report = this.normalizeReport(response);
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el reporte de ventas.",
          );
        },
      });
  }

  private normalizeReport(report: SalesReportResponse): SalesReportResponse {
    return {
      ...report,
      totalSalesAmount: this.numberOf(report.totalSalesAmount),
      averageTicket: this.numberOf(report.averageTicket),
      salesByPaymentMethod: report.salesByPaymentMethod.map(
        (row: PaymentMethodAmountResponse) => ({
          ...row,
          amount: this.numberOf(row.amount),
        }),
      ),
      salesByDay: report.salesByDay.map((row: SalesByDayResponse) => ({
        ...row,
        totalAmount: this.numberOf(row.totalAmount),
      })),
    };
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
