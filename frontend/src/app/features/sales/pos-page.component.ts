import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { WarehouseService } from "../inventory/data/warehouse.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { CashRegisterService } from "./data/cash-register.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { PosService } from "./data/pos.service";
import { SalesService } from "./data/sales.service";
import {
  CashRegisterResponse,
  CreateSaleRequest,
  PaymentMethod,
  PosProductResponse,
} from "./data/sales.models";

interface PosCartItem {
  productId: number;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: number;
  stockAvailable: number;
  quantity: number;
  discountAmount: number;
}

interface PaymentLine {
  paymentMethod: PaymentMethod;
  amount: number;
  reference: string;
}

@Component({
  selector: "app-pos-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1>POS - Venta rapida</h1>
          <p class="muted">
            Escanea SKU/barcode o busca por nombre para registrar ventas.
          </p>
          <p class="alert" *ngIf="!currentCashSession">
            No hay caja abierta para el usuario actual. Abre caja en
            <a [routerLink]="['/caja']">/caja</a> antes de vender.
          </p>
          <p class="success" *ngIf="currentCashSession">
            Caja abierta #{{ currentCashSession.id }} desde
            {{ currentCashSession.openedAt | date: "yyyy-MM-dd HH:mm" }}.
          </p>
        </div>
        <a class="button secondary" [routerLink]="['/caja']">Ir a Caja</a>
      </header>

      <form [formGroup]="saleForm" class="form-grid">
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

        <label>
          SKU / Barcode
          <div class="inline-group">
            <input
              type="text"
              formControlName="code"
              placeholder="Escanear o escribir codigo"
            />
            <button
              type="button"
              (click)="lookupByCode()"
              [disabled]="loadingLookup"
            >
              Buscar codigo
            </button>
          </div>
        </label>

        <label>
          Buscar por nombre
          <div class="inline-group">
            <input
              type="text"
              formControlName="query"
              placeholder="Ej: lapiz, cuaderno"
            />
            <button
              type="button"
              (click)="searchByName()"
              [disabled]="loadingSearch"
            >
              Buscar nombre
            </button>
          </div>
        </label>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section *ngIf="searchResults.length > 0" class="search-results">
        <h2>Resultados de busqueda</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Stock disponible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let result of searchResults">
              <td>{{ result.sku }}</td>
              <td>{{ result.barcode || "-" }}</td>
              <td>{{ result.name }}</td>
              <td>{{ result.salePrice | number: "1.2-2" }}</td>
              <td>{{ result.stockAvailable | number: "1.0-3" }}</td>
              <td>
                <button type="button" (click)="addToCart(result)">
                  Agregar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="cart">
        <header class="cart-header">
          <h2>Carrito</h2>
          <button
            type="button"
            class="danger"
            (click)="clearCart()"
            [disabled]="cart.length === 0"
          >
            Limpiar carrito
          </button>
        </header>

        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Stock</th>
              <th>Cantidad *</th>
              <th>Precio unitario</th>
              <th>Descuento</th>
              <th>Subtotal</th>
              <th>Total linea</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of cart; let index = index">
              <td>{{ item.sku }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.stockAvailable | number: "1.0-3" }}</td>
              <td>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  [value]="item.quantity"
                  (input)="setQuantity(index, $any($event.target).value)"
                />
              </td>
              <td>{{ item.salePrice | number: "1.2-2" }}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  [value]="item.discountAmount"
                  (input)="setDiscount(index, $any($event.target).value)"
                />
              </td>
              <td>{{ lineSubtotal(item) | number: "1.2-2" }}</td>
              <td>{{ lineTotal(item) | number: "1.2-2" }}</td>
              <td>
                <button
                  type="button"
                  class="danger"
                  (click)="removeFromCart(index)"
                >
                  Quitar
                </button>
              </td>
            </tr>
            <tr *ngIf="cart.length === 0">
              <td colspan="9" class="empty">Carrito vacio.</td>
            </tr>
          </tbody>
        </table>
      </section>

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
                  [value]="payment.reference"
                  (input)="
                    setPaymentReference(index, $any($event.target).value)
                  "
                  maxlength="120"
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
        <p><strong>Subtotal:</strong> {{ subtotal | number: "1.2-2" }}</p>
        <p><strong>Descuento:</strong> {{ discountTotal | number: "1.2-2" }}</p>
        <p><strong>Total:</strong> {{ total | number: "1.2-2" }}</p>
        <p><strong>Pagado:</strong> {{ paidTotal | number: "1.2-2" }}</p>
        <p><strong>Vuelto:</strong> {{ change | number: "1.2-2" }}</p>
      </section>

      <footer class="actions">
        <button type="button" (click)="refreshCashSession()" class="secondary">
          Refrescar caja
        </button>
        <button type="button" (click)="finalizeSale()" [disabled]="submitting">
          Finalizar venta
        </button>
        <a
          *ngIf="lastSaleId"
          class="button"
          [routerLink]="['/ventas', lastSaleId]"
        >
          Ver venta #{{ lastSaleId }}
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
        margin: 0.5rem 0 0;
        color: #b91c1c;
      }
      .form-grid {
        display: grid;
        gap: 0.75rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      .inline-group {
        display: grid;
        grid-template-columns: 1fr auto;
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
      .secondary {
        background: #374151;
      }
      .danger {
        background: #b91c1c;
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
      .search-results,
      .cart,
      .payments {
        overflow-x: auto;
      }
      .cart-header,
      .payments-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      .totals {
        display: grid;
        grid-template-columns: repeat(5, minmax(140px, 1fr));
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
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 900px) {
        .header {
          flex-direction: column;
        }
        .inline-group {
          grid-template-columns: 1fr;
        }
        .totals {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .totals {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PosPageComponent implements OnInit {
  readonly saleForm = this.formBuilder.group({
    warehouseId: [null as number | null, Validators.required],
    code: [""],
    query: [""],
  });

  warehouses: WarehouseResponse[] = [];
  currentCashSession: CashRegisterResponse | null = null;
  searchResults: PosProductResponse[] = [];
  cart: PosCartItem[] = [];
  payments: PaymentLine[] = [
    { paymentMethod: "CASH", amount: 0, reference: "" },
  ];

  loadingLookup = false;
  loadingSearch = false;
  submitting = false;

  errorMessage = "";
  successMessage = "";
  lastSaleId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly warehouseService: WarehouseService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly posService: PosService,
    private readonly salesService: SalesService,
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.refreshCashSession();
  }

  get subtotal(): number {
    return this.cart.reduce((acc, item) => acc + this.lineSubtotal(item), 0);
  }

  get discountTotal(): number {
    return this.cart.reduce(
      (acc, item) => acc + this.normalizeNumber(item.discountAmount),
      0,
    );
  }

  get total(): number {
    return Math.max(this.subtotal - this.discountTotal, 0);
  }

  get paidTotal(): number {
    return this.payments.reduce(
      (acc, payment) => acc + this.normalizeNumber(payment.amount),
      0,
    );
  }

  get change(): number {
    return this.paidTotal > this.total ? this.paidTotal - this.total : 0;
  }

  lookupByCode(): void {
    const code = (this.saleForm.value.code ?? "").trim();
    if (!code) {
      this.errorMessage = "Ingresa un SKU o barcode para buscar.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;
    if (!warehouseId) {
      this.errorMessage = "Selecciona un almacen antes de buscar por codigo.";
      return;
    }

    this.loadingLookup = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.posService.lookup(code, warehouseId).subscribe({
      next: (product) => {
        this.loadingLookup = false;
        this.addToCart(product);
        this.saleForm.patchValue({ code: "" });
      },
      error: (error: unknown) => {
        this.loadingLookup = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo consultar el producto por codigo.",
        );
      },
    });
  }

  searchByName(): void {
    const query = (this.saleForm.value.query ?? "").trim();
    if (query.length < 2) {
      this.errorMessage =
        "Ingresa al menos 2 caracteres para buscar por nombre.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;

    this.loadingSearch = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.posService.search(query, warehouseId).subscribe({
      next: (results) => {
        this.loadingSearch = false;
        this.searchResults = results;
        if (results.length === 0) {
          this.errorMessage = "No se encontraron productos para la busqueda.";
        }
      },
      error: (error: unknown) => {
        this.loadingSearch = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo realizar la busqueda por nombre.",
        );
      },
    });
  }

  addToCart(product: PosProductResponse): void {
    this.errorMessage = "";
    this.successMessage = "";

    const existing = this.cart.find(
      (item) => item.productId === product.productId,
    );

    if (existing) {
      const nextQty = existing.quantity + 1;
      if (nextQty > product.stockAvailable) {
        this.errorMessage = `Stock insuficiente para ${product.sku}. Disponible: ${product.stockAvailable}.`;
        return;
      }
      existing.quantity = nextQty;
      return;
    }

    if (product.stockAvailable <= 0) {
      this.errorMessage = `El producto ${product.sku} no tiene stock disponible.`;
      return;
    }

    this.cart.push({
      productId: product.productId,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      salePrice: this.normalizeNumber(product.salePrice),
      stockAvailable: this.normalizeNumber(product.stockAvailable),
      quantity: 1,
      discountAmount: 0,
    });
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
  }

  clearCart(): void {
    this.cart = [];
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.lastSaleId = null;
  }

  setQuantity(index: number, rawValue: string): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = this.normalizeNumber(rawValue);
    if (parsed <= 0) {
      item.quantity = 0;
      return;
    }

    if (parsed > item.stockAvailable) {
      this.errorMessage = `Cantidad excede stock disponible (${item.stockAvailable}) para ${item.sku}.`;
      item.quantity = item.stockAvailable;
      return;
    }

    item.quantity = parsed;
  }

  setDiscount(index: number, rawValue: string): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = Math.max(this.normalizeNumber(rawValue), 0);
    const maxDiscount = this.lineSubtotal(item);

    if (parsed > maxDiscount) {
      item.discountAmount = maxDiscount;
      return;
    }

    item.discountAmount = parsed;
  }

  lineSubtotal(item: PosCartItem): number {
    return (
      this.normalizeNumber(item.salePrice) * this.normalizeNumber(item.quantity)
    );
  }

  lineTotal(item: PosCartItem): number {
    return Math.max(
      this.lineSubtotal(item) - this.normalizeNumber(item.discountAmount),
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

  setPaymentAmount(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.amount = Math.max(this.normalizeNumber(rawValue), 0);
  }

  setPaymentReference(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.reference = rawValue;
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

  finalizeSale(): void {
    this.errorMessage = "";
    this.successMessage = "";
    this.lastSaleId = null;

    const validationError = this.validateSaleBeforeSubmit();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId as number;

    const payload: CreateSaleRequest = {
      warehouseId,
      items: this.cart.map((item) => ({
        productId: item.productId,
        quantity: this.normalizeNumber(item.quantity),
        discountAmount: this.normalizeNumber(item.discountAmount),
      })),
      payments: this.payments
        .map((payment) => ({
          paymentMethod: payment.paymentMethod,
          amount: this.normalizeNumber(payment.amount),
          reference: payment.reference.trim() ? payment.reference.trim() : null,
        }))
        .filter((payment) => payment.amount > 0),
    };

    this.submitting = true;

    this.salesService.create(payload).subscribe({
      next: (sale) => {
        this.submitting = false;
        this.successMessage = `Venta ${sale.saleNumber} registrada correctamente.`;
        this.lastSaleId = sale.id;
        this.clearCart();
        this.searchResults = [];
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo registrar la venta.",
        );
      },
    });
  }

  private loadWarehouses(): void {
    this.warehouseService.list(true).subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses;
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar los almacenes.",
        );
      },
    });
  }

  private validateSaleBeforeSubmit(): string {
    if (!this.currentCashSession) {
      return "No puedes vender sin caja abierta.";
    }

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      return "warehouseId es requerido.";
    }

    if (this.cart.length === 0) {
      return "Debes agregar al menos un item al carrito.";
    }

    for (const item of this.cart) {
      if (this.normalizeNumber(item.quantity) <= 0) {
        return `La cantidad de ${item.sku} debe ser mayor que 0.`;
      }

      if (this.normalizeNumber(item.discountAmount) < 0) {
        return `El descuento de ${item.sku} debe ser >= 0.`;
      }

      if (
        this.normalizeNumber(item.quantity) >
        this.normalizeNumber(item.stockAvailable)
      ) {
        return `Stock insuficiente para ${item.sku}.`;
      }
    }

    const validPayments = this.payments.filter(
      (payment) => this.normalizeNumber(payment.amount) > 0,
    );

    if (validPayments.length === 0) {
      return "Debes registrar al menos un pago valido.";
    }

    if (this.paidTotal < this.total) {
      return "El total pagado debe ser mayor o igual al total de la venta.";
    }

    return "";
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }
}
