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
    <section class="card">
      <header>
        <h1>Reportes operativos</h1>
        <p class="muted">
          Accede a indicadores clave del MVP y consulta por filtros.
        </p>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>

      <section class="grid" *ngIf="cards.length > 0">
        <a class="tile" *ngFor="let card of cards" [routerLink]="card.route">
          <h2>{{ card.title }}</h2>
          <p>{{ card.description }}</p>
        </a>
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
        color: #6b7280;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: 0.75rem;
      }
      .tile {
        display: grid;
        gap: 0.35rem;
        text-decoration: none;
        background: #f8fafc;
        color: #111827;
        border: 1px solid #e5e7eb;
        border-radius: 0.45rem;
        padding: 0.9rem;
      }
      .tile:hover {
        border-color: #0f766e;
        box-shadow: 0 0 0 1px #0f766e inset;
      }
      h2 {
        margin: 0;
        font-size: 1rem;
      }
      p {
        margin: 0;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      @media (max-width: 960px) {
        .grid {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .grid {
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
