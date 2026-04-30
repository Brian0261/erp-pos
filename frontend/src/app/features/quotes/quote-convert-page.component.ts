import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { WarehouseResponse } from "../inventory/data/inventory.models";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "../sales/data/cash-register.service";
import { CashRegisterResponse } from "../sales/data/sales.models";
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
  amount: number;
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
            Cotizacion {{ quote.quoteNumber }} | Estado {{ quote.status }}
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/cotizaciones', quote.id]"
        >
          Volver al detalle
        </a>
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
      <p class="ui-alert ui-alert--success" *ngIf="currentCashSession">
        Caja abierta #{{ currentCashSession.id }} desde
        {{ currentCashSession.openedAt | date: "yyyy-MM-dd HH:mm" }}.
      </p>
      <p class="ui-alert ui-alert--info">
        El stock disponible y reglas de negocio se validan al convertir.
      </p>

      <section class="summary-grid">
        <article class="summary-card">
          <h2>Cotizacion</h2>
          <p>
            <span class="label">Cliente</span>
            <strong>{{ quote.customerName }}</strong>
          </p>
          <p>
            <span class="label">Vencimiento</span>
            <strong>{{ quote.expiresAt }}</strong>
          </p>
          <p>
            <span class="label">Total cotizacion</span>
            <strong class="amount">{{
              quote.totalAmount | number: "1.2-2"
            }}</strong>
          </p>
        </article>

        <article class="summary-card" *ngIf="quote.convertedSaleId">
          <h2>Resultado conversion</h2>
          <p>
            <span class="label">Venta generada</span>
            <strong>#{{ quote.convertedSaleId }}</strong>
          </p>
          <a
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
                <td>#{{ item.productId }}</td>
                <td>{{ item.quantity | number: "1.0-3" }}</td>
                <td>{{ item.unitPrice | number: "1.2-2" }}</td>
                <td>{{ item.discountAmount | number: "1.2-2" }}</td>
                <td>{{ item.lineTotal | number: "1.2-2" }}</td>
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
                {{ warehouse.code }} - {{ warehouse.name }}
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
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    [value]="payment.amount"
                    (input)="setPaymentAmount(index, $any($event.target).value)"
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
          <p class="value">{{ quote.totalAmount | number: "1.2-2" }}</p>
        </article>
        <article
          class="total-box"
          [class.total-box--strong]="paidTotal >= quote.totalAmount"
        >
          <p class="label">Total pagado</p>
          <p class="value">{{ paidTotal | number: "1.2-2" }}</p>
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

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .inline-link {
        font-weight: 700;
        text-decoration: underline;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
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
        font-size: 1.2rem;
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
        min-width: 900px;
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
        grid-template-columns: repeat(2, minmax(140px, 1fr));
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

  payments: PaymentLine[] = [
    { paymentMethod: "CASH", amount: 0, reference: "" },
  ];

  submitting = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly quoteService: QuoteService,
    private readonly warehouseService: WarehouseService,
    private readonly cashRegisterService: CashRegisterService,
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

  addPaymentLine(): void {
    this.payments.push({ paymentMethod: "CASH", amount: 0, reference: "" });
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

    payment.amount = Math.max(this.normalizeNumber(value), 0);
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
    this.errorMessage = "";
    this.successMessage = "";

    if (!this.quote) {
      this.errorMessage = "Cotizacion no disponible.";
      return;
    }

    const validation = this.validateBeforeConvert();
    if (validation) {
      this.errorMessage = validation;
      return;
    }

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
      warehouses: this.warehouseService.list(true),
      cashSession: this.cashRegisterService
        .current()
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ quote, warehouses, cashSession }) => {
        this.quote = quote;
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
