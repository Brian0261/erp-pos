import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse, SaleStatus } from "./data/sales.models";

@Component({
  selector: "app-sales-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card sales-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Operacion Comercial InkToy</p>
          <h1 class="ui-page-title">Ventas</h1>
          <p class="ui-page-description">
            Consulta ventas por rango de fechas, estado, caja o usuario y accede
            al detalle para seguimiento operativo.
          </p>
        </div>

        <span class="ui-badge">{{ sales.length }} registros</span>
      </header>

      <form
        [formGroup]="filterForm"
        (ngSubmit)="applyFilters()"
        class="filters"
      >
        <label class="field">
          <span>Desde</span>
          <input type="date" formControlName="from" />
        </label>

        <label class="field">
          <span>Hasta</span>
          <input type="date" formControlName="to" />
        </label>

        <label class="field">
          <span>Estado</span>
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statuses" [value]="status">
              {{ status }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Caja</span>
          <input
            type="number"
            min="1"
            formControlName="cashRegisterSessionId"
          />
        </label>

        <label class="field">
          <span>Usuario</span>
          <input
            type="text"
            formControlName="createdBy"
            placeholder="admin, cajero..."
          />
        </label>

        <div class="filter-actions">
          <button type="submit" class="ui-button ui-button--primary">
            Filtrar
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="resetFilters()"
          >
            Limpiar
          </button>
        </div>
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando ventas...</p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table sales-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nro venta</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th class="cell-number">Total</th>
              <th>Usuario</th>
              <th>Caja</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sale of sales">
              <td class="cell-id">#{{ sale.id }}</td>
              <td class="cell-code">{{ sale.saleNumber }}</td>
              <td>{{ sale.soldAt | date: "yyyy-MM-dd HH:mm" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--danger]="sale.status === 'VOIDED'"
                  [class.ui-badge--success]="sale.status !== 'VOIDED'"
                >
                  {{ sale.status }}
                </span>
              </td>
              <td class="cell-number">
                {{ sale.totalAmount | number: "1.2-2" }}
              </td>
              <td>{{ sale.createdBy }}</td>
              <td>#{{ sale.cashRegisterSessionId }}</td>
              <td>
                <a
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/ventas', sale.id]"
                  >Ver detalle</a
                >
              </td>
            </tr>
            <tr *ngIf="sales.length === 0">
              <td colspan="8" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay ventas para los filtros aplicados.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .sales-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h1 {
        margin: 0;
      }

      .filters {
        display: grid;
        gap: var(--space-3);
        grid-template-columns: repeat(6, minmax(130px, 1fr));
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      input,
      select {
        padding: 0.6rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      .filter-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .sales-table {
        min-width: 980px;
      }

      .cell-id,
      .cell-code,
      .cell-number {
        white-space: nowrap;
      }

      .cell-number {
        text-align: right;
      }

      .ui-button {
        white-space: nowrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1100px) {
        .sales-page {
          padding: var(--space-4);
        }

        .filters {
          grid-template-columns: repeat(2, minmax(160px, 1fr));
        }
      }

      @media (max-width: 700px) {
        .filters {
          grid-template-columns: 1fr;
        }

        .filter-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class SalesPageComponent implements OnInit {
  readonly filterForm = this.formBuilder.group({
    from: [""],
    to: [""],
    status: [""],
    cashRegisterSessionId: [null as number | null],
    createdBy: [""],
  });

  readonly statuses: SaleStatus[] = ["COMPLETED", "VOIDED"];

  sales: SaleResponse[] = [];
  loading = false;
  errorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly salesService: SalesService,
  ) {}

  ngOnInit(): void {
    this.loadSales();
  }

  applyFilters(): void {
    const { from, to } = this.filterForm.getRawValue();

    if (from && to && from > to) {
      this.errorMessage =
        "El rango de fechas es invalido: desde no puede ser mayor que hasta.";
      return;
    }

    this.loadSales();
  }

  resetFilters(): void {
    this.filterForm.reset({
      from: "",
      to: "",
      status: "",
      cashRegisterSessionId: null,
      createdBy: "",
    });
    this.loadSales();
  }

  private loadSales(): void {
    const value = this.filterForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.salesService
      .list({
        from: value.from || undefined,
        to: value.to || undefined,
        status: (value.status as SaleStatus | "") || undefined,
        cashRegisterSessionId: value.cashRegisterSessionId ?? undefined,
        createdBy: value.createdBy?.trim() ? value.createdBy.trim() : undefined,
      })
      .subscribe({
        next: (sales) => {
          this.loading = false;
          this.sales = sales;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el listado de ventas.",
          );
        },
      });
  }
}
