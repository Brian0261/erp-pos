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
    <section class="ui-card ui-module-page low-stock-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria de inventario</p>
          <h1 class="ui-page-title">Reporte de stock bajo</h1>
          <p class="ui-page-description">
            Identifica productos con cantidad menor o igual al umbral definido.
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
          <h2 class="ui-module-section__title">Filtro de umbral</h2>
        </header>

        <form
          class="ui-filter-grid low-stock-filters"
          [formGroup]="filtersForm"
          (ngSubmit)="applyFilters()"
        >
          <label class="ui-field">
            <span>Threshold</span>
            <input
              type="number"
              min="0"
              step="0.01"
              formControlName="threshold"
            />
          </label>

          <div class="ui-filter-actions low-stock-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="loading || !canView"
            >
              Aplicar
            </button>
          </div>
        </form>
      </section>

      <section class="ui-kpi-grid" *ngIf="canView">
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Registros encontrados</p>
          <p class="ui-kpi-value">{{ items.length }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Umbral aplicado</p>
          <p class="ui-kpi-value">
            {{
              numberOf(filtersForm.controls.threshold.value) | number: "1.2-2"
            }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Estado</p>
          <p class="low-stock-state">
            <span class="ui-chip ui-chip--warning">Alerta de reposicion</span>
          </p>
        </article>
      </section>

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">
            Detalle por producto y almacen
          </h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table low-stock-table">
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
                <td>
                  <span
                    class="ui-chip"
                    [ngClass]="stockChipClass(row.currentStock)"
                  >
                    {{ numberOf(row.currentStock) | number: "1.2-2" }}
                  </span>
                </td>
                <td>{{ numberOf(row.threshold) | number: "1.2-2" }}</td>
              </tr>
              <tr *ngIf="!loading && items.length === 0">
                <td colspan="6" class="ui-table__empty">
                  <div class="ui-empty-state">
                    No hay registros para el threshold seleccionado.
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
      .low-stock-filters {
        grid-template-columns: minmax(220px, 340px) auto;
      }

      .low-stock-actions {
        align-self: end;
      }

      .low-stock-state {
        margin: 0;
      }

      .low-stock-table {
        min-width: 860px;
      }

      @media (max-width: 760px) {
        .low-stock-filters {
          grid-template-columns: 1fr;
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

  stockChipClass(stock: unknown): string {
    const value = this.numberOf(stock);
    if (value <= 0) {
      return "ui-chip--danger";
    }
    if (value < 3) {
      return "ui-chip--warning";
    }
    return "ui-chip--info";
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
