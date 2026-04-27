import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { SupplierService } from "../purchases/data/supplier.service";
import { SupplierResponse } from "../purchases/data/purchases.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { PurchasesReportResponse } from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-purchases-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <h1>Reporte de compras</h1>
        <p class="muted">Resumen de compras y montos por proveedor.</p>
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
          Proveedor
          <select formControlName="supplierId">
            <option value="">Todos</option>
            <option *ngFor="let supplier of suppliers" [value]="supplier.id">
              {{ supplier.name }}
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
            (click)="clearFilters()"
            [disabled]="loading || !canView"
          >
            Limpiar
          </button>
        </div>
      </form>

      <section class="kpis" *ngIf="report">
        <article>
          <h2>Monto total</h2>
          <p>{{ numberOf(report.totalPurchaseAmount) | number: "1.2-2" }}</p>
        </article>
        <article>
          <h2>Ordenes</h2>
          <p>{{ report.purchaseOrderCount }}</p>
        </article>
        <article>
          <h2>Ordenes recibidas</h2>
          <p>{{ report.receivedOrdersCount }}</p>
        </article>
      </section>

      <section *ngIf="report">
        <h2>Compras por proveedor</h2>
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of report.purchasesBySupplier">
              <td>{{ row.supplierName }} (#{{ row.supplierId }})</td>
              <td>{{ numberOf(row.amount) | number: "1.2-2" }}</td>
            </tr>
            <tr *ngIf="report.purchasesBySupplier.length === 0">
              <td colspan="2" class="empty">
                Sin compras para los filtros seleccionados.
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
        grid-template-columns: repeat(3, minmax(180px, 1fr));
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
        .filters {
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
export class PurchasesReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    from: [""],
    to: [""],
    supplierId: [""],
  });

  canView = false;
  loading = false;

  suppliers: SupplierResponse[] = [];
  report: PurchasesReportResponse | null = null;

  permissionMessage = "";
  errorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly reportsService: ReportsService,
    private readonly supplierService: SupplierService,
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

        this.loadSuppliers();
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
    this.filtersForm.reset({
      from: "",
      to: "",
      supplierId: "",
    });
    this.loadReport();
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private loadSuppliers(): void {
    this.supplierService.list().subscribe({
      next: (rows) => {
        this.suppliers = rows;
      },
      error: () => {
        this.suppliers = [];
      },
    });
  }

  private loadReport(): void {
    if (!this.canView) {
      return;
    }

    const raw = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.reportsService
      .purchases({
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
        supplierId: this.parseOptionalInt(raw.supplierId),
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.report = {
            ...response,
            totalPurchaseAmount: this.numberOf(response.totalPurchaseAmount),
            purchasesBySupplier: response.purchasesBySupplier.map((row) => ({
              ...row,
              amount: this.numberOf(row.amount),
            })),
          };
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el reporte de compras.",
          );
        },
      });
  }

  private parseOptionalInt(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
