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
    <section class="card" *ngIf="quote">
      <header class="header">
        <div>
          <h1>Detalle de cotizacion</h1>
          <p class="muted">
            {{ quote.quoteNumber }} | Estado:
            <span class="status" [ngClass]="statusClass(quote.status)">{{
              quote.status
            }}</span>
          </p>
        </div>
        <a [routerLink]="['/cotizaciones']">Volver al listado</a>
      </header>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section class="summary grid">
        <p><strong>Cliente:</strong> {{ quote.customerName }}</p>
        <p><strong>Documento:</strong> {{ quote.customerDocument || "-" }}</p>
        <p><strong>Telefono:</strong> {{ quote.customerPhone || "-" }}</p>
        <p><strong>Correo:</strong> {{ quote.customerEmail || "-" }}</p>
        <p><strong>Emision:</strong> {{ quote.issueDate }}</p>
        <p><strong>Vencimiento:</strong> {{ quote.expiresAt }}</p>
        <p><strong>Creado por:</strong> {{ quote.createdBy }}</p>
        <p><strong>Notas:</strong> {{ quote.notes || "-" }}</p>
      </section>

      <p class="converted" *ngIf="quote.convertedSaleId">
        Venta generada: #{{ quote.convertedSaleId }}
        <a [routerLink]="['/ventas', quote.convertedSaleId]">Ver venta</a>
      </p>

      <section class="actions">
        <a
          *ngIf="canEdit(quote)"
          class="button"
          [routerLink]="['/cotizaciones', quote.id, 'editar']"
          >Editar</a
        >
        <button
          *ngIf="canSend(quote)"
          type="button"
          [disabled]="processing"
          (click)="sendQuote()"
        >
          Enviar
        </button>
        <button
          *ngIf="canCancel(quote)"
          type="button"
          class="danger"
          [disabled]="processing"
          (click)="cancelQuote()"
        >
          Cancelar
        </button>
        <a
          *ngIf="canConvert(quote)"
          class="button"
          [routerLink]="['/cotizaciones', quote.id, 'convertir']"
          >Convertir a venta</a
        >
      </section>

      <section class="table-wrap">
        <h2>Items</h2>
        <table>
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
      </section>

      <section class="totals">
        <p>
          <strong>Subtotal:</strong>
          {{ quote.subtotalAmount | number: "1.2-2" }}
        </p>
        <p>
          <strong>Descuento:</strong>
          {{ quote.discountAmount | number: "1.2-2" }}
        </p>
        <p><strong>Total:</strong> {{ quote.totalAmount | number: "1.2-2" }}</p>
      </section>

      <section class="table-wrap">
        <h2>Historial de estados</h2>
        <table>
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
              <td colspan="5" class="empty">No hay historial disponible.</td>
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
      h1,
      h2 {
        margin: 0;
      }
      .muted {
        color: #6b7280;
        margin: 0.25rem 0 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.5rem;
      }
      .grid p {
        margin: 0;
      }
      .converted {
        margin: 0;
        color: #166534;
      }
      .converted a {
        margin-left: 0.5rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      button,
      .button {
        padding: 0.45rem 0.75rem;
        border: 0;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
        text-decoration: none;
      }
      .danger {
        background: #b91c1c;
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
      }
      .totals {
        display: grid;
        grid-template-columns: repeat(3, minmax(140px, 1fr));
        gap: 0.5rem;
      }
      .totals p {
        margin: 0;
        background: #f3f4f6;
        padding: 0.5rem;
        border-radius: 0.35rem;
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
      @media (max-width: 900px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .grid {
          grid-template-columns: 1fr;
        }
        .totals {
          grid-template-columns: 1fr;
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
