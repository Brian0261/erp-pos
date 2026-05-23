import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
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
    <section class="ui-card purchase-orders-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Ordenes de compra</h1>
          <p class="ui-page-description">
            Consulta el ciclo de vida completo de cada orden, desde borrador
            hasta recepcion total o cancelacion.
          </p>
        </div>
        <a
          *ngIf="canManage"
          class="ui-button ui-button--primary"
          [routerLink]="['/compras/ordenes/nueva']"
        >
          Nueva orden
        </a>
      </header>

      <form
        [formGroup]="filterForm"
        class="filters-panel"
        (ngSubmit)="applyFilters()"
      >
        <label class="field">
          <span>Estado</span>
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statusOptions" [value]="status">
              {{ statusLabel(status) }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Proveedor</span>
          <select formControlName="supplierId">
            <option [ngValue]="null">Todos</option>
            <option *ngFor="let supplier of suppliers" [ngValue]="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Desde</span>
          <input type="date" formControlName="from" />
        </label>

        <label class="field">
          <span>Hasta</span>
          <input type="date" formControlName="to" />
        </label>

        <div class="filter-actions">
          <button type="submit" class="ui-button ui-button--primary">
            Aplicar filtros
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="resetFilters()"
          >
            Limpiar
          </button>
        </div>
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando ordenes...</p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table orders-table">
          <thead>
            <tr>
              <th>Orden</th>
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
              <td class="cell-order" [title]="'Orden #' + order.id">#{{ order.id }}</td>
              <td>{{ order.orderDate | date: "yyyy-MM-dd" }}</td>
              <td class="cell-ellipsis" [title]="supplierName(order.supplierId)">{{ supplierName(order.supplierId) }}</td>
              <td class="cell-ellipsis" [title]="warehouseName(order.warehouseId)">{{ warehouseName(order.warehouseId) }}</td>
              <td>
                <span
                  class="ui-badge status-badge"
                  [ngClass]="statusClass(order.status)"
                >
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td class="amount">{{ order.totalAmount | number: "1.2-2" }}</td>
              <td class="row-actions">
                <a
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/compras/ordenes', order.id]"
                >
                  Detalle
                </a>
                <a
                  *ngIf="canEdit(order)"
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/compras/ordenes', order.id, 'editar']"
                >
                  Editar
                </a>
                <a
                  *ngIf="canReceive(order)"
                  class="ui-button ui-button--primary"
                  [routerLink]="['/compras/ordenes', order.id, 'recibir']"
                >
                  Recibir
                </a>
                <button
                  type="button"
                  class="ui-button ui-button--primary"
                  *ngIf="canApprove(order)"
                  (click)="approve(order)"
                  [disabled]="actionOrderId === order.id"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  class="ui-button ui-button--danger"
                  *ngIf="canCancel(order)"
                  (click)="cancel(order)"
                  [disabled]="actionOrderId === order.id"
                >
                  Cancelar
                </button>
              </td>
            </tr>
            <tr *ngIf="orders.length === 0">
              <td colspan="7" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay ordenes para los filtros aplicados.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .purchase-orders-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .purchase-orders-page .ui-page-description {
        white-space: nowrap;
      }

      .filters-panel {
        display: grid;
        grid-template-columns: repeat(4, minmax(170px, 1fr));
        gap: var(--space-3);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
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
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .filter-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
      }

      .orders-table {
        min-width: 1080px;
      }

      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
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

      .cell-order {
        white-space: nowrap;
        font-weight: 700;
      }

      .cell-ellipsis {
        max-width: 14rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .amount {
        white-space: nowrap;
        font-weight: 700;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1100px) {
        .filters-panel {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 700px) {
        .purchase-orders-page {
          padding: var(--space-4);
        }

        .filters-panel {
          grid-template-columns: 1fr;
        }

        .filter-actions {
          justify-content: flex-start;
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
    private readonly confirmDialog: ConfirmDialogService,
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

  async approve(order: PurchaseOrderResponse): Promise<void> {
    if (!this.canApprove(order)) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: "Aprobar orden",
      description: `Vas a aprobar la orden #${order.id}. Esta accion avanza el flujo hacia recepcion.`,
      highlightText: `Orden #${order.id}`,
      confirmText: "Aprobar orden",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) {
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

  async cancel(order: PurchaseOrderResponse): Promise<void> {
    if (!this.canCancel(order)) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: "Cancelar orden",
      description: `Vas a cancelar la orden #${order.id}. La orden no seguira avanzando en el flujo.`,
      highlightText: `Orden #${order.id}`,
      confirmText: "Cancelar orden",
      cancelText: "Volver",
      variant: "warning",
    });

    if (!confirmed) {
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
          warehouses.map((item) => [
            item.id,
            item.name?.trim() || item.code?.trim() || `Almacen #${item.id}`,
          ]),
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
