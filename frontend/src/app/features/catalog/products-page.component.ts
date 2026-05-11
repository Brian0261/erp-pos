import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
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
        <div>
          <p class="ui-page-kicker">Catalogo InkToy</p>
          <h1 class="ui-page-title">Productos</h1>
          <p class="ui-page-description">
            Gestiona productos y buscalos por nombre, SKU o codigo de barras.
          </p>
        </div>
        <a
          routerLink="/catalogo/productos/nuevo"
          class="ui-button ui-button--primary"
          >Crear producto</a
        >
      </header>

      <form
        [formGroup]="searchForm"
        (ngSubmit)="onSearch()"
        class="search-panel"
      >
        <label class="search-field">
          <span>Busqueda rapida</span>
          <input
            type="text"
            formControlName="q"
            placeholder="Nombre, SKU o codigo de barras"
          />
        </label>

        <label class="search-field">
          <span>Categoria</span>
          <select formControlName="categoryId">
            <option value="">Todas</option>
            <option *ngFor="let category of categories" [value]="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>

        <label class="search-field">
          <span>Estado</span>
          <select formControlName="active">
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>

        <label class="search-field">
          <span>Codigo de barras</span>
          <select formControlName="barcodeStatus">
            <option value="">Todos</option>
            <option value="WITH_BARCODE">Con codigo</option>
            <option value="WITHOUT_BARCODE">Sin codigo</option>
          </select>
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
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Cargando productos...
      </p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table catalog-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Codigo de barras</th>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Unidad</th>
              <th class="cell-right">Precio venta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products">
              <td class="cell-code">{{ product.sku }}</td>
              <td class="cell-code">{{ barcodeLabel(product.barcode) }}</td>
              <td>{{ product.name }}</td>
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
              <td class="actions">
                <a
                  class="ui-button ui-button--secondary"
                  [routerLink]="['/catalogo/productos', product.id, 'editar']"
                >Editar</a
                 >
                <button
                  type="button"
                  class="ui-button ui-button--secondary action-deactivate"
                  [disabled]="!product.active || !isAdmin"
                  (click)="deactivate(product)"
                >
                  Desactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="products.length === 0">
              <td colspan="8" class="ui-table__empty">
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
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .search-panel {
        display: grid;
        grid-template-columns: minmax(260px, 2fr) repeat(3, minmax(160px, 1fr)) auto;
        gap: var(--space-3);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .search-field {
        display: grid;
        gap: var(--space-1);
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
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
      }

      .action-deactivate {
        opacity: 0.88;
      }

      .cell-id,
      .cell-code {
        white-space: nowrap;
      }

      .cell-right {
        text-align: right;
      }

      .catalog-table {
        min-width: 960px;
      }

      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
      }

      .pagination-copy {
        margin: 0;
      }

      .pagination-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      @media (max-width: 980px) {
        .catalog-page {
          padding: var(--space-4);
        }

        .search-panel {
          grid-template-columns: 1fr;
        }

        .search-actions {
          justify-content: flex-start;
        }

        .pagination {
          flex-direction: column;
          align-items: flex-start;
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
  errorMessage = "";
  successMessage = "";
  isAdmin = false;

  private readonly categoriesById = new Map<number, Category>();
  private readonly unitsById = new Map<number, Unit>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly unitService: UnitService,
  ) {}

  ngOnInit(): void {
    this.resolveCurrentRole();
    this.loadReferenceData();
  }

  onSearch(): void {
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
    this.loadProducts();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }

    this.page -= 1;
    this.loadProducts();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.loadProducts();
  }

  deactivate(product: Product): void {
    if (!this.isAdmin) {
      this.errorMessage = "Solo ADMIN puede desactivar productos.";
      return;
    }

    const accepted = window.confirm(`Desactivar producto ${product.name}?`);
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
    this.errorMessage = "";
    this.successMessage = "";

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
      },
      error: (error: unknown) => {
        this.loading = false;
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

}
