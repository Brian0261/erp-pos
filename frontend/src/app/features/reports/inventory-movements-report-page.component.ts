import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryMovementReportItemResponse } from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-inventory-movements-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card ui-module-page inventory-movements-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria de inventario</p>
          <h1 class="ui-page-title">Movimientos de inventario</h1>
          <p class="ui-page-description">
            Consulta entradas y salidas por fecha, producto o almacen.
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
          <h2 class="ui-module-section__title">Filtros de consulta</h2>
        </header>

        <form
          class="ui-filter-grid movements-filters"
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
            <span>ProductId</span>
            <input type="number" min="1" step="1" formControlName="productId" />
          </label>

          <label class="ui-field">
            <span>WarehouseId</span>
            <input
              type="number"
              min="1"
              step="1"
              formControlName="warehouseId"
            />
          </label>

          <div class="ui-filter-actions movements-actions">
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

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Detalle de movimientos</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table movements-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Almacen</th>
                <th>Cantidad</th>
                <th>Stock previo</th>
                <th>Stock nuevo</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of items">
                <td>{{ row.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
                <td>
                  <span
                    class="ui-chip"
                    [ngClass]="movementChipClass(row.movementType)"
                  >
                    {{ row.movementType }}
                  </span>
                </td>
                <td>{{ row.productName }}</td>
                <td>{{ row.warehouseName }}</td>
                <td>{{ numberOf(row.quantity) | number: "1.2-2" }}</td>
                <td>{{ numberOf(row.previousStock) | number: "1.2-2" }}</td>
                <td>{{ numberOf(row.newStock) | number: "1.2-2" }}</td>
                <td>{{ row.reason || "-" }}</td>
                <td>{{ row.createdBy || "-" }}</td>
              </tr>
              <tr *ngIf="!loading && items.length === 0">
                <td colspan="9" class="ui-table__empty">
                  <div class="ui-empty-state">
                    No hay movimientos para los filtros seleccionados.
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
      .movements-actions {
        grid-column: 1 / -1;
      }

      .movements-table {
        min-width: 1120px;
      }
    `,
  ],
})
export class InventoryMovementsReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    from: [""],
    to: [""],
    productId: [""],
    warehouseId: [""],
  });

  canView = false;
  loading = false;
  items: InventoryMovementReportItemResponse[] = [];

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

  clearFilters(): void {
    this.filtersForm.reset({
      from: "",
      to: "",
      productId: "",
      warehouseId: "",
    });
    this.loadReport();
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  movementChipClass(movementType: string): string {
    if (
      movementType.includes("IN") ||
      movementType.includes("RECEIPT") ||
      movementType.includes("RETURN")
    ) {
      return "ui-chip--success";
    }

    if (movementType.includes("OUT") || movementType.includes("VOID")) {
      return "ui-chip--warning";
    }

    if (movementType.includes("ADJUSTMENT")) {
      return "ui-chip--info";
    }

    return "ui-chip--neutral";
  }

  private loadReport(): void {
    if (!this.canView) {
      return;
    }

    const raw = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.reportsService
      .inventoryMovements({
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
        productId: this.parseOptionalInt(raw.productId),
        warehouseId: this.parseOptionalInt(raw.warehouseId),
      })
      .subscribe({
        next: (rows) => {
          this.loading = false;
          this.items = rows.map((row) => ({
            ...row,
            quantity: this.numberOf(row.quantity),
            previousStock: this.numberOf(row.previousStock),
            newStock: this.numberOf(row.newStock),
          }));
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el reporte de movimientos.",
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
