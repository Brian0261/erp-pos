import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import {
  BillingEnvironment,
  ElectronicDocumentResponse,
  ElectronicDocumentStatus,
  ElectronicDocumentType,
} from "../billing/data/billing.models";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";

@Component({
  selector: "app-sale-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card sale-detail-page" *ngIf="sale || errorMessage">
      <header class="ui-page-head">
          <div>
            <h1 class="ui-page-title">
              {{ sale ? sale.saleNumber : "Detalle de venta" }}
            </h1>
            <p class="ui-page-description" *ngIf="sale">
              ID interno #{{ sale.id }} · Consulta de items, pagos y estado.
            </p>
          </div>

        <a class="ui-button ui-button--secondary" [routerLink]="['/ventas']"
          >Volver al listado</a
        >
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage && sale">
        {{ successMessage }}
      </p>

      <ng-container *ngIf="sale">
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
            <p><strong>Venta:</strong> {{ sale.saleNumber }}</p>
            <p><strong>ID interno:</strong> #{{ sale.id }}</p>
            <p>
              <strong>Fecha:</strong>
              {{ formatDateTime(sale.soldAt) }}
            </p>
            <p><strong>Usuario:</strong> {{ sale.createdBy }}</p>
            <p><strong>Caja:</strong> #{{ sale.cashRegisterSessionId }}</p>
            <p><strong>Almacen:</strong> #{{ sale.warehouseId }}</p>
            <ng-container *ngIf="sale.status === 'VOIDED'">
              <p>
                <strong>Anulada en:</strong>
                {{ sale.voidedAt ? formatDateTime(sale.voidedAt) : "-" }}
              </p>
              <p class="full-width">
                <strong>Motivo anulación:</strong> {{ sale.voidReason || "-" }}
              </p>
            </ng-container>
          </div>
        </article>

        <article class="panel billing-panel">
          <header class="panel-head">
            <h2>Comprobante electronico</h2>
          </header>

          <p class="ui-page-description">
            Seguimiento del comprobante asociado.
          </p>
          <p class="ui-page-description billing-note">
            Gestion desde Facturacion.
          </p>

          <p class="ui-alert ui-alert--info" *ngIf="billingLoading">
            Cargando comprobante asociado...
          </p>
          <p class="ui-alert ui-alert--error" *ngIf="!billingLoading && billingErrorMessage">
            {{ billingErrorMessage }}
          </p>

          <ng-container *ngIf="!billingLoading">
            <div class="billing-summary-scroll" *ngIf="billingDocument; else pendingDocument">
              <div class="billing-summary-grid">
                <div class="billing-kv">
                  <span class="billing-kv__label">Tipo</span>
                  <strong class="billing-kv__value">{{ billingDocumentTypeLabel(billingDocument.documentType) }}</strong>
                </div>
                <div class="billing-kv">
                  <span class="billing-kv__label">Numero</span>
                  <strong class="billing-kv__value billing-kv__value--number">{{ billingDocument.fullNumber || "-" }}</strong>
                </div>
                <div class="billing-kv">
                  <span class="billing-kv__label">Estado</span>
                  <strong class="billing-status-chip" [ngClass]="billingStatusClass(billingDocument.status)">
                    {{ billingStatusLabel(billingDocument.status) }}
                  </strong>
                </div>
                <div class="billing-kv">
                  <span class="billing-kv__label">Ambiente</span>
                  <strong class="billing-kv__value">{{ billingEnvironmentLabel(billingDocument.environment) }}</strong>
                </div>
              </div>
            </div>

            <p
              class="billing-warning-note"
              *ngIf="billingDocument && hasBlockingBillingDocument()"
            >
              {{ blockingBillingMessage() }}
            </p>

            <ng-template #pendingDocument>
              <div class="billing-summary-scroll">
                <div class="billing-summary-grid billing-summary-grid--pending">
                  <div class="billing-kv">
                    <span class="billing-kv__label">Estado</span>
                    <strong class="billing-status-chip billing-status--pending">PENDIENTE</strong>
                  </div>
                  <div class="billing-kv">
                    <span class="billing-kv__label">Comprobante</span>
                    <strong class="billing-kv__value">Sin comprobante emitido</strong>
                  </div>
                </div>
              </div>
            </ng-template>

            <div class="actions billing-actions">
              <a
                *ngIf="billingDocument"
                class="ui-button ui-button--secondary"
                [routerLink]="['/facturacion/comprobantes', billingDocument.id]"
              >
                Ver comprobante
              </a>
              <a
                *ngIf="!billingDocument"
                class="ui-button ui-button--primary"
                [routerLink]="['/facturacion/emitir', sale.id]"
              >
                Emitir comprobante
              </a>
            </div>
          </ng-container>
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
                  <th class="cell-number">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of sale.items">
                  <td>
                    <div class="item-product">
                      <strong class="item-product__name">
                        {{ item.productName || "Producto #" + item.productId }}
                      </strong>
                      <div
                        class="item-product__meta"
                        *ngIf="item.sku || item.barcode || !item.productName"
                      >
                        <span *ngIf="item.sku">SKU {{ item.sku }}</span>
                        <span *ngIf="item.barcode">Barcode {{ item.barcode }}</span>
                        <span *ngIf="!item.productName">ID #{{ item.productId }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="cell-number">
                    {{ formatNumber(item.quantity) }}
                  </td>
                  <td class="cell-number">
                    {{ formatCurrency(item.unitPrice) }}
                  </td>
                  <td class="cell-number">
                    {{ formatCurrency(item.discountAmount) }}
                  </td>
                  <td class="cell-number">
                    {{ formatCurrency(item.lineTotal) }}
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
                    {{ formatCurrency(payment.amount) }}
                  </td>
                  <td>{{ payment.reference || "-" }}</td>
                  <td>{{ formatDateTime(payment.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="totals-panel">
          <div class="total-item">
            <p class="label">Subtotal</p>
            <p class="value">{{ formatCurrency(sale.subtotalAmount) }}</p>
          </div>
          <div class="total-item">
            <p class="label">Descuento</p>
            <p class="value">{{ formatCurrency(sale.discountAmount) }}</p>
          </div>
          <div class="total-item total-item--strong">
            <p class="label">Total</p>
            <p class="value">{{ formatCurrency(sale.totalAmount) }}</p>
          </div>
          <div class="total-item">
            <p class="label">Pagado</p>
            <p class="value">{{ formatCurrency(sale.paidAmount) }}</p>
          </div>
          <div
            class="total-item"
            [class.total-item--accent]="settlementDisplayAmount(sale) !== null"
          >
            <p class="label">{{ settlementLabel(sale) }}</p>
            <p class="value" *ngIf="settlementDisplayAmount(sale) !== null; else settlementNotApplicable">
              {{ formatCurrency(settlementDisplayAmount(sale)) }}
            </p>
            <ng-template #settlementNotApplicable>
              <p class="value value--muted">No aplica</p>
            </ng-template>
          </div>
        </article>

        <footer class="actions">
          <a
            *ngIf="canVoidSale() && !hasBlockingBillingDocument()"
            class="ui-button ui-button--danger"
            [routerLink]="['/ventas', sale.id, 'anular']"
          >
            Anular venta
          </a>
          <button
            *ngIf="canVoidSale() && hasBlockingBillingDocument()"
            type="button"
            class="ui-button ui-button--danger ui-button--disabled"
            [disabled]="true"
            [title]="blockingBillingButtonHint()"
          >
            Anular venta
          </button>
        </footer>
        <p
          class="ui-page-description action-note"
          *ngIf="canVoidSale() && hasBlockingBillingDocument()"
        >
          {{ blockingBillingButtonHint() }}
        </p>
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

      .summary-grid strong {
        display: inline-block;
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

      .item-product {
        display: grid;
        gap: 0.18rem;
        min-width: 0;
      }

      .item-product__name {
        display: block;
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        line-height: 1.2;
      }

      .item-product__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.32rem 0.5rem;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .billing-panel {
        gap: var(--space-2);
      }

      .billing-summary-scroll {
        overflow-x: auto;
        padding-bottom: 0.1rem;
      }

      .billing-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(150px, 1fr));
        gap: var(--space-2);
        min-width: 720px;
      }

      .billing-summary-grid--pending {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        min-width: 420px;
      }

      .billing-kv {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: rgba(15, 23, 42, 0.02);
        padding: 0.72rem 0.8rem;
        display: grid;
        gap: 0.42rem;
        align-content: start;
        min-width: 0;
      }

      .billing-kv__label {
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 800;
      }

      .billing-kv__value {
        display: block;
        font-size: 0.96rem;
        line-height: 1.2;
        color: var(--color-text-primary);
      }

      .billing-kv__value--number {
        font-variant-numeric: tabular-nums;
      }

      .billing-note {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .billing-warning-note {
        margin: 0;
        font-size: var(--font-size-sm);
        color: #8a5a00;
      }

      .billing-actions {
        justify-content: flex-start;
      }

      .billing-status-chip {
        width: fit-content;
        font-weight: 700;
        font-size: 0.75rem;
        line-height: 1.1;
        border-radius: 999px;
        padding: 0.32rem 0.56rem;
        border: 1px solid transparent;
      }

      .billing-status--pending {
        background: rgba(107, 114, 128, 0.08);
        color: #6b7280;
        border-color: rgba(107, 114, 128, 0.18);
      }

      .billing-status--draft {
        background: rgba(59, 130, 246, 0.08);
        color: #375a91;
        border-color: rgba(59, 130, 246, 0.18);
      }

      .billing-status--generated {
        background: rgba(109, 40, 217, 0.08);
        color: #6b46c1;
        border-color: rgba(109, 40, 217, 0.18);
      }

      .billing-status--signed {
        background: rgba(14, 116, 144, 0.09);
        color: #155e75;
        border-color: rgba(14, 116, 144, 0.18);
      }

      .billing-status--sent {
        background: rgba(245, 158, 11, 0.1);
        color: #9a6700;
        border-color: rgba(245, 158, 11, 0.18);
      }

      .billing-status--accepted {
        background: rgba(34, 197, 94, 0.09);
        color: #166534;
        border-color: rgba(34, 197, 94, 0.18);
      }

      .billing-status--rejected,
      .billing-status--error {
        background: rgba(220, 38, 38, 0.1);
        color: #991b1b;
        border-color: rgba(220, 38, 38, 0.18);
      }

      .billing-status--cancelled {
        background: rgba(107, 114, 128, 0.1);
        color: #4b5563;
        border-color: rgba(107, 114, 128, 0.2);
      }

      :host-context(body[data-theme="dark"]) .billing-kv {
        background: rgba(15, 23, 42, 0.72);
        border-color: rgba(148, 163, 184, 0.16);
      }

      :host-context(body[data-theme="dark"]) .billing-kv__label,
      :host-context(body[data-theme="dark"]) .billing-note,
      :host-context(body[data-theme="dark"]) .billing-warning-note {
        color: rgba(226, 232, 240, 0.72);
      }

      :host-context(body[data-theme="dark"]) .billing-kv__value,
      :host-context(body[data-theme="dark"]) .billing-kv__value {
        color: rgba(248, 250, 252, 0.94);
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

      .total-item .value--muted {
        color: var(--color-text-secondary);
        font-size: 0.95rem;
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

      .ui-button--disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .action-note {
        margin: 0;
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
  private readonly blockingBillingStatuses = new Set([
    "DRAFT",
    "GENERATED",
    "SIGNED",
    "SENT",
    "ACCEPTED",
  ]);

  private readonly taxManagementBillingStatuses = new Set([
    "SIGNED",
    "SENT",
    "ACCEPTED",
  ]);

  private readonly currencyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  sale: SaleResponse | null = null;
  billingDocument: ElectronicDocumentResponse | null = null;
  currentUser: UserProfile | null = null;

  loading = true;
  billingLoading = false;
  errorMessage = "";
  billingErrorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly salesService: SalesService,
    private readonly electronicDocumentService: ElectronicDocumentService,
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

  billingDocumentTypeLabel(type: ElectronicDocumentType): string {
    return type === "INVOICE" ? "Factura" : "Boleta";
  }

  billingStatusLabel(status: ElectronicDocumentStatus): string {
    switch (status) {
      case "DRAFT":
        return "BORRADOR";
      case "GENERATED":
        return "XML GENERADO";
      case "SIGNED":
        return "FIRMADO";
      case "SENT":
        return "ENVIADO";
      case "ACCEPTED":
        return "ACEPTADO";
      case "REJECTED":
        return "RECHAZADO";
      case "ERROR":
        return "ERROR";
      case "CANCELLED":
        return "ANULADO";
      default:
        return status;
    }
  }

  billingStatusClass(status: ElectronicDocumentStatus): string {
    switch (status) {
      case "DRAFT":
        return "billing-status--draft";
      case "GENERATED":
        return "billing-status--generated";
      case "SIGNED":
        return "billing-status--signed";
      case "SENT":
        return "billing-status--sent";
      case "ACCEPTED":
        return "billing-status--accepted";
      case "REJECTED":
        return "billing-status--rejected";
      case "ERROR":
        return "billing-status--error";
      case "CANCELLED":
        return "billing-status--cancelled";
      default:
        return "";
    }
  }

  billingEnvironmentLabel(environment: BillingEnvironment): string {
    switch (environment) {
      case "LOCAL":
        return "Local";
      case "BETA":
        return "SUNAT Beta";
      case "PROD":
        return "SUNAT";
      default:
        return environment;
    }
  }

  hasBlockingBillingDocument(): boolean {
    const status = this.billingDocument?.status;
    return typeof status === "string" && this.blockingBillingStatuses.has(status);
  }

  blockingBillingMessage(): string {
    if (this.requiresTaxManagement()) {
      return "Esta venta tiene un comprobante electronico activo. La anulacion interna esta bloqueada; requiere gestion tributaria desde Facturacion.";
    }

    return "Esta venta tiene un comprobante electronico activo. La anulacion interna esta bloqueada; gestiona el caso desde Facturacion.";
  }

  blockingBillingButtonHint(): string {
    if (this.requiresTaxManagement()) {
      return "No se puede anular internamente. Requiere gestion tributaria desde Facturacion.";
    }

    return "No se puede anular internamente. Requiere gestion desde Facturacion.";
  }

  settlementLabel(sale: SaleResponse): string {
    if (this.hasCashPayment(sale)) {
      return "Vuelto";
    }

    const difference = sale.paidAmount - sale.totalAmount;
    if (difference > 0) {
      return "Diferencia";
    }
    if (difference < 0) {
      return "Saldo";
    }

    return "Vuelto";
  }

  settlementDisplayAmount(sale: SaleResponse): number | null {
    if (this.hasCashPayment(sale)) {
      return sale.changeAmount;
    }

    const difference = sale.paidAmount - sale.totalAmount;
    if (difference === 0) {
      return null;
    }

    return Math.abs(difference);
  }

  private hasCashPayment(sale: SaleResponse): boolean {
    return sale.payments.some((payment) => payment.paymentMethod === "CASH");
  }

  private requiresTaxManagement(): boolean {
    const status = this.billingDocument?.status;
    return typeof status === "string" && this.taxManagementBillingStatuses.has(status);
  }

  formatCurrency(value: number | null | undefined): string {
    return this.currencyFormatter.format(value ?? 0);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return this.dateTimeFormatter.format(date);
  }

  formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value ?? 0);
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
        this.loadBillingDocument(sale.id);
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

  private loadBillingDocument(saleId: number): void {
    this.billingLoading = true;
    this.billingErrorMessage = "";
    this.billingDocument = null;

    this.electronicDocumentService.listBySaleId(saleId).subscribe({
      next: (rows) => {
        this.billingLoading = false;
        this.billingDocument = rows.length > 0 ? rows[0] : null;
      },
      error: (error: unknown) => {
        this.billingLoading = false;
        this.billingErrorMessage = toHttpErrorMessage(
          error,
          "No se pudo consultar el comprobante asociado.",
        );
      },
    });
  }
}
