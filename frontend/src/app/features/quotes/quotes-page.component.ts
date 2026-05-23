import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuoteService } from "./data/quote.service";
import { QuoteResponse, QuoteStatus } from "./data/quotes.models";

@Component({
  selector: "app-quotes-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card quotes-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Comercial InkToy</p>
          <h1 class="ui-page-title">Cotizaciones</h1>
          <p class="ui-page-description">
            Gestiona cotizaciones, estados operativos y acciones de conversion a
            venta con visibilidad clara por etapa.
          </p>
        </div>
        <a
          class="ui-button ui-button--primary"
          [routerLink]="['/cotizaciones/nueva']"
        >
          Nueva cotizacion
        </a>
      </header>

      <form
        [formGroup]="filtersForm"
        class="filters-panel"
        (ngSubmit)="applyFilters()"
      >
        <label class="field">
          <span>Estado</span>
          <select formControlName="status">
            <option value="">Todos</option>
            <option value="DRAFT">BORRADOR</option>
            <option value="SENT">ENVIADA</option>
            <option value="EXPIRED">VENCIDA</option>
            <option value="CONVERTED">CONVERTIDA</option>
            <option value="CANCELLED">CANCELADA</option>
          </select>
        </label>

        <label class="field">
          <span>Cliente</span>
          <input
            type="text"
            formControlName="customerQuery"
            placeholder="Nombre o documento"
            maxlength="180"
          />
        </label>

        <label class="field">
          <span>Desde</span>
          <input type="date" formControlName="from" />
        </label>

        <label class="field">
          <span>Hasta</span>
          <input type="date" formControlName="to" />
        </label>

        <div class="filter-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="loading"
          >
            Filtrar
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="clearFilters()"
            [disabled]="loading"
          >
            Limpiar
          </button>
        </div>
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Cargando cotizaciones...
      </p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table quotes-table">
          <colgroup>
            <col class="col-number" />
            <col class="col-customer" />
            <col class="col-status" />
            <col class="col-amount" />
            <col class="col-date" />
            <col class="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Cotizacion</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let quote of quotes">
              <td class="cell-number">{{ quote.quoteNumber }}</td>
              <td class="cell-customer" [title]="quote.customerName">
                <div class="customer-inner">
                  <strong>{{ quote.customerName }}</strong>
                  <span class="customer-meta">
                    {{ quote.customerDocument || "Sin documento" }}
                  </span>
                </div>
              </td>
              <td class="cell-status">
                <span
                  class="ui-badge status-badge"
                  [ngClass]="statusClass(quote.status)"
                >
                  {{ statusLabel(quote.status) }}
                </span>
              </td>
              <td class="cell-amount">{{ formatCurrency(quote.totalAmount) }}</td>
              <td class="cell-date">
                <div class="date-inner">
                  {{ formatLocalDate(quote.expiresAt) }}
                  <span class="expired-note" *ngIf="isExpired(quote)">
                    Vencida
                  </span>
                </div>
              </td>
              <td class="cell-actions">
                <a
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/cotizaciones', quote.id]"
                >
                  Ver detalle
                </a>
                <a
                  *ngIf="canEdit(quote)"
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/cotizaciones', quote.id, 'editar']"
                >
                  Editar
                </a>
                <button
                  *ngIf="canSend(quote)"
                  type="button"
                  class="ui-button ui-button--primary"
                  [disabled]="processingQuoteId === quote.id"
                  (click)="sendQuote(quote)"
                >
                  Enviar
                </button>
                <button
                  *ngIf="canCancel(quote)"
                  type="button"
                  class="ui-button ui-button--danger"
                  [disabled]="processingQuoteId === quote.id"
                  (click)="cancelQuote(quote)"
                >
                  Cancelar
                </button>
                <a
                  *ngIf="canConvert(quote)"
                  class="ui-button ui-button--primary"
                  [routerLink]="['/cotizaciones', quote.id, 'convertir']"
                >
                  Convertir
                </a>
              </td>
            </tr>
            <tr *ngIf="quotes.length === 0">
              <td colspan="6" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay cotizaciones para los filtros seleccionados.
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
      .quotes-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .filters-panel {
        display: grid;
        grid-template-columns: repeat(4, minmax(170px, 1fr));
        gap: var(--space-3);
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

      .quotes-table {
        min-width: 1080px;
        table-layout: fixed;
      }

      .quotes-table .col-number {
        width: 9rem;
      }

      .quotes-table .col-customer {
        width: 24%;
      }

      .quotes-table .col-status {
        width: 8.5rem;
      }

      .quotes-table .col-amount {
        width: 9rem;
      }

      .quotes-table .col-date {
        width: 10rem;
      }

      .quotes-table .col-actions {
        width: auto;
      }

      .quotes-table th,
      .quotes-table td {
        vertical-align: top;
      }

      .quotes-table th {
        text-align: center;
      }

      .quotes-table th:first-child,
      .quotes-table td.cell-number {
        text-align: left;
      }

      .quotes-table th:nth-child(2),
      .quotes-table td.cell-customer {
        text-align: left;
      }

      .cell-number {
        white-space: nowrap;
        font-weight: 700;
      }

      .cell-customer {
        min-width: 0;
      }

      .customer-inner {
        display: grid;
        gap: 0.2rem;
        min-width: 0;
      }

      .customer-inner strong,
      .customer-inner span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .customer-meta {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .cell-status {
        text-align: center;
      }

      .status-badge {
        font-weight: 700;
      }

      .status-draft {
        background: #fef3c7;
        color: var(--color-warning);
      }

      .status-sent {
        background: #dbeafe;
        color: var(--color-info);
      }

      .status-expired {
        background: #fee2e2;
        color: var(--color-danger);
      }

      .status-converted {
        background: #dcfce7;
        color: var(--color-success);
      }

      .status-cancelled {
        background: #e5e7eb;
        color: #1f2937;
      }

      .cell-amount {
        white-space: nowrap;
        text-align: center;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
      }

      .cell-date {
        text-align: center;
      }

      .date-inner {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .expired-note {
        font-size: var(--font-size-xs);
        color: var(--color-danger);
        font-weight: 700;
      }

      .cell-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        justify-content: flex-end;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1080px) {
        .filters-panel {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 640px) {
        .quotes-page {
          padding: var(--space-4);
        }

        .filters-panel {
          grid-template-columns: 1fr;
        }

        .filter-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class QuotesPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    status: [""],
    customerQuery: [""],
    from: [""],
    to: [""],
  });

  quotes: QuoteResponse[] = [];
  loading = false;
  processingQuoteId: number | null = null;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly quoteService: QuoteService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadQuotes();
  }

  applyFilters(): void {
    this.loadQuotes();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      status: "",
      customerQuery: "",
      from: "",
      to: "",
    });
    this.loadQuotes();
  }

  async sendQuote(quote: QuoteResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: "Enviar cotizacion",
      description: `Vas a enviar la cotizacion ${quote.quoteNumber}. La cotizacion cambiara de estado.`,
      highlightText: quote.quoteNumber,
      confirmText: "Enviar",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) {
      return;
    }

    this.processingQuoteId = quote.id;
    this.errorMessage = "";
    this.successMessage = "";

    this.quoteService.send(quote.id, { comment: null }).subscribe({
      next: () => {
        this.processingQuoteId = null;
        this.successMessage = `Cotizacion ${quote.quoteNumber} enviada.`;
        this.loadQuotes();
      },
      error: (error: unknown) => {
        this.processingQuoteId = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo enviar la cotizacion.",
        );
      },
    });
  }

  async cancelQuote(quote: QuoteResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: "Cancelar cotizacion",
      description: `Vas a cancelar la cotizacion ${quote.quoteNumber}. La cotizacion quedara cancelada.`,
      highlightText: quote.quoteNumber,
      confirmText: "Cancelar cotizacion",
      cancelText: "Volver",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    this.processingQuoteId = quote.id;
    this.errorMessage = "";
    this.successMessage = "";

    this.quoteService.cancel(quote.id, { comment: null }).subscribe({
      next: () => {
        this.processingQuoteId = null;
        this.successMessage = `Cotizacion ${quote.quoteNumber} cancelada.`;
        this.loadQuotes();
      },
      error: (error: unknown) => {
        this.processingQuoteId = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cancelar la cotizacion.",
        );
      },
    });
  }

  canEdit(quote: QuoteResponse): boolean {
    return quote.status === "DRAFT" || quote.status === "SENT";
  }

  canSend(quote: QuoteResponse): boolean {
    return quote.status === "DRAFT";
  }

  canCancel(quote: QuoteResponse): boolean {
    return quote.status === "DRAFT" || quote.status === "SENT";
  }

  canConvert(quote: QuoteResponse): boolean {
    return this.canCancel(quote) && !this.isExpired(quote);
  }

  isExpired(quote: QuoteResponse): boolean {
    if (quote.status === "EXPIRED") {
      return true;
    }

    const today = new Date().toISOString().slice(0, 10);
    return quote.expiresAt < today;
  }

  statusClass(status: QuoteStatus): string {
    switch (status) {
      case "DRAFT":
        return "status-draft";
      case "SENT":
        return "status-sent";
      case "EXPIRED":
        return "status-expired";
      case "CONVERTED":
        return "status-converted";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "";
    }
  }

  statusLabel(status: QuoteStatus): string {
    switch (status) {
      case "DRAFT":
        return "BORRADOR";
      case "SENT":
        return "ENVIADA";
      case "EXPIRED":
        return "VENCIDA";
      case "CONVERTED":
        return "CONVERTIDA";
      case "CANCELLED":
        return "CANCELADA";
      default:
        return status;
    }
  }

  formatCurrency(value: unknown): string {
    const amount = this.toNumber(value) ?? 0;
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  formatLocalDate(value: unknown): string {
    const normalized = this.normalizeDateInput(value);
    if (!normalized) {
      return "-";
    }
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(normalized);
  }

  private loadQuotes(): void {
    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    const raw = this.filtersForm.getRawValue();

    this.quoteService
      .list({
        status: (raw.status || null) as QuoteStatus | null,
        customerQuery: this.normalizeOptional(raw.customerQuery),
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
      })
      .subscribe({
        next: (quotes) => {
          this.loading = false;
          this.quotes = quotes;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudieron cargar las cotizaciones.",
          );
        },
      });
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const numericValue = Number(trimmed);
      return Number.isFinite(numericValue) ? numericValue : null;
    }

    return null;
  }

  private normalizeDateInput(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "number") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      const date = new Date(trimmed);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (
      Array.isArray(value) &&
      (value.length === 3 || value.length >= 5) &&
      value.every((part) => typeof part === "number")
    ) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[];
      return new Date(year, month - 1, day, hour, minute, second);
    }

    return null;
  }
}
