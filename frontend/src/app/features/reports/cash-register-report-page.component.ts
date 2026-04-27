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
    <section class="card">
      <header>
        <h1>Reporte de caja</h1>
        <p class="muted">Consulta resumen por sesion de caja.</p>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

      <form class="filters" [formGroup]="filtersForm" (ngSubmit)="loadById()">
        <label>
          CashRegisterId
          <input
            type="number"
            min="1"
            step="1"
            formControlName="cashRegisterId"
          />
        </label>

        <div class="actions">
          <button type="submit" [disabled]="loading || !canView">
            Consultar
          </button>
        </div>
      </form>

      <section class="kpis" *ngIf="report">
        <article>
          <h2>Apertura</h2>
          <p>{{ numberOf(report.openingAmount) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Esperado</h2>
          <p>{{ numberOf(report.expectedCashAmount) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Contado</h2>
          <p>{{ numberOf(report.countedAmount) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Diferencia</h2>
          <p>{{ numberOf(report.differenceAmount) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Total ventas</h2>
          <p>{{ numberOf(report.totalSales) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Estado</h2>
          <p>{{ report.status }}</p>
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
                Sin ventas registradas para esta caja.
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
        display: flex;
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
      .kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(160px, 1fr));
        gap: 0.65rem;
      }
      .kpis article {
        border: 1px solid #e5e7eb;
        border-radius: 0.45rem;
        padding: 0.65rem;
      }
      .kpis p {
        margin: 0.3rem 0 0;
        font-size: 1.15rem;
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
      @media (max-width: 720px) {
        .filters {
          flex-direction: column;
          align-items: stretch;
        }
        .kpis {
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
}
