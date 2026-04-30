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
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Stock</h1>
          <p class="ui-page-description">
            Consulta existencias por producto y almacen, con foco en niveles
            criticos.
          </p>
        </div>
      </header>

      <form
        [formGroup]="filtersForm"
        (ngSubmit)="applyFilters()"
        class="filters-grid"
      >
        <label class="field">
          <span>Producto</span>
          <select formControlName="productId">
            <option [ngValue]="null">Todos</option>
            <option *ngFor="let product of products" [ngValue]="product.id">
              {{ product.name }} (SKU: {{ product.sku }})
            </option>
          </select>
        </label>

        <label class="field">
          <span>Almacen</span>
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

        <div class="field-action">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="loading"
          >
            Buscar
          </button>
        </div>
        <div class="field-action">
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

      <section class="stock-summary" *ngIf="!loading && stocks.length > 0">
        <span class="ui-badge">{{ totalElements }} registros</span>
        <span class="ui-badge ui-badge--danger" *ngIf="criticalCount > 0"
          >{{ criticalCount }} criticos</span
        >
        <span class="ui-badge ui-badge--warning" *ngIf="lowCount > 0"
          >{{ lowCount }} bajos</span
        >
      </section>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando stock...</p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table stock-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Almacen</th>
              <th>Cantidad</th>
              <th>Nivel</th>
              <th>Version</th>
              <th>Ultima actualizacion</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let stock of stocks"
              [class.row-critical]="isCritical(stock)"
              [class.row-low]="isLow(stock)"
            >
              <td class="cell-id">{{ stock.id }}</td>
              <td>{{ resolveProductName(stock.productId) }}</td>
              <td>{{ resolveWarehouseName(stock.warehouseId) }}</td>
              <td class="cell-qty">{{ stock.quantity | number: "1.0-3" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--danger]="isCritical(stock)"
                  [class.ui-badge--warning]="isLow(stock)"
                  [class.ui-badge--success]="
                    !isCritical(stock) && !isLow(stock)
                  "
                >
                  {{ stockLevelLabel(stock) }}
                </span>
              </td>
              <td>{{ stock.version }}</td>
              <td class="cell-date">
                {{ stock.updatedAt | date: "yyyy-MM-dd HH:mm" }}
              </td>
            </tr>
            <tr *ngIf="stocks.length === 0">
              <td colspan="7" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay stock para los filtros seleccionados.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination">
        <p class="ui-muted pagination-copy">
          Pagina {{ page + 1 }} de {{ totalPages }} -
          {{ totalElements }} registros
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
      .inventory-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: var(--space-3);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field > span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      .field-action {
        display: flex;
        justify-content: flex-end;
      }

      .stock-summary {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .stock-table {
        min-width: 980px;
      }

      .cell-id,
      .cell-qty,
      .cell-date {
        white-space: nowrap;
      }

      .row-critical td {
        background: rgba(185, 28, 28, 0.04);
      }

      .row-low td {
        background: rgba(146, 64, 14, 0.04);
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

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1000px) {
        .inventory-page {
          padding: var(--space-4);
        }

        .filters-grid {
          grid-template-columns: 1fr;
        }

        .field-action {
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

  get criticalCount(): number {
    return this.stocks.filter((stock) => Number(stock.quantity) <= 0).length;
  }

  get lowCount(): number {
    return this.stocks.filter(
      (stock) => Number(stock.quantity) > 0 && Number(stock.quantity) <= 5,
    ).length;
  }

  isCritical(stock: StockResponse): boolean {
    return Number(stock.quantity) <= 0;
  }

  isLow(stock: StockResponse): boolean {
    const quantity = Number(stock.quantity);
    return quantity > 0 && quantity <= 5;
  }

  stockLevelLabel(stock: StockResponse): string {
    if (this.isCritical(stock)) {
      return "Critico";
    }

    if (this.isLow(stock)) {
      return "Bajo";
    }

    return "Estable";
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
