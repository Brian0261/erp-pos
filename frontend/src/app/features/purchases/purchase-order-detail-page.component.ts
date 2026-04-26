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
    <section class="card" *ngIf="order">
      <header class="header">
        <div>
          <h1>Orden de compra #{{ order.id }}</h1>
          <p class="muted">
            Estado: <strong>{{ statusLabel(order.status) }}</strong>
          </p>
        </div>
        <a [routerLink]="['/compras/ordenes']">Volver al listado</a>
      </header>

      <section class="summary">
        <article>
          <h2>Datos generales</h2>
          <p>
            <strong>Proveedor:</strong> {{ supplierName(order.supplierId) }}
          </p>
          <p>
            <strong>Almacen:</strong> {{ warehouseName(order.warehouseId) }}
          </p>
          <p>
            <strong>Fecha orden:</strong>
            {{ order.orderDate | date: "yyyy-MM-dd" }}
          </p>
          <p *ngIf="order.expectedDate">
            <strong>Fecha esperada:</strong>
            {{ order.expectedDate | date: "yyyy-MM-dd" }}
          </p>
        </article>

        <article>
          <h2>Totales</h2>
          <p>
            <strong>Total:</strong> {{ order.totalAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Actualizado:</strong>
            {{ order.updatedAt | date: "yyyy-MM-dd HH:mm" }}
          </p>
          <p *ngIf="order.notes"><strong>Notas:</strong> {{ order.notes }}</p>
        </article>
      </section>

      <section class="actions" *ngIf="canManage">
        <a
          *ngIf="order.status === 'DRAFT'"
          [routerLink]="['/compras/ordenes', order.id, 'editar']"
        >
          Editar orden
        </a>
        <button
          type="button"
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
          [routerLink]="['/compras/ordenes', order.id, 'recibir']"
        >
          Registrar recepcion
        </a>
        <button
          type="button"
          class="danger"
          *ngIf="order.status === 'DRAFT' || order.status === 'APPROVED'"
          (click)="cancel()"
          [disabled]="savingAction"
        >
          Cancelar orden
        </button>
      </section>

      <section class="table-wrap">
        <table>
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
      </section>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>
    </section>

    <section class="card" *ngIf="!order && !loading">
      <p class="error">No se encontro la orden solicitada.</p>
      <a [routerLink]="['/compras/ordenes']">Volver al listado</a>
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
      h1,
      h2 {
        margin: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .header a {
        color: #1e3a8a;
        text-decoration: none;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(250px, 1fr));
        gap: 0.75rem;
      }
      article {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.75rem;
      }
      article p {
        margin: 0.4rem 0 0;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }
      .actions a,
      .actions button {
        padding: 0.42rem 0.75rem;
        border-radius: 0.35rem;
      }
      .actions a {
        background: #eef2ff;
        color: #1e3a8a;
        text-decoration: none;
      }
      .actions button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .actions .danger {
        background: #b91c1c;
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid #e5e7eb;
        padding: 0.5rem;
        text-align: left;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 800px) {
        .summary {
          grid-template-columns: 1fr;
        }
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
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
