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
    <section class="card">
      <header>
        <h1>Reporte de ventas</h1>
        <p class="muted">Analiza montos, volumen y comportamiento diario.</p>
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
            (click)="clearFilters()"
            [disabled]="loading || !canView"
          >
            Limpiar
          </button>
        </div>
      </form>

      <section class="kpis" *ngIf="report">
        <article>
          <h2>Total vendido</h2>
          <p>{{ numberOf(report.totalSalesAmount) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Cantidad ventas</h2>
          <p>{{ report.totalSalesCount }}</p>
        </article>
        <article>
          <h2>Ticket promedio</h2>
          <p>{{ numberOf(report.averageTicket) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Ventas anuladas</h2>
          <p>{{ report.voidedSalesCount }}</p>
        </article>
      </section>

      <section *ngIf="report">
        <h2>Ventas por metodo de pago</h2>
        <table>
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
              <td colspan="2" class="empty">
                Sin datos en el rango seleccionado.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section *ngIf="report">
        <h2>Ventas por dia</h2>
        <table>
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
              <td colspan="3" class="empty">
                Sin datos en el rango seleccionado.
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
        grid-template-columns: 1fr 1fr auto;
        gap: 0.6rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.3rem;
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
        grid-template-columns: repeat(4, minmax(160px, 1fr));
        gap: 0.6rem;
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
        padding: 0.5rem;
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
      @media (max-width: 900px) {
        .filters {
          grid-template-columns: 1fr;
        }
        .kpis {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 560px) {
        .kpis {
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
