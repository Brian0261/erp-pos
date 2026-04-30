import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ProductService } from "../catalog/data/product.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderResponse,
  PurchaseOrderStatus,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";
import { SupplierService } from "./data/supplier.service";

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
            <strong>{{ supplierName(order.supplierId) }}</strong>
          </p>
          <p>
            <span class="label">Almacen</span>
            <strong>{{ warehouseName(order.warehouseId) }}</strong>
          </p>
          <p>
            <span class="label">Fecha orden</span>
            <strong>{{ order.orderDate | date: "yyyy-MM-dd" }}</strong>
          </p>
          <p *ngIf="order.expectedDate">
            <span class="label">Fecha esperada</span>
            <strong>{{ order.expectedDate | date: "yyyy-MM-dd" }}</strong>
          </p>
        </article>

        <article class="summary-card">
          <h2>Totales y seguimiento</h2>
          <p>
            <span class="label">Total</span>
            <strong class="amount">{{
              order.totalAmount | number: "1.2-2"
            }}</strong>
          </p>
          <p>
            <span class="label">Actualizado</span>
            <strong>{{ order.updatedAt | date: "yyyy-MM-dd HH:mm" }}</strong>
          </p>
          <p *ngIf="order.notes">
            <span class="label">Notas</span>
            <strong>{{ order.notes }}</strong>
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
          <thead>
            <tr>
              <th>Item</th>
              <th>Producto</th>
              <th>Ordenado</th>
              <th>Recibido</th>
              <th>Pendiente</th>
              <th>Costo unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of order.items; let index = index">
              <td>{{ index + 1 }}</td>
              <td>{{ productName(item.productId) }}</td>
              <td>{{ item.quantityOrdered | number: "1.3-3" }}</td>
              <td>{{ item.quantityReceived | number: "1.3-3" }}</td>
              <td>
                {{
                  pending(item.quantityOrdered, item.quantityReceived)
                    | number: "1.3-3"
                }}
              </td>
              <td>{{ item.unitCost | number: "1.2-4" }}</td>
              <td>{{ item.lineTotal | number: "1.2-2" }}</td>
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

      .workflow-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .detail-table {
        min-width: 980px;
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
  productNames = new Map<number, string>();

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

  approve(): void {
    if (!this.order || !this.canManage || this.order.status !== "DRAFT") {
      return;
    }

    if (!window.confirm(`Aprobar la orden #${this.order.id}?`)) {
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

  cancel(): void {
    if (
      !this.order ||
      !this.canManage ||
      !["DRAFT", "APPROVED"].includes(this.order.status)
    ) {
      return;
    }

    if (!window.confirm(`Cancelar la orden #${this.order.id}?`)) {
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

  productName(productId: number): string {
    return this.productNames.get(productId) ?? `Producto #${productId}`;
  }

  pending(quantityOrdered: number, quantityReceived: number): number {
    return Math.max(quantityOrdered - quantityReceived, 0);
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
          warehouses.map((item) => [item.id, `${item.code} - ${item.name}`]),
        );
        this.productNames = new Map(
          productsPage.content.map((item) => [
            item.id,
            `${item.name} (${item.sku})`,
          ]),
        );
      },
      error: () => {
        this.supplierNames = new Map();
        this.warehouseNames = new Map();
        this.productNames = new Map();
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
}
