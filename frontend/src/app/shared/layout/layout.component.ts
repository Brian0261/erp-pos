import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img
            src="assets/images/brand/logo-inktoy.png"
            alt="InkToy"
            class="sidebar-brand-logo"
          />
          <div class="sidebar-brand-copy">
            <p class="sidebar-brand-kicker">InkToy ERP/POS</p>
            <h2>Operacion diaria</h2>
          </div>
        </div>

        <section class="sidebar-user ui-card" aria-label="Usuario actual">
          <p class="sidebar-user-label">Usuario activo</p>
          <p class="sidebar-user-name">
            {{ currentUser?.username || "Usuario" }}
          </p>
          <p class="sidebar-user-role">
            Rol:
            <span class="ui-badge sidebar-role-badge">{{ primaryRole }}</span>
          </p>
        </section>

        <nav class="sidebar-menu" aria-label="Menu principal">
          <a
            class="sidebar-link"
            routerLink="/dashboard"
            routerLinkActive="is-active"
            >Dashboard</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/pos"
            routerLinkActive="is-active"
            >POS</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/caja"
            routerLinkActive="is-active"
            >Caja</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/ventas"
            routerLinkActive="is-active"
            >Ventas</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/catalogo/productos"
            routerLinkActive="is-active"
            >Catalogo - Productos</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/catalogo/categorias"
            routerLinkActive="is-active"
            >Catalogo - Categorias</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/catalogo/unidades"
            routerLinkActive="is-active"
            >Catalogo - Unidades</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/inventario/almacenes"
            routerLinkActive="is-active"
            >Inventario - Almacenes</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR', 'CAJERO'])"
            routerLink="/inventario/stock"
            routerLinkActive="is-active"
            >Inventario - Stock</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO'])"
            routerLink="/inventario/stock-inicial"
            routerLinkActive="is-active"
            >Inventario - Stock inicial</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO'])"
            routerLink="/inventario/ajustes"
            routerLinkActive="is-active"
            >Inventario - Ajustes</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO'])"
            routerLink="/inventario/transferencias"
            routerLinkActive="is-active"
            >Inventario - Transferencias</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'SUPERVISOR'])"
            routerLink="/inventario/kardex"
            routerLinkActive="is-active"
            >Inventario - Kardex</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/compras/proveedores"
            routerLinkActive="is-active"
            >Compras - Proveedores</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/compras/ordenes"
            routerLinkActive="is-active"
            >Compras - Ordenes</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'SUPERVISOR', 'CAJERO'])"
            routerLink="/cotizaciones"
            routerLinkActive="is-active"
            >Cotizaciones</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/facturacion/comprobantes"
            routerLinkActive="is-active"
            >Facturacion - Comprobantes</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN'])"
            routerLink="/facturacion/configuracion"
            routerLinkActive="is-active"
            >Facturacion - Configuracion</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN'])"
            routerLink="/facturacion/series"
            routerLinkActive="is-active"
            >Facturacion - Series</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN', 'SUPERVISOR', 'ALMACENERO'])"
            routerLink="/reportes"
            routerLinkActive="is-active"
            >Reportes</a
          >
          <a
            class="sidebar-link"
            *ngIf="canSee(['ADMIN'])"
            routerLink="/integraciones/eventos"
            routerLinkActive="is-active"
            >Integraciones - Eventos</a
          >
        </nav>

        <button
          type="button"
          class="ui-button ui-button--secondary sidebar-logout"
          (click)="logout()"
        >
          Cerrar sesion
        </button>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div class="topbar-context">
            <p class="topbar-kicker">Panel principal</p>
            <h1>{{ currentSectionLabel }}</h1>
          </div>
          <div class="topbar-user">
            <span class="topbar-user-name">{{
              currentUser?.username || "Usuario"
            }}</span>
            <span class="ui-badge topbar-role-badge">{{ primaryRole }}</span>
          </div>
        </header>

        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </section>
    </div>
  `,
  styles: [
    `
      .layout-shell {
        display: grid;
        grid-template-columns: var(--layout-sidebar-width) 1fr;
        min-height: 100vh;
        background: linear-gradient(
          165deg,
          rgba(18, 23, 184, 0.04) 0%,
          rgba(242, 74, 11, 0.03) 100%
        );
      }

      .sidebar {
        background: linear-gradient(180deg, #0d128e 0%, #101114 65%);
        color: var(--color-text-on-dark);
        padding: var(--space-5) var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        border-right: 1px solid rgba(255, 255, 255, 0.08);
      }

      .sidebar-brand {
        display: grid;
        grid-template-columns: 68px 1fr;
        align-items: center;
        gap: var(--space-3);
      }

      .sidebar-brand-logo {
        width: 100%;
        max-width: 68px;
        background: #ffffff;
        border-radius: var(--radius-md);
        padding: var(--space-1);
        box-shadow: 0 8px 20px rgba(16, 17, 20, 0.28);
      }

      .sidebar-brand-kicker {
        color: rgba(255, 255, 255, 0.72);
        font-size: var(--font-size-xs);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin: 0;
      }

      .sidebar-brand-copy h2 {
        margin: var(--space-1) 0 0;
        font-family: var(--font-family-display);
        font-size: 1.15rem;
        line-height: 1.2;
      }

      .sidebar-user {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.16);
        box-shadow: none;
        color: var(--color-text-on-dark);
        padding: var(--space-3);
      }

      .sidebar-user-label {
        margin: 0;
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.74);
        font-weight: 700;
      }

      .sidebar-user-name {
        margin: var(--space-1) 0 var(--space-2);
        font-size: var(--font-size-lg);
        font-weight: 800;
      }

      .sidebar-user-role {
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
      }

      .sidebar-role-badge {
        background: rgba(244, 194, 13, 0.18);
        border: 1px solid rgba(244, 194, 13, 0.5);
        color: #ffe082;
      }

      .sidebar-menu {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        overflow: auto;
        padding-right: var(--space-1);
      }

      .sidebar-link {
        display: flex;
        align-items: center;
        min-height: 2.25rem;
        padding: 0.56rem 0.72rem;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        color: rgba(255, 255, 255, 0.85);
        font-size: var(--font-size-sm);
        font-weight: 600;
        transition:
          background-color 120ms ease-in-out,
          border-color 120ms ease-in-out,
          color 120ms ease-in-out,
          transform 120ms ease-in-out;
      }

      .sidebar-link:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.22);
        color: #ffffff;
        transform: translateX(1px);
      }

      .sidebar-link.is-active {
        background: #ffffff;
        border-color: #ffffff;
        color: var(--color-brand-primary);
        box-shadow: 0 8px 16px rgba(18, 23, 184, 0.24);
      }

      .sidebar-link.is-active:hover {
        color: var(--color-brand-primary);
      }

      .sidebar-logout {
        margin-top: auto;
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.24);
        background: rgba(255, 255, 255, 0.14);
      }

      .sidebar-logout:hover {
        background: rgba(255, 255, 255, 0.22);
      }

      .workspace {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        background: rgba(255, 255, 255, 0.88);
        border-bottom: 1px solid var(--color-border-default);
        backdrop-filter: blur(6px);
      }

      .topbar-kicker {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      .topbar h1 {
        margin: 0;
        font-size: clamp(1.1rem, 2vw, 1.4rem);
        font-family: var(--font-family-display);
      }

      .topbar-user {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        border: 1px solid var(--color-border-default);
      }

      .topbar-user-name {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .topbar-role-badge {
        background: #eef2ff;
        color: #1e3a8a;
      }

      .content {
        padding: var(--space-5);
        min-width: 0;
      }

      @media (max-width: 1100px) {
        .layout-shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-right: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .sidebar-menu {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          max-height: 260px;
          padding-right: 0;
        }

        .sidebar-logout {
          max-width: 260px;
        }
      }

      @media (max-width: 700px) {
        .sidebar {
          padding: var(--space-4);
        }

        .sidebar-brand {
          grid-template-columns: 56px 1fr;
        }

        .sidebar-brand-logo {
          max-width: 56px;
        }

        .topbar {
          padding: var(--space-3) var(--space-4);
          flex-direction: column;
          align-items: flex-start;
        }

        .topbar-user {
          width: 100%;
          justify-content: space-between;
        }

        .content {
          padding: var(--space-4);
        }

        .sidebar-menu {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit {
  currentUser: UserProfile | null = null;
  primaryRole = "N/A";
  private readonly sectionLabels: Record<string, string> = {
    dashboard: "Dashboard",
    pos: "Punto de venta",
    caja: "Caja",
    ventas: "Ventas",
    catalogo: "Catalogo",
    inventario: "Inventario",
    compras: "Compras",
    cotizaciones: "Cotizaciones",
    facturacion: "Facturacion",
    reportes: "Reportes",
    integraciones: "Integraciones",
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.primaryRole = user.roles?.[0] || "N/A";
      },
      error: () => this.logout(),
    });
  }

  canSee(allowedRoles: string[]): boolean {
    if (!this.currentUser) {
      return false;
    }
    return this.currentUser.roles.some((role) => allowedRoles.includes(role));
  }

  get currentSectionLabel(): string {
    const activeSection =
      this.router.url.split("?")[0].split("/").filter(Boolean)[0] ||
      "dashboard";
    return this.sectionLabels[activeSection] || "ERP POS";
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
}
