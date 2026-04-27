import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { TopProductReportItemResponse } from "./data/reports.models";
import { ReportsService } from "./data/reports.service";

@Component({
  selector: "app-top-products-report-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <h1>Reporte de productos mas vendidos</h1>
        <p class="muted">Ranking por cantidad vendida y monto total.</p>
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
          Limite
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            formControlName="limit"
          />
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

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Cantidad vendida</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of items; index as i">
              <td>{{ i + 1 }}</td>
              <td>{{ row.productName }}</td>
              <td>{{ row.sku }}</td>
              <td>{{ row.barcode || "-" }}</td>
              <td>{{ numberOf(row.quantitySold) | number: "1.2-2" }}</td>
              <td>{{ numberOf(row.totalAmount) | number: "1.2-2" }}</td>
            </tr>
            <tr *ngIf="!loading && items.length === 0">
              <td colspan="6" class="empty">
                No hay datos para los filtros seleccionados.
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
      h1 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #6b7280;
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
      @media (max-width: 980px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TopProductsReportPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    from: [""],
    to: [""],
    limit: ["10"],
  });

  canView = false;
  loading = false;
  items: TopProductReportItemResponse[] = [];

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
    this.filtersForm.reset({
      from: "",
      to: "",
      limit: "10",
    });
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
    const limit = this.parseLimit(raw.limit);

    this.loading = true;
    this.errorMessage = "";

    this.reportsService
      .topProducts({
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
        limit,
      })
      .subscribe({
        next: (rows) => {
          this.loading = false;
          this.items = rows.map((row) => ({
            ...row,
            quantitySold: this.numberOf(row.quantitySold),
            totalAmount: this.numberOf(row.totalAmount),
          }));
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el reporte de top productos.",
          );
        },
      });
  }

  private parseLimit(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 10;
    }
    return Math.min(parsed, 100);
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
