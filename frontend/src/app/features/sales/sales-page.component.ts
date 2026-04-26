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
    <section class="card">
      <header>
        <h1>Ventas</h1>
        <p class="muted">Listado de ventas y acceso a detalle.</p>
      </header>

      <form
        [formGroup]="filterForm"
        (ngSubmit)="applyFilters()"
        class="filters"
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
          Estado
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statuses" [value]="status">
              {{ status }}
            </option>
          </select>
        </label>

        <label>
          Caja
          <input
            type="number"
            min="1"
            formControlName="cashRegisterSessionId"
          />
        </label>

        <label>
          Usuario
          <input
            type="text"
            formControlName="createdBy"
            placeholder="admin, cajero..."
          />
        </label>

        <div class="actions">
          <button type="submit">Filtrar</button>
          <button type="button" class="secondary" (click)="resetFilters()">
            Limpiar
          </button>
        </div>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="muted" *ngIf="loading">Cargando ventas...</p>

      <div class="table-wrapper" *ngIf="!loading">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nro venta</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Usuario</th>
              <th>Caja</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sale of sales">
              <td>#{{ sale.id }}</td>
              <td>{{ sale.saleNumber }}</td>
              <td>{{ sale.soldAt | date: "yyyy-MM-dd HH:mm" }}</td>
              <td>
                <span
                  [class]="
                    sale.status === 'VOIDED'
                      ? 'status-voided'
                      : 'status-completed'
                  "
                >
                  {{ sale.status }}
                </span>
              </td>
              <td>{{ sale.totalAmount | number: "1.2-2" }}</td>
              <td>{{ sale.createdBy }}</td>
              <td>#{{ sale.cashRegisterSessionId }}</td>
              <td>
                <a [routerLink]="['/ventas', sale.id]">Ver detalle</a>
              </td>
            </tr>
            <tr *ngIf="sales.length === 0">
              <td colspan="8" class="empty">
                No hay ventas para los filtros aplicados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
      .filters {
        display: grid;
        gap: 0.6rem;
        grid-template-columns: repeat(6, minmax(140px, 1fr));
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      button,
      a {
        padding: 0.5rem 0.7rem;
        border-radius: 0.35rem;
        border: 1px solid #d1d5db;
      }
      button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      a {
        border: 0;
        background: #eef2ff;
        color: #1e3a8a;
        text-decoration: none;
        display: inline-flex;
      }
      .secondary {
        background: #374151;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .table-wrapper {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1000px;
      }
      th,
      td {
        padding: 0.45rem;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
      }
      .status-completed {
        color: #166534;
        font-weight: 700;
      }
      .status-voided {
        color: #b91c1c;
        font-weight: 700;
      }
      .muted,
      .error,
      .empty {
        margin: 0;
      }
      .muted,
      .empty {
        color: #6b7280;
      }
      .error {
        color: #b91c1c;
      }
      @media (max-width: 1100px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 700px) {
        .filters {
          grid-template-columns: 1fr;
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
