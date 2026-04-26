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
    <section class="card" *ngIf="quote">
      <header class="header">
        <div>
          <h1>Convertir cotizacion a venta</h1>
          <p class="muted">
            Cotizacion {{ quote.quoteNumber }} | Estado {{ quote.status }}
          </p>
        </div>
        <a [routerLink]="['/cotizaciones', quote.id]">Volver al detalle</a>
      </header>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <p class="alert" *ngIf="!currentCashSession">
        No hay caja abierta para el usuario actual. Abre caja en
        <a [routerLink]="['/caja']">/caja</a> antes de convertir.
      </p>
      <p class="success" *ngIf="currentCashSession">
        Caja abierta #{{ currentCashSession.id }} desde
        {{ currentCashSession.openedAt | date: "yyyy-MM-dd HH:mm" }}.
      </p>

      <section class="summary">
        <p><strong>Cliente:</strong> {{ quote.customerName }}</p>
        <p><strong>Vencimiento:</strong> {{ quote.expiresAt }}</p>
        <p>
          <strong>Total cotizacion:</strong>
          {{ quote.totalAmount | number: "1.2-2" }}
        </p>
        <p *ngIf="quote.convertedSaleId" class="converted">
          Esta cotizacion ya fue convertida. Venta #{{ quote.convertedSaleId }}
          <a [routerLink]="['/ventas', quote.convertedSaleId]">Ver venta</a>
        </p>
      </section>

      <section class="table-wrap">
        <h2>Items de la cotizacion</h2>
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
              <td>#{{ item.productId }}</td>
              <td>{{ item.quantity | number: "1.0-3" }}</td>
              <td>{{ item.unitPrice | number: "1.2-2" }}</td>
              <td>{{ item.discountAmount | number: "1.2-2" }}</td>
              <td>{{ item.lineTotal | number: "1.2-2" }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <form [formGroup]="form" class="form-grid">
        <label>
          Almacen de salida *
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

        <label class="full">
          Comentario
          <textarea
            rows="2"
            maxlength="400"
            formControlName="comment"
          ></textarea>
        </label>
      </form>

      <section class="payments">
        <header class="payments-header">
          <h2>Pagos</h2>
          <button type="button" (click)="addPaymentLine()">Agregar pago</button>
        </header>

        <table>
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
                  (change)="setPaymentMethod(index, $any($event.target).value)"
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
                  class="danger"
                  (click)="removePaymentLine(index)"
                  [disabled]="payments.length === 1"
                >
                  Quitar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="totals">
        <p>
          <strong>Total cotizacion:</strong>
          {{ quote.totalAmount | number: "1.2-2" }}
        </p>
        <p><strong>Total pagado:</strong> {{ paidTotal | number: "1.2-2" }}</p>
      </section>

      <footer class="actions">
        <button type="button" class="secondary" (click)="refreshCashSession()">
          Refrescar caja
        </button>
        <button
          type="button"
          (click)="convert()"
          [disabled]="submitting || !canAttemptConversion()"
        >
          {{ submitting ? "Convirtiendo..." : "Convertir a venta" }}
        </button>
        <a
          *ngIf="quote.convertedSaleId"
          class="button"
          [routerLink]="['/ventas', quote.convertedSaleId]"
        >
          Ver venta #{{ quote.convertedSaleId }}
        </a>
      </footer>
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
        align-items: flex-start;
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
      .alert {
        margin: 0;
        color: #b91c1c;
      }
      .summary {
        display: grid;
        gap: 0.4rem;
      }
      .summary p {
        margin: 0;
      }
      .converted {
        color: #166534;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.65rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      textarea,
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
      .danger {
        background: #b91c1c;
      }
      .table-wrap,
      .payments {
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
      .payments-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      .totals {
        display: grid;
        grid-template-columns: repeat(2, minmax(140px, 1fr));
        gap: 0.5rem;
      }
      .totals p {
        margin: 0;
        background: #f3f4f6;
        padding: 0.5rem;
        border-radius: 0.35rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 900px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .form-grid {
          grid-template-columns: 1fr;
        }
        .totals {
          grid-template-columns: 1fr;
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
