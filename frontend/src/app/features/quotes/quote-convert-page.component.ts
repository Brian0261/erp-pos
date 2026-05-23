import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "../sales/data/cash-register.service";
import { CashRegisterResponse } from "../sales/data/sales.models";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuoteService } from "./data/quote.service";
import {
  ConvertQuoteToSaleRequest,
  QuotePaymentMethod,
  QuotePaymentRequest,
  QuoteResponse,
} from "./data/quotes.models";

interface PaymentLine {
  paymentMethod: QuotePaymentMethod;
  amount: string;
  reference: string;
}

@Component({
  selector: "app-quote-convert-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card quote-convert-page" *ngIf="quote">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Comercial InkToy</p>
          <h1 class="ui-page-title">Convertir cotizacion a venta</h1>
          <p class="ui-page-description">
            Cotizacion {{ quote.quoteNumber }} lista para conversion a venta.
          </p>
        </div>

        <div class="header-actions">
          <span class="ui-badge status-badge" [ngClass]="statusClass(quote.status)">
            {{ formatStatus(quote.status) }}
          </span>
          <a
            class="ui-button ui-button--secondary"
            [routerLink]="['/cotizaciones', quote.id]"
          >
            Volver al detalle
          </a>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <p class="ui-alert ui-alert--error" *ngIf="!currentCashSession">
        No hay caja abierta para el usuario actual. Abre caja en
        <a class="inline-link" [routerLink]="['/caja']">/caja</a> antes de
        convertir.
      </p>

      <section class="meta-row" *ngIf="quote">
        <span class="meta-chip" *ngIf="currentCashSession">
          Caja abierta: #{{ currentCashSession.id }} ·
          {{ formatDateTime(currentCashSession.openedAt) }}
        </span>
        <span class="meta-note">
          Se validan stock y reglas al confirmar la conversion.
        </span>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <h2>Cliente</h2>
          <p>
            <span class="label">Cliente</span>
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
            <strong>{{ formatDate(quote.issueDate) }}</strong>
          </p>
          <p>
            <span class="label">Vencimiento</span>
            <strong>{{ formatDate(quote.expiresAt) }}</strong>
          </p>
          <p>
            <span class="label">Estado</span>
            <strong>{{ formatStatus(quote.status) }}</strong>
          </p>
          <p>
            <span class="label">Notas</span>
            <strong>{{ quote.notes || "-" }}</strong>
          </p>
        </article>

        <article class="summary-card summary-card--strong summary-card--conversion">
          <h2>Total y conversion</h2>
          <p class="summary-row">
            <span class="label">Total cotizacion</span>
            <strong class="amount">{{ formatCurrency(quote.totalAmount) }}</strong>
          </p>
          <p class="summary-row">
            <span class="label">Total pagado</span>
            <strong>{{ formatCurrency(paidTotal) }}</strong>
          </p>
          <p class="summary-row">
            <span class="label">Pendiente</span>
            <strong [class.amount-pending]="pendingAmount > 0">{{ formatCurrency(pendingAmount) }}</strong>
          </p>
          <p class="summary-row">
            <span class="label">Estado de caja</span>
            <strong>{{ currentCashSession ? 'ABIERTA' : 'SIN CAJA ABIERTA' }}</strong>
          </p>
          <p *ngIf="quote.convertedSaleId">
            <span class="label">Venta generada</span>
            <strong>#{{ quote.convertedSaleId }}</strong>
          </p>
          <a
            *ngIf="quote.convertedSaleId"
            class="ui-button ui-button--secondary"
            [routerLink]="['/ventas', quote.convertedSaleId]"
          >
            Ver venta
          </a>
        </article>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Items de la cotizacion</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table convert-table">
            <colgroup>
              <col style="width: 40%;" />
              <col style="width: 12%;" />
              <col style="width: 16%;" />
              <col style="width: 16%;" />
              <col style="width: 16%;" />
            </colgroup>
            <thead>
              <tr>
                <th>Producto</th>
                <th class="cell--numeric">Cantidad</th>
                <th class="cell--numeric">Precio unitario</th>
                <th class="cell--numeric">Descuento</th>
                <th class="cell--numeric">Total linea</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of quote.items">
                <td>
                  <div class="cell-product">
                    <strong>{{ productName(item.productId) }}</strong>
                    <span *ngIf="productSecondary(item.productId) as secondary">{{ secondary }}</span>
                  </div>
                </td>
                <td class="cell--numeric">{{ item.quantity }}</td>
                <td class="cell--numeric">{{ formatCurrency(item.unitPrice) }}</td>
                <td class="cell--numeric">{{ formatCurrency(item.discountAmount) }}</td>
                <td class="cell--numeric">{{ formatCurrency(item.lineTotal) }}</td>
              </tr>
              <tr *ngIf="quote.items.length === 0">
                <td colspan="5" class="ui-table__empty">
                  <div class="ui-empty-state">No hay items registrados.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Datos de conversion</h2>
        </header>

        <form [formGroup]="form" class="form-grid form-grid--two">
          <label class="field">
            <span>Almacen de salida *</span>
            <select formControlName="warehouseId">
              <option [ngValue]="null">Selecciona almacen</option>
              <option
                *ngFor="let warehouse of warehouses"
                [ngValue]="warehouse.id"
              >
                {{ warehouseDisplay(warehouse) }}
              </option>
            </select>
          </label>

          <label class="field full">
            <span>Comentario</span>
            <textarea
              rows="2"
              maxlength="400"
              formControlName="comment"
            ></textarea>
          </label>
        </form>
      </section>

      <section class="data-section payments-section">
        <header class="section-head section-head--actions">
          <h2>Pagos</h2>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="addPaymentLine()"
          >
            Agregar pago
          </button>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table convert-table">
            <thead>
              <tr>
                <th>Metodo *</th>
                <th>Monto *</th>
                <th>Referencia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let payment of payments; let index = index">
                <td>
                  <select
                    [value]="payment.paymentMethod"
                    (change)="
                      setPaymentMethod(index, $any($event.target).value)
                    "
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    inputmode="decimal"
                    [value]="payment.amount"
                    (input)="setPaymentAmount(index, $any($event.target).value)"
                    (keydown)="blockInvalidDecimalKeys($event)"
                    (blur)="normalizePaymentAmountOnBlur(index)"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    maxlength="120"
                    [value]="payment.reference"
                    (input)="
                      setPaymentReference(index, $any($event.target).value)
                    "
                  />
                </td>
                <td>
                  <button
                    type="button"
                    class="ui-button ui-button--danger"
                    (click)="removePaymentLine(index)"
                    [disabled]="payments.length === 1"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="totals-strip">
        <article class="total-box">
          <p class="label">Total cotizacion</p>
          <p class="value">{{ formatCurrency(quote.totalAmount) }}</p>
        </article>
        <article
          class="total-box"
          [class.total-box--strong]="paidTotal >= quote.totalAmount"
        >
          <p class="label">Total pagado</p>
          <p class="value">{{ formatCurrency(paidTotal) }}</p>
        </article>
        <article
          class="total-box"
          [class.total-box--strong]="pendingAmount <= 0"
        >
          <p class="label">Pendiente</p>
          <p class="value">{{ formatCurrency(pendingAmount) }}</p>
        </article>
      </section>

      <footer class="actions-bar">
        <button
          type="button"
          class="ui-button ui-button--secondary"
          (click)="refreshCashSession()"
        >
          Refrescar caja
        </button>
        <button
          type="button"
          class="ui-button ui-button--primary"
          (click)="convert()"
          [disabled]="submitting || !canAttemptConversion()"
        >
          {{ submitting ? "Convirtiendo..." : "Convertir a venta" }}
        </button>
        <a
          *ngIf="quote.convertedSaleId"
          class="ui-button ui-button--secondary"
          [routerLink]="['/ventas', quote.convertedSaleId]"
        >
          Ver venta #{{ quote.convertedSaleId }}
        </a>
      </footer>
    </section>
  `,
  styles: [
    `
      .quote-convert-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
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

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .inline-link {
        font-weight: 700;
        text-decoration: underline;
      }

      .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
      }

      .meta-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border: 1px solid var(--color-border-default);
        border-radius: 999px;
        padding: 0.35rem 0.65rem;
        background: var(--color-bg-surface);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .meta-note {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: var(--space-3);
      }

      .summary-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-2);
        display: grid;
        gap: var(--space-1);
      }

      .summary-card p {
        margin: 0;
        display: grid;
        gap: 0.1rem;
      }

      .summary-card .label {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .summary-card .amount {
        font-family: var(--font-family-display);
        font-size: 1.3rem;
      }

      .summary-card--conversion {
        gap: 0.35rem;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-2);
      }

      .summary-row .label {
        margin: 0;
      }

      .amount-pending {
        color: var(--color-danger);
      }

      .summary-card--strong {
        border-color: var(--color-border-strong);
        border-top: 2px solid var(--color-border-strong);
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

      .section-head--actions {
        border-bottom: 1px solid var(--color-border-default);
        padding-bottom: var(--space-2);
      }

      .form-grid {
        display: grid;
        gap: var(--space-3);
      }

      .form-grid--two {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
      }

      .full {
        grid-column: 1 / -1;
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
      select,
      textarea {
        padding: 0.6rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      .convert-table {
        table-layout: fixed;
        min-width: 900px;
      }

      .convert-table th,
      .convert-table td {
        vertical-align: middle;
      }

      .cell--numeric {
        text-align: center;
      }

      .cell-product {
        display: grid;
        gap: 0.1rem;
      }

      .cell-product strong {
        font-weight: 700;
      }

      .cell-product span {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .payments-section td,
      .payments-section th {
        vertical-align: middle;
      }

      .payments-section input,
      .payments-section select {
        width: 100%;
      }

      .totals-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(140px, 1fr));
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

      .actions-bar {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .quote-convert-page {
          padding: var(--space-4);
        }

        .summary-grid,
        .form-grid--two,
        .totals-strip {
          grid-template-columns: 1fr;
        }

        .actions-bar {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class QuoteConvertPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    warehouseId: [null as number | null, Validators.required],
    comment: ["", Validators.maxLength(400)],
  });

  quoteId = 0;
  quote: QuoteResponse | null = null;
  warehouses: WarehouseResponse[] = [];
  currentCashSession: CashRegisterResponse | null = null;
  private readonly productById = new Map<number, Product>();

  payments: PaymentLine[] = [
    { paymentMethod: "CASH", amount: "", reference: "" },
  ];

  submitting = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly quoteService: QuoteService,
    private readonly productService: ProductService,
    private readonly warehouseService: WarehouseService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly confirmDialogService: ConfirmDialogService,
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

  get paidTotal(): number {
    return this.payments.reduce(
      (sum, payment) => sum + this.normalizeNumber(payment.amount),
      0,
    );
  }

  get pendingAmount(): number {
    if (!this.quote) {
      return 0;
    }
    return Math.max(this.normalizeNumber(this.quote.totalAmount) - this.paidTotal, 0);
  }

  addPaymentLine(): void {
    this.payments.push({ paymentMethod: "CASH", amount: "", reference: "" });
  }

  removePaymentLine(index: number): void {
    if (this.payments.length === 1) {
      return;
    }
    this.payments.splice(index, 1);
  }

  setPaymentMethod(index: number, value: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      payment.paymentMethod = value;
    }
  }

  setPaymentAmount(index: number, value: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.amount = this.sanitizeDecimalValue(value, 2, true);
  }

  normalizePaymentAmountOnBlur(index: number): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    const normalized = this.sanitizeDecimalValue(String(payment.amount ?? ""), 2, false);
    if (!normalized) {
      payment.amount = "";
      return;
    }

    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric < 0) {
      payment.amount = "";
      return;
    }

    payment.amount = String(numeric);
  }

  blockInvalidDecimalKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "+", "-", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  setPaymentReference(index: number, value: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.reference = value;
  }

  refreshCashSession(): void {
    this.cashRegisterService.current().subscribe({
      next: (session) => {
        this.currentCashSession = session;
      },
      error: () => {
        this.currentCashSession = null;
      },
    });
  }

  canAttemptConversion(): boolean {
    if (!this.quote) {
      return false;
    }

    return this.isConvertible(this.quote);
  }

  convert(): void {
    void this.convertInternal();
  }

  formatStatus(status: QuoteResponse["status"]): string {
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

  statusClass(status: QuoteResponse["status"]): string {
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

  productName(productId: number): string {
    const product = this.productById.get(productId);
    if (!product) {
      return `Producto #${productId}`;
    }
    return product.name;
  }

  productSecondary(productId: number): string | null {
    const product = this.productById.get(productId);
    if (!product) {
      return null;
    }

    if (product.barcode) {
      return `SKU: ${product.sku} · Codigo: ${product.barcode}`;
    }
    return `SKU: ${product.sku}`;
  }

  warehouseDisplay(warehouse: WarehouseResponse): string {
    if (warehouse.name) {
      return warehouse.name;
    }
    if (warehouse.code) {
      return warehouse.code;
    }
    return `Almacen #${warehouse.id}`;
  }

  formatDate(value: string): string {
    if (!value) {
      return "-";
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  }

  formatDateTime(value: string): string {
    if (!value) {
      return "-";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  }

  formatCurrency(value: unknown): string {
    const amount = this.normalizeNumber(value);
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  private async convertInternal(): Promise<void> {
    if (!this.quote) {
      this.errorMessage = "Cotizacion no disponible.";
      return;
    }

    const validation = this.validateBeforeConvert();
    if (validation) {
      this.errorMessage = validation;
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Convertir cotizacion",
      description: this.buildConvertConfirmationMessage(this.quote),
      confirmText: "Convertir",
      cancelText: "Cancelar",
      variant: "warning",
    });
    if (!confirmed) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    const warehouseId = Number(this.form.value.warehouseId);
    const comment = this.normalizeOptional(this.form.value.comment);
    const payments = this.payments
      .map((payment) => this.mapPayment(payment))
      .filter((payment) => payment !== null) as QuotePaymentRequest[];

    const payload: ConvertQuoteToSaleRequest = {
      warehouseId,
      comment,
      payments,
    };

    this.submitting = true;

    this.quoteService.convertToSale(this.quote.id, payload).subscribe({
      next: (convertedQuote) => {
        this.submitting = false;
        this.quote = convertedQuote;
        this.successMessage = `Cotizacion convertida correctamente a venta #${convertedQuote.convertedSaleId}.`;
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo convertir la cotizacion.",
        );
      },
    });
  }

  private loadData(): void {
    this.errorMessage = "";

    forkJoin({
      quote: this.quoteService.getById(this.quoteId),
      productsPage: this.productService.list(0, 500),
      warehouses: this.warehouseService.list(true),
      cashSession: this.cashRegisterService
        .current()
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ quote, productsPage, warehouses, cashSession }) => {
        this.quote = quote;
        this.productById.clear();
        for (const product of productsPage.content) {
          this.productById.set(product.id, product);
        }
        this.warehouses = warehouses.filter((warehouse) => warehouse.active);
        this.currentCashSession = cashSession;

        if (!this.isConvertible(quote)) {
          this.errorMessage =
            "La cotizacion no se puede convertir porque esta CONVERTED, CANCELLED o EXPIRED.";
        }
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar la pantalla de conversion.",
        );
      },
    });
  }

  private validateBeforeConvert(): string {
    if (!this.quote) {
      return "Cotizacion no disponible.";
    }

    if (!this.isConvertible(this.quote)) {
      return "No se permite convertir cotizaciones CONVERTED, CANCELLED o EXPIRED.";
    }

    if (!this.currentCashSession) {
      return "No se puede convertir sin caja abierta.";
    }

    const warehouseId = Number(this.form.value.warehouseId);
    if (!warehouseId) {
      return "warehouseId es obligatorio.";
    }

    const validPayments = this.payments
      .map((payment) => this.mapPayment(payment))
      .filter((payment) => payment !== null) as QuotePaymentRequest[];

    if (validPayments.length === 0) {
      return "Debes registrar al menos un pago valido.";
    }

    if (this.paidTotal < this.normalizeNumber(this.quote.totalAmount)) {
      return "El total pagado debe cubrir el total de la cotizacion.";
    }

    return "";
  }

  private isConvertible(quote: QuoteResponse): boolean {
    if (quote.status === "CONVERTED" || quote.status === "CANCELLED") {
      return false;
    }

    if (quote.status === "EXPIRED") {
      return false;
    }

    const today = new Date().toISOString().slice(0, 10);
    return quote.expiresAt >= today;
  }

  private mapPayment(payment: PaymentLine): QuotePaymentRequest | null {
    const amount = this.normalizeNumber(payment.amount);
    if (amount <= 0) {
      return null;
    }

    return {
      paymentMethod: payment.paymentMethod,
      amount,
      reference: this.normalizeOptional(payment.reference),
    };
  }

  private buildConvertConfirmationMessage(quote: QuoteResponse): string {
    return [
      `Vas a convertir la cotizacion ${quote.quoteNumber} a venta.`,
      "",
      `Total cotizacion: ${this.formatCurrency(quote.totalAmount)}`,
      `Total pagado: ${this.formatCurrency(this.paidTotal)}`,
      "",
      "Se generara una venta real y podria impactar caja/stock segun el flujo actual.",
      "",
      "Confirmas convertir la cotizacion?",
    ].join("\n");
  }

  private sanitizeDecimalValue(
    rawValue: string,
    maxDecimals: number,
    keepTrailingDot: boolean,
  ): string {
    const digitsAndDots = (rawValue ?? "").replace(/[^\d.]/g, "");
    if (!digitsAndDots) {
      return "";
    }

    const [integerRaw = "", ...decimalParts] = digitsAndDots.split(".");
    const decimalRaw = decimalParts.join("");
    const hasDot = digitsAndDots.includes(".");

    let integerPart = integerRaw.replace(/\D/g, "");
    if (integerPart.length > 0) {
      if (/^0+$/.test(integerPart)) {
        integerPart = "0";
      } else {
        integerPart = integerPart.replace(/^0+/, "");
      }
    }

    if (!integerPart && (hasDot || decimalRaw.length > 0)) {
      integerPart = "0";
    }

    const decimalPart = decimalRaw.replace(/\D/g, "").slice(0, maxDecimals);
    if (hasDot) {
      if (decimalPart.length > 0) {
        return `${integerPart || "0"}.${decimalPart}`;
      }
      return keepTrailingDot
        ? `${integerPart || "0"}.`
        : `${integerPart || "0"}`;
    }

    return integerPart;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }
}
