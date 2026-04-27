import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { LowStockItemResponse } from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-low-stock-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <h1>Reporte de stock bajo</h1>
        <p class="muted">
          Lista productos con cantidad menor o igual al umbral definido.
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
          Threshold
          <input
            type="number"
            min="0"
            step="0.01"
            formControlName="threshold"
          />
        </label>

        <button type="submit" [disabled]="loading || !canView">Aplicar</button>
      </form>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Almacen</th>
              <th>Stock actual</th>
              <th>Threshold</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of items">
              <td>{{ row.productName }}</td>
              <td>{{ row.sku }}</td>
              <td>{{ row.barcode || "-" }}</td>
              <td>{{ row.warehouseName }} (#{{ row.warehouseId }})</td>
              <td>{{ numberOf(row.currentStock) | number: "1.2-2" }}</td>
              <td>{{ numberOf(row.threshold) | number: "1.2-2" }}</td>
            </tr>
            <tr *ngIf="!loading && items.length === 0">
              <td colspan="6" class="empty">
                No hay registros para el threshold seleccionado.
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
      .muted {
        color: #6b7280;
        margin: 0.25rem 0 0;
      }
      h1 {
        margin: 0;
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
      }
    `,
  ],
})
export class LowStockReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    threshold: ["5"],
  });

  canView = false;
  loading = false;
  items: LowStockItemResponse[] = [];

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
          ["ADMIN", "SUPERVISOR", "ALMACENERO"].includes(role),
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

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private loadReport(): void {
    if (!this.canView) {
      return;
    }

    const threshold = this.numberOf(this.filtersForm.controls.threshold.value);
    if (threshold < 0) {
      this.errorMessage = "El threshold debe ser mayor o igual a 0.";
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.reportsService.lowStock(threshold).subscribe({
      next: (rows) => {
        this.loading = false;
        this.items = rows.map((row) => ({
          ...row,
          currentStock: this.numberOf(row.currentStock),
          threshold: this.numberOf(row.threshold),
        }));
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el reporte de stock bajo.",
        );
      },
    });
  }
}
