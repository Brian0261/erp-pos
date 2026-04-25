import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { Product } from "./data/catalog.models";
import { ProductService } from "./data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-products-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1>Catalogo - Productos</h1>
          <p class="muted">
            Gestiona productos y buscalos por nombre, SKU o codigo de barras.
          </p>
        </div>
        <a routerLink="/catalogo/productos/nuevo" class="primary"
          >Crear producto</a
        >
      </header>

      <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="search-row">
        <input
          type="text"
          formControlName="q"
          placeholder="Buscar por nombre, SKU o codigo de barras"
        />
        <button type="submit">Buscar</button>
        <button type="button" class="secondary" (click)="clearSearch()">
          Limpiar
        </button>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>
      <p class="muted" *ngIf="loading">Cargando productos...</p>

      <div class="table-wrapper" *ngIf="!loading">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>SKU</th>
              <th>Codigo de barras</th>
              <th>Nombre</th>
              <th>Categoria ID</th>
              <th>Unidad ID</th>
              <th>Precio venta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products">
              <td>{{ product.id }}</td>
              <td>{{ product.sku }}</td>
              <td>{{ product.barcode || "-" }}</td>
              <td>{{ product.name }}</td>
              <td>{{ product.categoryId }}</td>
              <td>{{ product.unitId }}</td>
              <td>{{ product.salePrice | number: "1.2-2" }}</td>
              <td>
                <span
                  [class.active]="product.active"
                  [class.inactive]="!product.active"
                >
                  {{ product.active ? "Activo" : "Inactivo" }}
                </span>
              </td>
              <td class="actions">
                <a [routerLink]="['/catalogo/productos', product.id, 'editar']"
                  >Editar</a
                >
                <button
                  type="button"
                  class="danger"
                  [disabled]="!product.active || !isAdmin"
                  (click)="deactivate(product)"
                >
                  Desactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="products.length === 0">
              <td colspan="9" class="empty">No hay productos para mostrar.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination">
        <button
          type="button"
          (click)="previousPage()"
          [disabled]="page === 0 || loading"
        >
          Anterior
        </button>
        <span
          >Pagina {{ page + 1 }} de {{ totalPages }} -
          {{ totalElements }} registros</span
        >
        <button
          type="button"
          (click)="nextPage()"
          [disabled]="page + 1 >= totalPages || loading"
        >
          Siguiente
        </button>
      </footer>
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
      .header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }
      .header h1 {
        margin: 0;
      }
      .search-row {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      input {
        flex: 1;
        min-width: 260px;
        padding: 0.55rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button,
      .primary,
      .actions a {
        border: 0;
        border-radius: 0.35rem;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
      }
      button {
        background: #111827;
        color: #fff;
      }
      .primary {
        background: #0f766e;
        color: #fff;
      }
      .secondary {
        background: #4b5563;
      }
      .danger {
        background: #b91c1c;
      }
      .danger[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .actions {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      .actions a {
        background: #1f2937;
        color: #fff;
      }
      .table-wrapper {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1000px;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #e5e7eb;
      }
      .active {
        color: #166534;
        font-weight: 600;
      }
      .inactive {
        color: #b91c1c;
        font-weight: 600;
      }
      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .muted {
        color: #6b7280;
        margin: 0;
      }
      .error {
        color: #b91c1c;
        margin: 0;
      }
      .success {
        color: #166534;
        margin: 0;
      }
      .empty {
        text-align: center;
        color: #6b7280;
      }
    `,
  ],
})
export class ProductsPageComponent implements OnInit {
  readonly searchForm = this.formBuilder.nonNullable.group({
    q: "",
  });

  products: Product[] = [];
  page = 0;
  readonly pageSize = 10;
  totalPages = 1;
  totalElements = 0;
  loading = false;
  errorMessage = "";
  successMessage = "";
  isAdmin = false;

  private searchResults: Product[] = [];
  private searchMode = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.resolveCurrentRole();
    this.loadProducts();
  }

  onSearch(): void {
    this.page = 0;
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchForm.controls.q.setValue("");
    this.page = 0;
    this.loadProducts();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }

    this.page -= 1;
    this.refreshByMode();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.refreshByMode();
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

  private loadProducts(): void {
    const query = this.searchForm.controls.q.value.trim();

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    if (query.length > 0) {
      this.productService.search(query).subscribe({
        next: (results) => {
          this.loading = false;
          this.searchMode = true;
          this.searchResults = results;
          this.applySearchPagination();
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo buscar productos.",
          );
          this.products = [];
          this.totalElements = 0;
          this.totalPages = 1;
        },
      });
      return;
    }

    this.productService.list(this.page, this.pageSize).subscribe({
      next: (response) => {
        this.loading = false;
        this.searchMode = false;
        this.searchResults = [];
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

  private refreshByMode(): void {
    if (this.searchMode) {
      this.applySearchPagination();
      return;
    }
    this.loadProducts();
  }

  private applySearchPagination(): void {
    this.totalElements = this.searchResults.length;
    this.totalPages = Math.max(
      Math.ceil(this.totalElements / this.pageSize),
      1,
    );

    if (this.page >= this.totalPages) {
      this.page = this.totalPages - 1;
    }

    const start = this.page * this.pageSize;
    const end = start + this.pageSize;
    this.products = this.searchResults.slice(start, end);
  }
}
