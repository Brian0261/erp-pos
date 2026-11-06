import { Subscription, timeout } from "rxjs";
import { commercialDateAt, COMMERCIAL_ZONE, formatCommercialDay, formatCommercialInstant, isCommercialDate } from "../../shared/utils/commercial-date";
import { createBoundAuthContext } from "../../core/auth/bound-auth-context";
import { HttpErrorResponse } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { Component, DoCheck, HostListener, OnDestroy, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import {
  ElectronicDocumentResponse,
  ElectronicDocumentStatus,
} from "../billing/data/billing.models";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { ProductService } from "../catalog/data/product.service";
import { InventoryService } from "../inventory/data/inventory.service";
import { QuoteResponse, QuoteStatus } from "../quotes/data/quotes.models";
import { QuoteService } from "../quotes/data/quote.service";
import { toHttpErrorMessage } from "../reports/data/http-error-message";
import {
  LowStockItemResponse,
  TopProductReportItemResponse,
} from "../reports/data/reports.models";
import { ReportsService } from "../reports/data/reports.service";
import { CashRegisterService } from "../sales/data/cash-register.service";
import { SaleResponse, TodaySalesResponse } from "../sales/data/sales.models";
import { SalesService } from "../sales/data/sales.service";

type DashboardKpiTone = "primary" | "accent" | "warning" | "neutral";

interface DashboardKpi {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  message: string;
  route: string;
  tone: DashboardKpiTone;
  loading: boolean;
  empty: boolean;
  visible: boolean;
  allowedRoles: string[];
}

interface DashboardAction {
  label: string;
  description: string;
  route: string;
  roles: string[];
}

interface DashboardActivity {
  title: string;
  detail: string;
  at: string;
  badge: string;
  route: string;
}

@Component({
    selector: "app-dashboard",
    imports: [CommonModule, RouterLink],
    template: `
    <section class="dashboard-shell">
      <ng-container *ngIf="!profileErrorMessage; else profileErrorBlock">
        <section class="ui-card dashboard-hero">
          <header class="hero-head">
            <div>
              <p class="hero-kicker">InkToy · Centro operativo</p>
              <h1>Dashboard principal</h1>
              <p class="hero-description">{{ roleFocusMessage }}</p>
            </div>

            <aside class="hero-user" *ngIf="user">
              <p class="hero-user-name">{{ user.username }}</p>
              <p class="hero-user-email">{{ user.email }}</p>
              <p class="hero-user-role">
                Rol
                <span class="ui-badge hero-role-badge">{{ primaryRole }}</span>
              </p>
            </aside>
          </header>

          <p class="hero-updated">
            Actualizado: {{ now | date: "dd/MM/yyyy HH:mm" }}
          </p>

          <section class="quick-actions" *ngIf="quickActions.length > 0">
            <a
              class="quick-action"
              *ngFor="let action of quickActions"
              [routerLink]="action.route"
            >
              <span>{{ action.label }}</span>
              <small>{{ action.description }}</small>
            </a>
          </section>
        </section>

        <section class="kpi-grid" *ngIf="visibleKpis.length > 0">
          <article
            class="ui-card kpi-card"
            *ngFor="let kpi of visibleKpis"
            [class.kpi-card--accent]="kpi.tone === 'accent'"
            [class.kpi-card--warning]="kpi.tone === 'warning'"
            [class.kpi-card--neutral]="kpi.tone === 'neutral'"
          >
            <p class="kpi-title">{{ kpi.title }}</p>
            <p class="kpi-value" *ngIf="!kpi.loading">{{ kpi.value }}</p>
            <p class="kpi-value kpi-value--loading" *ngIf="kpi.loading">
              Cargando...
            </p>
            <p class="kpi-subtitle">{{ kpi.subtitle }}</p>
            <p class="kpi-message" *ngIf="kpi.message" [attr.role]="kpi.id === 'salesToday' ? 'status' : null">{{ kpi.message }}</p>
            <button *ngIf="kpi.id === 'salesToday' && todayStatus === 'error'" type="button"
              class="ui-button ui-button--secondary" (click)="refreshTodaySales()">Reintentar ventas de hoy</button>
            <a class="kpi-link" [routerLink]="kpi.route" *ngIf="!kpi.loading"
              >Abrir modulo</a
            >
          </article>
        </section>

        <section class="dashboard-grid">
          <article class="ui-card panel">
            <header class="panel-head">
              <h2>Alertas operativas</h2>
              <span
                class="ui-badge ui-badge--warning"
                *ngIf="lowStockAlerts.length > 0"
              >
                {{ lowStockAlerts.length }}
              </span>
            </header>

            <ul class="alerts-list" *ngIf="lowStockAlerts.length > 0">
              <li *ngFor="let item of lowStockAlerts">
                <div>
                  <p class="alert-title">{{ item.productName }}</p>
                  <p class="alert-meta">
                    {{ item.warehouseName }} · SKU {{ item.sku }}
                  </p>
                </div>
                <span class="ui-badge ui-badge--danger">
                  {{ item.currentStock }} / {{ item.threshold }}
                </span>
              </li>
            </ul>

            <p class="ui-empty-state" *ngIf="lowStockAlerts.length === 0">
              {{ lowStockMessage }}
            </p>
          </article>

          <article class="ui-card panel">
            <header class="panel-head">
              <h2>Actividad reciente</h2>
              <span class="ui-badge" *ngIf="recentActivity.length > 0">
                {{ recentActivity.length }}
              </span>
            </header>

            <ul class="activity-list" *ngIf="recentActivity.length > 0">
              <li *ngFor="let item of recentActivity">
                <div>
                  <p class="activity-title">{{ item.title }}</p>
                  <p class="activity-detail">{{ item.detail }}</p>
                </div>
                <div class="activity-side">
                  <span class="ui-badge">{{ item.badge }}</span>
                  <span class="activity-date">{{
                    item.badge === "VENTA" ? formatSaleTime(item.at) : (item.at | date: "dd/MM HH:mm")
                  }}</span>
                  <a [routerLink]="item.route">Abrir</a>
                </div>
              </li>
            </ul>

            <p class="ui-empty-state" *ngIf="recentActivity.length === 0">
              {{ activityMessage }}
            </p>
          </article>
        </section>

        <section class="ui-card panel" *ngIf="showTopProductsPanel">
          <header class="panel-head">
            <h2>Productos mas vendidos (30 dias)</h2>
            <a routerLink="/reportes/productos-mas-vendidos">Ver reporte</a>
          </header>

          <p class="ui-empty-state" *ngIf="topProductsLoading">
            Cargando ranking...
          </p>
          <p
            class="ui-empty-state"
            *ngIf="!topProductsLoading && topProducts.length === 0"
          >
            {{ topProductsMessage }}
          </p>

          <div
            class="top-products"
            *ngIf="!topProductsLoading && topProducts.length > 0"
          >
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of topProducts">
                  <td>
                    <p class="product-name">{{ row.productName }}</p>
                    <small class="ui-muted">SKU {{ row.sku }}</small>
                  </td>
                  <td>{{ numberOf(row.quantitySold) | number: "1.0-0" }}</td>
                  <td>{{ formatCurrency(row.totalAmount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </ng-container>

      <ng-template #profileErrorBlock>
        <section class="ui-card dashboard-error">
          <h1>Dashboard</h1>
          <p>{{ profileErrorMessage }}</p>
        </section>
      </ng-template>
    </section>
  `,
    styles: [
        `
      .dashboard-shell {
        display: grid;
        gap: var(--space-4);
      }

      .dashboard-hero {
        padding: var(--space-5);
        background:
          radial-gradient(
            circle at 100% 0%,
            rgba(18, 23, 184, 0.13),
            transparent 30%
          ),
          radial-gradient(
            circle at 0% 100%,
            rgba(242, 74, 11, 0.1),
            transparent 30%
          ),
          var(--color-bg-surface);
      }

      .hero-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
      }

      .hero-kicker {
        margin: 0;
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      h1 {
        margin: var(--space-1) 0 0;
        font-family: var(--font-family-display);
        font-size: clamp(1.4rem, 2.5vw, 1.9rem);
      }

      .hero-description {
        margin: var(--space-2) 0 0;
        color: var(--color-text-secondary);
        max-width: 60ch;
      }

      .hero-user {
        min-width: 240px;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.76);
        padding: var(--space-3);
      }

      .hero-user-name {
        margin: 0;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .hero-user-email {
        margin: var(--space-1) 0 var(--space-2);
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .hero-user-role {
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
      }

      .hero-role-badge {
        background: #eef2ff;
        color: #1d4ed8;
      }

      .hero-updated {
        margin: var(--space-3) 0 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .quick-actions {
        margin-top: var(--space-4);
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--space-2);
      }

      .quick-action {
        display: grid;
        gap: 0.15rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-default);
        background: rgba(255, 255, 255, 0.88);
        padding: var(--space-3);
        text-decoration: none;
        color: inherit;
      }

      .quick-action span {
        font-weight: 700;
      }

      .quick-action small {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .quick-action:hover {
        border-color: var(--color-brand-primary);
        box-shadow: 0 0 0 1px rgba(18, 23, 184, 0.15) inset;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: var(--space-3);
      }

      .kpi-card {
        border-top: 4px solid var(--color-brand-primary);
        padding: var(--space-4);
        display: grid;
        gap: var(--space-1);
      }

      .kpi-card--accent {
        border-top-color: var(--color-brand-accent);
      }

      .kpi-card--warning {
        border-top-color: var(--color-warning);
      }

      .kpi-card--neutral {
        border-top-color: var(--color-border-strong);
      }

      .kpi-title {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .kpi-value {
        margin: 0;
        font-size: clamp(1.2rem, 2vw, 1.65rem);
        font-family: var(--font-family-display);
        color: var(--color-text-primary);
      }

      .kpi-value--loading {
        color: var(--color-text-secondary);
      }

      .kpi-subtitle {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .kpi-message {
        margin: 0;
        color: var(--color-text-primary);
        font-size: var(--font-size-xs);
      }

      .kpi-link {
        margin-top: var(--space-1);
        font-size: var(--font-size-xs);
        font-weight: 700;
        color: var(--color-brand-primary);
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        gap: var(--space-3);
      }

      .panel {
        padding: var(--space-4);
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
      }

      .panel-head h2 {
        margin: 0;
        font-size: 1.08rem;
      }

      .alerts-list,
      .activity-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--space-2);
      }

      .alerts-list li,
      .activity-list li {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        padding: var(--space-3);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }

      .alert-title,
      .activity-title {
        margin: 0;
        font-weight: 700;
      }

      .alert-meta,
      .activity-detail {
        margin: var(--space-1) 0 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .activity-side {
        display: grid;
        justify-items: end;
        gap: var(--space-1);
        text-align: right;
      }

      .activity-date {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .activity-side a {
        font-size: var(--font-size-xs);
        font-weight: 700;
        color: var(--color-brand-primary);
      }

      .top-products {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        text-align: left;
        border-bottom: 1px solid var(--color-border-default);
        padding: var(--space-2) var(--space-1);
        font-size: var(--font-size-sm);
      }

      .product-name {
        margin: 0;
        font-weight: 700;
      }

      .dashboard-error {
        padding: var(--space-5);
      }

      .dashboard-error p {
        margin: var(--space-2) 0 0;
        color: var(--color-danger);
      }

      @media (max-width: 980px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .dashboard-hero {
          padding: var(--space-4);
        }

        .hero-head {
          flex-direction: column;
        }

        .hero-user {
          width: 100%;
          min-width: 0;
        }

        .kpi-grid {
          grid-template-columns: 1fr;
        }

        .alerts-list li,
        .activity-list li {
          flex-direction: column;
          align-items: flex-start;
        }

        .activity-side {
          justify-items: start;
          text-align: left;
        }
      }
    `,
    ]
})
export class DashboardComponent implements OnInit, OnDestroy, DoCheck {
  user: UserProfile | null = null;
  loadingProfile = true;
  profileErrorMessage = "";
  now = new Date();

  quickActions: DashboardAction[] = [];

  lowStockAlerts: LowStockItemResponse[] = [];
  lowStockMessage = "Cargando alertas de stock...";

  topProducts: TopProductReportItemResponse[] = [];
  topProductsLoading = false;
  topProductsMessage = "";

  recentActivity: DashboardActivity[] = [];
  activityMessage = "Cargando actividad reciente...";

  readonly kpis: DashboardKpi[] = [
    {
      id: "salesToday",
      title: "Ventas del dia",
      value: "--",
      subtitle: "Sincronizando operaciones de ventas.",
      message: "",
      route: "/ventas",
      tone: "primary",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      id: "cashSession",
      title: "Caja actual",
      value: "--",
      subtitle: "Verificando sesion de caja.",
      message: "",
      route: "/caja",
      tone: "accent",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      id: "lowStock",
      title: "Stock bajo",
      value: "--",
      subtitle: "Validando productos bajo umbral.",
      message: "",
      route: "/inventario/stock",
      tone: "warning",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "ALMACENERO"],
    },
    {
      id: "quotesPending",
      title: "Cotizaciones pendientes",
      value: "--",
      subtitle: "Analizando cotizaciones recientes.",
      message: "",
      route: "/cotizaciones",
      tone: "neutral",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      id: "electronicDocuments",
      title: "Comprobantes recientes",
      value: "--",
      subtitle: "Consultando estado de comprobantes.",
      message: "",
      route: "/facturacion/comprobantes",
      tone: "neutral",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      id: "inventoryCoverage",
      title: "Registros de stock",
      value: "--",
      subtitle: "Revisando cobertura de inventario.",
      message: "",
      route: "/inventario/stock",
      tone: "warning",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "ALMACENERO", "CAJERO"],
    },
    {
      id: "catalogProducts",
      title: "Productos en catalogo",
      value: "--",
      subtitle: "Cargando tamano de catalogo.",
      message: "",
      route: "/catalogo/productos",
      tone: "neutral",
      loading: false,
      empty: false,
      visible: false,
      allowedRoles: ["ADMIN", "SUPERVISOR", "ALMACENERO"],
    },
  ];

  private readonly allActions: DashboardAction[] = [
    {
      label: "POS",
      description: "Venta rapida en mostrador.",
      route: "/pos",
      roles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      label: "Caja",
      description: "Apertura y cierre de sesion.",
      route: "/caja",
      roles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      label: "Ventas",
      description: "Consulta y gestion de comprobantes de venta.",
      route: "/ventas",
      roles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      label: "Inventario",
      description: "Stock por almacen y disponibilidad.",
      route: "/inventario/stock",
      roles: ["ADMIN", "SUPERVISOR", "ALMACENERO", "CAJERO"],
    },
    {
      label: "Ajustes de stock",
      description: "Entradas y salidas de regularizacion.",
      route: "/inventario/ajustes",
      roles: ["ADMIN", "ALMACENERO"],
    },
    {
      label: "Cotizaciones",
      description: "Seguimiento de oportunidades.",
      route: "/cotizaciones",
      roles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      label: "Comprobantes",
      description: "Estado de emision electronica.",
      route: "/facturacion/comprobantes",
      roles: ["ADMIN", "SUPERVISOR", "CAJERO"],
    },
    {
      label: "Reportes",
      description: "Indicadores operativos del negocio.",
      route: "/reportes",
      roles: ["ADMIN", "SUPERVISOR", "ALMACENERO"],
    },
    {
      label: "Outbox",
      description: "Monitoreo de eventos de integracion.",
      route: "/integraciones/eventos",
      roles: ["ADMIN"],
    },
  ];

  private salesActivity: DashboardActivity[] = [];
  private salesReads = new Subscription();
  private profileRead = new Subscription();
  private salesGeneration = 0;
  todayStatus: "idle" | "loading" | "ready" | "error" | "blocked" = "idle";
  private todayRequest = new Subscription();
  private todayGeneration = 0;
  private todayTimer: ReturnType<typeof setTimeout> | null = null;
  private salesCredential: string | null = null;
  private salesExpired = false;
  private destroyed = false;
  readonly formatSaleTime = formatCommercialInstant;
  private quotesActivity: DashboardActivity[] = [];
  private documentsActivity: DashboardActivity[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly salesService: SalesService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly reportsService: ReportsService,
    private readonly inventoryService: InventoryService,
    private readonly quoteService: QuoteService,
    private readonly electronicDocumentService: ElectronicDocumentService,
    private readonly productService: ProductService,
  ) {}

  ngOnInit(): void {
    this.salesCredential = this.authService.getToken();
    if (!this.salesCredential) { this.loadingProfile = false; return; }
    this.profileRead = this.authService.me(createBoundAuthContext(this.salesCredential)).subscribe({
      next: (response) => {
        if (!this.salesCurrent()) return;
        this.user = response;
        this.loadingProfile = false;
        this.setupDashboard();
      },
      error: (error: unknown) => {
        if (!this.salesCurrent()) return;
        this.loadingProfile = false;
        this.profileErrorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el dashboard.",
        );
      },
    });
  }

  get primaryRole(): string {
    return this.user?.roles?.[0] ?? "N/A";
  }

  get visibleKpis(): DashboardKpi[] {
    return this.kpis.filter((kpi) => kpi.visible);
  }

  get showTopProductsPanel(): boolean {
    return this.hasAnyRole(["ADMIN", "SUPERVISOR"]);
  }

  get roleFocusMessage(): string {
    if (this.hasRole("CAJERO")) {
      return "Prioriza atencion en POS, caja y seguimiento de ventas del turno.";
    }

    if (this.hasRole("ALMACENERO")) {
      return "Monitorea stock, alertas y cobertura de inventario por almacen.";
    }

    if (this.hasRole("SUPERVISOR")) {
      return "Supervisa ventas, inventario y cumplimiento operativo en tiempo real.";
    }

    return "Control integral de ventas, inventario, cotizaciones y facturacion.";
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatCurrency(value: unknown): string {
    const amount = this.numberOf(value);
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private setupDashboard(): void {
    this.salesReads.unsubscribe(); this.salesReads = new Subscription(); this.salesGeneration++;
    this.now = new Date();

    for (const kpi of this.kpis) {
      kpi.visible = this.hasAnyRole(kpi.allowedRoles);
      kpi.loading = kpi.visible;
      kpi.empty = false;
      kpi.message = "";
    }

    this.quickActions = this.allActions.filter((action) =>
      this.hasAnyRole(action.roles),
    );

    this.loadSalesKpi();
    this.loadCashKpi();
    this.loadLowStockKpi();
    this.loadQuotesKpi();
    this.loadElectronicDocumentsKpi();
    this.loadInventoryCoverageKpi();
    this.loadCatalogProductsKpi();
    this.loadTopProducts();
  }

  private salesCurrent(generation = this.salesGeneration): boolean {
    return !this.destroyed && !this.salesExpired && generation === this.salesGeneration
      && !!this.salesCredential && this.salesCredential === this.authService.getToken();
  }
  ngDoCheck(): void { this.checkSalesSession(); }
  @HostListener("window:storage")
  checkSalesSession(): void {
    if (this.salesCredential === this.authService.getToken() || this.salesExpired) return;
    this.salesExpired = true; this.salesGeneration++; this.salesReads.unsubscribe(); this.profileRead.unsubscribe();
    this.cancelToday(); this.todayStatus = "blocked";
    this.salesActivity = []; this.rebuildActivity(); this.topProducts = []; this.topProductsLoading = false;
    this.topProductsMessage = "La sesión cambió. Vuelve a abrir Inicio.";
    const kpi = this.findKpi("salesToday"); kpi.loading = false; kpi.value = "No disponible";
    kpi.subtitle = "La sesión cambió"; kpi.message = "Vuelve a abrir Inicio con la sesión actual.";
  }
  ngOnDestroy(): void {
    this.destroyed = true; this.salesGeneration++; this.salesReads.unsubscribe(); this.profileRead.unsubscribe(); this.cancelToday();
  }
  private loadSalesKpi(): void {
    const kpi = this.findKpi("salesToday");
    if (!kpi.visible || !this.salesCurrent()) return;
    const generation = this.salesGeneration, context = createBoundAuthContext(this.salesCredential!);
    // Recent activity retains its existing unbounded history; the KPI has a server-filtered interval.
    this.salesReads.add(this.salesService.list(undefined, context).subscribe({
      next: sales => {
        if (!this.salesCurrent(generation)) return;
        this.salesActivity = sales.slice().sort((a,b) => this.byNewest(b.soldAt,a.soldAt)).slice(0,4).map(sale => ({
          title: `Venta ${sale.saleNumber}`, detail: `${this.formatCurrency(sale.totalAmount)} · ${this.saleStatusLabel(sale.status)}`,
          at: sale.soldAt, badge: "VENTA", route: `/ventas/${sale.id}` }));
        this.rebuildActivity();
      }, error: () => { if (this.salesCurrent(generation)) { this.salesActivity = []; this.rebuildActivity(); } }
    }));
    this.refreshTodaySales();
  }

  private cancelToday(): void {
    this.todayGeneration++;
    this.todayRequest.unsubscribe(); this.todayRequest = new Subscription();
    if (this.todayTimer !== null) clearTimeout(this.todayTimer);
    this.todayTimer = null;
  }

  @HostListener("window:focus")
  @HostListener("document:visibilitychange")
  revalidateTodayOnResume(): void {
    this.checkSalesSession();
    if (!this.salesCurrent()) return;
    if (document.visibilityState !== "visible") {
      this.cancelToday();
      if (this.todayStatus === "blocked") return;
      this.todayStatus = "idle";
      const kpi = this.findKpi("salesToday");
      kpi.value = "--"; kpi.loading = false; kpi.empty = false; kpi.message = "";
      kpi.subtitle = "Pendiente de verificar el día comercial";
      return;
    }
    if (this.todayStatus !== "blocked") this.refreshTodaySales();
  }

  @HostListener("window:online")
  retryTodayWhenOnline(): void {
    if (this.todayStatus === "error") this.refreshTodaySales();
  }

  refreshTodaySales(retryExpired = true): void {
    const kpi = this.findKpi("salesToday");
    if (!kpi.visible || !this.salesCurrent() || this.todayStatus === "loading" || document.visibilityState !== "visible") return;
    this.cancelToday();
    const generation = this.todayGeneration, salesGeneration = this.salesGeneration;
    const valid = () => this.salesCurrent(salesGeneration) && generation === this.todayGeneration;
    const started = performance.now();
    this.todayStatus = "loading"; kpi.loading = true; kpi.empty = false; kpi.value = "--";
    kpi.subtitle = "Verificando día comercial · Lima"; kpi.message = "";
    const fail = (message: string, blocked = false) => {
      this.todayStatus = blocked ? "blocked" : "error";
      kpi.loading = false; kpi.empty = false; kpi.value = "--";
      kpi.subtitle = "Ventas de hoy no verificadas"; kpi.message = message;
    };
    this.todayRequest.add(this.salesService.today(createBoundAuthContext(this.salesCredential!)).pipe(timeout(15000)).subscribe({
      next: response => {
        if (!valid()) return;
        if (!this.validTodayResponse(response)) { fail("No se pudo verificar la referencia comercial recibida. Reintenta la consulta."); return; }
        // Elapsed monotonic time includes the entire round trip: an intentionally conservative expiry.
        const remaining = Date.parse(response.nextDayStartsAt) - Date.parse(response.referenceInstant)
          - Math.max(0, performance.now() - started) - 1;
        if (remaining <= 0) {
          fail("La referencia del día venció durante la consulta. Vuelve a comprobar las ventas.");
          if (retryExpired) void Promise.resolve().then(() => { if (valid()) this.refreshTodaySales(false); });
          return;
        }
        const completed = response.sales.filter(sale => sale.status === "COMPLETED");
        const voidedCount = response.sales.filter(sale => sale.status === "VOIDED").length;
        const total = completed.reduce((sum, sale) => sum + this.numberOf(sale.totalAmount), 0);
        this.todayStatus = "ready"; kpi.loading = false; kpi.value = this.formatCurrency(total);
        kpi.subtitle = `${completed.length} ventas completadas hoy (${formatCommercialDay(response.businessDate)}) · Lima.`;
        kpi.message = completed.length ? `Ticket promedio ${this.formatCurrency(total / completed.length)}.` : "Sin ventas completadas en el día confirmado.";
        if (voidedCount) kpi.message += ` ${voidedCount} anuladas.`;
        kpi.empty = completed.length === 0;
        this.todayTimer = setTimeout(() => { this.todayTimer = null; if (valid()) this.refreshTodaySales(); }, remaining);
      },
      error: error => {
        if (!valid()) return;
        fail(error?.status === 401 ? "Sesión vencida. Inicia sesión para consultar las ventas."
          : error?.status === 403 ? "No tienes permiso para consultar las ventas de hoy."
          : "No se pudieron consultar las ventas de hoy. Reintenta cuando haya conexión.", [401, 403].includes(error?.status));
      }
    }));
  }

  private validTodayResponse(response: TodaySalesResponse): boolean {
    if (!response || response.timeZone !== COMMERCIAL_ZONE || !isCommercialDate(response.businessDate)
        || commercialDateAt(response.referenceInstant) !== response.businessDate) return false;
    const next = Date.parse(response.nextDayStartsAt), reference = Date.parse(response.referenceInstant);
    return Number.isFinite(next) && next > reference && commercialDateAt(response.nextDayStartsAt) !== response.businessDate
      && commercialDateAt(new Date(next - 1).toISOString()) === response.businessDate
      && Array.isArray(response.sales) && response.sales.every(sale => sale && Number.isSafeInteger(sale.id) && sale.id > 0
        && ["COMPLETED", "VOIDED"].includes(sale.status) && Number.isFinite(sale.totalAmount));
  }


  private loadCashKpi(): void {
    const kpi = this.findKpi("cashSession");
    if (!kpi.visible) {
      return;
    }

    this.cashRegisterService.current().subscribe({
      next: (session) => {
        kpi.loading = false;
        kpi.empty = false;

        if (session.status === "OPEN") {
          kpi.value = "Sesion abierta";
          kpi.subtitle = `Caja #${session.id} · Apertura ${this.formatCurrency(session.openingAmount)}.`;

          if (session.expectedCashAmount !== null) {
            kpi.message = `Esperado: ${this.formatCurrency(session.expectedCashAmount)}.`;
          } else {
            kpi.message = "Sin arqueo final registrado aun.";
          }

          return;
        }

        kpi.value = "Sesion cerrada";
        kpi.subtitle = `Caja #${session.id} cerrada.`;
        kpi.message =
          session.closedAt !== null
            ? `Cierre ${new Date(session.closedAt).toLocaleString("es-PE")}.`
            : "Sin hora de cierre disponible.";
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          kpi.loading = false;
          kpi.empty = true;
          kpi.value = "Sin apertura";
          kpi.subtitle = "No hay caja abierta en este momento.";
          kpi.message = "Puedes abrir una nueva sesion desde el modulo Caja.";
          return;
        }

        this.applyKpiError(kpi, error, "No se pudo cargar el estado de caja.");
      },
    });
  }

  private loadLowStockKpi(): void {
    const kpi = this.findKpi("lowStock");
    if (!kpi.visible) {
      this.lowStockMessage = "Sin alertas para el rol actual.";
      return;
    }

    this.reportsService.lowStock(10).subscribe({
      next: (rows) => {
        const sorted = rows
          .slice()
          .sort(
            (a, b) =>
              a.currentStock - a.threshold - (b.currentStock - b.threshold),
          );

        this.lowStockAlerts = sorted.slice(0, 6);
        this.lowStockMessage =
          rows.length === 0
            ? "No hay alertas de stock bajo por el momento."
            : "";

        kpi.loading = false;
        kpi.value = String(rows.length);
        kpi.subtitle =
          rows.length > 0
            ? `${rows.length} productos por debajo del umbral 10.`
            : "Sin productos criticos en stock.";
        kpi.message = rows.length > 0 ? "Revisa reposicion prioritaria." : "";
        kpi.empty = rows.length === 0;
      },
      error: (error: unknown) => {
        this.lowStockAlerts = [];
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.lowStockMessage =
            "No tienes permisos para ver alertas de stock.";
        } else {
          this.lowStockMessage = toHttpErrorMessage(
            error,
            "No se pudieron cargar alertas de stock.",
          );
        }
        this.applyKpiError(kpi, error, "No se pudo cargar stock bajo.");
      },
    });
  }

  private loadQuotesKpi(): void {
    const kpi = this.findKpi("quotesPending");
    if (!kpi.visible) {
      return;
    }

    this.quoteService.list().subscribe({
      next: (quotes) => {
        const startRange = this.daysAgo(13).getTime();
        const quotesInWindow = quotes.filter(
          (quote) => new Date(quote.issueDate).getTime() >= startRange,
        );

        const pendingCount = quotesInWindow.filter((quote) =>
          ["DRAFT", "SENT"].includes(quote.status),
        ).length;

        kpi.loading = false;
        kpi.value = String(pendingCount);
        kpi.subtitle = `${quotesInWindow.length} cotizaciones registradas en 14 dias.`;
        kpi.message =
          pendingCount > 0
            ? `${pendingCount} requieren seguimiento comercial.`
            : "Sin pendientes de envio o conversion.";
        kpi.empty = quotesInWindow.length === 0;

        this.quotesActivity = quotesInWindow
          .slice()
          .sort((a, b) => this.byNewest(b.issueDate, a.issueDate))
          .slice(0, 4)
          .map((quote) => ({
            title: `Cotizacion ${quote.quoteNumber}`,
            detail: `${quote.customerName} · ${this.quoteStatusLabel(quote.status)}`,
            at: quote.issueDate,
            badge: "COTIZACION",
            route: `/cotizaciones/${quote.id}`,
          }));

        this.rebuildActivity();
      },
      error: (error: unknown) => {
        this.quotesActivity = [];
        this.rebuildActivity();
        this.applyKpiError(
          kpi,
          error,
          "No se pudo cargar el estado de cotizaciones.",
        );
      },
    });
  }

  private loadElectronicDocumentsKpi(): void {
    const kpi = this.findKpi("electronicDocuments");
    if (!kpi.visible) {
      return;
    }

    this.electronicDocumentService
      .list({
        from: this.toIsoDate(this.daysAgo(13)),
        to: this.toIsoDate(new Date()),
      })
      .subscribe({
        next: (documents) => {
          const acceptedCount = documents.filter(
            (item) => item.status === "ACCEPTED",
          ).length;
          const issuesCount = documents.filter((item) =>
            ["REJECTED", "ERROR"].includes(item.status),
          ).length;

          kpi.loading = false;
          kpi.value = String(documents.length);
          kpi.subtitle = `${acceptedCount} aceptados en el periodo actual.`;
          kpi.message =
            issuesCount > 0
              ? `${issuesCount} con observaciones o errores.`
              : "Sin incidencias de envio recientes.";
          kpi.empty = documents.length === 0;

          this.documentsActivity = documents
            .slice()
            .sort((a, b) => this.byNewest(b.createdAt, a.createdAt))
            .slice(0, 4)
            .map((document) => ({
              title: `Comprobante ${document.fullNumber}`,
              detail: `${this.documentStatusLabel(document.status)} · ${this.formatCurrency(document.totalAmount)}`,
              at: document.createdAt,
              badge: "DOC",
              route: `/facturacion/comprobantes/${document.id}`,
            }));

          this.rebuildActivity();
        },
        error: (error: unknown) => {
          this.documentsActivity = [];
          this.rebuildActivity();
          this.applyKpiError(
            kpi,
            error,
            "No se pudo cargar el resumen de comprobantes.",
          );
        },
      });
  }

  private loadInventoryCoverageKpi(): void {
    const kpi = this.findKpi("inventoryCoverage");
    if (!kpi.visible) {
      return;
    }

    this.inventoryService.listStocks({ page: 0, size: 1 }).subscribe({
      next: (response) => {
        kpi.loading = false;
        kpi.value = String(response.totalElements);
        kpi.subtitle = "Registros de stock monitoreados.";
        kpi.message = "Visibilidad de inventario en tiempo real.";
        kpi.empty = response.totalElements === 0;
      },
      error: (error: unknown) => {
        this.applyKpiError(
          kpi,
          error,
          "No se pudo cargar la cobertura de inventario.",
        );
      },
    });
  }

  private loadCatalogProductsKpi(): void {
    const kpi = this.findKpi("catalogProducts");
    if (!kpi.visible) {
      return;
    }

    this.productService.list(0, 1).subscribe({
      next: (response) => {
        kpi.loading = false;
        kpi.value = String(response.totalElements);
        kpi.subtitle = "Productos disponibles en catalogo.";
        kpi.message = "Base comercial para ventas y cotizaciones.";
        kpi.empty = response.totalElements === 0;
      },
      error: (error: unknown) => {
        this.applyKpiError(
          kpi,
          error,
          "No se pudo cargar el catalogo de productos.",
        );
      },
    });
  }

  private loadTopProducts(): void {
    if (!this.showTopProductsPanel) {
      this.topProducts = [];
      this.topProductsMessage = "No disponible para el rol actual.";
      this.topProductsLoading = false;
      return;
    }

    this.topProductsLoading = true;
    this.topProductsMessage = "";

    const generation = this.salesGeneration;
    this.salesReads.add(this.reportsService
      .topProducts({limit: 5}, createBoundAuthContext(this.salesCredential!))
      .subscribe({
        next: (rows) => {
          if (!this.salesCurrent(generation)) return;
          this.topProductsLoading = false;
          this.topProducts = rows;
          if (rows.length === 0) {
            this.topProductsMessage =
              "Sin ventas suficientes para construir ranking en los ultimos 30 dias.";
          }
        },
        error: (error: unknown) => {
          if (!this.salesCurrent(generation)) return;
          this.topProductsLoading = false;
          this.topProducts = [];
          this.topProductsMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el ranking de productos.",
          );
        },
      }));
  }

  private rebuildActivity(): void {
    this.recentActivity = [
      ...this.salesActivity,
      ...this.quotesActivity,
      ...this.documentsActivity,
    ]
      .slice()
      .sort((a, b) => this.byNewest(a.at, b.at))
      .slice(0, 8);

    this.activityMessage =
      this.recentActivity.length === 0
        ? "Sin actividad reciente para tu rol en este momento."
        : "";
  }

  private hasRole(role: string): boolean {
    return this.user?.roles.includes(role) ?? false;
  }

  private hasAnyRole(roles: string[]): boolean {
    if (!this.user) {
      return false;
    }
    return this.user.roles.some((role) => roles.includes(role));
  }

  private findKpi(id: string): DashboardKpi {
    return this.kpis.find((kpi) => kpi.id === id) as DashboardKpi;
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - days);
    return date;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private byNewest(left: string, right: string): number {
    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();
    return rightTime - leftTime;
  }

  private saleStatusLabel(status: SaleResponse["status"]): string {
    if (status === "VOIDED") {
      return "Venta anulada";
    }
    return "Venta completada";
  }

  private quoteStatusLabel(status: QuoteStatus): string {
    const labels: Record<QuoteStatus, string> = {
      DRAFT: "Borrador",
      SENT: "Enviada",
      EXPIRED: "Vencida",
      CONVERTED: "Convertida",
      CANCELLED: "Cancelada",
    };

    return labels[status] ?? status;
  }

  private documentStatusLabel(status: ElectronicDocumentStatus): string {
    const labels: Record<ElectronicDocumentStatus, string> = {
      DRAFT: "Borrador",
      GENERATED: "Generado",
      SIGNED: "Firmado",
      SENT: "Enviado",
      ACCEPTED: "Aceptado",
      REJECTED: "Rechazado",
      ERROR: "Error",
      CANCELLED: "Cancelado",
    };

    return labels[status] ?? status;
  }

  private applyKpiError(
    kpi: DashboardKpi,
    error: unknown,
    fallbackMessage: string,
  ): void {
    kpi.loading = false;
    kpi.empty = true;
    kpi.value = "--";

    if (error instanceof HttpErrorResponse && error.status === 403) {
      kpi.subtitle = "No disponible para tu rol actual.";
      kpi.message = "";
      return;
    }

    kpi.subtitle = "No disponible en este momento.";
    kpi.message = toHttpErrorMessage(error, fallbackMessage);
  }
}
