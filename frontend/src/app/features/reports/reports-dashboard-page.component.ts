import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";

interface ReportShortcut {
  title: string;
  description: string;
  route: string;
  roles: string[];
}

@Component({
  selector: "app-reports-dashboard-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card ui-module-page reports-dashboard-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Centro de indicadores InkToy</p>
          <h1 class="ui-page-title">Reportes operativos</h1>
          <p class="ui-page-description">
            Accede a cada vista de control y consulta indicadores clave del MVP
            con filtros por periodo, estado o entidad.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>

      <section class="cards-grid" *ngIf="cards.length > 0; else emptyState">
        <a
          class="report-card"
          *ngFor="let card of cards"
          [routerLink]="card.route"
        >
          <p class="report-card__kicker">Reporte</p>
          <h2>{{ card.title }}</h2>
          <p class="report-card__description">{{ card.description }}</p>
          <span class="ui-chip ui-chip--info report-card__chip"
            >Abrir vista</span
          >
        </a>
      </section>

      <ng-template #emptyState>
        <div class="ui-module-section">
          <p class="ui-empty-state">
            No hay reportes habilitados para tu rol en esta sesion.
          </p>
        </div>
      </ng-template>

      <section class="ui-module-section quick-guide" *ngIf="cards.length > 0">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Guia rapida</h2>
        </header>
        <p class="quick-guide__text">
          Accede a indicadores clave del MVP y consulta por filtros.
        </p>
      </section>

      <section class="hint-row" *ngIf="cards.length > 0">
        <p class="hint-row__item">
          Prioriza reportes con impacto diario: ventas, caja y comprobantes.
        </p>
        <p class="hint-row__item">
          Usa filtros de fecha para reducir ruido y detectar variaciones.
        </p>
      </section>
    </section>
  `,
  styles: [
    `
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: var(--space-3);
      }

      .report-card {
        display: grid;
        gap: var(--space-2);
        text-decoration: none;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background:
          linear-gradient(
            180deg,
            rgba(18, 23, 184, 0.05) 0%,
            rgba(18, 23, 184, 0) 58%
          ),
          var(--color-bg-surface);
        padding: var(--space-3);
        transition:
          transform 120ms ease,
          box-shadow 120ms ease,
          border-color 120ms ease;
      }

      .report-card:hover {
        transform: translateY(-2px);
        border-color: rgba(18, 23, 184, 0.4);
        box-shadow: var(--shadow-md);
      }

      .report-card h2 {
        margin: 0;
        font-size: 1.04rem;
      }

      .report-card__kicker {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      .report-card__description {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .report-card__chip {
        width: fit-content;
      }

      .quick-guide__text {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .hint-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }

      .hint-row__item {
        margin: 0;
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        color: var(--color-text-secondary);
        background: var(--color-bg-soft);
      }

      @media (max-width: 960px) {
        .cards-grid,
        .hint-row {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 640px) {
        .cards-grid,
        .hint-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ReportsDashboardPageComponent implements OnInit {
  private readonly allShortcuts: ReportShortcut[] = [
    {
      title: "Ventas",
      description: "Total, ticket promedio, metodos de pago y ventas por dia.",
      route: "/reportes/ventas",
      roles: ["ADMIN", "SUPERVISOR"],
    },
    {
      title: "Caja",
      description: "Resumen de apertura, cierre y diferencias por sesion.",
      route: "/reportes/caja",
      roles: ["ADMIN", "SUPERVISOR"],
    },
    {
      title: "Stock bajo",
      description: "Productos con stock actual por debajo del umbral.",
      route: "/reportes/stock-bajo",
      roles: ["ADMIN", "SUPERVISOR", "ALMACENERO"],
    },
    {
      title: "Movimientos de inventario",
      description: "Entradas/salidas con filtros por producto y almacen.",
      route: "/reportes/movimientos-inventario",
      roles: ["ADMIN", "SUPERVISOR", "ALMACENERO"],
    },
    {
      title: "Compras",
      description: "Totales de compras y distribucion por proveedor.",
      route: "/reportes/compras",
      roles: ["ADMIN", "SUPERVISOR"],
    },
    {
      title: "Productos mas vendidos",
      description: "Ranking por cantidad vendida y monto total.",
      route: "/reportes/productos-mas-vendidos",
      roles: ["ADMIN", "SUPERVISOR"],
    },
    {
      title: "Cotizaciones",
      description: "Totales, conversiones, cancelaciones y tasa.",
      route: "/reportes/cotizaciones",
      roles: ["ADMIN", "SUPERVISOR"],
    },
    {
      title: "Comprobantes",
      description: "Resumen por estado/tipo de documentos electronicos.",
      route: "/reportes/comprobantes",
      roles: ["ADMIN", "SUPERVISOR"],
    },
  ];

  cards: ReportShortcut[] = [];
  permissionMessage = "";

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.cards = this.allShortcuts.filter((shortcut) =>
          user.roles.some((role) => shortcut.roles.includes(role)),
        );

        if (this.cards.length === 0) {
          this.permissionMessage =
            "No tienes permisos para consultar reportes operativos.";
        }
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }
}
