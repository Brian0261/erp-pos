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
type SidebarIconKey =
  | "home"
  | "pos"
  | "catalog"
  | "online-store"
  | "inventory"
  | "purchases"
  | "search"
  | "quote"
  | "invoice"
  | "reports"
  | "integrations"
  | "admin";

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
type RailFlyoutOpenSource = "hover" | "focus" | "click";

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
        <ng-template #sidebarIconTemplate let-icon>
          <ng-container *ngIf="isProfessionalIcon(icon); else sidebarIconText">
            <svg
              *ngIf="icon === 'home'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M3.75 10.5L12 4l8.25 6.5"></path>
              <path d="M5.25 9.75V20h13.5V9.75"></path>
              <path d="M10 20v-5.25h4V20"></path>
            </svg>
            <svg
              *ngIf="icon === 'pos'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4.5 6.75h15v10.5h-15z"></path>
              <path d="M7.5 17.25v2.25"></path>
              <path d="M16.5 17.25v2.25"></path>
              <path d="M7.5 9.75h4.5"></path>
              <path d="M7.5 12.75h2.25"></path>
              <circle cx="15.75" cy="11.25" r="1.5"></circle>
            </svg>
            <svg
              *ngIf="icon === 'catalog'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4.5 6.75h15v10.5h-15z"></path>
              <path d="M12 6.75v10.5"></path>
              <path d="M8.25 10.5h.01"></path>
              <path d="M8.25 13.5h.01"></path>
              <path d="M15.75 10.5h.01"></path>
              <path d="M15.75 13.5h.01"></path>
            </svg>
            <svg
              *ngIf="icon === 'online-store'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4.5 9.75h15"></path>
              <path d="M6 9.75l1.5-4.5h9L18 9.75"></path>
              <path d="M5.25 9.75V18.75H18.75V9.75"></path>
              <path d="M9 18.75v-4.5h6v4.5"></path>
              <circle cx="18.75" cy="5.25" r="2.25"></circle>
              <path d="M18.75 3v4.5"></path>
              <path d="M16.5 5.25H21"></path>
            </svg>
            <svg
              *ngIf="icon === 'inventory'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4.5 8.25L12 4.5l7.5 3.75L12 12 4.5 8.25z"></path>
              <path d="M4.5 8.25V15.75L12 19.5l7.5-3.75V8.25"></path>
              <path d="M12 12v7.5"></path>
            </svg>
            <svg
              *ngIf="icon === 'purchases'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6.75h12l-1.2 6H7.2L6 6.75z"></path>
              <path d="M7.5 6.75L9 4.5h6l1.5 2.25"></path>
              <circle cx="9" cy="17.25" r="1.5"></circle>
              <circle cx="15" cy="17.25" r="1.5"></circle>
            </svg>
            <svg
              *ngIf="icon === 'search'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="10.5" cy="10.5" r="5.25"></circle>
              <path d="M14.25 14.25L19.5 19.5"></path>
            </svg>
            <svg
              *ngIf="icon === 'quote'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 5.25h12l3 3v10.5H6z"></path>
              <path d="M18 5.25v3h3"></path>
              <path d="M9 11.25h6"></path>
              <path d="M9 14.25h4.5"></path>
            </svg>
            <svg
              *ngIf="icon === 'invoice'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M7.5 4.5h9v15l-2.25-1.5L12 19.5l-2.25-1.5L7.5 19.5z"></path>
              <path d="M9.75 9h4.5"></path>
              <path d="M9.75 12h4.5"></path>
              <path d="M9.75 15h3"></path>
            </svg>
            <svg
              *ngIf="icon === 'reports'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M5.25 19.5V10.5"></path>
              <path d="M10.5 19.5V6.75"></path>
              <path d="M15.75 19.5v-5.25"></path>
              <path d="M3.75 19.5h16.5"></path>
            </svg>
            <svg
              *ngIf="icon === 'integrations'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8.25 9.75h7.5"></path>
              <path d="M8.25 14.25h7.5"></path>
              <path d="M15.75 9.75l2.25-2.25"></path>
              <path d="M15.75 14.25l2.25 2.25"></path>
              <path d="M8.25 9.75L6 7.5"></path>
              <path d="M8.25 14.25L6 16.5"></path>
              <circle cx="4.5" cy="6" r="1.5"></circle>
              <circle cx="4.5" cy="18" r="1.5"></circle>
              <circle cx="19.5" cy="6" r="1.5"></circle>
              <circle cx="19.5" cy="18" r="1.5"></circle>
            </svg>
            <svg
              *ngIf="icon === 'admin'"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 3.75l6 2.25v5.25c0 4.05-2.58 7.83-6 9-3.42-1.17-6-4.95-6-9V6z"></path>
              <path d="M12 9v5.25"></path>
              <path d="M9.75 11.25H14.25"></path>
            </svg>
          </ng-container>
          <ng-template #sidebarIconText>{{ icon }}</ng-template>
        </ng-template>

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
        </div>

        <nav class="sidebar-menu" aria-label="Menu principal">
          <ng-container *ngIf="!isSidebarCompact; else compactRailTemplate">
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
                [attr.data-tooltip]="null"
              >
                <span class="sidebar-icon" aria-hidden="true">
                  <ng-container
                    [ngTemplateOutlet]="sidebarIconTemplate"
                    [ngTemplateOutletContext]="{ $implicit: node.icon }"
                  ></ng-container>
                </span>
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
                  [attr.data-tooltip]="null"
                  (click)="toggleGroup(node.id)"
                >
                  <span class="sidebar-group-leading">
                    <span class="sidebar-icon" aria-hidden="true">
                      <ng-container
                        [ngTemplateOutlet]="sidebarIconTemplate"
                        [ngTemplateOutletContext]="{ $implicit: node.icon }"
                      ></ng-container>
                    </span>
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
                    class="sidebar-link sidebar-link--child sidebar-link--child-text-only"
                    *ngFor="let item of node.items; trackBy: trackByItemId"
                    [routerLink]="item.route"
                    routerLinkActive="is-active"
                    [routerLinkActiveOptions]="
                      item.route === '/dashboard'
                        ? exactMatchOptions
                        : inclusiveMatchOptions
                    "
                    [attr.data-tooltip]="null"
                  >
                    <span class="sidebar-label">{{ item.label }}</span>
                  </a>
                </div>
              </section>
            </ng-container>
          </ng-container>

          <ng-template #compactRailTemplate>
            <ng-container
              *ngFor="let node of sidebarNodesForView; trackBy: trackByNodeId"
            >
              <a
                *ngIf="node.kind === 'link'"
                class="sidebar-link sidebar-link--standalone sidebar-rail-launcher"
                [class.is-active]="isRailNodeActive(node)"
                [routerLink]="node.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="
                  node.route === '/dashboard'
                    ? exactMatchOptions
                    : inclusiveMatchOptions
                "
                [attr.aria-label]="node.label"
                [attr.title]="node.label"
                [attr.data-tooltip]="getRailTooltip(node)"
                (click)="closeRailFlyout()"
              >
                <span class="sidebar-icon" aria-hidden="true">
                  <ng-container
                    [ngTemplateOutlet]="sidebarIconTemplate"
                    [ngTemplateOutletContext]="{ $implicit: node.icon }"
                  ></ng-container>
                </span>
                <span class="sidebar-label">{{ node.label }}</span>
              </a>

              <section
                *ngIf="node.kind === 'group'"
                class="sidebar-group sidebar-rail-item"
                [class.is-active-group]="isGroupActive(node)"
                [class.is-open]="isRailFlyoutOpen(node.id)"
                (mouseenter)="openRailFlyout(node.id, 'hover')"
                (mouseleave)="closeRailFlyoutFromPointer(node.id)"
                (focusin)="openRailFlyout(node.id, 'focus')"
                (focusout)="onRailItemFocusOut($event, node.id)"
              >
                <button
                  type="button"
                  class="sidebar-group-toggle sidebar-rail-launcher"
                  [class.is-active-group]="isGroupActive(node)"
                  [attr.aria-label]="node.label"
                  [attr.aria-expanded]="isRailFlyoutOpen(node.id)"
                  [attr.aria-controls]="getRailFlyoutId(node.id)"
                  aria-haspopup="menu"
                  [attr.title]="node.label"
                  [attr.data-tooltip]="getRailTooltip(node)"
                   (click)="toggleRailFlyout(node.id, $event)"
                 >
                   <span class="sidebar-group-leading">
                     <span class="sidebar-icon" aria-hidden="true">
                       <ng-container
                         [ngTemplateOutlet]="sidebarIconTemplate"
                         [ngTemplateOutletContext]="{ $implicit: node.icon }"
                       ></ng-container>
                     </span>
                     <span class="sidebar-label">{{ node.label }}</span>
                   </span>
                 </button>

                <section
                  *ngIf="isRailFlyoutOpen(node.id)"
                  class="sidebar-rail-flyout"
                  [id]="getRailFlyoutId(node.id)"
                  role="menu"
                  [attr.aria-label]="node.label"
                >
                  <header class="sidebar-rail-flyout-header">
                    <span class="sidebar-rail-flyout-title">{{ node.label }}</span>
                  </header>

                  <div class="sidebar-rail-flyout-items">
                    <a
                      class="sidebar-link sidebar-link--child sidebar-link--child-text-only sidebar-rail-flyout-link"
                      *ngFor="let item of node.items; trackBy: trackByItemId"
                      [routerLink]="item.route"
                      routerLinkActive="is-active"
                      [routerLinkActiveOptions]="
                        item.route === '/dashboard'
                          ? exactMatchOptions
                          : inclusiveMatchOptions
                      "
                      [attr.data-tooltip]="null"
                      (click)="onRailItemNavigate()"
                    >
                      <span class="sidebar-label">{{ item.label }}</span>
                    </a>
                  </div>
                </section>
              </section>
            </ng-container>
          </ng-template>
        </nav>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div class="topbar-context">
            <h1>{{ currentSectionLabel }}</h1>
          </div>

          <div class="topbar-actions">
            <button
              type="button"
              class="topbar-user-menu"
              [attr.aria-label]="userMenuAriaLabel"
              [attr.aria-expanded]="isUserMenuOpen"
              aria-haspopup="menu"
              (click)="toggleUserMenu()"
            >
              <span class="topbar-user-avatar" aria-hidden="true">{{ userInitial }}</span>
              <span class="topbar-user-name">{{ currentUser?.username || "Usuario" }}</span>
              <span class="topbar-user-chevron" aria-hidden="true">▾</span>
            </button>

            <section
              class="topbar-user-panel"
              *ngIf="isUserMenuOpen"
              role="menu"
              aria-label="Menu de usuario"
              (click)="$event.stopPropagation()"
            >
              <div class="topbar-user-panel__identity">
                <span class="topbar-user-panel__avatar" aria-hidden="true">{{ userInitial }}</span>
                <div class="topbar-user-panel__copy">
                  <strong>{{ currentUser?.username || "Usuario" }}</strong>
                  <span *ngIf="currentUser?.email">{{ currentUser?.email }}</span>
                  <small>Rol: {{ primaryRole }}</small>
                </div>
              </div>

              <div class="topbar-user-panel__actions">
                <button
                  type="button"
                  class="topbar-user-panel__action"
                  role="menuitem"
                  [attr.aria-label]="themeToggleAriaLabel"
                  [attr.title]="themeToggleAriaLabel"
                  (click)="changeThemeFromMenu()"
                >
                  <span class="topbar-user-panel__action-icon" aria-hidden="true">{{
                    isDarkTheme ? "☀" : "☾"
                  }}</span>
                  <span>{{ isDarkTheme ? "Cambiar a modo claro" : "Cambiar a modo oscuro" }}</span>
                </button>

                <button
                  type="button"
                  class="topbar-user-panel__action topbar-user-panel__action--danger"
                  role="menuitem"
                  [attr.aria-label]="logoutAriaLabel"
                  [attr.title]="logoutAriaLabel"
                  (click)="logoutFromMenu()"
                >
                  <span class="topbar-user-panel__action-icon" aria-hidden="true">⎋</span>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </section>
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
        grid-template-columns: var(--layout-sidebar-width-compact, 76px) 1fr;
        overflow: visible;
      }

      .sidebar {
        background: linear-gradient(
          180deg,
          var(--layout-sidebar-bg-start) 0%,
          var(--layout-sidebar-bg-end) 65%
        );
        color: var(--color-text-on-dark);
        padding: var(--space-4) var(--space-3);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: var(--space-3);
        height: 100vh;
        height: 100dvh;
        min-height: 100vh;
        max-height: 100dvh;
        align-self: start;
        overflow: hidden;
        border-right: 1px solid var(--layout-sidebar-border);
        position: relative;
        z-index: 5;
      }

      .sidebar-header {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-height: 0;
      }

      .sidebar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        flex-shrink: 0;
      }

      .sidebar-brand {
        display: grid;
        grid-template-columns: 56px 1fr;
        align-items: center;
        gap: 0.7rem;
        min-width: 0;
      }

      .sidebar-brand-logo {
        width: 100%;
        max-width: 56px;
        background: #ffffff;
        border-radius: var(--radius-md);
        padding: 0.35rem;
        box-shadow: 0 5px 14px rgba(16, 17, 20, 0.18);
      }

      .sidebar-brand-copy {
        min-width: 0;
      }

      .sidebar-brand-kicker {
        color: rgba(255, 255, 255, 0.96);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin: 0;
        line-height: 1.25;
      }

      .sidebar-toggle {
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-sm);
        width: 1.9rem;
        height: 1.9rem;
        background: rgba(255, 255, 255, 0.08);
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

      .sidebar-menu {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 0.35rem;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
      }

      .sidebar-menu::-webkit-scrollbar {
        width: 0.44rem;
      }

      .sidebar-menu::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 999px;
      }

      .sidebar-menu::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.22);
        border-radius: 999px;
      }

      .sidebar-menu::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.32);
      }

      .sidebar-group {
        display: grid;
        gap: 0.25rem;
      }

      .sidebar-group-toggle {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.9rem;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.94);
        padding: 0.58rem 0.72rem;
        min-height: 2.35rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        font-weight: 700;
        letter-spacing: 0.01em;
        text-align: left;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      }

      .sidebar-group-toggle:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.96);
      }

      .sidebar-group-toggle.is-active-group {
        border-color: rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.98);
        box-shadow: 0 4px 10px rgba(8, 10, 44, 0.12);
      }

      .sidebar-group-toggle.is-active-group:hover,
      .sidebar-group-toggle.is-active-group:focus-visible {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar-group-leading {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
      }

      .sidebar-group-chevron {
        opacity: 0.72;
        font-size: 0.85rem;
      }

      .sidebar-group-items {
        display: grid;
        gap: 0.35rem;
        padding: 0.15rem 0 0.1rem 1.15rem;
      }

      .sidebar-link {
        display: flex;
        align-items: center;
        min-height: 2.2rem;
        padding: 0.52rem 0.7rem;
        border-radius: 0.8rem;
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
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.96);
        transform: translateX(1px);
      }

      .sidebar-link.is-active {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
        box-shadow: 0 4px 10px rgba(8, 10, 44, 0.12);
      }

      .sidebar-link.is-active:hover,
      .sidebar-link.is-active:focus-visible {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar-link--standalone {
        border-color: rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        min-height: 2.35rem;
        font-weight: 700;
      }

      .sidebar-link--standalone:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .sidebar-link--standalone.is-active {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar-link--child {
        margin-left: 0.2rem;
        padding-left: 0.92rem;
        min-height: 2rem;
        border-color: transparent;
        background: transparent;
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.82rem;
        font-weight: 500;
      }

      .sidebar-link--child-text-only {
        justify-content: flex-start;
        padding-right: 0.7rem;
        padding-left: 0.78rem;
      }

      .sidebar-link--child-text-only .sidebar-label {
        margin-left: 0;
      }

      .sidebar-link--child:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: transparent;
        color: rgba(255, 255, 255, 0.96);
      }

      .sidebar-link--child.is-active {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
        box-shadow: none;
      }

      .sidebar-link--child.is-active:hover,
      .sidebar-link--child.is-active:focus-visible {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar-link:focus-visible,
      .sidebar-group-toggle:focus-visible,
      .sidebar-rail-flyout-link:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.36);
        outline-offset: 2px;
      }

      .sidebar-link.is-active .sidebar-icon,
      .sidebar-link.is-active:hover .sidebar-icon,
      .sidebar-link.is-active:focus-visible .sidebar-icon,
      .sidebar-group-toggle.is-active-group .sidebar-icon,
      .sidebar-group-toggle.is-active-group:hover .sidebar-icon,
      .sidebar-group-toggle.is-active-group:focus-visible .sidebar-icon,
      .sidebar-rail-flyout-link.is-active .sidebar-icon,
      .sidebar-rail-flyout-link.is-active:hover .sidebar-icon,
      .sidebar-rail-flyout-link.is-active:focus-visible .sidebar-icon {
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar-icon {
        width: 1.4rem;
        min-width: 1.4rem;
        height: 1.4rem;
        border-radius: 0.38rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.63rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1;
      }

      .sidebar-icon svg {
        width: 0.95rem;
        height: 0.95rem;
        display: block;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }

      .sidebar-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-left: var(--space-2);
      }

      .sidebar.is-compact {
        align-items: stretch;
        overflow: visible;
      }

      .sidebar.is-compact .sidebar-top {
        justify-content: center;
      }

      .sidebar.is-compact .sidebar-menu {
        overflow: visible;
        padding-right: 0;
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
        padding: 0.44rem 0.3rem;
        border-radius: 0.85rem;
      }

      .sidebar.is-compact .sidebar-group-items {
        padding-left: 0;
      }

      .sidebar.is-compact .sidebar-toggle,
      .sidebar.is-compact .sidebar-link,
      .sidebar.is-compact .sidebar-group-toggle {
        width: 100%;
      }

      .sidebar.is-compact .sidebar-group,
      .sidebar.is-compact .sidebar-menu {
        gap: 0.4rem;
      }

      .sidebar-rail-item {
        position: relative;
        overflow: visible;
      }

      .sidebar.is-compact .sidebar-rail-launcher {
        position: relative;
        z-index: 1;
      }

      .sidebar.is-compact .sidebar-rail-item.is-open .sidebar-rail-launcher {
        background: rgba(255, 255, 255, 0.11);
        border-color: rgba(255, 255, 255, 0.18);
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar.is-compact .sidebar-rail-item.is-open .sidebar-rail-launcher:hover,
      .sidebar.is-compact .sidebar-rail-item.is-open .sidebar-rail-launcher:focus-visible,
      .sidebar.is-compact .sidebar-rail-launcher.is-active,
      .sidebar.is-compact .sidebar-rail-launcher.is-active:hover,
      .sidebar.is-compact .sidebar-rail-launcher.is-active:focus-visible,
      .sidebar.is-compact .sidebar-rail-launcher.is-active-group,
      .sidebar.is-compact .sidebar-rail-launcher.is-active-group:hover,
      .sidebar.is-compact .sidebar-rail-launcher.is-active-group:focus-visible {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar.is-compact .sidebar-rail-launcher.is-active .sidebar-icon,
      .sidebar.is-compact .sidebar-rail-launcher.is-active:hover .sidebar-icon,
      .sidebar.is-compact .sidebar-rail-launcher.is-active:focus-visible .sidebar-icon,
      .sidebar.is-compact .sidebar-rail-launcher.is-active-group .sidebar-icon,
      .sidebar.is-compact .sidebar-rail-launcher.is-active-group:hover .sidebar-icon,
      .sidebar.is-compact .sidebar-rail-launcher.is-active-group:focus-visible .sidebar-icon,
      .sidebar.is-compact .sidebar-rail-item.is-open .sidebar-rail-launcher .sidebar-icon {
        color: rgba(255, 255, 255, 0.98);
      }

      .sidebar-rail-flyout {
        position: absolute;
        left: calc(100% + 0.7rem);
        top: 0;
        width: min(18rem, calc(100vw - 8rem));
        display: grid;
        gap: 0.55rem;
        padding: 0.7rem;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(16, 17, 20, 0.98);
        box-shadow: 0 18px 34px rgba(8, 10, 44, 0.28);
        z-index: 35;
      }

      .sidebar-rail-flyout::before {
        content: "";
        position: absolute;
        top: 0;
        right: 100%;
        width: 0.7rem;
        height: 100%;
        pointer-events: auto;
      }

      .sidebar-rail-flyout-header {
        display: flex;
        align-items: center;
        min-height: 1.5rem;
        padding: 0 0.15rem;
      }

      .sidebar-rail-flyout-title {
        color: rgba(255, 255, 255, 0.98);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.03em;
      }

      .sidebar-rail-flyout-items {
        display: grid;
        gap: 0.3rem;
      }

      .sidebar.is-compact .sidebar-rail-flyout-link {
        margin-left: 0;
        padding-left: 0.78rem;
        padding-right: 0.7rem;
        justify-content: flex-start;
        min-height: 2.2rem;
      }

      .sidebar.is-compact .sidebar-rail-flyout-link .sidebar-label {
        display: inline;
      }

      .sidebar.is-compact .sidebar-link,
      .sidebar.is-compact .sidebar-group-toggle {
        border-color: rgba(255, 255, 255, 0.05);
        background: rgba(255, 255, 255, 0.03);
      }

      .sidebar.is-compact .sidebar-link:hover,
      .sidebar.is-compact .sidebar-group-toggle:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .sidebar.is-compact .sidebar-icon {
        width: 1.62rem;
        min-width: 1.62rem;
        height: 1.62rem;
        border-radius: 0.55rem;
      }

      .sidebar.is-compact .sidebar-icon svg {
        width: 1rem;
        height: 1rem;
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

      .sidebar.is-compact .sidebar-rail-item.is-open [data-tooltip]::after {
        opacity: 0;
      }

      .workspace {
        min-width: 0;
        min-height: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        flex-shrink: 0;
        background: var(--layout-topbar-bg);
        border-bottom: 1px solid var(--layout-topbar-border);
        backdrop-filter: blur(6px);
      }

      .topbar-context {
        min-width: 0;
      }

      .topbar-actions {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .topbar h1 {
        margin: 0;
        font-size: clamp(1.05rem, 1.8vw, 1.28rem);
        font-family: var(--font-family-display);
        line-height: 1.15;
      }

      .topbar-user-menu {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        min-height: 2.35rem;
        padding: 0.35rem 0.55rem 0.35rem 0.45rem;
        border-radius: var(--radius-pill);
        background: var(--layout-topbar-user-bg);
        border: 1px solid var(--layout-topbar-user-border);
        color: var(--color-text-primary);
        cursor: pointer;
      }

      .topbar-user-menu:hover {
        background: color-mix(in srgb, var(--layout-topbar-user-bg) 82%, var(--color-bg-soft));
      }

      .topbar-user-avatar,
      .topbar-user-panel__avatar {
        width: 1.8rem;
        min-width: 1.8rem;
        height: 1.8rem;
        border-radius: 999px;
        background: var(--layout-topbar-role-bg);
        color: var(--layout-topbar-role-text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.74rem;
        font-weight: 800;
      }

      .topbar-user-name {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .topbar-user-chevron {
        color: var(--color-text-secondary);
        font-size: 0.75rem;
      }

      .topbar-user-panel {
        position: absolute;
        top: calc(100% + 0.55rem);
        right: 0;
        width: min(20rem, calc(100vw - 2rem));
        display: grid;
        gap: var(--space-3);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        border: 1px solid var(--layout-topbar-user-border);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-md);
        z-index: 40;
      }

      .topbar-user-panel__identity {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        min-width: 0;
      }

      .topbar-user-panel__copy {
        display: grid;
        gap: 0.18rem;
        min-width: 0;
      }

      .topbar-user-panel__copy strong {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-user-panel__copy span,
      .topbar-user-panel__copy small {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-user-panel__actions {
        display: grid;
        gap: var(--space-2);
      }

      .topbar-user-panel__action {
        width: 100%;
        min-height: 2.5rem;
        border: 1px solid var(--layout-theme-toggle-border);
        border-radius: var(--radius-md);
        background: var(--layout-theme-toggle-bg);
        color: var(--color-text-primary);
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: var(--space-2);
        padding: 0.58rem 0.72rem;
        font-size: var(--font-size-sm);
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }

      .topbar-user-panel__action:hover {
        background: var(--layout-theme-toggle-hover-bg);
      }

      .topbar-user-panel__action-icon {
        width: 1.25rem;
        min-width: 1.25rem;
        text-align: center;
        font-size: 0.9rem;
        line-height: 1;
      }

      .topbar-user-panel__action--danger {
        color: var(--color-danger);
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
          justify-content: flex-end;
        }

        .topbar-user-menu {
          margin-left: auto;
        }

        .topbar-user-panel {
          width: 100%;
          max-width: 22rem;
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
  isUserMenuOpen = false;
  activeTheme: UiTheme = "light";
  sidebarNodesForView: VisibleSidebarNode[] = [];
  activeRailNodeId: string | null = null;

  readonly exactMatchOptions = { exact: true };
  readonly inclusiveMatchOptions = { exact: false };

  private readonly compactDisabledBreakpoint = 1100;
  private readonly sidebarModeStorageKey = "erp_pos_sidebar_mode";
  private readonly sidebarGroupsStorageKey = "erp_pos_sidebar_groups";
  private readonly themeStorageKey = "erp_pos_theme";
  private readonly professionalIconKeys = new Set<SidebarIconKey>([
    "home",
    "pos",
    "catalog",
    "online-store",
    "inventory",
    "purchases",
    "search",
    "quote",
    "invoice",
    "reports",
    "integrations",
    "admin",
  ]);

  private readonly subscriptions = new Subscription();
  private groupExpandedState: Record<string, boolean> = {};
  private pinnedRailNodeId: string | null = null;
  private railCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
      icon: "home",
      allowedRoles: ROLES_ALL,
    },
    {
      kind: "group",
      id: "operacion",
      label: "Operación",
      icon: "pos",
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
      icon: "catalog",
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
      icon: "online-store",
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
      icon: "inventory",
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
      icon: "purchases",
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
      icon: "search",
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
      icon: "quote",
      allowedRoles: ROLES_SALES,
    },
    {
      kind: "group",
      id: "facturacion",
      label: "Facturación",
      icon: "invoice",
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
      icon: "reports",
      allowedRoles: ROLES_REPORTS,
    },
    {
      kind: "group",
      id: "integraciones",
      label: "Integraciones",
      icon: "integrations",
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
      icon: "admin",
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
    this.clearRailCloseTimeout();
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    if (!this.isCompactModeAvailable() && this.isSidebarCompact) {
      this.isSidebarCompact = false;
      this.persistSidebarModePreference();
    }
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest(".topbar-user-menu") || target.closest(".topbar-user-panel")) {
    } else {
      this.closeUserMenu();
    }

    if (target.closest(".sidebar-rail-item") || target.closest(".sidebar-rail-launcher")) {
      return;
    }

    this.closeRailFlyout();
  }

  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    this.closeUserMenu();
    this.closeRailFlyout();
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

  get userMenuAriaLabel(): string {
    return `Abrir menú de usuario de ${this.currentUser?.username || "Usuario"}`;
  }

  get logoutAriaLabel(): string {
    return "Cerrar sesion";
  }

  get userInitial(): string {
    return (this.currentUser?.username || "U").trim().charAt(0).toUpperCase() || "U";
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

  isRailNodeActive(node: VisibleSidebarNode): boolean {
    return node.kind === "link" ? this.isRouteActive(node.route) : this.isGroupActive(node);
  }

  isRailFlyoutOpen(groupId: string): boolean {
    return this.activeRailNodeId === groupId;
  }

  getRailFlyoutId(groupId: string): string {
    return `sidebar-rail-flyout-${groupId}`;
  }

  getRailTooltip(node: VisibleSidebarNode): string | null {
    return this.isRailFlyoutOpen(node.id) ? null : node.label;
  }

  getGroupItemsContainerId(groupId: string): string {
    return `sidebar-group-${groupId}`;
  }

  isProfessionalIcon(icon: string): icon is SidebarIconKey {
    return this.professionalIconKeys.has(icon as SidebarIconKey);
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

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  openRailFlyout(groupId: string, source: RailFlyoutOpenSource): void {
    if (!this.isSidebarCompact) {
      return;
    }

    this.clearRailCloseTimeout();

    if (source !== "click" && this.pinnedRailNodeId && this.pinnedRailNodeId !== groupId) {
      return;
    }

    this.activeRailNodeId = groupId;
    if (source === "click") {
      this.pinnedRailNodeId = groupId;
    }
  }

  toggleRailFlyout(groupId: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.isRailFlyoutOpen(groupId) && this.pinnedRailNodeId === groupId) {
      this.closeRailFlyout();
      return;
    }

    this.openRailFlyout(groupId, "click");
  }

  closeRailFlyout(): void {
    this.clearRailCloseTimeout();
    this.activeRailNodeId = null;
    this.pinnedRailNodeId = null;
  }

  closeRailFlyoutFromPointer(groupId: string): void {
    if (this.pinnedRailNodeId === groupId) {
      return;
    }

    if (this.activeRailNodeId === groupId) {
      this.scheduleRailFlyoutClose(groupId);
    }
  }

  onRailItemFocusOut(event: FocusEvent, groupId: string): void {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget instanceof HTMLElement) {
      if (event.currentTarget.contains(relatedTarget)) {
        return;
      }
    }

    if (this.pinnedRailNodeId === groupId) {
      return;
    }

    if (this.activeRailNodeId === groupId) {
      this.scheduleRailFlyoutClose(groupId);
    }
  }

  onRailItemNavigate(): void {
    this.closeRailFlyout();
  }

  private scheduleRailFlyoutClose(groupId: string): void {
    this.clearRailCloseTimeout();
    this.railCloseTimeoutId = setTimeout(() => {
      if (this.pinnedRailNodeId === groupId) {
        return;
      }

      if (this.activeRailNodeId === groupId) {
        this.activeRailNodeId = null;
      }
      this.railCloseTimeoutId = null;
    }, 90);
  }

  private clearRailCloseTimeout(): void {
    if (this.railCloseTimeoutId === null) {
      return;
    }

    clearTimeout(this.railCloseTimeoutId);
    this.railCloseTimeoutId = null;
  }

  changeThemeFromMenu(): void {
    this.toggleTheme();
  }

  logoutFromMenu(): void {
    this.closeUserMenu();
    this.logout();
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

    if (this.isSidebarCompact && this.pinnedRailNodeId) {
      return;
    }

    const activeRailGroup = this.sidebarNodesForView.find(
      (node): node is SidebarGroupNode => node.kind === "group" && this.isGroupActive(node),
    );
    this.activeRailNodeId = activeRailGroup?.id || null;
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
