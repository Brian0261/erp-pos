import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

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
                {{ saleStatusLabel(status) }}
              </option>
            </select>
          </label>

        <label class="field">
          <span>Caja</span>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            formControlName="cashRegisterSessionId"
            (keydown)="onCashRegisterKeydown($event)"
            (input)="sanitizeCashRegisterInput($event)"
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
              <td>{{ sale.soldAt | date: "dd/MM/yyyy HH:mm" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--danger]="sale.status === 'VOIDED'"
                  [class.ui-badge--success]="sale.status !== 'VOIDED'"
                >
                  {{ saleStatusLabel(sale.status) }}
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
  private readonly destroyRef = inject(DestroyRef);

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
    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyFilters();
      });

    this.loadSales();
  }

  saleStatusLabel(status: SaleStatus | string): string {
    switch (status) {
      case "COMPLETED":
        return "Completada";
      case "VOIDED":
        return "Anulada";
      case "PENDING":
        return "Pendiente";
      case "CANCELLED":
        return "Cancelada";
      default:
        return status;
    }
  }

  applyFilters(): void {
    const { from, to, cashRegisterSessionId } = this.filterForm.getRawValue();

    if (from && to && from > to) {
      this.errorMessage =
        "La fecha Desde no puede ser mayor que la fecha Hasta.";
      return;
    }

    if (
      cashRegisterSessionId !== null &&
      this.normalizeCashRegisterSessionId(cashRegisterSessionId) === undefined
    ) {
      this.errorMessage = "Ingresa un número de caja válido.";
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
    }, { emitEvent: false });
    this.loadSales();
  }

  onCashRegisterKeydown(event: KeyboardEvent): void {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      ["Backspace", "Delete", "Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      return;
    }

    event.preventDefault();
  }

  sanitizeCashRegisterInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const sanitized = input.value.match(/^\d*/)?.[0] ?? "";
    if (input.value !== sanitized) {
      input.value = sanitized;
    }

    this.filterForm.controls.cashRegisterSessionId.setValue(
      sanitized ? Number(sanitized) : null,
      { emitEvent: false },
    );
  }

  private loadSales(): void {
    const value = this.filterForm.getRawValue();
    const cashRegisterSessionId = this.normalizeCashRegisterSessionId(value.cashRegisterSessionId);
    const from = value.from || undefined;
    const to = value.to || undefined;

    this.loading = true;
    this.errorMessage = "";

    this.salesService
      .list({
        status: (value.status as SaleStatus | "") || undefined,
        cashRegisterSessionId,
        createdBy: value.createdBy?.trim() ? value.createdBy.trim() : undefined,
      })
      .subscribe({
        next: (sales) => {
          this.loading = false;
          this.sales = this.applyDateRangeFilter(sales, from, to);
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

  private normalizeCashRegisterSessionId(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    const normalized = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      return undefined;
    }

    return normalized;
  }

  private applyDateRangeFilter(
    sales: SaleResponse[],
    from?: string,
    to?: string,
  ): SaleResponse[] {
    if (!from && !to) {
      return sales;
    }

    const fromBoundary = from ? new Date(`${from}T00:00:00.000`) : null;
    const toBoundary = to ? new Date(`${to}T23:59:59.999`) : null;

    return sales.filter((sale) => {
      const soldDate = new Date(sale.soldAt);
      if (Number.isNaN(soldDate.getTime())) {
        return false;
      }

      if (fromBoundary && soldDate < fromBoundary) {
        return false;
      }
      if (toBoundary && soldDate > toBoundary) {
        return false;
      }
      return true;
    });
  }
}
