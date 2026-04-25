import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { StockResponse, WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

@Component({
  selector: "app-stock-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <h1>Inventario - Stock</h1>
        <p class="muted">Consulta el stock por producto y almacen.</p>
      </header>

      <form
        [formGroup]="filtersForm"
        (ngSubmit)="applyFilters()"
        class="form-grid"
      >
        <label>
          Producto
          <select formControlName="productId">
            <option [ngValue]="null">Todos</option>
            <option *ngFor="let product of products" [ngValue]="product.id">
              {{ product.name }} (SKU: {{ product.sku }})
            </option>
          </select>
        </label>

        <label>
          Almacen
          <select formControlName="warehouseId">
            <option [ngValue]="null">Todos</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
        </label>

        <button type="submit" [disabled]="loading">Buscar</button>
        <button
          type="button"
          class="secondary"
          (click)="clearFilters()"
          [disabled]="loading"
        >
          Limpiar
        </button>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="muted" *ngIf="loading">Cargando stock...</p>

      <div class="table-wrapper" *ngIf="!loading">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Almacen</th>
              <th>Cantidad</th>
              <th>Version</th>
              <th>Ultima actualizacion</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let stock of stocks">
              <td>{{ stock.id }}</td>
              <td>{{ resolveProductName(stock.productId) }}</td>
              <td>{{ resolveWarehouseName(stock.warehouseId) }}</td>
              <td>{{ stock.quantity | number: "1.0-3" }}</td>
              <td>{{ stock.version }}</td>
              <td>{{ stock.updatedAt | date: "yyyy-MM-dd HH:mm" }}</td>
            </tr>
            <tr *ngIf="stocks.length === 0">
              <td colspan="6" class="empty">
                No hay stock para los filtros seleccionados.
              </td>
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
      h1 {
        margin: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 0.75rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      select {
        padding: 0.55rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        padding: 0.55rem 0.9rem;
        border: 0;
        border-radius: 0.35rem;
        background: #111827;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #4b5563;
      }
      .table-wrapper {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 900px;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #e5e7eb;
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
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 1000px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StockPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    productId: [null as number | null],
    warehouseId: [null as number | null],
  });

  products: Product[] = [];
  warehouses: WarehouseResponse[] = [];
  stocks: StockResponse[] = [];

  page = 0;
  readonly pageSize = 20;
  totalPages = 1;
  totalElements = 0;

  loading = true;
  errorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
  ) {}

  ngOnInit(): void {
    this.loadLookupsAndStock();
  }

  applyFilters(): void {
    this.page = 0;
    this.loadStock();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.page = 0;
    this.loadStock();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }

    this.page -= 1;
    this.loadStock();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.loadStock();
  }

  resolveProductName(productId: number): string {
    const product = this.products.find((item) => item.id === productId);
    return product
      ? `${product.name} (SKU: ${product.sku})`
      : `Producto #${productId}`;
  }

  resolveWarehouseName(warehouseId: number): string {
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse
      ? `${warehouse.code} - ${warehouse.name}`
      : `Almacen #${warehouseId}`;
  }

  private loadLookupsAndStock(): void {
    this.loading = true;
    this.errorMessage = "";

    forkJoin({
      productsPage: this.productService.list(0, 300),
      warehouses: this.warehouseService.list(true),
    }).subscribe({
      next: ({ productsPage, warehouses }) => {
        this.products = productsPage.content;
        this.warehouses = warehouses;
        this.loadStock();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar productos/almacenes para filtros.",
        );
      },
    });
  }

  private loadStock(): void {
    const value = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.inventoryService
      .listStocks({
        page: this.page,
        size: this.pageSize,
        productId: value.productId ?? undefined,
        warehouseId: value.warehouseId ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.stocks = response.content;
          this.page = response.number;
          this.totalElements = response.totalElements;
          this.totalPages = Math.max(response.totalPages, 1);
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo consultar el stock.",
          );
        },
      });
  }
}
