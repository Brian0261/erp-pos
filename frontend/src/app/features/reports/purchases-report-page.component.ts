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
    <section class="ui-card ui-module-page purchases-report-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Reporteria comercial</p>
          <h1 class="ui-page-title">Reporte de compras</h1>
          <p class="ui-page-description">
            Consulta montos, volumen de ordenes y distribucion por proveedor.
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
          <h2 class="ui-module-section__title">Filtros de compras</h2>
        </header>

        <form
          class="ui-filter-grid purchases-filters"
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
            <span>Proveedor</span>
            <select formControlName="supplierId">
              <option value="">Todos</option>
              <option *ngFor="let supplier of suppliers" [value]="supplier.id">
                {{ supplier.name }}
              </option>
            </select>
          </label>

          <div class="ui-filter-actions purchases-actions">
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
          <p class="ui-kpi-label">Monto total</p>
          <p class="ui-kpi-value">
            {{ numberOf(report.totalPurchaseAmount) | number: "1.2-2" }}
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Ordenes</p>
          <p class="ui-kpi-value">{{ report.purchaseOrderCount }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Ordenes recibidas</p>
          <p class="ui-kpi-value">{{ report.receivedOrdersCount }}</p>
        </article>
      </section>

      <section class="ui-module-section" *ngIf="report">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Compras por proveedor</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table purchases-table">
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
                <td colspan="2" class="ui-table__empty">
                  <div class="ui-empty-state">
                    Sin compras para los filtros seleccionados.
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
      .purchases-filters {
        grid-template-columns: 1fr 1fr 1fr auto;
      }

      .purchases-actions {
        align-self: end;
      }

      .purchases-table {
        min-width: 540px;
      }

      @media (max-width: 760px) {
        .purchases-filters {
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
