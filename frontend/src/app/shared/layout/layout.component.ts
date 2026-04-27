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
    <div class="layout">
      <aside class="sidebar">
        <h2>ERP/POS</h2>
        <p class="muted">{{ currentUser?.username || "Usuario" }}</p>
        <p class="muted">Rol: {{ primaryRole }}</p>

        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/pos"
            routerLinkActive="active"
            >POS</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/caja"
            routerLinkActive="active"
            >Caja</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/ventas"
            routerLinkActive="active"
            >Ventas</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/catalogo/productos"
            routerLinkActive="active"
            >Catalogo - Productos</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/catalogo/categorias"
            routerLinkActive="active"
            >Catalogo - Categorias</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/catalogo/unidades"
            routerLinkActive="active"
            >Catalogo - Unidades</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/inventario/almacenes"
            routerLinkActive="active"
            >Inventario - Almacenes</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR', 'CAJERO'])"
            routerLink="/inventario/stock"
            routerLinkActive="active"
            >Inventario - Stock</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO'])"
            routerLink="/inventario/stock-inicial"
            routerLinkActive="active"
            >Inventario - Stock inicial</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO'])"
            routerLink="/inventario/ajustes"
            routerLinkActive="active"
            >Inventario - Ajustes</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO'])"
            routerLink="/inventario/transferencias"
            routerLinkActive="active"
            >Inventario - Transferencias</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'SUPERVISOR'])"
            routerLink="/inventario/kardex"
            routerLinkActive="active"
            >Inventario - Kardex</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/compras/proveedores"
            routerLinkActive="active"
            >Compras - Proveedores</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'ALMACENERO', 'SUPERVISOR'])"
            routerLink="/compras/ordenes"
            routerLinkActive="active"
            >Compras - Ordenes</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'SUPERVISOR', 'CAJERO'])"
            routerLink="/cotizaciones"
            routerLinkActive="active"
            >Cotizaciones</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'CAJERO', 'SUPERVISOR'])"
            routerLink="/facturacion/comprobantes"
            routerLinkActive="active"
            >Facturacion - Comprobantes</a
          >
          <a
            *ngIf="canSee(['ADMIN'])"
            routerLink="/facturacion/configuracion"
            routerLinkActive="active"
            >Facturacion - Configuracion</a
          >
          <a
            *ngIf="canSee(['ADMIN'])"
            routerLink="/facturacion/series"
            routerLinkActive="active"
            >Facturacion - Series</a
          >
          <a
            *ngIf="canSee(['ADMIN', 'SUPERVISOR', 'ALMACENERO'])"
            routerLink="/reportes"
            routerLinkActive="active"
            >Reportes</a
          >
          <a
            *ngIf="canSee(['ADMIN'])"
            routerLink="/integraciones/eventos"
            routerLinkActive="active"
            >Integraciones - Eventos</a
          >
        </nav>

        <button type="button" (click)="logout()">Cerrar sesion</button>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .layout {
        display: grid;
        grid-template-columns: 250px 1fr;
        min-height: 100vh;
      }
      .sidebar {
        background: #111827;
        color: #fff;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .content {
        padding: 1.25rem;
      }
      nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 1rem 0;
      }
      a {
        color: #cbd5e1;
        padding: 0.5rem;
        border-radius: 0.35rem;
      }
      a.active,
      a:hover {
        background: #1f2937;
        color: #fff;
      }
      .muted {
        color: #93c5fd;
        margin: 0;
        font-size: 0.9rem;
      }
      button {
        margin-top: auto;
        padding: 0.5rem 0.75rem;
        border: 0;
        border-radius: 0.35rem;
        cursor: pointer;
      }
    `,
  ],
})
export class LayoutComponent implements OnInit {
  currentUser: UserProfile | null = null;
  primaryRole = "N/A";

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

  logout(): void {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
}
