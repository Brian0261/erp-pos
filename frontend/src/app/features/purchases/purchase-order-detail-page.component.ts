import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { ProductService } from "../catalog/data/product.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderItemResponse,
  PurchaseOrderResponse,
  PurchaseOrderStatus,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";
import { SupplierService } from "./data/supplier.service";

type ProductDisplayInfo = {
  primary: string;
  secondary: string;
};

@Component({
  selector: "app-purchase-order-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card order-detail-page" *ngIf="order">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Orden de compra #{{ order.id }}</h1>
          <p class="ui-page-description">
            Consulta proveedor, almacen, estado de recepcion y totales por item.
          </p>
        </div>

        <div class="header-actions">
          <span
            class="ui-badge status-badge"
            [ngClass]="{
              'status-draft': order.status === 'DRAFT',
              'status-approved': order.status === 'APPROVED',
              'status-partially': order.status === 'PARTIALLY_RECEIVED',
              'status-received': order.status === 'RECEIVED',
              'status-cancelled': order.status === 'CANCELLED',
            }"
          >
            {{ statusLabel(order.status) }}
          </span>
          <a
            class="ui-button ui-button--secondary"
            [routerLink]="['/compras/ordenes']"
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
            <strong>{{ formatLocalDate(orderDateValue()) }}</strong>
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
            <strong class="amount">{{ formatCurrency(totalAmountValue()) }}</strong>
          </p>
          <p>
            <span class="label">Actualizado</span>
            <strong>{{ formatLocalDateTime(order.updatedAt) || "-" }}</strong>
          </p>
          <p *ngIf="order.notes">
            <span class="label">Notas</span>
            <strong class="text-ellipsis" [title]="order.notes">{{ order.notes }}</strong>
          </p>
        </article>
      </section>

      <section class="workflow-actions" *ngIf="canManage">
        <a
          *ngIf="order.status === 'DRAFT'"
          class="ui-button ui-button--secondary"
          [routerLink]="['/compras/ordenes', order.id, 'editar']"
        >
          Editar orden
        </a>
        <button
          type="button"
          class="ui-button ui-button--primary"
          *ngIf="order.status === 'DRAFT'"
          (click)="approve()"
          [disabled]="savingAction"
        >
          Aprobar orden
        </button>
        <a
          *ngIf="
            order.status === 'APPROVED' || order.status === 'PARTIALLY_RECEIVED'
          "
          class="ui-button ui-button--primary"
          [routerLink]="['/compras/ordenes', order.id, 'recibir']"
        >
          Registrar recepcion
        </a>
        <button
          type="button"
          class="ui-button ui-button--danger"
          *ngIf="order.status === 'DRAFT' || order.status === 'APPROVED'"
          (click)="cancel()"
          [disabled]="savingAction"
        >
          Cancelar orden
        </button>
      </section>

      <div class="ui-table-wrapper">
        <table class="ui-table detail-table">
          <colgroup>
            <col class="col-index" />
            <col class="col-product" />
            <col class="col-qty" />
            <col class="col-qty" />
            <col class="col-qty" />
            <col class="col-money" />
            <col class="col-money" />
          </colgroup>
          <thead>
            <tr>
              <th class="th-index">Item</th>
              <th class="th-product">Producto</th>
              <th class="th-number">Ordenado</th>
              <th class="th-number">Recibido</th>
              <th class="th-number">Pendiente</th>
              <th class="th-number">Costo unit.</th>
              <th class="th-number">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of orderItems(); let index = index">
              <td class="cell-index">{{ index + 1 }}</td>
              <td class="cell-product" [title]="productTitle(item.productId)">
                <strong>{{ productName(item.productId) }}</strong>
                <span *ngIf="productSecondary(item.productId)">
                  {{ productSecondary(item.productId) }}
                </span>
              </td>
              <td class="cell-number">{{ formatQuantity(item.quantityOrdered) }}</td>
              <td class="cell-number">{{ formatQuantity(item.quantityReceived) }}</td>
              <td class="cell-number">{{ formatQuantity(pending(item.quantityOrdered, item.quantityReceived)) }}</td>
              <td class="cell-number">{{ formatCurrency(item.unitCost) }}</td>
              <td class="cell-number">{{ formatCurrency(itemLineTotal(item)) }}</td>
            </tr>
            <tr *ngIf="orderItems().length === 0">
              <td colspan="7" class="ui-table__empty">
                <div class="ui-empty-state">No hay ítems registrados para esta orden.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ui-card order-detail-page" *ngIf="!order && !loading">
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
      .order-detail-page {
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

      .detail-table {
        min-width: 1080px;
        table-layout: fixed;
      }

      .detail-table .col-index {
        width: 4.5rem;
      }

      .detail-table .col-product {
        width: 42%;
      }

      .detail-table .col-qty {
        width: 8.5rem;
      }

      .detail-table .col-money {
        width: 9.5rem;
      }

      .detail-table th,
      .detail-table td {
        vertical-align: top;
      }

      .detail-table th {
        text-align: center;
      }

      .detail-table th.th-product,
      .detail-table td.cell-product {
        text-align: left;
      }

      .detail-table th.th-index,
      .detail-table td.cell-index {
        text-align: center;
      }

      .cell-index {
        white-space: nowrap;
        font-weight: 700;
      }

      .cell-product {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .cell-product strong,
      .cell-product span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-product span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .cell-number {
        white-space: nowrap;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }

      .workflow-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .order-detail-page {
          padding: var(--space-4);
        }
      }

      .summary-card .label,
      .summary-card strong,
      .detail-table td,
      .detail-table th,
      h2 {
        word-break: break-word;
      }
    `,
  ],
})
export class PurchaseOrderDetailPageComponent implements OnInit {
  order: PurchaseOrderResponse | null = null;

  supplierNames = new Map<number, string>();
  warehouseNames = new Map<number, string>();
  productNames = new Map<number, ProductDisplayInfo>();

  loading = false;
  savingAction = false;
  canManage = false;

  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly supplierService: SupplierService,
    private readonly warehouseService: WarehouseService,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.router.navigate(["/compras/ordenes"]);
      return;
    }

    this.loadPermissions();
    this.loadLookups();
    this.loadOrder(id);
  }

  async approve(): Promise<void> {
    if (!this.order || !this.canManage || this.order.status !== "DRAFT") {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: "Aprobar orden",
      description: `Vas a aprobar la orden #${this.order.id}. Esta accion avanza el flujo hacia recepcion.`,
      highlightText: `Orden #${this.order.id}`,
      confirmText: "Aprobar orden",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) {
      return;
    }

    this.savingAction = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.purchaseOrderService.approve(this.order.id).subscribe({
      next: (updated) => {
        this.savingAction = false;
        this.order = updated;
        this.successMessage = "Orden aprobada correctamente.";
      },
      error: (error: unknown) => {
        this.savingAction = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo aprobar la orden.",
        );
      },
    });
  }

  async cancel(): Promise<void> {
    if (
      !this.order ||
      !this.canManage ||
      !["DRAFT", "APPROVED"].includes(this.order.status)
    ) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: "Cancelar orden",
      description: `Vas a cancelar la orden #${this.order.id}. La orden no seguira avanzando en el flujo.`,
      highlightText: `Orden #${this.order.id}`,
      confirmText: "Cancelar orden",
      cancelText: "Volver",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    this.savingAction = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.purchaseOrderService.cancel(this.order.id).subscribe({
      next: (updated) => {
        this.savingAction = false;
        this.order = updated;
        this.successMessage = "Orden cancelada correctamente.";
      },
      error: (error: unknown) => {
        this.savingAction = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cancelar la orden.",
        );
      },
    });
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

  orderDateValue(): unknown {
    return this.order?.orderDate ?? null;
  }

  totalAmountValue(): number {
    const rawTotal = this.toNumber(this.order?.totalAmount);
    if (rawTotal !== null) {
      return rawTotal;
    }

    return this.orderItems().reduce(
      (sum, item) => sum + this.itemLineTotal(item),
      0,
    );
  }

  orderItems(): PurchaseOrderItemResponse[] {
    const rawItems = this.order?.items;
    return Array.isArray(rawItems) ? rawItems : [];
  }

  itemLineTotal(item: PurchaseOrderItemResponse): number {
    const lineTotal = this.toNumber(item.lineTotal);
    if (lineTotal !== null) {
      return lineTotal;
    }

    const quantity = this.toNumber(item.quantityOrdered) ?? 0;
    const unitCost = this.toNumber(item.unitCost) ?? 0;
    return quantity * unitCost;
  }

  pending(quantityOrdered: number, quantityReceived: number): number {
    const ordered = this.toNumber(quantityOrdered) ?? 0;
    const received = this.toNumber(quantityReceived) ?? 0;
    return Math.max(ordered - received, 0);
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

  formatLocalDateTime(value: unknown): string {
    const normalized = this.normalizeDateInput(value);
    if (!normalized) {
      return "";
    }

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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
      maximumFractionDigits: 3,
    }).format(Number.isFinite(amount) ? amount : 0);
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

  private loadPermissions(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.some((role) =>
          ["ADMIN", "ALMACENERO"].includes(role),
        );
      },
      error: () => {
        this.canManage = false;
      },
    });
  }

  private loadLookups(): void {
    forkJoin({
      suppliers: this.supplierService.list(),
      warehouses: this.warehouseService.list(),
      productsPage: this.productService.list(0, 500),
    }).subscribe({
      next: ({ suppliers, warehouses, productsPage }) => {
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
                item.barcode ? `Código: ${item.barcode}` : "",
              ]
                .filter(Boolean)
                .join(" | "),
            },
          ]),
        );
      },
      error: () => {
        this.supplierNames = new Map<number, string>();
        this.warehouseNames = new Map<number, string>();
        this.productNames = new Map<number, ProductDisplayInfo>();
      },
    });
  }

  private loadOrder(id: number): void {
    this.loading = true;
    this.errorMessage = "";

    this.purchaseOrderService.getById(id).subscribe({
      next: (order) => {
        this.loading = false;
        this.order = order;
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
