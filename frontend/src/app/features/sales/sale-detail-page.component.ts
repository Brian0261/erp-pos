import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";

@Component({
  selector: "app-sale-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card sale-detail-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Operacion Comercial InkToy</p>
          <h1 class="ui-page-title" *ngIf="sale">
            Venta {{ sale.saleNumber }}
          </h1>
          <h1 class="ui-page-title" *ngIf="!sale">Detalle de venta</h1>
          <p class="ui-page-description">Consulta de items, pagos y estado.</p>
        </div>

        <a class="ui-button ui-button--secondary" [routerLink]="['/ventas']"
          >Volver al listado</a
        >
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Cargando detalle de venta...
      </p>

      <ng-container *ngIf="sale && !loading">
        <article class="summary-panel">
          <div class="summary-head">
            <h2>Resumen</h2>
            <span
              class="ui-badge"
              [class.ui-badge--danger]="sale.status === 'VOIDED'"
              [class.ui-badge--success]="sale.status !== 'VOIDED'"
            >
              {{ saleStatusLabel(sale.status) }}
            </span>
          </div>

          <div class="summary-grid">
            <p><strong>ID:</strong> #{{ sale.id }}</p>
            <p><strong>Nro venta:</strong> {{ sale.saleNumber }}</p>
            <p>
              <strong>Fecha:</strong>
              {{ sale.soldAt | date: "dd/MM/yyyy HH:mm" }}
            </p>
            <p><strong>Usuario:</strong> {{ sale.createdBy }}</p>
            <p><strong>Caja:</strong> #{{ sale.cashRegisterSessionId }}</p>
            <p><strong>Almacen:</strong> #{{ sale.warehouseId }}</p>
            <ng-container *ngIf="sale.status === 'VOIDED'">
              <p>
                <strong>Anulada en:</strong>
                {{
                  sale.voidedAt
                    ? (sale.voidedAt | date: "dd/MM/yyyy HH:mm")
                    : "-"
                }}
              </p>
              <p class="full-width">
                <strong>Motivo anulación:</strong> {{ sale.voidReason || "-" }}
              </p>
            </ng-container>
          </div>
        </article>

        <article class="panel">
          <header class="panel-head">
            <h2>Items</h2>
            <span class="ui-badge">{{ sale.items.length }} lineas</span>
          </header>
          <div class="ui-table-wrapper">
            <table class="ui-table items-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="cell-number">Cantidad</th>
                  <th class="cell-number">Precio unitario</th>
                  <th class="cell-number">Descuento</th>
                  <th class="cell-number">Total linea</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of sale.items">
                  <td>Producto #{{ item.productId }}</td>
                  <td class="cell-number">
                    {{ item.quantity | number: "1.0-3" }}
                  </td>
                  <td class="cell-number">
                    {{ item.unitPrice | number: "1.2-2" }}
                  </td>
                  <td class="cell-number">
                    {{ item.discountAmount | number: "1.2-2" }}
                  </td>
                  <td class="cell-number">
                    {{ item.lineTotal | number: "1.2-2" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <header class="panel-head">
            <h2>Pagos</h2>
            <span class="ui-badge">{{ sale.payments.length }} movimientos</span>
          </header>
          <div class="ui-table-wrapper">
            <table class="ui-table payments-table">
              <thead>
                <tr>
                  <th>Metodo</th>
                  <th class="cell-number">Monto</th>
                  <th>Referencia</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let payment of sale.payments">
                  <td>{{ paymentMethodLabel(payment.paymentMethod) }}</td>
                  <td class="cell-number">
                    {{ payment.amount | number: "1.2-2" }}
                  </td>
                  <td>{{ payment.reference || "-" }}</td>
                  <td>{{ payment.createdAt | date: "dd/MM/yyyy HH:mm" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="totals-panel">
          <div class="total-item">
            <p class="label">Subtotal</p>
            <p class="value">{{ sale.subtotalAmount | number: "1.2-2" }}</p>
          </div>
          <div class="total-item">
            <p class="label">Descuento</p>
            <p class="value">{{ sale.discountAmount | number: "1.2-2" }}</p>
          </div>
          <div class="total-item total-item--strong">
            <p class="label">Total</p>
            <p class="value">{{ sale.totalAmount | number: "1.2-2" }}</p>
          </div>
          <div class="total-item">
            <p class="label">Pagado</p>
            <p class="value">{{ sale.paidAmount | number: "1.2-2" }}</p>
          </div>
          <div class="total-item total-item--accent">
            <p class="label">Vuelto</p>
            <p class="value">{{ sale.changeAmount | number: "1.2-2" }}</p>
          </div>
        </article>

        <footer class="actions">
          <a
            *ngIf="canVoidSale()"
            class="ui-button ui-button--danger"
            [routerLink]="['/ventas', sale.id, 'anular']"
          >
            Anular venta
          </a>
        </footer>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .sale-detail-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h1,
      h2 {
        margin: 0;
      }

      .summary-panel {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .summary-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: var(--space-2) var(--space-4);
      }

      .summary-grid p {
        margin: 0;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .panel {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
        background: var(--color-bg-surface);
      }

      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .items-table,
      .payments-table {
        min-width: 720px;
      }

      .cell-number {
        text-align: right;
        white-space: nowrap;
      }

      .totals-panel {
        display: grid;
        grid-template-columns: repeat(5, minmax(130px, 1fr));
        gap: var(--space-2);
      }

      .total-item {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        padding: var(--space-2) var(--space-3);
        display: grid;
        gap: var(--space-1);
      }

      .total-item .label {
        margin: 0;
        font-size: 0.68rem;
        color: var(--color-text-secondary);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .total-item .value {
        margin: 0;
        font-weight: 900;
        font-size: clamp(1.02rem, 1.4vw, 1.22rem);
        line-height: 1.08;
        font-variant-numeric: tabular-nums;
      }

      .total-item--strong {
        border-color: var(--color-brand-primary);
        background: linear-gradient(
          135deg,
          rgba(18, 23, 184, 0.12),
          rgba(56, 189, 248, 0.08)
        );
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .total-item--strong .value {
        color: var(--color-brand-primary);
        font-size: clamp(1.28rem, 2vw, 1.8rem);
      }

      .total-item--accent {
        border-color: var(--color-success);
        background: linear-gradient(
          135deg,
          rgba(34, 197, 94, 0.1),
          rgba(34, 197, 94, 0.04)
        );
      }

      .total-item--accent .value {
        color: var(--color-success);
      }

      :host-context(body[data-theme="dark"]) .summary-panel {
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.88));
        border-color: rgba(148, 163, 184, 0.2);
      }

      :host-context(body[data-theme="dark"]) .panel {
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(17, 24, 39, 0.96));
        border-color: rgba(148, 163, 184, 0.18);
      }

      :host-context(body[data-theme="dark"]) .total-item {
        background: rgba(15, 23, 42, 0.9);
        border-color: rgba(148, 163, 184, 0.18);
      }

      :host-context(body[data-theme="dark"]) .total-item .label {
        color: rgba(226, 232, 240, 0.72);
      }

      :host-context(body[data-theme="dark"]) .total-item--strong {
        background: linear-gradient(135deg, rgba(18, 23, 184, 0.35), rgba(56, 189, 248, 0.16));
        border-color: rgba(96, 165, 250, 0.42);
      }

      :host-context(body[data-theme="dark"]) .total-item--strong .value {
        color: var(--color-text-on-dark);
      }

      :host-context(body[data-theme="dark"]) .total-item--accent {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.08));
        border-color: rgba(34, 197, 94, 0.28);
      }

      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button {
        white-space: nowrap;
      }

      @media (max-width: 900px) {
        .sale-detail-page {
          padding: var(--space-4);
        }

        .summary-grid,
        .totals-panel {
          grid-template-columns: 1fr;
        }

        .full-width {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class SaleDetailPageComponent implements OnInit {
  sale: SaleResponse | null = null;
  currentUser: UserProfile | null = null;

  loading = true;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly salesService: SalesService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: () => {
        this.currentUser = null;
      },
    });

    const statusMessage = this.route.snapshot.queryParamMap.get("status");
    if (statusMessage === "voided") {
      this.successMessage = "Venta anulada correctamente.";
    }

    this.loadSale();
  }

  canVoidSale(): boolean {
    if (!this.sale || !this.currentUser) {
      return false;
    }

    const canRole = this.currentUser.roles.some((role) =>
      ["ADMIN", "SUPERVISOR"].includes(role),
    );

    return canRole && this.sale.status === "COMPLETED";
  }

  saleStatusLabel(status: string): string {
    switch (status) {
      case "COMPLETED":
        return "Completada";
      case "VOIDED":
        return "Anulada";
      case "PENDING":
        return "Pendiente";
      case "CANCELLED":
        return "Cancelada";
      default:
        return status;
    }
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case "CASH":
        return "Efectivo";
      case "CARD":
        return "Tarjeta";
      case "TRANSFER":
        return "Transferencia";
      default:
        return method;
    }
  }

  private loadSale(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading = false;
      this.errorMessage = "ID de venta invalido.";
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.salesService.getById(id).subscribe({
      next: (sale) => {
        this.loading = false;
        this.sale = sale;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el detalle de la venta.",
        );
      },
    });
  }
}
