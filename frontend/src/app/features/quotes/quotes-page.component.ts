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
    <section class="card">
      <header class="header">
        <div>
          <h1>Cotizaciones</h1>
          <p class="muted">Gestiona cotizaciones y sus estados operativos.</p>
        </div>
        <a class="button" [routerLink]="['/cotizaciones/nueva']"
          >Nueva cotizacion</a
        >
      </header>

      <form
        [formGroup]="filtersForm"
        class="filters"
        (ngSubmit)="applyFilters()"
      >
        <label>
          Estado
          <select formControlName="status">
            <option value="">Todos</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>

        <label>
          Cliente
          <input
            type="text"
            formControlName="customerQuery"
            placeholder="Nombre o documento"
            maxlength="180"
          />
        </label>

        <label>
          Desde
          <input type="date" formControlName="from" />
        </label>

        <label>
          Hasta
          <input type="date" formControlName="to" />
        </label>

        <div class="actions">
          <button type="submit" [disabled]="loading">Filtrar</button>
          <button
            type="button"
            class="secondary"
            (click)="clearFilters()"
            [disabled]="loading"
          >
            Limpiar
          </button>
        </div>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section class="table-wrap">
        <table>
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
              <td>{{ quote.quoteNumber }}</td>
              <td>
                <strong>{{ quote.customerName }}</strong>
                <div class="muted tiny">
                  {{ quote.customerDocument || "Sin documento" }}
                </div>
              </td>
              <td>
                <span class="status" [ngClass]="statusClass(quote.status)">
                  {{ quote.status }}
                </span>
              </td>
              <td>{{ quote.totalAmount | number: "1.2-2" }}</td>
              <td>
                {{ quote.expiresAt }}
                <span class="expired" *ngIf="isExpired(quote)">Vencida</span>
              </td>
              <td class="row-actions">
                <a class="link-btn" [routerLink]="['/cotizaciones', quote.id]"
                  >Ver detalle</a
                >
                <a
                  *ngIf="canEdit(quote)"
                  class="link-btn"
                  [routerLink]="['/cotizaciones', quote.id, 'editar']"
                  >Editar</a
                >
                <button
                  *ngIf="canSend(quote)"
                  type="button"
                  class="link-btn"
                  [disabled]="processingQuoteId === quote.id"
                  (click)="sendQuote(quote)"
                >
                  Enviar
                </button>
                <button
                  *ngIf="canCancel(quote)"
                  type="button"
                  class="link-btn danger"
                  [disabled]="processingQuoteId === quote.id"
                  (click)="cancelQuote(quote)"
                >
                  Cancelar
                </button>
                <a
                  *ngIf="canConvert(quote)"
                  class="link-btn"
                  [routerLink]="['/cotizaciones', quote.id, 'convertir']"
                  >Convertir</a
                >
              </td>
            </tr>
            <tr *ngIf="!loading && quotes.length === 0">
              <td colspan="6" class="empty">
                No hay cotizaciones para los filtros seleccionados.
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
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      h1 {
        margin: 0;
      }
      .muted {
        color: #6b7280;
        margin: 0.25rem 0 0;
      }
      .tiny {
        font-size: 0.8rem;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 0.65rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      button,
      .button {
        padding: 0.5rem 0.7rem;
        border-radius: 0.35rem;
        border: 1px solid #d1d5db;
      }
      button,
      .button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .button {
        text-decoration: none;
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
        vertical-align: top;
      }
      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .link-btn {
        padding: 0.35rem 0.55rem;
        border-radius: 0.3rem;
        background: #1f2937;
        color: #fff;
        border: 0;
        cursor: pointer;
        text-decoration: none;
        font-size: 0.85rem;
      }
      .danger {
        background: #b91c1c;
      }
      .status {
        display: inline-flex;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .status-draft {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .status-sent {
        background: #ede9fe;
        color: #6d28d9;
      }
      .status-expired {
        background: #fee2e2;
        color: #b91c1c;
      }
      .status-converted {
        background: #dcfce7;
        color: #166534;
      }
      .status-cancelled {
        background: #e5e7eb;
        color: #1f2937;
      }
      .expired {
        display: block;
        font-size: 0.75rem;
        color: #b91c1c;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 1080px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .filters {
          grid-template-columns: 1fr;
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
}
