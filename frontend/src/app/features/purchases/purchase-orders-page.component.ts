import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  SupplierResponse,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";
import { SupplierService } from "./data/supplier.service";

@Component({
  selector: "app-purchase-orders-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1>Compras - Ordenes de compra</h1>
          <p class="muted">Listado y acciones de ciclo de vida de ordenes.</p>
        </div>
        <a
          *ngIf="canManage"
          class="button"
          [routerLink]="['/compras/ordenes/nueva']"
        >
          Nueva orden
        </a>
      </header>

      <form
        [formGroup]="filterForm"
        class="filters"
        (ngSubmit)="applyFilters()"
      >
        <label>
          Estado
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statusOptions" [value]="status">
              {{ statusLabel(status) }}
            </option>
          </select>
        </label>

        <label>
          Proveedor
          <select formControlName="supplierId">
            <option [ngValue]="null">Todos</option>
            <option *ngFor="let supplier of suppliers" [ngValue]="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
        </label>

        <label>
          Desde
          <input type="date" formControlName="from" />
        </label>

        <label>
          Hasta
          <input type="date" formControlName="to" />
        </label>

        <div class="actions">
          <button type="submit">Aplicar filtros</button>
          <button type="button" class="secondary" (click)="resetFilters()">
            Limpiar
          </button>
        </div>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha orden</th>
              <th>Proveedor</th>
              <th>Almacen</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of orders">
              <td>#{{ order.id }}</td>
              <td>{{ order.orderDate | date: "yyyy-MM-dd" }}</td>
              <td>{{ supplierName(order.supplierId) }}</td>
              <td>{{ warehouseName(order.warehouseId) }}</td>
              <td>
                <span class="status" [class]="statusClass(order.status)">
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td>{{ order.totalAmount | number: "1.2-2" }}</td>
              <td class="row-actions">
                <a [routerLink]="['/compras/ordenes', order.id]">Detalle</a>
                <a
                  *ngIf="canEdit(order)"
                  [routerLink]="['/compras/ordenes', order.id, 'editar']"
                >
                  Editar
                </a>
                <a
                  *ngIf="canReceive(order)"
                  [routerLink]="['/compras/ordenes', order.id, 'recibir']"
                >
                  Recibir
                </a>
                <button
                  type="button"
                  *ngIf="canApprove(order)"
                  (click)="approve(order)"
                  [disabled]="actionOrderId === order.id"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  class="danger"
                  *ngIf="canCancel(order)"
                  (click)="cancel(order)"
                  [disabled]="actionOrderId === order.id"
                >
                  Cancelar
                </button>
              </td>
            </tr>
            <tr *ngIf="!loading && orders.length === 0">
              <td colspan="7">No hay ordenes para los filtros aplicados.</td>
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
      h1 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 0.65rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
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
        vertical-align: middle;
      }
      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .status {
        font-weight: 700;
      }
      .status-draft {
        color: #92400e;
      }
      .status-approved {
        color: #1d4ed8;
      }
      .status-partially {
        color: #0369a1;
      }
      .status-received {
        color: #166534;
      }
      .status-cancelled {
        color: #b91c1c;
      }
      .button,
      button,
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 0.42rem 0.75rem;
        border-radius: 0.35rem;
      }
      .button,
      button {
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
      a {
        background: #eef2ff;
        color: #1e3a8a;
        text-decoration: none;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 1100px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 700px) {
        .filters {
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
export class PurchaseOrdersPageComponent implements OnInit {
  readonly filterForm = this.formBuilder.group({
    status: [""],
    supplierId: [null as number | null],
    from: [""],
    to: [""],
  });

  readonly statusOptions: PurchaseOrderStatus[] = [
    "DRAFT",
    "APPROVED",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "CANCELLED",
  ];

  suppliers: SupplierResponse[] = [];
  warehouseNames = new Map<number, string>();
  orders: PurchaseOrderResponse[] = [];

  loading = false;
  actionOrderId: number | null = null;
  canManage = false;

  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly supplierService: SupplierService,
    private readonly warehouseService: WarehouseService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
    this.loadLookups();
    this.loadOrders();
  }

  applyFilters(): void {
    this.loadOrders();
  }

  resetFilters(): void {
    this.filterForm.reset({ status: "", supplierId: null, from: "", to: "" });
    this.loadOrders();
  }

  approve(order: PurchaseOrderResponse): void {
    if (!this.canApprove(order)) {
      return;
    }

    if (!window.confirm(`Aprobar la orden #${order.id}?`)) {
      return;
    }

    this.actionOrderId = order.id;
    this.errorMessage = "";
    this.successMessage = "";

    this.purchaseOrderService.approve(order.id).subscribe({
      next: () => {
        this.actionOrderId = null;
        this.successMessage = `Orden #${order.id} aprobada.`;
        this.loadOrders();
      },
      error: (error: unknown) => {
        this.actionOrderId = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo aprobar la orden.",
        );
      },
    });
  }

  cancel(order: PurchaseOrderResponse): void {
    if (!this.canCancel(order)) {
      return;
    }

    if (!window.confirm(`Cancelar la orden #${order.id}?`)) {
      return;
    }

    this.actionOrderId = order.id;
    this.errorMessage = "";
    this.successMessage = "";

    this.purchaseOrderService.cancel(order.id).subscribe({
      next: () => {
        this.actionOrderId = null;
        this.successMessage = `Orden #${order.id} cancelada.`;
        this.loadOrders();
      },
      error: (error: unknown) => {
        this.actionOrderId = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cancelar la orden.",
        );
      },
    });
  }

  canApprove(order: PurchaseOrderResponse): boolean {
    return this.canManage && order.status === "DRAFT";
  }

  canCancel(order: PurchaseOrderResponse): boolean {
    return this.canManage && ["DRAFT", "APPROVED"].includes(order.status);
  }

  canEdit(order: PurchaseOrderResponse): boolean {
    return this.canManage && order.status === "DRAFT";
  }

  canReceive(order: PurchaseOrderResponse): boolean {
    return (
      this.canManage &&
      (order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED")
    );
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

  statusClass(status: PurchaseOrderStatus): string {
    switch (status) {
      case "DRAFT":
        return "status-draft";
      case "APPROVED":
        return "status-approved";
      case "PARTIALLY_RECEIVED":
        return "status-partially";
      case "RECEIVED":
        return "status-received";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "";
    }
  }

  supplierName(supplierId: number): string {
    const supplier = this.suppliers.find((item) => item.id === supplierId);
    return supplier ? supplier.name : `Proveedor #${supplierId}`;
  }

  warehouseName(warehouseId: number): string {
    return this.warehouseNames.get(warehouseId) ?? `Almacen #${warehouseId}`;
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
    }).subscribe({
      next: ({ suppliers, warehouses }) => {
        this.suppliers = suppliers;
        this.warehouseNames = new Map(
          warehouses.map((item) => [item.id, `${item.code} - ${item.name}`]),
        );
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar proveedores y almacenes.",
        );
      },
    });
  }

  private loadOrders(): void {
    this.loading = true;
    this.errorMessage = "";

    const form = this.filterForm.getRawValue();
    const statusValue = (form.status ?? "") as PurchaseOrderStatus | "";

    this.purchaseOrderService
      .list({
        status: statusValue || undefined,
        supplierId: form.supplierId ?? undefined,
        from: form.from || undefined,
        to: form.to || undefined,
      })
      .subscribe({
        next: (orders) => {
          this.loading = false;
          this.orders = orders;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar la lista de ordenes.",
          );
        },
      });
  }
}
