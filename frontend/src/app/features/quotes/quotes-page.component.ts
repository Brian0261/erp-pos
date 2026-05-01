import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

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
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="CANCELLED">CANCELLED</option>
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
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let quote of quotes">
              <td class="quote-number">{{ quote.quoteNumber }}</td>
              <td class="customer-cell">
                <strong>{{ quote.customerName }}</strong>
                <div class="customer-meta">
                  {{ quote.customerDocument || "Sin documento" }}
                </div>
              </td>
              <td>
                <span
                  class="ui-badge status-badge"
                  [ngClass]="statusClass(quote.status)"
                >
                  {{ quote.status }}
                </span>
              </td>
              <td class="amount">{{ quote.totalAmount | number: "1.2-2" }}</td>
              <td class="expires-col">
                {{ quote.expiresAt }}
                <span class="expired-note" *ngIf="isExpired(quote)">
                  Vencida
                </span>
              </td>
              <td class="row-actions">
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
      }

      .quote-number {
        white-space: nowrap;
        font-weight: 700;
      }

      .customer-cell {
        display: grid;
        gap: 0.2rem;
      }

      .customer-meta {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .status-badge {
        font-weight: 700;
      }

      .status-draft {
        background: #dbeafe;
        color: var(--color-info);
      }

      .status-sent {
        background: #ede9fe;
        color: #6d28d9;
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

      .amount {
        white-space: nowrap;
        font-weight: 700;
      }

      .expires-col {
        display: grid;
        gap: 0.15rem;
      }

      .expired-note {
        font-size: var(--font-size-xs);
        color: var(--color-danger);
        font-weight: 700;
      }

      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
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

  sendQuote(quote: QuoteResponse): void {
    const confirmed = window.confirm(this.buildSendConfirmationMessage(quote));
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

  cancelQuote(quote: QuoteResponse): void {
    const confirmed = window.confirm(
      this.buildCancelConfirmationMessage(quote),
    );
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

  private buildSendConfirmationMessage(quote: QuoteResponse): string {
    return [
      `Vas a enviar la cotizacion ${quote.quoteNumber}.`,
      "",
      "La cotizacion cambiara de estado.",
      "",
      "Confirmas enviar la cotizacion?",
    ].join("\n");
  }

  private buildCancelConfirmationMessage(quote: QuoteResponse): string {
    return [
      `Vas a cancelar la cotizacion ${quote.quoteNumber}.`,
      "",
      "La cotizacion quedara cancelada.",
      "",
      "Confirmas cancelar la cotizacion?",
    ].join("\n");
  }
}
