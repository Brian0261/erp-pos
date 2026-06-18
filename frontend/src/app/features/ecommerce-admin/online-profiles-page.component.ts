import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged, forkJoin, Subject, takeUntil } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import {
  EcommerceAdminBrandResponse,
  EcommerceAdminOnlineCategoryResponse,
  EcommerceAdminOnlineProfileSummaryResponse,
  MissingRequirement,
  OnlinePublicationStatus,
  ReadinessStatus,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService, OnlineProfileListFilters } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

type PublicationFilter = "ALL" | OnlinePublicationStatus;
type ReadinessFilter = "ALL" | ReadinessStatus;

const NONE_VALUE = "__NONE__";

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
          <a
            *ngIf="canManage"
            routerLink="/ecommerce-admin/perfiles/importar"
            class="ui-button ui-button--secondary"
          >
            Importar perfiles
          </a>
          <a
            *ngIf="canManage"
            routerLink="/ecommerce-admin/perfiles/imagenes/importar"
            class="ui-button ui-button--secondary"
          >
            Importar imagenes por URL
          </a>
          <a
            *ngIf="canManage"
            routerLink="/ecommerce-admin/perfiles/imagenes/importar-zip"
            class="ui-button ui-button--secondary"
          >
            Importar Excel + ZIP
          </a>
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
      >
        <div class="filters-row filters-row--primary">
          <label class="filter-field filter-field--query">
            <span>Búsqueda</span>
            <input
              type="text"
              formControlName="query"
              placeholder="Nombre online o slug"
            />
          </label>

          <label class="filter-field filter-field--status">
            <span>Estado</span>
            <select formControlName="status">
              <option value="ALL">Todos</option>
              <option *ngFor="let status of publicationStatuses" [value]="status">
                {{ statusLabel(status) }}
              </option>
            </select>
          </label>

          <label class="filter-field filter-field--readiness">
            <span>Preparación</span>
            <select formControlName="readinessStatus">
              <option value="ALL">Todas</option>
              <option *ngFor="let status of readinessStatuses" [value]="status">
                {{ readinessLabel(status) }}
              </option>
            </select>
          </label>
        </div>

        <div class="filters-row filters-row--secondary">
          <label class="filter-field">
            <span>Marca</span>
            <select formControlName="brandId">
              <option value="">Todas</option>
              <option [value]="noneValue">Sin marca</option>
              <option *ngFor="let brand of brands" [value]="brand.id">
                {{ brand.name }}
              </option>
            </select>
          </label>

          <label class="filter-field">
            <span>Categoría online</span>
            <select formControlName="onlineCategoryId">
              <option value="">Todas</option>
              <option [value]="noneValue">Sin categoría online</option>
              <option *ngFor="let category of onlineCategories" [value]="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <div class="filter-actions">
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="clearFilters()"
              [disabled]="loading"
            >
              Limpiar filtros
            </button>
          </div>
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
        <table class="ui-table ecommerce-table" *ngIf="profiles.length > 0">
          <thead>
            <tr>
                <th>Producto ERP</th>
              <th>Nombre online</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Readiness</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th>Publicado el</th>
              <th>Actualizado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let profile of profiles">
              <td class="cell-product">
                <div class="product-summary">
                  <span class="product-name" [attr.title]="profile.productName || 'Producto ERP no disponible'">
                    {{ profile.productName || "Producto ERP no disponible" }}
                  </span>
                  <span class="ui-badge ui-badge--danger" *ngIf="!profile.productActive">Inactivo</span>
                </div>
                <div class="product-meta">
                  SKU: {{ profile.productSku || "-" }} · #{{ profile.productId }}
                </div>
              </td>
              <td class="cell-name">{{ profile.onlineName || "-" }}</td>
              <td class="cell-code">{{ profile.slug || "-" }}</td>
              <td>
                <span class="ui-badge" [ngClass]="publicationBadgeClass(profile.publicationStatus)">
                  {{ statusLabel(profile.publicationStatus) }}
                </span>
              </td>
              <td class="cell-readiness">
                <div class="readiness-summary">
                  <span class="ui-badge" [ngClass]="readinessBadgeClass(profile.readinessStatus)">
                    {{ readinessLabel(profile.readinessStatus) }}
                  </span>
                  <span class="readiness-score">{{ profile.readinessCompleted }}/{{ profile.readinessTotal }}</span>
                </div>
                <div
                  class="readiness-detail"
                  [attr.title]="readinessDetailTitle(profile.missingRequirements)"
                  [attr.aria-label]="readinessDetailTitle(profile.missingRequirements)"
                >
                  {{ readinessDetail(profile.missingRequirements) }}
                </div>
              </td>
              <td class="cell-code">{{ profile.brandName ?? "Sin marca" }}</td>
              <td class="cell-code">{{ profile.onlineCategoryName ?? "Sin categoría online" }}</td>
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

        <div class="ui-empty-state" *ngIf="profiles.length === 0">
          <p class="empty-state-title">{{ hasActiveFilters() ? "Sin resultados" : "Aún no hay perfiles online" }}</p>
          <p class="ui-muted">{{ emptyMessage }}</p>
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
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .filters-panel {
        display: grid;
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .filters-row {
        display: grid;
        gap: var(--space-3);
        align-items: end;
      }

      .filters-row--primary {
        grid-template-columns: minmax(200px, 1fr) 180px 200px;
      }

      .filters-row--secondary {
        grid-template-columns: 220px 220px minmax(140px, auto);
      }

      .filter-field {
        display: grid;
        gap: var(--space-1);
        min-width: 0;
      }

      .filter-field span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .filter-field input,
      .filter-field select {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
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
        align-self: end;
      }

      .ecommerce-table {
        min-width: 1200px;
      }

      .cell-code,
      .cell-date {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
      }

      .cell-name {
        max-width: 260px;
      }

      .cell-product {
        min-width: 260px;
      }

      .product-summary {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-width: 0;
      }

      .product-name {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-meta {
        margin-top: 0.2rem;
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cell-readiness {
        min-width: 260px;
      }

      .readiness-summary {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: nowrap;
      }

      .readiness-score {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-family: var(--font-family-mono);
        white-space: nowrap;
      }

      .readiness-detail {
        margin-top: 0.2rem;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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

      .empty-state-title {
        margin: 0 0 var(--space-1);
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      @media (max-width: 900px) {
        .filters-row--primary,
        .filters-row--secondary {
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
export class OnlineProfilesPageComponent implements OnInit, OnDestroy {
  readonly noneValue = NONE_VALUE;

  readonly publicationStatuses: OnlinePublicationStatus[] = [
    "DRAFT",
    "INCOMPLETE",
    "READY_FOR_REVIEW",
    "PUBLISHED",
    "UNPUBLISHED",
    "BLOCKED",
  ];

  readonly readinessStatuses: ReadinessStatus[] = [
    "READY",
    "INCOMPLETE",
    "NEEDS_ATTENTION",
    "PUBLISHED",
    "UNPUBLISHED",
  ];

  readonly filtersForm = this.formBuilder.group({
    query: [""],
    status: ["ALL" as PublicationFilter],
    readinessStatus: ["ALL" as ReadinessFilter],
    brandId: [""],
    onlineCategoryId: [""],
  });

  profiles: EcommerceAdminOnlineProfileSummaryResponse[] = [];
  brands: EcommerceAdminBrandResponse[] = [];
  onlineCategories: EcommerceAdminOnlineCategoryResponse[] = [];

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

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly ecommerceAdminService: EcommerceAdminService,
  ) {}

  get emptyMessage(): string {
    if (this.hasActiveFilters()) {
      return "No hay perfiles online para los filtros aplicados.";
    }
    return "No existen perfiles online para la página seleccionada.";
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
        this.loadFilterOptions();
        this.loadProfiles();
        this.setupFilterSubscriptions();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      query: "",
      status: "ALL",
      readinessStatus: "ALL",
      brandId: "",
      onlineCategoryId: "",
    });
    this.page = 0;
    this.loadProfiles();
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

  readinessLabel(status: ReadinessStatus): string {
    switch (status) {
      case "READY":
        return "Listo";
      case "INCOMPLETE":
        return "Incompleto";
      case "NEEDS_ATTENTION":
        return "Requiere atención";
      case "PUBLISHED":
        return "Publicado";
      case "UNPUBLISHED":
        return "Despublicado";
      default:
        return status;
    }
  }

  readinessBadgeClass(status: ReadinessStatus): string {
    switch (status) {
      case "READY":
        return "ui-badge--success";
      case "INCOMPLETE":
        return "ui-badge--warning";
      case "NEEDS_ATTENTION":
        return "ui-badge--danger";
      case "PUBLISHED":
        return "ui-badge--info";
      case "UNPUBLISHED":
        return "";
      default:
        return "";
    }
  }

  requirementLabel(req: MissingRequirement): string {
    const labels: Record<MissingRequirement, string> = {
      PRODUCT_INACTIVE: "Producto inactivo",
      SKU_MISSING: "SKU",
      ONLINE_NAME_MISSING: "Nombre",
      ONLINE_DESCRIPTION_MISSING: "Descripción",
      SLUG_MISSING: "Slug",
      SLUG_DUPLICATE: "Slug duplicado",
      CATEGORY_MISSING: "Categoría",
      CATEGORY_INACTIVE: "Categoría inactiva",
      BRAND_MISSING: "Marca",
      BRAND_INACTIVE: "Marca inactiva",
      ASSET_MISSING: "Imagen",
      ASSET_INVALID: "Imagen inválida",
      SEO_MISSING: "SEO",
      SEO_INCOMPLETE: "SEO incompleto",
      PRICE_INVALID: "Precio inválido"
    };
    return labels[req];
  }

  readinessDetail(missingRequirements: MissingRequirement[]): string {
    if (missingRequirements.length === 0) {
      return "Sin faltantes";
    }

    const visible = missingRequirements.slice(0, 3).map((req) => this.requirementLabel(req));
    const remaining = missingRequirements.length - visible.length;
    const summary = `Faltan ${missingRequirements.length}: ${visible.join(", ")}`;

    return remaining > 0 ? `${summary} +${remaining} más` : summary;
  }

  readinessDetailTitle(missingRequirements: MissingRequirement[]): string {
    if (missingRequirements.length === 0) {
      return "Sin faltantes";
    }

    return `Faltantes: ${missingRequirements.map((req) => this.requirementLabel(req)).join(", ")}`;
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

  hasActiveFilters(): boolean {
    const raw = this.filtersForm.getRawValue();
    return Boolean(
      String(raw.query || "").trim() ||
        raw.status !== "ALL" ||
        raw.readinessStatus !== "ALL" ||
        raw.brandId ||
        raw.onlineCategoryId,
    );
  }

  private setupFilterSubscriptions(): void {
    this.filtersForm.controls.query.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(450),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.page = 0;
        this.loadProfiles();
      });

    this.filtersForm.controls.status.valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(() => {
        this.page = 0;
        this.loadProfiles();
      });

    this.filtersForm.controls.readinessStatus.valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(() => {
        this.page = 0;
        this.loadProfiles();
      });

    this.filtersForm.controls.brandId.valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(() => {
        this.page = 0;
        this.loadProfiles();
      });

    this.filtersForm.controls.onlineCategoryId.valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(() => {
        this.page = 0;
        this.loadProfiles();
      });
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

    this.ecommerceAdminService.listOnlineProfiles(this.page, this.size, this.currentFilters()).subscribe({
      next: (response) => {
        this.loading = false;
        this.profiles = response.items;
        this.totalItems = response.totalItems;
        this.totalPages = Math.max(response.totalPages || 1, 1);
        this.page = response.page;
        this.size = response.size;

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

  private loadFilterOptions(): void {
    forkJoin({
      brands: this.ecommerceAdminService.listBrands(),
      onlineCategories: this.ecommerceAdminService.listOnlineCategories(),
    }).subscribe({
      next: ({ brands, onlineCategories }) => {
        this.brands = brands;
        this.onlineCategories = onlineCategories;
      },
      error: () => {
        this.brands = [];
        this.onlineCategories = [];
      },
    });
  }

  private currentFilters(): OnlineProfileListFilters {
    const raw = this.filtersForm.getRawValue();
    const brandIdRaw = raw.brandId;
    const onlineCategoryIdRaw = raw.onlineCategoryId;

    const withoutBrand = brandIdRaw === NONE_VALUE;
    const withoutOnlineCategory = onlineCategoryIdRaw === NONE_VALUE;

    const brandId = !withoutBrand && brandIdRaw ? Number(brandIdRaw) : undefined;
    const onlineCategoryId = !withoutOnlineCategory && onlineCategoryIdRaw ? Number(onlineCategoryIdRaw) : undefined;

    return {
      q: String(raw.query || "").trim() || undefined,
      status: raw.status === "ALL" ? undefined : raw.status as OnlinePublicationStatus,
      readinessStatus: raw.readinessStatus === "ALL" ? undefined : raw.readinessStatus as ReadinessStatus,
      brandId: Number.isFinite(brandId) ? brandId : undefined,
      withoutBrand: withoutBrand || undefined,
      onlineCategoryId: Number.isFinite(onlineCategoryId) ? onlineCategoryId : undefined,
      withoutOnlineCategory: withoutOnlineCategory || undefined,
    };
  }
}
