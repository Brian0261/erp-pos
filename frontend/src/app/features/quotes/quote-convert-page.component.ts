import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { PosService } from "../sales/data/pos.service";
import { PosProductResponse } from "../sales/data/sales.models";
import { immutableRequest } from "../sales/utils/checkout-confirmation";
import { posLineCents, posPaidCents, posTotalCents } from "../sales/utils/pos-calculations";
import { decimalText, moneyCents, quantityHundredths, scaledNumber, stockMillis } from "../sales/utils/pos-decimal";
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
          <p class="summary-row"><span class="label">Total propuesto de venta</span><strong>{{ proposalTotal === null ? 'Revalidación pendiente' : formatCurrency(proposalTotal) }}</strong></p>
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
                <td class="cell--numeric">{{ formatCurrency(item.unitPrice) }}<small *ngIf="proposalPrice(item.productId) !== null"> · Vigente {{ formatCurrency(proposalPrice(item.productId)) }}</small></td>
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
        <p class="ui-alert ui-alert--info">Los importes históricos no cambian. Revisa los precios vigentes y confirma el total de la venta resultante.</p>
        <button type="button" class="ui-button ui-button--secondary" [disabled]="submitting || revalidating || !!pendingRequest" (click)="refreshProposal()">Revalidar precios y disponibilidad</button>
        <p *ngIf="pendingRequest" class="ui-alert ui-alert--warning">Resultado pendiente: solo se permite recuperar la misma operación.</p>

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
    ]
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
  revalidating = false;
  proposalTotal: number | null = null;
  pendingRequest: ConvertQuoteToSaleRequest | null = null;
  private proposalProducts: PosProductResponse[] = [];
  private confirming = false;
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
    private readonly posService: PosService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.errorMessage = "Cotizacion no valida.";
      return;
    }

    this.quoteId = id;
    try {
      const saved = sessionStorage.getItem(this.pendingKey);
      if (saved) {
        this.pendingRequest = immutableRequest(JSON.parse(saved));
        this.form.patchValue({ warehouseId: this.pendingRequest!.warehouseId, comment: this.pendingRequest!.comment ?? "" }, { emitEvent: false });
        this.payments = this.pendingRequest!.payments.map(p => ({ paymentMethod: p.paymentMethod, amount: decimalText(moneyCents(p.amount)), reference: p.reference ?? "" }));
        this.form.disable({ emitEvent: false });
      }
    }
    catch { this.errorMessage = "No se pudo recuperar la operación pendiente."; }
    this.form.controls.warehouseId.valueChanges.subscribe(() => { this.proposalTotal = null; this.proposalProducts = []; });
    this.loadData();
  }

  get paidTotal(): number {
    try { return scaledNumber(posPaidCents(this.payments.map(p => ({ ...p, amount: Number(p.amount), amountInput: p.amount })))); }
    catch { return NaN; }
  }

  get pendingAmount(): number {
    if (!this.quote) {
      return 0;
    }
    if (this.proposalTotal === null || !Number.isFinite(this.paidTotal)) return NaN;
    const delta = moneyCents(this.proposalTotal) - moneyCents(this.paidTotal);
    return scaledNumber(delta > 0n ? delta : 0n);
  }

  addPaymentLine(): void {
    if (this.pendingRequest) return;
    this.payments.push({ paymentMethod: "CASH", amount: "", reference: "" });
  }

  removePaymentLine(index: number): void {
    if (this.pendingRequest) return;
    if (this.payments.length === 1) {
      return;
    }
    this.payments.splice(index, 1);
  }

  setPaymentMethod(index: number, value: string): void {
    if (this.pendingRequest) return;
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      payment.paymentMethod = value;
    }
  }

  setPaymentAmount(index: number, value: string): void {
    if (this.pendingRequest) return;
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.amount = value;
  }

  normalizePaymentAmountOnBlur(index: number): void {
    if (this.pendingRequest) return;
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    try { payment.amount = decimalText(moneyCents(payment.amount)); }
    catch { this.errorMessage = "El pago debe tener precisión monetaria exacta; conserva y corrige el valor ingresado."; }
  }

  blockInvalidDecimalKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "+", "-", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  setPaymentReference(index: number, value: string): void {
    if (this.pendingRequest) return;
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
    if (this.pendingRequest) return true;
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
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    const amount = this.normalizeNumber(value);
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private async convertInternal(): Promise<void> {
    if (this.submitting || this.confirming || this.revalidating) return;
    if (this.pendingRequest) {
      this.confirming = true;
      try {
        if (await this.confirmDialogService.confirm({ title: "Recuperar conversión pendiente",
          description: `Se reintentará la misma operación ${this.pendingRequest.operationId} sin crear otra venta.`,
          confirmText: "Recuperar resultado", cancelText: "Cancelar", variant: "warning" })) this.submitConversion(this.pendingRequest);
      } finally { this.confirming = false; }
      return;
    }
    if (!this.quote) {
      this.errorMessage = "Cotizacion no disponible.";
      return;
    }

    const validation = this.validateBeforeConvert();
    if (validation) {
      this.errorMessage = validation;
      return;
    }

    const payload = immutableRequest(this.buildConversionRequest());
    const fingerprint = this.conversionFingerprint();
    this.confirming = true;
    const confirmed = await this.confirmDialogService.confirm({
      title: "Convertir cotizacion",
      description: this.buildConvertConfirmationMessage(this.quote),
      confirmText: "Convertir",
      cancelText: "Cancelar",
      variant: "warning",
    }).catch(() => false).finally(() => this.confirming = false);
    if (!confirmed) {
      return;
    }
    if (fingerprint !== this.conversionFingerprint()) { this.errorMessage = "La cotización, propuesta o pagos cambiaron. Revisa y confirma nuevamente."; return; }

    this.errorMessage = "";
    this.successMessage = "";

    this.submitConversion(payload);
  }

  private submitConversion(payload: ConvertQuoteToSaleRequest): void {
    if (!this.quote) return;
    this.pendingRequest = payload;
    try { sessionStorage.setItem(this.pendingKey, JSON.stringify(payload)); }
    catch { this.errorMessage = "No se pudo conservar la identidad del cobro. No se envió la conversión."; this.pendingRequest = null; return; }
    this.form.disable({ emitEvent: false });
    this.submitting = true;

    this.quoteService.convertToSale(this.quote.id, payload).subscribe({
      next: (convertedQuote) => {
        this.pendingRequest = null;
        sessionStorage.removeItem(this.pendingKey);
        this.submitting = false;
        this.quote = convertedQuote;
        this.successMessage = `Cotizacion convertida correctamente a venta #${convertedQuote.convertedSaleId}.`;
      },
      error: (error: unknown) => {
        this.submitting = false;
        const response = error as HttpErrorResponse;
        if (response.status >= 400 && response.status < 500 && response.status !== 408
            && !["OPERATION_CONTENT_MISMATCH", "OPERATION_RESULT_UNAVAILABLE"].includes(response.error?.code)) {
          this.pendingRequest = null; sessionStorage.removeItem(this.pendingKey); this.form.enable({ emitEvent: false });
        }
        if (response.status === 409 && response.error?.code === "PRICE_CONFIRMATION_REQUIRED") {
          this.proposalTotal = null; this.proposalProducts = [];
          this.errorMessage = `Total confirmado ${response.error.confirmedTotal}; total vigente ${response.error.proposedTotal ?? 'requiere revisar descuentos'}. Revalida y confirma otra vez. ` +
            response.error.changes.map((c: { productId: number; confirmedUnitPrice: number; currentUnitPrice: number }) =>
              `Producto #${c.productId}: ${c.confirmedUnitPrice} → ${c.currentUnitPrice}`).join("; ");
          return;
        }
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

        if (!this.isConvertible(quote) && !this.pendingRequest) {
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

    if (this.proposalTotal === null) return "Revalida los precios y la disponibilidad antes de convertir.";
    let validPayments: QuotePaymentRequest[];
    try {
      validPayments = this.payments
      .map((payment) => this.mapPayment(payment))
      .filter((payment) => payment !== null) as QuotePaymentRequest[];
      const electronic = validPayments.filter(p => p.paymentMethod !== "CASH").reduce((sum, p) => sum + moneyCents(p.amount), 0n);
      if (electronic > moneyCents(this.proposalTotal)) return "Los pagos electrónicos no pueden superar el total propuesto.";
    } catch (error) { return error instanceof Error ? error.message : "Pago no válido."; }

    if (validPayments.length === 0) {
      return "Debes registrar al menos un pago valido.";
    }

    if (moneyCents(this.paidTotal) < moneyCents(this.proposalTotal)) {
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
    const amount = scaledNumber(moneyCents(payment.amount));
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
      `Total propuesto de venta: ${this.formatCurrency(this.proposalTotal)}`,
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

  private get pendingKey(): string { return `erp_quote_conversion_pending_${this.quoteId}`; }
  private conversionFingerprint(): string { return JSON.stringify([this.quote, this.proposalProducts, this.form.getRawValue(), this.payments]); }
  proposalPrice(id: number): number | null { return this.proposalProducts.find(p => p.productId === id)?.salePrice ?? null; }

  refreshProposal(): void {
    if (!this.quote || this.pendingRequest || this.revalidating) return;
    const warehouse = this.form.value.warehouseId;
    if (!warehouse) { this.errorMessage = "Selecciona un almacén."; return; }
    const quote = structuredClone(this.quote);
    const fingerprint = this.conversionFingerprint();
    this.revalidating = true;
    this.posService.snapshot(quote.items.map(i => i.productId), warehouse).subscribe({
      next: products => {
        this.revalidating = false;
        if (fingerprint !== this.conversionFingerprint()) { this.errorMessage = "La propuesta cambió durante la consulta; revalida nuevamente."; return; }
        try {
          const lines = quote.items.map(item => {
            const product = products.find(p => p.productId === item.productId);
            if (!product) throw new Error(`Producto #${item.productId} no disponible.`);
            const line = { ...product, quantity: item.quantity, discountAmount: item.discountAmount };
            posLineCents(line);
            if (quantityHundredths(item.quantity, product.quantityPolicy) * 10n > stockMillis(product.stockAvailable)) throw new Error(`${product.name}: stock insuficiente.`);
            return line;
          });
          this.proposalTotal = scaledNumber(posTotalCents(lines)); this.proposalProducts = products;
          this.errorMessage = "";
        } catch (error) { this.proposalTotal = null; this.proposalProducts = []; this.errorMessage = error instanceof Error ? error.message : "Propuesta inválida."; }
      },
      error: error => { this.revalidating = false; this.proposalTotal = null; this.proposalProducts = []; this.errorMessage = toHttpErrorMessage(error, "No se pudo revalidar."); },
    });
  }

  private buildConversionRequest(): ConvertQuoteToSaleRequest {
    if (!this.quote || this.proposalTotal === null) throw new Error("Revalidación pendiente");
    return { operationId: crypto.randomUUID(), warehouseId: this.form.value.warehouseId as number,
      confirmedTotal: this.proposalTotal, comment: this.normalizeOptional(this.form.value.comment),
      items: this.quote.items.map(item => ({ quoteItemId: item.id as number, quantity: item.quantity,
        discountAmount: item.discountAmount, confirmedUnitPrice: this.proposalPrice(item.productId) as number })),
      payments: this.payments.map(p => this.mapPayment(p)).filter((p): p is QuotePaymentRequest => p !== null) };
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return NaN;
    }
    return parsed;
  }
}
