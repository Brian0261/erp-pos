import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  EcommerceAdminOnlineProfileStatusResponse,
  OnlinePublicationStatus,
} from "../ecommerce-admin/data/ecommerce-admin.models";
import { EcommerceAdminService } from "../ecommerce-admin/data/ecommerce-admin.service";
import { Category, Product, Unit } from "./data/catalog.models";
import { CategoryService } from "./data/category.service";
import { ProductListFilters, ProductService } from "./data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { UnitService } from "./data/unit.service";

@Component({
  selector: "app-products-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card catalog-page">
      <header class="ui-page-head">
        <div class="page-copy">
          <h1 class="ui-page-title">Productos</h1>
        </div>
        <div class="header-actions">
          <a
            *ngIf="isAdmin"
            routerLink="/catalogo/productos/importar"
            class="ui-button ui-button--secondary"
            >Importar productos</a
          >
          <a
            routerLink="/catalogo/productos/nuevo"
            class="ui-button ui-button--primary"
            >Crear producto</a
          >
        </div>
      </header>

      <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="search-panel">
        <div class="search-panel__primary">
          <label class="search-field search-field--query">
            <span>Busqueda rapida</span>
            <input
              type="text"
              formControlName="q"
              placeholder="Nombre, SKU o codigo de barras"
            />
          </label>

          <div class="search-actions">
            <button type="submit" class="ui-button ui-button--primary">
              Buscar
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="clearSearch()"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div class="search-panel__secondary">
          <label class="search-field">
            <span>Categoria</span>
            <select formControlName="categoryId" (change)="applySelectFilters()">
              <option value="">Todas</option>
              <option *ngFor="let category of categories" [value]="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="search-field">
            <span>Estado</span>
            <select formControlName="active" (change)="applySelectFilters()">
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>

          <label class="search-field">
            <span>Codigo de barras</span>
            <select formControlName="barcodeStatus" (change)="applySelectFilters()">
              <option value="">Todos</option>
              <option value="WITH_BARCODE">Con codigo</option>
              <option value="WITHOUT_BARCODE">Sin codigo</option>
            </select>
          </label>
        </div>
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="reviewOnlineProfileProductId">
        El producto ya tiene un perfil online.
        <a [routerLink]="['/ecommerce-admin/perfiles', reviewOnlineProfileProductId]">
          Revisar perfil online
        </a>
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Cargando productos...
      </p>

      <div class="ui-table-wrapper table-scroll" *ngIf="!loading">
        <table class="ui-table catalog-table">
          <colgroup>
            <col class="col-sku" />
            <col class="col-barcode" />
            <col class="col-name" />
            <col class="col-category" />
            <col class="col-unit" />
            <col class="col-price" />
            <col class="col-state" />
            <col class="col-ecommerce" />
            <col class="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Codigo de barras</th>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Unidad</th>
              <th class="cell-right">Precio venta</th>
              <th>Estado</th>
              <th>Ecommerce</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products">
              <td class="cell-code">{{ product.sku }}</td>
              <td class="cell-code">{{ barcodeLabel(product.barcode) }}</td>
              <td class="cell-name" [title]="product.name">{{ product.name }}</td>
              <td>{{ categoryLabel(product.categoryId) }}</td>
              <td>{{ unitLabel(product.unitId) }}</td>
              <td class="cell-right">
                S/ {{ product.salePrice | number: "1.2-2" }}
              </td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="product.active"
                  [class.ui-badge--danger]="!product.active"
                >
                  {{ product.active ? "Activo" : "Inactivo" }}
                </span>
              </td>
              <td>
                <span
                  class="online-status-badge"
                  [ngClass]="onlineProfileBadgeClass(product.id)"
                  [title]="onlineProfileBadgeTitle(product.id)"
                >
                  {{ onlineProfileBadgeLabel(product.id) }}
                </span>
              </td>
              <td class="actions">
                <a
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/catalogo/productos', product.id, 'editar']"
                >
                  Editar
                </a>
                <a
                  *ngIf="hasOnlineProfile(product.id)"
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/ecommerce-admin/perfiles', product.id]"
                >
                  Revisar perfil
                </a>
                <button
                   *ngIf="canCreateOnlineProfile(product.id)"
                   type="button"
                   class="ui-button ui-button--secondary"
                    [disabled]="loading || loadingOnlineStatuses"
                    (click)="createOnlineProfile(product)"
                  >
                  Crear perfil online
                </button>
                <button
                   type="button"
                   class="ui-button ui-button--secondary action-deactivate"
                   [disabled]="loading || !product.active || !isAdmin"
                   (click)="deactivate(product)"
                 >
                  Desactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="products.length === 0">
              <td colspan="9" class="ui-table__empty">
                <div class="ui-empty-state">No hay productos para mostrar.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination" *ngIf="!loading">
        <p class="ui-muted pagination-copy">
          Pagina {{ page + 1 }} de {{ totalPages }} -
          {{ totalElements }} resultados
        </p>

        <div class="pagination-actions">
          <div class="page-jump" *ngIf="totalPages > 1">
            <label class="page-jump__label" for="pageJumpInput">Ir a pág.</label>
            <input
              id="pageJumpInput"
              class="page-jump__input"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              [value]="pageJumpValue"
              (input)="onPageJumpInput($event)"
              (keydown)="onPageJumpKeydown($event)"
              [attr.aria-invalid]="!isPageJumpValid()"
              [disabled]="loading"
            />
            <button
              type="button"
              class="ui-button ui-button--secondary page-jump__button"
              (click)="goToPageJump()"
              [disabled]="!isPageJumpValid() || loading"
            >
              Ir
            </button>
          </div>

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
      .catalog-page {
        padding: var(--space-5) var(--space-5) 0.55rem;
        display: grid;
        gap: 0;
        min-height: 100%;
      }

      .ui-page-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
        padding-top: var(--space-2);
        padding-bottom: 0.1rem;
      }

      .page-copy {
        display: grid;
        gap: 0.5rem;
        margin-bottom: 0;
      }

      .ui-page-title,
      .ui-page-description {
        margin: 0;
      }

      .ui-page-title {
        line-height: 1.1;
      }

      .search-panel {
        display: grid;
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
        margin-top: 0.35rem;
        --catalog-control-height: 2.75rem;
      }

      .search-panel__primary {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--space-3);
        align-items: end;
      }

      .search-panel__secondary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--space-3);
        align-items: end;
      }

      .search-field {
        display: grid;
        gap: var(--space-1);
      }

      .search-field--query {
        min-width: 0;
      }

      .search-field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .search-field input {
        min-width: 0;
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        box-sizing: border-box;
        height: var(--catalog-control-height);
      }

      .header-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        padding-top: 0;
      }

      .search-field select {
        min-width: 0;
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .search-actions {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-self: end;
        align-items: stretch;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .actions {
        display: flex;
        gap: 0.28rem;
        align-items: center;
        flex-wrap: nowrap;
        justify-content: flex-start;
        white-space: nowrap;
        min-width: 0;
      }

      .header-actions .ui-button,
      .search-actions .ui-button,
      .actions .ui-button {
        min-height: 1.65rem;
        padding-inline: 0.58rem;
      }

      .actions .ui-button {
        box-sizing: border-box;
        min-height: 1.65rem;
        padding-block: 0.22rem;
        padding-inline: 0.58rem;
        display: inline-flex;
        align-items: center;
      }

      .search-actions .ui-button {
        box-sizing: border-box;
        height: var(--catalog-control-height);
        min-height: var(--catalog-control-height);
        padding-block: 0;
        display: inline-flex;
        align-items: center;
      }

      .catalog-table tbody td {
        padding: 0.36rem var(--space-2);
      }

      .catalog-table thead th {
        font-size: 0.9rem;
        padding-top: 0.48rem;
        padding-bottom: 0.48rem;
        white-space: nowrap;
      }

      .action-deactivate {
        opacity: 0.88;
      }

      .online-status-badge {
        display: inline-flex;
        align-items: center;
        max-width: 100%;
        min-height: 1.45rem;
        padding: 0.18rem 0.48rem;
        border: 1px solid var(--color-border-default);
        border-radius: 999px;
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        font-size: 0.76rem;
        font-weight: 800;
        line-height: 1.1;
        white-space: nowrap;
      }

      .online-status-badge--draft,
      .online-status-badge--review {
        border-color: rgba(245, 158, 11, 0.45);
        background: rgba(245, 158, 11, 0.1);
        color: var(--color-warning-text, #92400e);
      }

      .online-status-badge--published {
        border-color: rgba(22, 163, 74, 0.45);
        background: rgba(22, 163, 74, 0.1);
        color: var(--color-success-text, #166534);
      }

      .online-status-badge--unpublished,
      .online-status-badge--empty,
      .online-status-badge--loading {
        color: var(--color-text-secondary);
      }

      .online-status-badge--blocked,
      .online-status-badge--error {
        border-color: rgba(220, 38, 38, 0.35);
        background: rgba(220, 38, 38, 0.08);
        color: var(--color-danger-text, #991b1b);
      }

      .cell-id,
      .cell-code {
        white-space: nowrap;
      }

      .cell-name {
        white-space: nowrap;
        min-width: 0;
      }

      .cell-right {
        text-align: right;
        white-space: nowrap;
      }

      .catalog-table {
        width: 100%;
        min-width: 1220px;
        table-layout: fixed;
        margin-top: 1rem;
      }

      .catalog-table th,
      .catalog-table td {
        vertical-align: middle;
      }

      .col-sku {
        width: 8%;
      }

      .col-barcode {
        width: 10%;
      }

      .col-name {
        width: 27%;
      }

      .col-category {
        width: 8%;
      }

      .col-unit {
        width: 6%;
      }

      .col-price {
        width: 9%;
      }

      .col-state {
        width: 6%;
      }

      .col-ecommerce {
        width: 12%;
      }

      .col-actions {
        width: 14%;
      }

      .catalog-table td.actions {
        overflow: visible;
      }

      .table-scroll {
        overflow-x: auto;
        overflow-y: hidden;
      }

      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
        margin-top: 0.35rem;
      }

      .pagination-copy {
        margin: 0;
      }

      .pagination-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
      }

      .page-jump {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.22rem 0.45rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
      }

      .page-jump__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
        white-space: nowrap;
      }

      .page-jump__input {
        width: 4.5rem;
        min-width: 4.5rem;
        padding: 0.35rem 0.45rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
      }

      .page-jump__button {
        min-height: 1.8rem;
        padding-block: 0.33rem;
        padding-inline: 0.7rem;
      }

      @media (max-width: 980px) {
        .catalog-page {
          padding: var(--space-4);
        }

        .search-panel {
          gap: var(--space-3);
        }

        .search-panel__primary,
        .search-panel__secondary {
          grid-template-columns: 1fr;
        }

        .search-actions {
          justify-content: flex-start;
        }

        .pagination {
          flex-direction: column;
          align-items: flex-start;
        }

        .page-jump {
          width: 100%;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .page-jump__input {
          width: 5rem;
          min-width: 5rem;
        }
      }
    `,
  ],
})
export class ProductsPageComponent implements OnInit {
  readonly searchForm = this.formBuilder.nonNullable.group({
    q: "",
    categoryId: "",
    active: "",
    barcodeStatus: "",
  });

  categories: Category[] = [];
  products: Product[] = [];
  page = 0;
  readonly pageSize = 10;
  totalPages = 1;
  totalElements = 0;
  loading = false;
  loadingOnlineStatuses = false;
  errorMessage = "";
  successMessage = "";
  isAdmin = false;
  pageJumpValue = "";
  reviewOnlineProfileProductId: number | null = null;

  private readonly categoriesById = new Map<number, Category>();
  private readonly unitsById = new Map<number, Unit>();
  private readonly onlineProfileStatusesByProductId = new Map<number, EcommerceAdminOnlineProfileStatusResponse>();
  private latestOnlineStatusRequestKey = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly unitService: UnitService,
    private readonly ecommerceAdminService: EcommerceAdminService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.resolveCurrentRole();
    this.loadReferenceData();
  }

  onSearch(): void {
    this.page = 0;
    this.loadProducts();
  }

  applySelectFilters(): void {
    this.page = 0;
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchForm.reset({
      q: "",
      categoryId: "",
      active: "",
      barcodeStatus: "",
    });
    this.page = 0;
    this.pageJumpValue = "";
    this.loadProducts();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }

    this.page -= 1;
    this.pageJumpValue = String(this.page + 1);
    this.loadProducts();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.pageJumpValue = String(this.page + 1);
    this.loadProducts();
  }

  onPageJumpInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const sanitized = input.value.replace(/\D+/g, "");
    if (input.value !== sanitized) {
      input.value = sanitized;
    }

    this.pageJumpValue = sanitized;
  }

  onPageJumpKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.goToPageJump();
      return;
    }

    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      ["Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      return;
    }

    event.preventDefault();
  }

  isPageJumpValid(): boolean {
    if (this.totalPages <= 1) {
      return false;
    }

    const value = Number(this.pageJumpValue);
    return Number.isInteger(value) && value >= 1 && value <= this.totalPages;
  }

  goToPageJump(): void {
    if (!this.isPageJumpValid()) {
      return;
    }

    const targetPage = Number(this.pageJumpValue) - 1;
    if (targetPage === this.page) {
      return;
    }

    this.page = targetPage;
    this.loadProducts();
  }

  async deactivate(product: Product): Promise<void> {
    if (!this.isAdmin) {
      this.errorMessage = "Solo ADMIN puede desactivar productos.";
      return;
    }

    if (this.loading) {
      return;
    }

    const accepted = await this.confirmDialog.confirm({
      title: "Desactivar producto",
      description: "El producto se marcará como inactivo. Podrás conservar su historial, pero dejará de estar disponible para nuevas operaciones donde aplique.",
      highlightText: product.name,
      confirmText: "Desactivar producto",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!accepted) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.productService.deactivate(product.id).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = "Producto desactivado correctamente.";
        this.loadProducts();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo desactivar el producto.",
        );
      },
    });
  }

  createOnlineProfile(product: Product): void {
    if (!this.isAdmin) {
      this.errorMessage = "Solo ADMIN puede crear perfiles online.";
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.reviewOnlineProfileProductId = null;

    this.ecommerceAdminService.createOnlineProfile(product.id).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(["/ecommerce-admin/perfiles", product.id]);
      },
      error: (error: unknown) => {
        this.loading = false;
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.errorMessage = "Este producto ya tiene un perfil online. Revisa el perfil existente antes de crear otro.";
          this.reviewOnlineProfileProductId = product.id;
          return;
        }

        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo crear el perfil online.",
        );
      },
    });
  }

  hasOnlineProfile(productId: number): boolean {
    return Boolean(this.onlineProfileStatusesByProductId.get(productId)?.hasOnlineProfile);
  }

  canCreateOnlineProfile(productId: number): boolean {
    const status = this.onlineProfileStatusesByProductId.get(productId);
    return this.isAdmin && Boolean(status) && !status?.hasOnlineProfile;
  }

  onlineProfileBadgeLabel(productId: number): string {
    const status = this.onlineProfileStatusesByProductId.get(productId);
    if (!status) {
      return this.loadingOnlineStatuses ? "Cargando ecommerce" : "Estado no disponible";
    }

    if (!status.hasOnlineProfile) {
      return "Sin perfil online";
    }

    return this.onlinePublicationStatusLabel(status.publicationStatus);
  }

  onlineProfileBadgeTitle(productId: number): string {
    const status = this.onlineProfileStatusesByProductId.get(productId);
    if (!status) {
      return "Estado ecommerce pendiente de cargar.";
    }

    if (!status.hasOnlineProfile) {
      return "Este producto aun no tiene perfil online.";
    }

    const profileName = status.profileName?.trim();
    const slug = status.slug?.trim();
    return [profileName || "Perfil online existente", slug ? `Slug: ${slug}` : null]
      .filter(Boolean)
      .join(" · ");
  }

  onlineProfileBadgeClass(productId: number): Record<string, boolean> {
    const status = this.onlineProfileStatusesByProductId.get(productId);
    if (!status) {
      return {
        "online-status-badge--loading": this.loadingOnlineStatuses,
        "online-status-badge--error": !this.loadingOnlineStatuses,
      };
    }

    if (!status.hasOnlineProfile) {
      return { "online-status-badge--empty": true };
    }

    return {
      "online-status-badge--draft": status.publicationStatus === "DRAFT" || status.publicationStatus === "INCOMPLETE",
      "online-status-badge--review": status.publicationStatus === "READY_FOR_REVIEW",
      "online-status-badge--published": status.publicationStatus === "PUBLISHED",
      "online-status-badge--unpublished": status.publicationStatus === "UNPUBLISHED",
      "online-status-badge--blocked": status.publicationStatus === "BLOCKED",
    };
  }

  barcodeLabel(barcode: string | null): string {
    const normalized = barcode?.trim();
    if (!normalized || normalized === "-") {
      return "Sin código";
    }

    return normalized;
  }

  categoryLabel(categoryId: number): string {
    return this.categoriesById.get(categoryId)?.name || `Categoría #${categoryId}`;
  }

  unitLabel(unitId: number): string {
    const unit = this.unitsById.get(unitId);
    if (!unit) {
      return `Unidad #${unitId}`;
    }

    return unit.code?.trim() || unit.name || `Unidad #${unitId}`;
  }

  private resolveCurrentRole(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.isAdmin = user.roles.includes("ADMIN");
      },
      error: () => {
        this.isAdmin = false;
      },
    });
  }

  private loadReferenceData(): void {
    this.loading = true;
    this.errorMessage = "";

    forkJoin({
      categories: this.categoryService.list().pipe(catchError(() => of([] as Category[]))),
      units: this.unitService.list().pipe(catchError(() => of([] as Unit[]))),
    }).subscribe({
      next: ({ categories, units }) => {
        this.categories = categories;
        this.categoriesById.clear();
        categories.forEach((category) => {
          this.categoriesById.set(category.id, category);
        });

        this.unitsById.clear();
        units.forEach((unit) => {
          this.unitsById.set(unit.id, unit);
        });

        this.loadProducts();
      },
      error: () => {
        this.loadProducts();
      },
    });
  }

  private loadProducts(): void {
    this.loading = true;
    this.loadingOnlineStatuses = false;
    this.errorMessage = "";
    this.successMessage = "";
    this.reviewOnlineProfileProductId = null;
    this.onlineProfileStatusesByProductId.clear();
    this.latestOnlineStatusRequestKey = "";

    this.productService.list(
      this.page,
      this.pageSize,
      this.currentFilters(),
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.products = response.content;
        this.page = response.number;
        this.totalElements = response.totalElements;
        this.totalPages = Math.max(response.totalPages, 1);
        this.pageJumpValue = String(this.page + 1);
        this.loadOnlineProfileStatuses(response.content);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadingOnlineStatuses = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar productos.",
        );
      },
    });
  }

  private currentFilters(): ProductListFilters {
    const value = this.searchForm.getRawValue();
    const categoryId = value.categoryId ? Number(value.categoryId) : undefined;

    return {
      q: value.q,
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      active: value.active === "" ? undefined : value.active === "true",
      barcodeStatus:
        value.barcodeStatus === "WITH_BARCODE" ||
        value.barcodeStatus === "WITHOUT_BARCODE"
          ? value.barcodeStatus
          : undefined,
    };
  }

  private loadOnlineProfileStatuses(products: Product[]): void {
    const productIds = products.map((product) => product.id).filter((id) => Number.isFinite(id));
    if (productIds.length === 0) {
      return;
    }

    const requestKey = productIds.join(",");
    this.latestOnlineStatusRequestKey = requestKey;
    this.loadingOnlineStatuses = true;

    this.ecommerceAdminService.listOnlineProfileStatuses(productIds).subscribe({
      next: (statuses) => {
        if (this.latestOnlineStatusRequestKey !== requestKey) {
          return;
        }

        this.onlineProfileStatusesByProductId.clear();
        statuses.forEach((status) => {
          this.onlineProfileStatusesByProductId.set(status.productId, status);
        });
        this.loadingOnlineStatuses = false;
      },
      error: () => {
        if (this.latestOnlineStatusRequestKey !== requestKey) {
          return;
        }

        this.onlineProfileStatusesByProductId.clear();
        this.loadingOnlineStatuses = false;
      },
    });
  }

  private onlinePublicationStatusLabel(status: OnlinePublicationStatus | null): string {
    switch (status) {
      case "DRAFT":
        return "Borrador ecommerce";
      case "INCOMPLETE":
        return "Pendiente ecommerce";
      case "READY_FOR_REVIEW":
        return "Listo para revisar";
      case "PUBLISHED":
        return "Publicado online";
      case "UNPUBLISHED":
        return "No publicado";
      case "BLOCKED":
        return "Revisar ecommerce";
      default:
        return "Perfil online";
    }
  }

}
