import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuoteService } from "./data/quote.service";
import {
  QuoteHistoryResponse,
  QuoteResponse,
  QuoteStatus,
} from "./data/quotes.models";

@Component({
  selector: "app-quote-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card quote-detail-page" *ngIf="quote">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Comercial InkToy</p>
          <h1 class="ui-page-title">
            Detalle de cotizacion {{ quote.quoteNumber }}
          </h1>
          <p class="ui-page-description">
            Consulta cliente, items, historial de estados y conversion a venta.
          </p>
        </div>

        <div class="header-actions">
          <span
            class="ui-badge status-badge"
            [ngClass]="statusClass(quote.status)"
          >
            {{ quote.status }}
          </span>
          <a
            class="ui-button ui-button--secondary"
            [routerLink]="['/cotizaciones']"
          >
            Volver al listado
          </a>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <section class="summary-grid">
        <article class="summary-card">
          <h2>Cliente</h2>
          <p>
            <span class="label">Nombre</span>
            <strong>{{ quote.customerName }}</strong>
          </p>
          <p>
            <span class="label">Documento</span>
            <strong>{{ quote.customerDocument || "-" }}</strong>
          </p>
          <p>
            <span class="label">Telefono</span>
            <strong>{{ quote.customerPhone || "-" }}</strong>
          </p>
          <p>
            <span class="label">Correo</span>
            <strong>{{ quote.customerEmail || "-" }}</strong>
          </p>
        </article>

        <article class="summary-card">
          <h2>Datos de operacion</h2>
          <p>
            <span class="label">Emision</span>
            <strong>{{ quote.issueDate }}</strong>
          </p>
          <p>
            <span class="label">Vencimiento</span>
            <strong>{{ quote.expiresAt }}</strong>
          </p>
          <p>
            <span class="label">Creado por</span>
            <strong>{{ quote.createdBy }}</strong>
          </p>
          <p>
            <span class="label">Notas</span>
            <strong>{{ quote.notes || "-" }}</strong>
          </p>
        </article>
      </section>

      <p
        class="ui-alert ui-alert--info converted-note"
        *ngIf="quote.convertedSaleId"
      >
        Venta generada: #{{ quote.convertedSaleId }}
        <a
          class="inline-link"
          [routerLink]="['/ventas', quote.convertedSaleId]"
        >
          Ver venta
        </a>
      </p>

      <section class="workflow-actions">
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
          [disabled]="processing"
          (click)="sendQuote()"
        >
          Enviar
        </button>
        <button
          *ngIf="canCancel(quote)"
          type="button"
          class="ui-button ui-button--danger"
          [disabled]="processing"
          (click)="cancelQuote()"
        >
          Cancelar
        </button>
        <a
          *ngIf="canConvert(quote)"
          class="ui-button ui-button--primary"
          [routerLink]="['/cotizaciones', quote.id, 'convertir']"
        >
          Convertir a venta
        </a>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Items</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table detail-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Descuento</th>
                <th>Total linea</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of quote.items">
                <td>{{ productName(item.productId) }}</td>
                <td>{{ item.quantity | number: "1.0-3" }}</td>
                <td>{{ item.unitPrice | number: "1.2-2" }}</td>
                <td>{{ item.discountAmount | number: "1.2-2" }}</td>
                <td>{{ item.lineTotal | number: "1.2-2" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="totals-strip">
        <article class="total-box">
          <p class="label">Subtotal</p>
          <p class="value">{{ quote.subtotalAmount | number: "1.2-2" }}</p>
        </article>
        <article class="total-box">
          <p class="label">Descuento</p>
          <p class="value">{{ quote.discountAmount | number: "1.2-2" }}</p>
        </article>
        <article class="total-box total-box--strong">
          <p class="label">Total</p>
          <p class="value">{{ quote.totalAmount | number: "1.2-2" }}</p>
        </article>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Historial de estados</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table detail-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado previo</th>
                <th>Nuevo estado</th>
                <th>Comentario</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let event of history">
                <td>{{ event.changedAt | date: "yyyy-MM-dd HH:mm" }}</td>
                <td>{{ event.previousStatus || "-" }}</td>
                <td>{{ event.newStatus }}</td>
                <td>{{ event.comment || "-" }}</td>
                <td>{{ event.changedBy }}</td>
              </tr>
              <tr *ngIf="history.length === 0">
                <td colspan="5" class="ui-table__empty">
                  <div class="ui-empty-state">No hay historial disponible.</div>
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
      .quote-detail-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .status-badge {
        font-weight: 700;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(260px, 1fr));
        gap: var(--space-3);
      }

      .summary-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-2);
      }

      .summary-card p {
        margin: 0;
        display: grid;
        gap: 0.15rem;
      }

      .summary-card .label {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .converted-note {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .inline-link {
        font-weight: 700;
        text-decoration: underline;
      }

      .workflow-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .data-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .detail-table {
        min-width: 920px;
      }

      .totals-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: var(--space-3);
      }

      .total-box {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: 0.15rem;
      }

      .total-box--strong {
        border-color: #c7d2fe;
        background: #eef2ff;
      }

      .total-box .label {
        margin: 0;
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .total-box .value {
        margin: 0;
        font-size: 1.15rem;
        font-family: var(--font-family-display);
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

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 960px) {
        .summary-grid,
        .totals-strip {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .quote-detail-page {
          padding: var(--space-4);
        }
      }
    `,
  ],
})
export class QuoteDetailPageComponent implements OnInit {
  quoteId = 0;
  quote: QuoteResponse | null = null;
  history: QuoteHistoryResponse[] = [];

  private readonly productById = new Map<number, Product>();

  processing = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly quoteService: QuoteService,
    private readonly productService: ProductService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.errorMessage = "Cotizacion no valida.";
      return;
    }

    this.quoteId = id;
    this.loadData();
  }

  sendQuote(): void {
    if (!this.quote || !this.canSend(this.quote)) {
      return;
    }

    this.processing = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.quoteService.send(this.quote.id, { comment: null }).subscribe({
      next: () => {
        this.processing = false;
        this.successMessage = "Cotizacion enviada correctamente.";
        this.loadData();
      },
      error: (error: unknown) => {
        this.processing = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo enviar la cotizacion.",
        );
      },
    });
  }

  cancelQuote(): void {
    if (!this.quote || !this.canCancel(this.quote)) {
      return;
    }

    this.processing = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.quoteService.cancel(this.quote.id, { comment: null }).subscribe({
      next: () => {
        this.processing = false;
        this.successMessage = "Cotizacion cancelada correctamente.";
        this.loadData();
      },
      error: (error: unknown) => {
        this.processing = false;
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

  productName(productId: number): string {
    const product = this.productById.get(productId);
    if (!product) {
      return `Producto #${productId}`;
    }

    return `${product.name} (${product.sku})`;
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

  private loadData(): void {
    this.errorMessage = "";

    forkJoin({
      quote: this.quoteService.getById(this.quoteId),
      history: this.quoteService.history(this.quoteId),
      productsPage: this.productService.list(0, 500),
    }).subscribe({
      next: ({ quote, history, productsPage }) => {
        this.quote = quote;
        this.history = history;

        this.productById.clear();
        for (const product of productsPage.content) {
          this.productById.set(product.id, product);
        }
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el detalle de la cotizacion.",
        );
      },
    });
  }

  private isExpired(quote: QuoteResponse): boolean {
    if (quote.status === "EXPIRED") {
      return true;
    }

    const today = new Date().toISOString().slice(0, 10);
    return quote.expiresAt < today;
  }
}
