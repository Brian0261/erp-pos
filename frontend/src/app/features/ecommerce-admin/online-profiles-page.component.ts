import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import {
  EcommerceAdminOnlineProfileSummaryResponse,
  OnlinePublicationStatus,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

type PublicationFilter = "ALL" | OnlinePublicationStatus;

@Component({
  selector: "app-online-profiles-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card ecommerce-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catálogo online</p>
          <h1 class="ui-page-title">Perfiles online</h1>
          <p class="ui-page-description">
            Revisa estado de publicación, SEO y consistencia de perfiles online.
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="reloadProfiles()"
            [disabled]="loading || !canView"
          >
            Actualizar
          </button>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>

      <form
        class="filters-panel"
        [formGroup]="filtersForm"
        *ngIf="canView"
        (ngSubmit)="applyFilters()"
      >
        <label class="filter-field filter-field--query">
          <span>Búsqueda rápida</span>
          <input
            type="text"
            formControlName="query"
            placeholder="productId, nombre online o slug"
          />
        </label>

        <label class="filter-field filter-field--status">
          <span>Estado</span>
          <select formControlName="status" (change)="applyFilters()">
            <option value="ALL">Todos</option>
            <option *ngFor="let status of publicationStatuses" [value]="status">
              {{ statusLabel(status) }}
            </option>
          </select>
        </label>

        <div class="filter-actions">
          <button type="submit" class="ui-button ui-button--primary" [disabled]="loading">
            Filtrar
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="clearFilters()"
            [disabled]="loading"
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
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando perfiles online...</p>

      <div class="ui-table-wrapper" *ngIf="!loading && canView">
        <table class="ui-table ecommerce-table" *ngIf="filteredProfiles.length > 0">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Nombre online</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th>Publicado</th>
              <th>Actualizado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let profile of filteredProfiles">
              <td class="cell-code">#{{ profile.productId }}</td>
              <td class="cell-name">{{ profile.onlineName || "-" }}</td>
              <td class="cell-code">{{ profile.slug || "-" }}</td>
              <td>
                <span class="ui-badge" [ngClass]="publicationBadgeClass(profile.publicationStatus)">
                  {{ statusLabel(profile.publicationStatus) }}
                </span>
              </td>
              <td class="cell-code">{{ profile.brandId ?? "-" }}</td>
              <td class="cell-code">{{ profile.onlineCategoryId ?? "-" }}</td>
              <td class="cell-date">{{ formatDateTime(profile.publishedAt) }}</td>
              <td class="cell-date">{{ formatDateTime(profile.updatedAt) }}</td>
              <td class="actions">
                <a
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/ecommerce-admin/perfiles', profile.productId]"
                  >Revisar</a
                >
              </td>
            </tr>
          </tbody>
        </table>

        <div class="ui-empty-state" *ngIf="filteredProfiles.length === 0">
          {{ emptyMessage }}
        </div>
      </div>

      <footer class="pagination" *ngIf="!loading && canView">
        <p class="ui-muted pagination-copy">
          Página {{ page + 1 }} de {{ totalPages }} - {{ totalItems }} resultados
        </p>

        <div class="pagination-actions">
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="previousPage()"
            [disabled]="page === 0 || loading"
          >
            Anterior
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="nextPage()"
            [disabled]="page + 1 >= totalPages || loading"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  `,
  styles: [
    `
      .ecommerce-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .header-actions {
        display: inline-flex;
        align-items: center;
      }

      .filters-panel {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px auto;
        gap: var(--space-3);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .filter-field {
        display: grid;
        gap: var(--space-1);
      }

      .filter-field span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .filter-field input,
      .filter-field select {
        min-height: 2.65rem;
        padding: 0.55rem 0.65rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .filter-actions {
        display: inline-flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ecommerce-table {
        min-width: 1020px;
      }

      .cell-code,
      .cell-date {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
      }

      .cell-name {
        max-width: 260px;
      }

      .actions {
        white-space: nowrap;
      }

      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
      }

      .pagination-actions {
        display: inline-flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      @media (max-width: 1100px) {
        .filters-panel {
          grid-template-columns: 1fr;
        }

        .filter-actions {
          justify-content: flex-start;
        }
      }

      @media (max-width: 768px) {
        .ecommerce-page {
          padding: var(--space-4);
        }

        .pagination {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class OnlineProfilesPageComponent implements OnInit {
  readonly publicationStatuses: OnlinePublicationStatus[] = [
    "DRAFT",
    "INCOMPLETE",
    "READY_FOR_REVIEW",
    "PUBLISHED",
    "UNPUBLISHED",
    "BLOCKED",
  ];

  readonly filtersForm = this.formBuilder.group({
    query: [""],
    status: ["ALL" as PublicationFilter],
  });

  profiles: EcommerceAdminOnlineProfileSummaryResponse[] = [];
  filteredProfiles: EcommerceAdminOnlineProfileSummaryResponse[] = [];

  loading = false;
  canView = false;
  canManage = false;

  page = 0;
  size = 20;
  totalItems = 0;
  totalPages = 1;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly ecommerceAdminService: EcommerceAdminService,
  ) {}

  get emptyMessage(): string {
    if (this.profiles.length === 0) {
      return "No existen perfiles online para la pagina seleccionada.";
    }
    return "No hay resultados para los filtros aplicados en esta pagina.";
  }

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.includes("ADMIN");
        this.canView = user.roles.some((role) => role === "ADMIN" || role === "SUPERVISOR");
        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para revisar perfiles online en esta pantalla.";
          return;
        }
        this.loadProfiles();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  applyFilters(): void {
    const rawQuery = String(this.filtersForm.controls.query.value || "").trim().toLowerCase();
    const status = this.filtersForm.controls.status.value as PublicationFilter;

    this.filteredProfiles = this.profiles.filter((profile) => {
      if (status !== "ALL" && profile.publicationStatus !== status) {
        return false;
      }

      if (!rawQuery) {
        return true;
      }

      const searchable = [
        String(profile.productId),
        profile.onlineName || "",
        profile.slug || "",
        String(profile.brandId ?? ""),
        String(profile.onlineCategoryId ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(rawQuery);
    });
  }

  clearFilters(): void {
    this.filtersForm.reset({ query: "", status: "ALL" });
    this.filteredProfiles = [...this.profiles];
  }

  reloadProfiles(): void {
    this.loadProfiles(true);
  }

  previousPage(): void {
    if (this.page === 0 || this.loading) {
      return;
    }
    this.page -= 1;
    this.loadProfiles();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages || this.loading) {
      return;
    }
    this.page += 1;
    this.loadProfiles();
  }

  statusLabel(status: OnlinePublicationStatus): string {
    switch (status) {
      case "DRAFT":
        return "Borrador";
      case "INCOMPLETE":
        return "Incompleto";
      case "READY_FOR_REVIEW":
        return "Listo para revisión";
      case "PUBLISHED":
        return "Publicado";
      case "UNPUBLISHED":
        return "Despublicado";
      case "BLOCKED":
        return "Bloqueado";
      default:
        return status;
    }
  }

  publicationBadgeClass(status: OnlinePublicationStatus): string {
    switch (status) {
      case "PUBLISHED":
        return "ui-badge--success";
      case "READY_FOR_REVIEW":
        return "ui-badge--warning";
      case "UNPUBLISHED":
        return "ui-badge--warning";
      case "BLOCKED":
      case "INCOMPLETE":
        return "ui-badge--danger";
      default:
        return "";
    }
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return "-";
    }
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  private loadProfiles(showSuccess = false): void {
    if (!this.canView) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    if (!showSuccess) {
      this.successMessage = "";
    }

    this.ecommerceAdminService.listOnlineProfiles(this.page, this.size).subscribe({
      next: (response) => {
        this.loading = false;
        this.profiles = response.items;
        this.totalItems = response.totalItems;
        this.totalPages = Math.max(response.totalPages || 1, 1);
        this.page = response.page;
        this.size = response.size;
        this.applyFilters();

        if (showSuccess) {
          this.successMessage = "Listado actualizado correctamente.";
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el listado de perfiles online.",
        );
      },
    });
  }
}
