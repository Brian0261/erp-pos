import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { CashRegisterReportResponse } from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-cash-register-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card ui-module-page cash-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria comercial</p>
          <h1 class="ui-page-title">Reporte de caja</h1>
          <p class="ui-page-description">
            Consulta apertura, cierre y diferencia operativa por sesion de caja.
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
          <h2 class="ui-module-section__title">Consulta por sesion</h2>
        </header>

        <form
          class="ui-filter-grid cash-filters"
          [formGroup]="filtersForm"
          (ngSubmit)="loadById()"
        >
          <label class="ui-field">
            <span>CashRegisterId</span>
            <input
              type="number"
              min="1"
              step="1"
              formControlName="cashRegisterId"
            />
          </label>

          <div class="ui-filter-actions cash-filter-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="loading || !canView"
            >
              Consultar
            </button>
          </div>
        </form>
      </section>

      <section class="ui-kpi-grid" *ngIf="report">
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Apertura</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.openingAmount) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Esperado</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.expectedCashAmount) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Contado</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.countedAmount) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Diferencia</p>
          <p
            class="ui-kpi-value"
            [ngClass]="differenceClass(report.differenceAmount)"
          >
            {{ numberOf(report.differenceAmount) | number: "1.2-2" }}
          </p>
          <p class="ui-kpi-note">Contado - Esperado</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Total ventas</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.totalSales) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Estado</p>
          <p class="status-chip-wrap">
            <span class="ui-chip" [ngClass]="statusChipClass(report.status)">
              {{ report.status }}
            </span>
          </p>
        </article>
      </section>

      <section class="ui-module-section" *ngIf="report">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Ventas por metodo de pago</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table cash-table">
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
                    Sin ventas registradas para esta caja.
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
      .cash-filters {
        grid-template-columns: minmax(260px, 420px) auto;
      }

      .cash-filter-actions {
        align-self: end;
      }

      .cash-table {
        min-width: 460px;
      }

      .status-chip-wrap {
        margin: 0;
      }

      .value-positive {
        color: var(--color-success);
      }

      .value-negative {
        color: var(--color-danger);
      }

      .value-neutral {
        color: var(--color-text-primary);
      }

      @media (max-width: 760px) {
        .cash-filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CashRegisterReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    cashRegisterId: [""],
  });

  canView = false;
  loading = false;
  report: CashRegisterReportResponse | null = null;

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
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  loadById(): void {
    if (!this.canView) {
      return;
    }

    const cashRegisterId = Number(
      this.filtersForm.controls.cashRegisterId.value,
    );
    if (!Number.isFinite(cashRegisterId) || cashRegisterId <= 0) {
      this.errorMessage = "Ingresa un cashRegisterId valido.";
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.reportsService.cashRegister(cashRegisterId).subscribe({
      next: (response) => {
        this.loading = false;
        this.report = {
          ...response,
          openingAmount: this.numberOf(response.openingAmount),
          countedAmount: this.numberOf(response.countedAmount),
          expectedCashAmount: this.numberOf(response.expectedCashAmount),
          differenceAmount: this.numberOf(response.differenceAmount),
          totalSales: this.numberOf(response.totalSales),
          salesByPaymentMethod: response.salesByPaymentMethod.map((row) => ({
            ...row,
            amount: this.numberOf(row.amount),
          })),
        };
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el reporte de caja.",
        );
      },
    });
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  differenceClass(value: unknown): string {
    const amount = this.numberOf(value);
    if (amount > 0) {
      return "value-positive";
    }
    if (amount < 0) {
      return "value-negative";
    }
    return "value-neutral";
  }

  statusChipClass(status: string): string {
    return status === "CLOSED" ? "ui-chip--success" : "ui-chip--warning";
  }
}
