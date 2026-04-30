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
    <section class="ui-card ui-module-page top-products-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria comercial</p>
          <h1 class="ui-page-title">Productos mas vendidos</h1>
          <p class="ui-page-description">
            Ranking por unidades vendidas y monto total para priorizar
            reposicion.
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
          <h2 class="ui-module-section__title">Filtros de ranking</h2>
        </header>

        <form
          class="ui-filter-grid top-products-filters"
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
            <span>Limite</span>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              formControlName="limit"
            />
          </label>

          <div class="ui-filter-actions top-products-actions">
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

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Ranking de productos</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table top-products-table">
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
                <td>
                  <span class="ui-chip" [ngClass]="rankingChipClass(i)">
                    {{ i + 1 }}
                  </span>
                </td>
                <td>{{ row.productName }}</td>
                <td>{{ row.sku }}</td>
                <td>{{ row.barcode || "-" }}</td>
                <td>{{ numberOf(row.quantitySold) | number: "1.2-2" }}</td>
                <td>{{ numberOf(row.totalAmount) | number: "1.2-2" }}</td>
              </tr>
              <tr *ngIf="!loading && items.length === 0">
                <td colspan="6" class="ui-table__empty">
                  <div class="ui-empty-state">
                    No hay datos para los filtros seleccionados.
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
      .top-products-filters {
        grid-template-columns: 1fr 1fr minmax(120px, 180px) auto;
      }

      .top-products-actions {
        align-self: end;
      }

      .top-products-table {
        min-width: 860px;
      }

      @media (max-width: 760px) {
        .top-products-filters {
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

  rankingChipClass(index: number): string {
    if (index === 0) {
      return "ui-chip--success";
    }
    if (index === 1) {
      return "ui-chip--info";
    }
    if (index === 2) {
      return "ui-chip--warning";
    }
    return "ui-chip--neutral";
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
