import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { filter, Subscription } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { PosStateService } from "../../features/sales/data/pos-state.service";
import { ConfirmDialogComponent } from "../dialogs/confirm-dialog.component";

type AppRole = "ADMIN" | "CAJERO" | "ALMACENERO" | "SUPERVISOR";
type UiTheme = "light" | "dark";

interface SidebarLinkNode {
  kind: "link";
  id: string;
  label: string;
  route: string;
  icon: string;
  allowedRoles: AppRole[];
}

interface SidebarGroupNode {
  kind: "group";
  id: string;
  label: string;
  icon: string;
  allowedRoles: AppRole[];
  collapsible: boolean;
  items: SidebarLinkNode[];
}

type SidebarNode = SidebarLinkNode | SidebarGroupNode;
type VisibleSidebarNode = SidebarLinkNode | SidebarGroupNode;

const ROLES_ALL: AppRole[] = ["ADMIN", "CAJERO", "ALMACENERO", "SUPERVISOR"];
const ROLES_ADMIN: AppRole[] = ["ADMIN"];
const ROLES_CATALOG: AppRole[] = ["ADMIN", "ALMACENERO", "SUPERVISOR"];
const ROLES_INVENTORY_STOCK: AppRole[] = ["ADMIN", "ALMACENERO", "SUPERVISOR"];
const ROLES_INVENTORY_MANAGEMENT: AppRole[] = ["ADMIN", "ALMACENERO"];
const ROLES_INVENTORY_KARDEX: AppRole[] = ["ADMIN", "SUPERVISOR"];
const ROLES_SALES: AppRole[] = ["ADMIN", "CAJERO", "SUPERVISOR"];
const ROLES_PURCHASES: AppRole[] = ["ADMIN", "ALMACENERO", "SUPERVISOR"];
const ROLES_REPORTS: AppRole[] = ["ADMIN", "SUPERVISOR", "ALMACENERO"];
const ROLES_CONSULTA_CAJERO: AppRole[] = ["CAJERO"];
const ROLES_ECOMMERCE_ADMIN: AppRole[] = ["ADMIN", "SUPERVISOR"];

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent],
  template: `
    <div class="layout-shell" [class.is-sidebar-compact]="isSidebarCompact">
      <aside class="sidebar" [class.is-compact]="isSidebarCompact">
        <div class="sidebar-header">
          <div class="sidebar-top">
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

            <button
              type="button"
              class="sidebar-toggle"
              [disabled]="!canToggleCompactMode"
              [attr.aria-label]="sidebarToggleAriaLabel"
              [attr.title]="sidebarToggleAriaLabel"
              (click)="toggleSidebarCompact()"
            >
              <span class="sidebar-toggle-glyph" aria-hidden="true">{{
                isSidebarCompact ? "»" : "«"
              }}</span>
              <span class="visually-hidden">{{ sidebarToggleAriaLabel }}</span>
            </button>
          </div>

          <section
            class="sidebar-user ui-card"
            aria-label="Usuario actual"
            *ngIf="!isSidebarCompact"
          >
            <p class="sidebar-user-label">Usuario activo</p>
            <p class="sidebar-user-name">
              {{ currentUser?.username || "Usuario" }}
            </p>
            <p class="sidebar-user-role">
              Rol:
              <span class="ui-badge sidebar-role-badge">{{ primaryRole }}</span>
            </p>
          </section>
        </div>

        <nav class="sidebar-menu" aria-label="Menu principal">
          <ng-container
            *ngFor="let node of sidebarNodesForView; trackBy: trackByNodeId"
          >
            <a
              *ngIf="node.kind === 'link'"
              class="sidebar-link sidebar-link--standalone"
              [routerLink]="node.route"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="
                node.route === '/dashboard'
                  ? exactMatchOptions
                  : inclusiveMatchOptions
              "
              [attr.data-tooltip]="isSidebarCompact ? node.label : null"
            >
              <span class="sidebar-icon" aria-hidden="true">{{
                node.icon
              }}</span>
              <span class="sidebar-label">{{ node.label }}</span>
            </a>

            <section
              *ngIf="node.kind === 'group'"
              class="sidebar-group"
              [class.is-active-group]="isGroupActive(node)"
            >
              <button
                type="button"
                class="sidebar-group-toggle"
                [class.is-active-group]="isGroupActive(node)"
                [attr.aria-expanded]="isGroupExpanded(node.id)"
                [attr.aria-controls]="getGroupItemsContainerId(node.id)"
                [attr.data-tooltip]="isSidebarCompact ? node.label : null"
                (click)="toggleGroup(node.id)"
              >
                <span class="sidebar-group-leading">
                  <span class="sidebar-icon" aria-hidden="true">{{
                    node.icon
                  }}</span>
                  <span class="sidebar-label">{{ node.label }}</span>
                </span>
                <span
                  class="sidebar-group-chevron"
                  *ngIf="node.collapsible && !isSidebarCompact"
                  aria-hidden="true"
                  >{{ isGroupExpanded(node.id) ? "▾" : "▸" }}</span
                >
              </button>

              <div
                class="sidebar-group-items"
                [id]="getGroupItemsContainerId(node.id)"
                *ngIf="isGroupExpanded(node.id)"
              >
                <a
                  class="sidebar-link sidebar-link--child"
                  *ngFor="let item of node.items; trackBy: trackByItemId"
                  [routerLink]="item.route"
                  routerLinkActive="is-active"
                  [routerLinkActiveOptions]="
                    item.route === '/dashboard'
                      ? exactMatchOptions
                      : inclusiveMatchOptions
                  "
                  [attr.data-tooltip]="isSidebarCompact ? item.label : null"
                >
                  <span class="sidebar-icon" aria-hidden="true">{{
                    item.icon
                  }}</span>
                  <span class="sidebar-label">{{ item.label }}</span>
                </a>
              </div>
            </section>
          </ng-container>
        </nav>

        <footer class="sidebar-footer">
          <button
            type="button"
            class="ui-button ui-button--secondary sidebar-logout"
            (click)="logout()"
          >
            Cerrar sesion
          </button>
        </footer>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div class="topbar-context">
            <p class="topbar-kicker">Panel principal</p>
            <h1>{{ currentSectionLabel }}</h1>
          </div>

          <div class="topbar-actions">
            <button
              type="button"
              class="ui-button theme-toggle"
              [attr.aria-label]="themeToggleAriaLabel"
              [attr.title]="themeToggleAriaLabel"
              (click)="toggleTheme()"
            >
              <span class="theme-toggle-icon" aria-hidden="true">{{
                isDarkTheme ? "☀" : "☾"
              }}</span>
              <span class="theme-toggle-label">{{
                isDarkTheme ? "Modo claro" : "Modo oscuro"
              }}</span>
            </button>

            <div class="topbar-user">
              <span class="topbar-user-name">{{
                currentUser?.username || "Usuario"
              }}</span>
              <span class="ui-badge topbar-role-badge">{{ primaryRole }}</span>
            </div>
          </div>
        </header>

        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </section>

      <app-confirm-dialog></app-confirm-dialog>
    </div>
  `,
  styles: [
    `
      .layout-shell {
        display: grid;
        grid-template-columns: var(--layout-sidebar-width, 250px) 1fr;
        height: 100vh;
        height: 100dvh;
        min-height: 100vh;
        overflow: hidden;
        background: linear-gradient(
          165deg,
          var(--layout-shell-bg-start) 0%,
          var(--layout-shell-bg-end) 100%
        );
      }

      .layout-shell.is-sidebar-compact {
        grid-template-columns: var(--layout-sidebar-width-compact, 88px) 1fr;
      }

      .sidebar {
        background: linear-gradient(
          180deg,
          var(--layout-sidebar-bg-start) 0%,
          var(--layout-sidebar-bg-end) 65%
        );
        color: var(--color-text-on-dark);
        padding: var(--space-5) var(--space-4);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        gap: var(--space-4);
        height: 100vh;
        height: 100dvh;
        min-height: 100vh;
        max-height: 100dvh;
        align-self: start;
        overflow: hidden;
        border-right: 1px solid var(--layout-sidebar-border);
      }

      .sidebar-header {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        min-height: 0;
      }

      .sidebar-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-2);
        flex-shrink: 0;
      }

      .sidebar-brand {
        display: grid;
        grid-template-columns: 68px 1fr;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
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
        color: var(--layout-sidebar-kicker);
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

      .sidebar-toggle {
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-sm);
        width: 2rem;
        height: 2rem;
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition:
          background-color 120ms ease-in-out,
          border-color 120ms ease-in-out;
      }

      .sidebar-toggle:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.42);
      }

      .sidebar-toggle:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .sidebar-toggle-glyph {
        font-size: 0.95rem;
        font-weight: 800;
        line-height: 1;
      }

      .sidebar-user {
        background: var(--layout-sidebar-surface-bg);
        border-color: var(--layout-sidebar-surface-border);
        box-shadow: none;
        color: var(--color-text-on-dark);
        padding: var(--space-3);
        flex-shrink: 0;
      }

      .sidebar-user-label {
        margin: 0;
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--layout-sidebar-muted);
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
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: var(--space-1);
        scrollbar-width: thin;
        scrollbar-color: var(--layout-scrollbar-thumb-end)
          var(--layout-scrollbar-track);
      }

      .sidebar-menu::-webkit-scrollbar {
        width: 0.62rem;
      }

      .sidebar-menu::-webkit-scrollbar-track {
        background: var(--layout-scrollbar-track);
        border-radius: 999px;
      }

      .sidebar-menu::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          var(--layout-scrollbar-thumb-start) 0%,
          var(--layout-scrollbar-thumb-end) 100%
        );
        border-radius: 999px;
      }

      .sidebar-menu::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          180deg,
          var(--layout-scrollbar-thumb-start-hover) 0%,
          var(--layout-scrollbar-thumb-end-hover) 100%
        );
      }

      .sidebar-group {
        display: grid;
        gap: var(--space-2);
      }

      .sidebar-group-toggle {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.88);
        padding: 0.56rem 0.72rem;
        min-height: 2.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        font-weight: 700;
        text-align: left;
      }

      .sidebar-group-toggle:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.22);
        color: #ffffff;
      }

      .sidebar-group-toggle.is-active-group {
        border-color: rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.18);
        color: #ffffff;
      }

      .sidebar-group-leading {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
      }

      .sidebar-group-chevron {
        opacity: 0.9;
        font-size: 0.9rem;
      }

      .sidebar-group-items {
        display: grid;
        gap: var(--space-2);
        padding-left: var(--space-2);
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

      .sidebar-link--child {
        margin-left: var(--space-1);
      }

      .sidebar-icon {
        width: 1.48rem;
        min-width: 1.48rem;
        height: 1.48rem;
        border-radius: 0.38rem;
        border: 1px solid rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.16);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.63rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1;
      }

      .sidebar-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-left: var(--space-2);
      }

      .sidebar-footer {
        min-height: 0;
      }

      .sidebar-logout {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.24);
        background: rgba(255, 255, 255, 0.14);
        flex-shrink: 0;
      }

      .sidebar-logout:hover {
        background: rgba(255, 255, 255, 0.22);
      }

      .sidebar.is-compact {
        align-items: stretch;
      }

      .sidebar.is-compact .sidebar-top {
        justify-content: center;
      }

      .sidebar.is-compact .sidebar-brand {
        grid-template-columns: 1fr;
        justify-items: center;
      }

      .sidebar.is-compact .sidebar-brand-copy,
      .sidebar.is-compact .sidebar-label,
      .sidebar.is-compact .sidebar-group-chevron {
        display: none;
      }

      .sidebar.is-compact .sidebar-link,
      .sidebar.is-compact .sidebar-group-toggle {
        justify-content: center;
        padding: 0.56rem 0.45rem;
      }

      .sidebar.is-compact .sidebar-group-items {
        padding-left: 0;
      }

      .sidebar.is-compact [data-tooltip] {
        position: relative;
      }

      .sidebar.is-compact [data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute;
        left: calc(100% + 0.55rem);
        top: 50%;
        transform: translateY(-50%) scale(0.98);
        background: rgba(16, 17, 20, 0.96);
        color: #ffffff;
        padding: 0.35rem 0.52rem;
        border-radius: 0.35rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 20px rgba(16, 17, 20, 0.35);
        font-size: 0.74rem;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        z-index: 20;
        transition:
          opacity 100ms ease-in-out,
          transform 100ms ease-in-out;
      }

      .sidebar.is-compact [data-tooltip]:hover::after,
      .sidebar.is-compact [data-tooltip]:focus-visible::after {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }

      .workspace {
        min-width: 0;
        min-height: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        flex-shrink: 0;
        background: var(--layout-topbar-bg);
        border-bottom: 1px solid var(--layout-topbar-border);
        backdrop-filter: blur(6px);
      }

      .topbar-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
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
        background: var(--layout-topbar-user-bg);
        border: 1px solid var(--layout-topbar-user-border);
      }

      .topbar-user-name {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .topbar-role-badge {
        background: var(--layout-topbar-role-bg);
        color: var(--layout-topbar-role-text);
      }

      .theme-toggle {
        min-height: 2.1rem;
        border: 1px solid var(--layout-theme-toggle-border);
        background: var(--layout-theme-toggle-bg);
        color: var(--color-text-primary);
        padding-inline: var(--space-3);
      }

      .theme-toggle:hover {
        filter: none;
        background: var(--layout-theme-toggle-hover-bg);
      }

      .theme-toggle-icon {
        font-size: 0.9rem;
        line-height: 1;
      }

      .theme-toggle-label {
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .content {
        padding: var(--space-5);
        min-width: 0;
        min-height: 0;
        overflow-x: auto;
        overflow-y: auto;
        scrollbar-gutter: stable;
      }

      @supports not (scrollbar-gutter: stable) {
        .content {
          overflow-y: scroll;
        }
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @media (max-width: 1100px) {
        .layout-shell,
        .layout-shell.is-sidebar-compact {
          grid-template-columns: 1fr;
          height: auto;
          min-height: 100vh;
          overflow: visible;
        }

        .sidebar {
          border-right: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .workspace {
          height: auto;
          overflow: visible;
        }

        .content {
          overflow: visible;
        }

        .sidebar-menu {
          max-height: 280px;
          padding-right: 0;
        }

        .sidebar-group-items {
          padding-left: var(--space-1);
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

        .topbar-actions {
          width: 100%;
          justify-content: space-between;
        }

        .topbar-user {
          width: 100%;
          justify-content: space-between;
        }

        .content {
          padding: var(--space-4);
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  primaryRole = "N/A";
  isSidebarCompact = false;
  activeTheme: UiTheme = "light";
  sidebarNodesForView: VisibleSidebarNode[] = [];

  readonly exactMatchOptions = { exact: true };
  readonly inclusiveMatchOptions = { exact: false };

  private readonly compactDisabledBreakpoint = 1100;
  private readonly sidebarModeStorageKey = "erp_pos_sidebar_mode";
  private readonly sidebarGroupsStorageKey = "erp_pos_sidebar_groups";
  private readonly themeStorageKey = "erp_pos_theme";

  private readonly subscriptions = new Subscription();
  private groupExpandedState: Record<string, boolean> = {};

  private readonly sectionLabels: Record<string, string> = {
    dashboard: "Inicio",
    pos: "Punto de venta",
    caja: "Caja",
    ventas: "Ventas",
    catalogo: "Catálogo",
    "ecommerce-admin": "Catálogo online",
    inventario: "Inventario",
    compras: "Compras",
    cotizaciones: "Cotizaciones",
    facturacion: "Facturación",
    reportes: "Reportes",
    integraciones: "Integraciones",
    admin: "Administración",
  };

  private readonly sidebarNodes: SidebarNode[] = [
    {
      kind: "link",
      id: "inicio",
      label: "Inicio",
      route: "/dashboard",
      icon: "IN",
      allowedRoles: ROLES_ALL,
    },
    {
      kind: "group",
      id: "operacion",
      label: "Operación",
      icon: "OP",
      allowedRoles: ROLES_SALES,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "punto-venta",
          label: "Punto de venta",
          route: "/pos",
          icon: "PV",
          allowedRoles: ROLES_SALES,
        },
        {
          kind: "link",
          id: "caja",
          label: "Caja",
          route: "/caja",
          icon: "CJ",
          allowedRoles: ROLES_SALES,
        },
        {
          kind: "link",
          id: "ventas",
          label: "Ventas",
          route: "/ventas",
          icon: "VE",
          allowedRoles: ROLES_SALES,
        },
      ],
    },
    {
      kind: "group",
      id: "catalogo",
      label: "Catálogo",
      icon: "CA",
      allowedRoles: ROLES_CATALOG,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "productos",
          label: "Productos",
          route: "/catalogo/productos",
          icon: "PR",
          allowedRoles: ROLES_CATALOG,
        },
        {
          kind: "link",
          id: "categorias",
          label: "Categorías",
          route: "/catalogo/categorias",
          icon: "CT",
          allowedRoles: ROLES_CATALOG,
        },
        {
          kind: "link",
          id: "unidades",
          label: "Unidades",
          route: "/catalogo/unidades",
          icon: "UN",
          allowedRoles: ROLES_CATALOG,
        },
      ],
    },
    {
      kind: "group",
      id: "catalogo-online",
      label: "Catálogo online",
      icon: "EO",
      allowedRoles: ROLES_ECOMMERCE_ADMIN,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "perfiles-online",
          label: "Perfiles online",
          route: "/ecommerce-admin/perfiles",
          icon: "PO",
          allowedRoles: ROLES_ECOMMERCE_ADMIN,
        },
        {
          kind: "link",
          id: "importar-perfiles-online",
          label: "Importar perfiles",
          route: "/ecommerce-admin/perfiles/importar",
          icon: "IP",
          allowedRoles: ROLES_ADMIN,
        },
        {
          kind: "link",
          id: "importar-imagenes-online",
          label: "Importar imagenes por URL",
          route: "/ecommerce-admin/perfiles/imagenes/importar",
          icon: "II",
          allowedRoles: ROLES_ADMIN,
        },
        {
          kind: "link",
          id: "importar-imagenes-zip-online",
          label: "Importar Excel + ZIP",
          route: "/ecommerce-admin/perfiles/imagenes/importar-zip",
          icon: "IZ",
          allowedRoles: ROLES_ADMIN,
        },
        {
          kind: "link",
          id: "marcas-online",
          label: "Marcas",
          route: "/ecommerce-admin/marcas",
          icon: "MA",
          allowedRoles: ROLES_ECOMMERCE_ADMIN,
        },
        {
          kind: "link",
          id: "categorias-online",
          label: "Categorías",
          route: "/ecommerce-admin/categorias",
          icon: "CO",
          allowedRoles: ROLES_ECOMMERCE_ADMIN,
        },
      ],
    },
    {
      kind: "group",
      id: "inventario",
      label: "Inventario",
      icon: "IV",
      allowedRoles: [...ROLES_CATALOG, ...ROLES_INVENTORY_MANAGEMENT],
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "almacenes",
          label: "Almacenes",
          route: "/inventario/almacenes",
          icon: "AL",
          allowedRoles: ROLES_CATALOG,
        },
        {
          kind: "link",
          id: "stock",
          label: "Stock",
          route: "/inventario/stock",
          icon: "ST",
          allowedRoles: ROLES_INVENTORY_STOCK,
        },
        {
          kind: "link",
          id: "carga-inicial",
          label: "Carga inicial",
          route: "/inventario/stock-inicial",
          icon: "CI",
          allowedRoles: ROLES_INVENTORY_MANAGEMENT,
        },
        {
          kind: "link",
          id: "ajustes-stock",
          label: "Ajustes de stock",
          route: "/inventario/ajustes",
          icon: "AJ",
          allowedRoles: ROLES_INVENTORY_MANAGEMENT,
        },
        {
          kind: "link",
          id: "transferencias",
          label: "Transferencias",
          route: "/inventario/transferencias",
          icon: "TR",
          allowedRoles: ROLES_INVENTORY_MANAGEMENT,
        },
        {
          kind: "link",
          id: "kardex-movimientos",
          label: "Kardex / Movimientos",
          route: "/inventario/kardex",
          icon: "KM",
          allowedRoles: ROLES_INVENTORY_KARDEX,
        },
      ],
    },
    {
      kind: "group",
      id: "compras",
      label: "Compras",
      icon: "CO",
      allowedRoles: ROLES_PURCHASES,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "proveedores",
          label: "Proveedores",
          route: "/compras/proveedores",
          icon: "PV",
          allowedRoles: ROLES_PURCHASES,
        },
        {
          kind: "link",
          id: "ordenes-compra",
          label: "Órdenes de compra",
          route: "/compras/ordenes",
          icon: "OC",
          allowedRoles: ROLES_PURCHASES,
        },
      ],
    },
    {
      kind: "group",
      id: "consulta",
      label: "Consulta",
      icon: "CS",
      allowedRoles: ROLES_CONSULTA_CAJERO,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "consulta-stock",
          label: "Stock",
          route: "/inventario/stock",
          icon: "ST",
          allowedRoles: ROLES_CONSULTA_CAJERO,
        },
      ],
    },
    {
      kind: "link",
      id: "cotizaciones",
      label: "Cotizaciones",
      route: "/cotizaciones",
      icon: "CZ",
      allowedRoles: ROLES_SALES,
    },
    {
      kind: "group",
      id: "facturacion",
      label: "Facturación",
      icon: "FA",
      allowedRoles: ROLES_SALES,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "comprobantes",
          label: "Comprobantes",
          route: "/facturacion/comprobantes",
          icon: "CP",
          allowedRoles: ROLES_SALES,
        },
        {
          kind: "link",
          id: "configuracion-tributaria",
          label: "Configuración tributaria",
          route: "/facturacion/configuracion",
          icon: "FT",
          allowedRoles: ROLES_ADMIN,
        },
        {
          kind: "link",
          id: "series-correlativos",
          label: "Series y correlativos",
          route: "/facturacion/series",
          icon: "SC",
          allowedRoles: ROLES_ADMIN,
        },
      ],
    },
    {
      kind: "link",
      id: "reportes",
      label: "Reportes",
      route: "/reportes",
      icon: "RP",
      allowedRoles: ROLES_REPORTS,
    },
    {
      kind: "group",
      id: "integraciones",
      label: "Integraciones",
      icon: "IG",
      allowedRoles: ROLES_ADMIN,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "eventos-integracion",
          label: "Eventos de integración",
          route: "/integraciones/eventos",
          icon: "EI",
          allowedRoles: ROLES_ADMIN,
        },
      ],
    },
    {
      kind: "group",
      id: "administracion",
      label: "Administración",
      icon: "AD",
      allowedRoles: ROLES_ADMIN,
      collapsible: true,
      items: [
        {
          kind: "link",
          id: "limpieza-pruebas",
          label: "Limpieza de pruebas",
          route: "/admin/test-data-cleanup/products",
          icon: "LP",
          allowedRoles: ROLES_ADMIN,
        },
      ],
    },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly posStateService: PosStateService,
  ) {}

  ngOnInit(): void {
    this.restoreThemePreference();
    this.restoreSidebarPreferences();

    const navigationSub = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => this.ensureActiveGroupExpanded());
    this.subscriptions.add(navigationSub);

    const userSub = this.authService.me().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.primaryRole = user.roles?.[0] || "N/A";
        this.refreshSidebarNodesForView();
      },
      error: () => this.logout(),
    });
    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    if (!this.isCompactModeAvailable() && this.isSidebarCompact) {
      this.isSidebarCompact = false;
      this.persistSidebarModePreference();
    }
  }

  get canToggleCompactMode(): boolean {
    return this.isCompactModeAvailable();
  }

  get sidebarToggleAriaLabel(): string {
    return this.isSidebarCompact
      ? "Expandir menú lateral"
      : "Compactar menú lateral";
  }

  get isDarkTheme(): boolean {
    return this.activeTheme === "dark";
  }

  get themeToggleAriaLabel(): string {
    return this.isDarkTheme ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  }

  get currentSectionLabel(): string {
    const activeSection =
      this.router.url.split("?")[0].split("/").filter(Boolean)[0] ||
      "dashboard";
    return this.sectionLabels[activeSection] || "ERP POS";
  }

  toggleSidebarCompact(): void {
    if (!this.canToggleCompactMode) {
      return;
    }

    this.isSidebarCompact = !this.isSidebarCompact;
    this.persistSidebarModePreference();
  }

  toggleTheme(): void {
    const nextTheme: UiTheme = this.isDarkTheme ? "light" : "dark";
    this.applyTheme(nextTheme);
    this.persistThemePreference();
  }

  toggleGroup(groupId: string): void {
    const group = this.findGroupById(groupId);
    if (!group || !group.collapsible) {
      return;
    }

    this.groupExpandedState = {
      ...this.groupExpandedState,
      [groupId]: !this.isGroupExpanded(groupId),
    };
    this.persistGroupExpandedState();
  }

  isGroupExpanded(groupId: string): boolean {
    return this.groupExpandedState[groupId] !== false;
  }

  isGroupActive(group: SidebarGroupNode): boolean {
    return group.items.some((item) => this.isRouteActive(item.route));
  }

  getGroupItemsContainerId(groupId: string): string {
    return `sidebar-group-${groupId}`;
  }

  trackByNodeId(_: number, node: VisibleSidebarNode): string {
    return node.id;
  }

  trackByItemId(_: number, item: SidebarLinkNode): string {
    return item.id;
  }

  logout(): void {
    this.posStateService.clearAll();
    this.authService.logout();
    this.router.navigate(["/login"]);
  }

  private refreshSidebarNodesForView(): void {
    if (!this.currentUser) {
      this.sidebarNodesForView = [];
      return;
    }

    const visibleNodes: VisibleSidebarNode[] = [];

    for (const node of this.sidebarNodes) {
      if (!this.hasAnyRole(node.allowedRoles)) {
        continue;
      }

      if (node.kind === "link") {
        visibleNodes.push(node);
        continue;
      }

      const visibleItems = node.items.filter((item) =>
        this.hasAnyRole(item.allowedRoles),
      );
      if (visibleItems.length === 0) {
        continue;
      }

      visibleNodes.push({
        ...node,
        items: visibleItems,
      });
    }

    this.sidebarNodesForView = visibleNodes;
    this.syncGroupExpandedState();
    this.ensureActiveGroupExpanded();
  }

  private hasAnyRole(allowedRoles: AppRole[]): boolean {
    if (!this.currentUser) {
      return false;
    }

    return this.currentUser.roles.some((role) =>
      allowedRoles.includes(role as AppRole),
    );
  }

  private isRouteActive(route: string): boolean {
    const currentPath = this.router.url.split("?")[0];
    return currentPath === route || currentPath.startsWith(`${route}/`);
  }

  private findGroupById(groupId: string): SidebarGroupNode | undefined {
    return this.sidebarNodesForView.find(
      (node): node is SidebarGroupNode =>
        node.kind === "group" && node.id === groupId,
    );
  }

  private syncGroupExpandedState(): void {
    const nextState: Record<string, boolean> = {};

    for (const node of this.sidebarNodesForView) {
      if (node.kind !== "group") {
        continue;
      }

      const persistedValue = this.groupExpandedState[node.id];
      nextState[node.id] =
        typeof persistedValue === "boolean" ? persistedValue : true;
    }

    this.groupExpandedState = nextState;
    this.persistGroupExpandedState();
  }

  private ensureActiveGroupExpanded(): void {
    let changed = false;
    const nextState = { ...this.groupExpandedState };

    for (const node of this.sidebarNodesForView) {
      if (node.kind !== "group" || !node.collapsible) {
        continue;
      }

      if (this.isGroupActive(node) && nextState[node.id] === false) {
        nextState[node.id] = true;
        changed = true;
      }
    }

    if (changed) {
      this.groupExpandedState = nextState;
      this.persistGroupExpandedState();
    }
  }

  private restoreSidebarPreferences(): void {
    this.restoreSidebarModePreference();
    this.restoreGroupExpandedStatePreference();
  }

  private restoreThemePreference(): void {
    try {
      const rawTheme = localStorage.getItem(this.themeStorageKey);
      const normalizedTheme: UiTheme =
        rawTheme === "dark" || rawTheme === "light" ? rawTheme : "light";
      this.applyTheme(normalizedTheme);
    } catch {
      this.applyTheme("light");
    }
  }

  private restoreSidebarModePreference(): void {
    try {
      const rawMode = localStorage.getItem(this.sidebarModeStorageKey);
      this.isSidebarCompact =
        rawMode === "compact" && this.isCompactModeAvailable();
    } catch {
      this.isSidebarCompact = false;
    }
  }

  private restoreGroupExpandedStatePreference(): void {
    try {
      const rawValue = localStorage.getItem(this.sidebarGroupsStorageKey);
      if (!rawValue) {
        this.groupExpandedState = {};
        return;
      }

      const parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        this.groupExpandedState = {};
        return;
      }

      const sanitized: Record<string, boolean> = {};
      for (const [groupId, isExpanded] of Object.entries(parsed)) {
        if (typeof isExpanded === "boolean") {
          sanitized[groupId] = isExpanded;
        }
      }

      this.groupExpandedState = sanitized;
    } catch {
      this.groupExpandedState = {};
    }
  }

  private persistSidebarModePreference(): void {
    try {
      localStorage.setItem(
        this.sidebarModeStorageKey,
        this.isSidebarCompact ? "compact" : "expanded",
      );
    } catch {
      // Persisting visual preferences is optional; ignore storage failures safely.
    }
  }

  private persistThemePreference(): void {
    try {
      localStorage.setItem(this.themeStorageKey, this.activeTheme);
    } catch {
      // Persisting visual preferences is optional; ignore storage failures safely.
    }
  }

  private persistGroupExpandedState(): void {
    try {
      localStorage.setItem(
        this.sidebarGroupsStorageKey,
        JSON.stringify(this.groupExpandedState),
      );
    } catch {
      // Persisting visual preferences is optional; ignore storage failures safely.
    }
  }

  private isCompactModeAvailable(): boolean {
    if (typeof window === "undefined") {
      return true;
    }

    return window.innerWidth > this.compactDisabledBreakpoint;
  }

  private applyTheme(theme: UiTheme): void {
    this.activeTheme = theme;
    if (typeof document === "undefined") {
      return;
    }

    document.body.setAttribute("data-theme", theme);
  }
}
