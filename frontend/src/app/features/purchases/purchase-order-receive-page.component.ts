import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { ProductService } from "../catalog/data/product.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  ReceivePurchaseItemRequest,
  ReceivePurchaseOrderRequest,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";
import { SupplierService } from "./data/supplier.service";

interface ReceiveItemView {
  purchaseOrderItemId: number;
  productId: number;
  quantityOrdered: number;
  quantityReceived: number;
  quantityPending: number;
}

type ProductDisplayInfo = {
  primary: string;
  secondary: string;
};

@Component({
  selector: "app-purchase-order-receive-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card receive-page" *ngIf="order">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Recepcion de orden #{{ order.id }}</h1>
          <p class="ui-page-description">
            Registra el ingreso parcial o total respetando cantidades pendientes
            por item.
          </p>
        </div>

        <div class="header-actions">
          <span
            class="ui-badge status-badge"
            [ngClass]="{
              'status-approved': order.status === 'APPROVED',
              'status-partially': order.status === 'PARTIALLY_RECEIVED',
              'status-received': order.status === 'RECEIVED',
              'status-cancelled': order.status === 'CANCELLED',
              'status-draft': order.status === 'DRAFT',
            }"
          >
            {{ statusLabel(order.status) }}
          </span>
          <a
            class="ui-button ui-button--secondary"
            [routerLink]="['/compras/ordenes', order.id]"
          >
            Volver al detalle
          </a>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <h2>Datos generales</h2>
          <p>
            <span class="label">Proveedor</span>
            <strong class="text-ellipsis" [title]="supplierName(order.supplierId)">
              {{ supplierName(order.supplierId) }}
            </strong>
          </p>
          <p>
            <span class="label">Almacen</span>
            <strong class="text-ellipsis" [title]="warehouseTitle(order.warehouseId)">
              {{ warehouseName(order.warehouseId) }}
            </strong>
          </p>
          <p>
            <span class="label">Fecha orden</span>
            <strong>{{ formatLocalDate(order.orderDate) }}</strong>
          </p>
          <p *ngIf="order.expectedDate">
            <span class="label">Fecha esperada</span>
            <strong>{{ formatLocalDate(order.expectedDate) }}</strong>
          </p>
        </article>

        <article class="summary-card">
          <h2>Totales y seguimiento</h2>
          <p>
            <span class="label">Total</span>
            <strong class="amount">{{ formatCurrency(order.totalAmount) }}</strong>
          </p>
          <p>
            <span class="label">Items</span>
            <strong>{{ orderItems().length }}</strong>
          </p>
          <p *ngIf="order.notes">
            <span class="label">Notas</span>
            <strong class="text-ellipsis" [title]="order.notes">{{ order.notes }}</strong>
          </p>
        </article>
      </section>

      <p
        class="ui-alert ui-alert--error"
        *ngIf="!isReceivableStatus(order.status)"
      >
        Solo se puede recibir una orden en estado aprobada o recepcion parcial.
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form
        *ngIf="isReceivableStatus(order.status)"
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="form-layout"
      >
        <section class="form-section">
          <header class="section-head">
            <h2>Datos de recepcion</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Fecha de recepcion</span>
              <input type="date" formControlName="receiptDate" />
            </label>

            <label class="field full">
              <span>Notas</span>
              <textarea
                rows="3"
                maxlength="400"
                formControlName="notes"
              ></textarea>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Items pendientes</h2>
          </header>

          <div class="ui-table-wrapper">
            <table class="ui-table receive-table">
              <colgroup>
                <col class="col-index" />
                <col class="col-product" />
                <col class="col-qty" />
                <col class="col-qty" />
                <col class="col-qty" />
                <col class="col-input" />
              </colgroup>
              <thead>
                <tr>
                  <th class="th-index">Item</th>
                  <th class="th-product">Producto</th>
                  <th class="th-number">Ordenado</th>
                  <th class="th-number">Recibido</th>
                  <th class="th-number">Pendiente</th>
                  <th class="th-number">Recibir ahora</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of receiveItems; let i = index" [formGroupName]="i">
                  <td class="cell-index">{{ i + 1 }}</td>
                  <td class="cell-product" [title]="productTitle(item.productId)">
                    <div class="cell-product__inner">
                      <strong>{{ productName(item.productId) }}</strong>
                      <span *ngIf="productSecondary(item.productId)">
                        {{ productSecondary(item.productId) }}
                      </span>
                    </div>
                  </td>
                  <td class="cell-number">{{ formatQuantity(item.quantityOrdered) }}</td>
                  <td class="cell-number">{{ formatQuantity(item.quantityReceived) }}</td>
                  <td class="cell-number">{{ formatQuantity(item.quantityPending) }}</td>
                  <td class="cell-input">
                    <label class="field field--inline">
                      <input
                        type="text"
                        inputmode="decimal"
                        autocomplete="off"
                        formControlName="quantityReceived"
                        placeholder="0"
                        (input)="onReceiveQuantityInput(i, $event)"
                        (keydown)="blockInvalidDecimalKeys($event)"
                        (blur)="normalizeReceiveQuantityOnBlur(i)"
                      />
                      <small class="field-error" [class.field-error--hidden]="!itemErrors[i]">
                        {{ itemErrors[i] || "&nbsp;" }}
                      </small>
                    </label>
                  </td>
                </tr>
                <tr *ngIf="receiveItems.length === 0">
                  <td colspan="6" class="ui-table__empty">
                    <div class="ui-empty-state">No hay items pendientes para recepcion.</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Registrando..." : "Confirmar recepcion" }}
          </button>
        </div>
      </form>
    </section>

    <section class="ui-card receive-page" *ngIf="!order && !loading">
      <p class="ui-alert ui-alert--error">
        No se encontro la orden solicitada.
      </p>
      <a
        class="ui-button ui-button--secondary"
        [routerLink]="['/compras/ordenes']"
      >
        Volver al listado
      </a>
    </section>
  `,
  styles: [
    `
      .receive-page {
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

      .status-draft {
        background: #fef3c7;
        color: var(--color-warning);
      }

      .status-approved {
        background: #dbeafe;
        color: var(--color-info);
      }

      .status-partially {
        background: #e0f2fe;
        color: #075985;
      }

      .status-received {
        background: #dcfce7;
        color: var(--color-success);
      }

      .status-cancelled {
        background: #fee2e2;
        color: var(--color-danger);
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
        gap: 0.2rem;
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
        font-size: 1.25rem;
      }

      .text-ellipsis {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .form-layout {
        display: grid;
        gap: var(--space-4);
      }

      .form-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        flex-wrap: wrap;
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

      .field--inline {
        gap: 0.15rem;
      }

      .field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      input,
      textarea {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        box-sizing: border-box;
      }

      .receive-table {
        min-width: 860px;
        table-layout: fixed;
      }

      .receive-table .col-index {
        width: 4.5rem;
      }

      .receive-table .col-product {
        width: 38%;
      }

      .receive-table .col-qty {
        width: 8rem;
      }

      .receive-table .col-input {
        width: 10rem;
      }

      .receive-table th,
      .receive-table td {
        vertical-align: top;
      }

      .receive-table th {
        text-align: center;
      }

      .receive-table th.th-product,
      .receive-table td.cell-product {
        text-align: left;
      }

      .receive-table th.th-index,
      .receive-table td.cell-index {
        text-align: center;
      }

      .cell-index {
        white-space: nowrap;
        font-weight: 700;
      }

      .cell-product__inner {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .cell-product__inner strong,
      .cell-product__inner span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-product__inner span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .cell-number {
        white-space: nowrap;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }

      .cell-input {
        text-align: center;
      }

      .cell-input input {
        width: 100%;
        text-align: center;
        min-width: 0;
      }

      .field-error {
        margin: 0;
        min-height: 1rem;
        line-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .field-error--hidden {
        visibility: hidden;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .ui-empty-state {
        padding: var(--space-4);
        text-align: center;
        color: var(--color-text-secondary);
      }

      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 800px) {
        .receive-page {
          padding: var(--space-4);
        }

        .form-grid--two {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PurchaseOrderReceivePageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    receiptDate: [this.todayIsoDate()],
    notes: [""],
    items: this.formBuilder.array([]),
  });

  order: PurchaseOrderResponse | null = null;
  receiveItems: ReceiveItemView[] = [];
  itemErrors: string[] = [];

  supplierNames = new Map<number, string>();
  warehouseNames = new Map<number, string>();
  productNames = new Map<number, ProductDisplayInfo>();

  saving = false;
  loading = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly productService: ProductService,
    private readonly supplierService: SupplierService,
    private readonly warehouseService: WarehouseService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.router.navigate(["/compras/ordenes"]);
      return;
    }

    this.loadOrder(id);
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as unknown as FormArray<FormGroup>;
  }

  async submit(): Promise<void> {
    if (!this.order || !this.isReceivableStatus(this.order.status)) {
      this.errorMessage =
        "La orden no se encuentra en estado valido para recepcion.";
      return;
    }

    const payloadItems: ReceivePurchaseItemRequest[] = [];
    let hasErrors = false;

    for (let i = 0; i < this.items.length; i += 1) {
      const group = this.items.at(i);
      const rawValue = String(group.get("quantityReceived")?.value ?? "").trim();
      const pending = this.receiveItems[i]?.quantityPending ?? 0;
      const purchaseOrderItemId = Number(
        group.get("purchaseOrderItemId")?.value ?? 0,
      );

      if (!rawValue) {
        this.itemErrors[i] = "";
        continue;
      }

      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        this.itemErrors[i] = "Cantidad no valida.";
        hasErrors = true;
        continue;
      }

      if (numericValue < 0) {
        this.itemErrors[i] = "No puede ser negativa.";
        hasErrors = true;
        continue;
      }

      if (numericValue > pending) {
        this.itemErrors[i] = `No puede superar lo pendiente (${this.formatQuantity(pending)}).`;
        hasErrors = true;
        continue;
      }

      this.itemErrors[i] = "";

      if (numericValue > 0) {
        payloadItems.push({ purchaseOrderItemId, quantityReceived: numericValue });
      }
    }

    if (hasErrors) {
      this.errorMessage = "Corrige las cantidades marcadas antes de continuar.";
      return;
    }

    if (payloadItems.length === 0) {
      this.errorMessage =
        "Ingresa al menos una cantidad mayor a cero para registrar recepcion.";
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: "Confirmar recepcion",
      description: `Vas a registrar la recepcion de ${payloadItems.length} item${payloadItems.length > 1 ? "s" : ""}. Esta accion generara entrada de stock.`,
      highlightText: "Movimiento real de stock",
      confirmText: "Registrar recepcion",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const raw = this.form.getRawValue();
    const payload: ReceivePurchaseOrderRequest = {
      receiptDate: this.normalizeOptional(raw.receiptDate),
      notes: this.normalizeOptional(raw.notes),
      items: payloadItems,
    };

    this.purchaseOrderService.receive(this.order.id, payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.successMessage = "Recepcion registrada correctamente.";
        this.router.navigate(["/compras/ordenes", updated.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo registrar la recepcion.",
        );
      },
    });
  }

  isReceivableStatus(status: string): boolean {
    return status === "APPROVED" || status === "PARTIALLY_RECEIVED";
  }

  statusLabel(status: PurchaseOrderStatus): string {
    switch (status) {
      case "DRAFT":
        return "BORRADOR";
      case "APPROVED":
        return "APROBADA";
      case "PARTIALLY_RECEIVED":
        return "RECEPCION PARCIAL";
      case "RECEIVED":
        return "RECEPCION COMPLETA";
      case "CANCELLED":
        return "CANCELADA";
      default:
        return status;
    }
  }

  supplierName(supplierId: number): string {
    return this.supplierNames.get(supplierId) ?? `Proveedor #${supplierId}`;
  }

  warehouseName(warehouseId: number): string {
    return this.warehouseNames.get(warehouseId) ?? `Almacen #${warehouseId}`;
  }

  warehouseTitle(warehouseId: number): string {
    return this.warehouseNames.get(warehouseId) ?? `Almacen #${warehouseId}`;
  }

  productName(productId: number): string {
    return this.productNames.get(productId)?.primary ?? `Producto #${productId}`;
  }

  productSecondary(productId: number): string {
    return this.productNames.get(productId)?.secondary ?? "";
  }

  productTitle(productId: number): string {
    const product = this.productNames.get(productId);
    if (!product) {
      return `Producto #${productId}`;
    }
    return product.secondary ? `${product.primary} - ${product.secondary}` : product.primary;
  }

  orderItems(): Array<unknown> {
    const rawItems = this.order?.items;
    return Array.isArray(rawItems) ? rawItems : [];
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

  formatCurrency(value: unknown): string {
    const amount = this.toNumber(value) ?? 0;
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  formatQuantity(value: unknown): string {
    const amount = this.toNumber(value) ?? 0;
    return new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  blockInvalidDecimalKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "+", "-", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  onReceiveQuantityInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const control = this.items.at(index)?.get("quantityReceived") ?? null;
    if (!input || !control) {
      return;
    }

    const sanitized = this.sanitizeReceiveValue(input.value, true);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }

    control.setValue(sanitized, { emitEvent: false });
    control.markAsDirty();
  }

  normalizeReceiveQuantityOnBlur(index: number): void {
    const control = this.items.at(index)?.get("quantityReceived") ?? null;
    if (!control) {
      return;
    }

    const normalized = this.sanitizeReceiveValue(String(control.value ?? ""), false);
    if (!normalized) {
      control.setValue("", { emitEvent: false });
      control.markAsTouched();
      this.itemErrors[index] = "";
      return;
    }

    const numericValue = Number(normalized);
    if (!Number.isFinite(numericValue)) {
      control.setValue("", { emitEvent: false });
      control.markAsTouched();
      this.itemErrors[index] = "Cantidad no valida.";
      return;
    }

    if (numericValue < 0) {
      control.setValue("", { emitEvent: false });
      control.markAsTouched();
      this.itemErrors[index] = "No puede ser negativa.";
      return;
    }

    const pending = this.receiveItems[index]?.quantityPending ?? 0;
    if (numericValue > pending) {
      this.itemErrors[index] = `No puede superar lo pendiente (${this.formatQuantity(pending)}).`;
    } else {
      this.itemErrors[index] = "";
    }

    control.setValue(String(numericValue), { emitEvent: false });
    control.markAsTouched();
  }

  private loadOrder(id: number): void {
    this.loading = true;
    this.errorMessage = "";

    forkJoin({
      order: this.purchaseOrderService.getById(id),
      suppliers: this.supplierService.list(),
      warehouses: this.warehouseService.list(),
      productsPage: this.productService.list(0, 500),
    }).subscribe({
      next: ({ order, suppliers, warehouses, productsPage }) => {
        this.loading = false;
        this.order = order;

        this.supplierNames = new Map(
          suppliers.map((item) => [item.id, item.name]),
        );
        this.warehouseNames = new Map(
          warehouses.map((item) => [
            item.id,
            item.name?.trim() || item.code?.trim() || `Almacen #${item.id}`,
          ]),
        );
        this.productNames = new Map(
          productsPage.content.map((item) => [
            item.id,
            {
              primary: item.name,
              secondary: [
                item.sku ? `SKU: ${item.sku}` : "",
                item.barcode ? `Codigo: ${item.barcode}` : "",
              ]
                .filter(Boolean)
                .join(" | "),
            },
          ]),
        );

        this.receiveItems = order.items.map((item) => ({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          quantityPending: Math.max(
            item.quantityOrdered - item.quantityReceived,
            0,
          ),
        }));

        this.itemErrors = new Array(this.receiveItems.length).fill("");

        this.items.clear();
        for (const item of this.receiveItems) {
          this.items.push(
            this.formBuilder.group({
              purchaseOrderItemId: [item.purchaseOrderItemId],
              quantityReceived: [""],
            }),
          );
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar la orden.",
        );
      },
    });
  }

  private sanitizeReceiveValue(rawValue: string, keepTrailingDot: boolean): string {
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

    const decimalPart = decimalRaw.replace(/\D/g, "").slice(0, 1);
    if (hasDot) {
      if (decimalPart.length > 0) {
        return `${integerPart || "0"}.${decimalPart}`;
      }
      return keepTrailingDot ? `${integerPart || "0"}.` : `${integerPart || "0"}`;
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

  private todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
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
