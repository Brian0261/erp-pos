import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import {
  BillingDocumentStatus,
  BillingEnvironment,
  BillingSummary,
  SalesListItem,
  SaleStatus,
} from "./data/sales.models";

@Component({
  selector: "app-sales-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card sales-page">
      <header class="ui-page-head">
        <div>
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
              <th>Venta</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Comprobante</th>
              <th class="cell-number">Total</th>
              <th>Usuario</th>
              <th>Caja</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sale of sales">
              <td class="cell-code">
                <strong>{{ sale.saleNumber }}</strong>
                <span class="cell-code__secondary">
                  ID interno #{{ sale.id }}
                </span>
              </td>
              <td>{{ formatDate(sale.soldAt) }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--danger]="sale.status === 'VOIDED'"
                  [class.ui-badge--success]="sale.status !== 'VOIDED'"
                >
                  {{ saleStatusLabel(sale.status) }}
                </span>
              </td>
              <td>
                <div class="cell-billing">
                  <span
                    class="ui-badge billing-badge"
                    [ngClass]="billingBadgeClass(sale.billingSummary)"
                  >
                    {{ billingPrimaryLabel(sale.billingSummary) }}
                  </span>
                  <span
                    class="cell-code__secondary"
                    *ngIf="billingSecondaryLabel(sale.billingSummary) as secondary"
                  >
                    {{ secondary }}
                  </span>
                </div>
              </td>
              <td class="cell-number">
                {{ formatCurrency(sale.totalAmount) }}
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

      .cell-code {
        display: grid;
        gap: 0.12rem;
      }

      .cell-billing {
        display: grid;
        gap: 0.18rem;
        min-width: 0;
      }

      .cell-code__secondary {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        line-height: 1.2;
      }

      .cell-number {
        text-align: right;
      }

      .billing-badge {
        width: fit-content;
        font-weight: 700;
      }

      .billing-badge--pending {
        background: #e5e7eb;
        color: #4b5563;
      }

      .billing-badge--draft {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .billing-badge--generated {
        background: #ede9fe;
        color: #6d28d9;
      }

      .billing-badge--signed {
        background: #cffafe;
        color: #0e7490;
      }

      .billing-badge--sent {
        background: #fef3c7;
        color: #92400e;
      }

      .billing-badge--accepted {
        background: #dcfce7;
        color: #166534;
      }

      .billing-badge--rejected,
      .billing-badge--error,
      .billing-badge--cancelled {
        background: #fee2e2;
        color: #b91c1c;
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

  private readonly currencyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly dateFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  readonly filterForm = this.formBuilder.group({
    from: [""],
    to: [""],
    status: [""],
    cashRegisterSessionId: [null as number | null],
    createdBy: [""],
  });

  readonly statuses: SaleStatus[] = ["COMPLETED", "VOIDED"];

  sales: SalesListItem[] = [];
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

  billingPrimaryLabel(summary: BillingSummary | null | undefined): string {
    if (!summary?.hasElectronicDocument) {
      return "Pendiente";
    }

    return summary.fullNumber || this.billingStatusLabel(summary.status);
  }

  billingSecondaryLabel(summary: BillingSummary | null | undefined): string {
    if (!summary?.hasElectronicDocument) {
      return "Sin comprobante";
    }

    const parts = [
      this.billingStatusLabel(summary.status),
      this.billingEnvironmentLabel(summary.environment),
    ].filter(Boolean);

    return parts.join(" · ");
  }

  billingBadgeClass(summary: BillingSummary | null | undefined): string {
    if (!summary?.hasElectronicDocument) {
      return "billing-badge--pending";
    }

    switch (summary.status) {
      case "DRAFT":
        return "billing-badge--draft";
      case "GENERATED":
        return "billing-badge--generated";
      case "SIGNED":
        return "billing-badge--signed";
      case "SENT":
        return "billing-badge--sent";
      case "ACCEPTED":
        return "billing-badge--accepted";
      case "REJECTED":
        return "billing-badge--rejected";
      case "ERROR":
        return "billing-badge--error";
      case "CANCELLED":
        return "billing-badge--cancelled";
      default:
        return "billing-badge--pending";
    }
  }

  billingStatusLabel(status: BillingDocumentStatus | null | undefined): string {
    switch (status) {
      case "DRAFT":
        return "BORRADOR";
      case "GENERATED":
        return "XML GENERADO";
      case "SIGNED":
        return "FIRMADO";
      case "SENT":
        return "ENVIADO";
      case "ACCEPTED":
        return "ACEPTADO";
      case "REJECTED":
        return "RECHAZADO";
      case "ERROR":
        return "ERROR";
      case "CANCELLED":
        return "ANULADO";
      default:
        return "-";
    }
  }

  billingEnvironmentLabel(environment: BillingEnvironment | null | undefined): string {
    switch (environment) {
      case "LOCAL":
        return "Local";
      case "BETA":
        return "Beta";
      case "PROD":
        return "Producción";
      default:
        return "";
    }
  }

  formatCurrency(value: number | null | undefined): string {
    return this.currencyFormatter.format(value ?? 0);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return this.dateFormatter.format(date);
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
      .listItems({
        from,
        to,
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
    sales: SalesListItem[],
    from?: string,
    to?: string,
  ): SalesListItem[] {
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
