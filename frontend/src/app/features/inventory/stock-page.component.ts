import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { forkJoin, of, Subject } from "rxjs";
import { catchError, distinctUntilChanged, takeUntil } from "rxjs/operators";

import { Product, ProductLookupResponse } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { ProductAutocompleteComponent } from "../../shared/components/product-autocomplete/product-autocomplete.component";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { StockResponse, WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

type ProductCacheItem = Pick<
  Product,
  "id" | "name" | "sku" | "barcode" | "active"
>;

@Component({
  selector: "app-stock-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProductAutocompleteComponent],
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
        <div class="filters-top">
          <div class="field-input field-input--product">
            <div class="field-label field-label--product">Producto</div>
            <app-product-autocomplete
              [placeholder]="'Buscar producto por nombre, SKU o código de barras'"
              [minChars]="2"
              [limit]="10"
              [activeOnly]="true"
              [compact]="true"
              [allowClear]="false"
              [showSelectedCard]="false"
              [filterMode]="true"
              [selectedProduct]="selectedProduct"
              [disabled]="loading"
              (productSelected)="selectProduct($event)"
              (queryChange)="onProductQueryChange($event)"
            ></app-product-autocomplete>
          </div>

          <div class="filters-right">
            <div class="field-input field-input--warehouse">
              <div class="field-label field-label--warehouse">Almacen</div>
              <select formControlName="warehouseId">
                <option [ngValue]="null">Todos</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                >
                  {{ warehouse.name }}
                </option>
              </select>
            </div>

            <div class="filter-actions">
              <button
                type="submit"
                class="ui-button ui-button--primary"
                [disabled]="loading"
              >
                Buscar
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
          </div>
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
              <th class="col-product">Producto</th>
              <th class="col-warehouse">Almacen</th>
              <th class="col-quantity">Cantidad</th>
              <th class="col-level">Nivel</th>
              <th class="col-updated-at">Ultima actualizacion</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let stock of stocks"
              [class.row-critical]="isCritical(stock)"
              [class.row-low]="isLow(stock)"
            >
              <td class="col-product">{{ resolveProductName(stock.productId) }}</td>
              <td class="col-warehouse">{{ formatWarehouseLabel(stock) }}</td>
              <td class="cell-qty col-quantity">{{ stock.quantity | number: "1.0-3" }}</td>
              <td class="col-level">
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
              <td class="cell-date col-updated-at">
                {{ stock.updatedAt | date: "dd/MM/yyyy HH:mm" }}
              </td>
            </tr>
            <tr *ngIf="stocks.length === 0">
              <td colspan="5" class="ui-table__empty">
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
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .filters-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--space-3);
        align-items: start;
      }

      .filters-right {
        display: grid;
        grid-template-columns: 260px max-content;
        grid-template-rows: auto auto;
        column-gap: var(--space-3);
        row-gap: var(--space-1);
        align-items: end;
        justify-content: start;
      }

      .field-label {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
        margin-bottom: var(--space-1);
      }

      .field-input {
        display: grid;
        gap: var(--space-1);
      }

      .field-input--product {
        min-width: 0;
        width: 100%;
      }

      .field-input--product app-product-autocomplete::ng-deep .product-autocomplete__label {
        display: none;
      }

      .field-input--warehouse {
        width: 260px;
        min-width: 260px;
        grid-column: 1;
        grid-row: 1 / span 2;
      }

      .field-input--warehouse .field-label {
        margin-bottom: var(--space-1);
      }

      select,
      input {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        box-sizing: border-box;
        width: 100%;
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
      }

      .autocomplete {
        position: relative;
        display: grid;
        gap: var(--space-2);
      }

      .autocomplete-shell {
        display: grid;
        gap: var(--space-2);
      }

      .autocomplete-panel {
        position: absolute;
        top: calc(100% + 0.35rem);
        left: 0;
        right: 0;
        z-index: 20;
        max-height: 18rem;
        overflow: auto;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-md);
      }

      .autocomplete-state,
      .autocomplete-option {
        padding: var(--space-2) var(--space-3);
      }

      .autocomplete-state {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .autocomplete-state--error {
        color: var(--color-danger);
      }

      .autocomplete-option {
        width: 100%;
        display: grid;
        gap: 0.15rem;
        border: 0;
        border-bottom: 1px solid var(--color-border-default);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .autocomplete-option:last-child {
        border-bottom: 0;
      }

      .autocomplete-option:hover,
      .autocomplete-option:focus-visible {
        background: var(--color-bg-soft);
      }

      .autocomplete-option strong {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
      }

      .autocomplete-option span {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .autocomplete-meta {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
        min-height: 2.25rem;
      }

      .autocomplete-meta--grid {
        padding-left: 0.1rem;
      }

      .autocomplete-selection {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        overflow-wrap: anywhere;
      }

      .autocomplete-clear {
        padding: 0.4rem 0.65rem;
      }

      .ui-chip {
        white-space: nowrap;
      }

      .filter-actions {
        grid-column: 2;
        grid-row: 2;
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-self: flex-end;
        justify-self: start;
        width: fit-content;
      }

      .filter-actions .ui-button {
        height: 2.75rem;
        box-sizing: border-box;
      }

      .stock-summary {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .stock-table {
        min-width: 980px;
        table-layout: fixed;
        width: 100%;
      }

      .stock-table th,
      .stock-table td {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .col-product,
      .col-warehouse,
      .col-quantity,
      .col-level,
      .col-updated-at {
        white-space: nowrap;
      }

      .col-product {
        width: 40%;
        max-width: 40%;
      }

      .col-warehouse {
        width: 20%;
        max-width: 20%;
      }

      .col-quantity {
        width: 10%;
        max-width: 10%;
      }

      .col-level {
        width: 12%;
        max-width: 12%;
      }

      .col-updated-at {
        width: 18%;
        max-width: 18%;
      }

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

        .filters-top {
          grid-template-columns: 1fr;
        }

        .filters-right {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto;
          justify-content: stretch;
        }

        .field-input--warehouse {
          max-width: none;
          width: 100%;
          min-width: 0;
          grid-column: auto;
          grid-row: auto;
        }

        .filter-actions {
          width: 100%;
          grid-column: auto;
          grid-row: auto;
        }

        .filter-actions .ui-button {
          height: auto;
        }

        .pagination {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
  export class StockPageComponent implements OnInit, OnDestroy {
  readonly filtersForm = this.formBuilder.group({
    productId: [null as number | null],
    warehouseId: [null as number | null],
  });

  warehouses: WarehouseResponse[] = [];
  stocks: StockResponse[] = [];
  productCache = new Map<number, ProductCacheItem>();
  selectedProduct: ProductLookupResponse | null = null;
  selectedProductQuery = "";

  page = 0;
  readonly pageSize = 20;
  totalPages = 1;
  totalElements = 0;

  loading = true;
  errorMessage = "";

  private readonly destroy$ = new Subject<void>();
  private stockRequestId = 0;

  @ViewChild(ProductAutocompleteComponent)
  private readonly productAutocomplete?: ProductAutocompleteComponent;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
  ) {}

  ngOnInit(): void {
    this.watchWarehouseFilter();
    this.loadWarehousesAndStock();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.page = 0;
    this.loadStock();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      productId: null,
      warehouseId: null,
    });
    this.clearProductSelection();
    this.page = 0;
    this.loadStock();
  }

  get selectedProductId(): number | null {
    return this.filtersForm.getRawValue().productId;
  }

  get selectedProductLabel(): string {
    return this.selectedProduct
      ? `${this.selectedProduct.name} (SKU: ${this.selectedProduct.sku})`
      : "";
  }

  selectProduct(product: ProductLookupResponse): void {
    this.filtersForm.patchValue({
      productId: product.id,
    });
    this.productCache.set(product.id, product);
    this.selectedProduct = product;
    this.selectedProductQuery = this.getProductLookupLabel(product);
  }

  clearProductSelection(): void {
    this.filtersForm.patchValue({
      productId: null,
    });
    this.selectedProduct = null;
    this.selectedProductQuery = "";
    this.productAutocomplete?.clear();
  }

  onProductQueryChange(query: string): void {
    this.selectedProductQuery = query;
  }

  getProductLookupLabel(product: ProductLookupResponse): string {
    return `${product.name} (SKU: ${product.sku})`;
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
    const product = this.productCache.get(productId);
    return product
      ? `${product.name} (SKU: ${product.sku})`
      : `Producto #${productId}`;
  }

  resolveWarehouseName(warehouseId: number): string {
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse
      ? warehouse.name
      : `Almacen #${warehouseId}`;
  }

  formatWarehouseLabel(stock: StockResponse): string {
    if (stock.warehouseName) {
      return stock.warehouseName;
    }

    if (stock.warehouseCode) {
      return stock.warehouseCode;
    }

    return this.resolveWarehouseName(stock.warehouseId);
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

  private watchWarehouseFilter(): void {
    this.filtersForm.controls.warehouseId.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.page = 0;
        this.loadStock();
      });
  }

  private loadWarehousesAndStock(): void {
    this.loading = true;
    this.errorMessage = "";

    this.warehouseService
      .list(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (warehouses) => {
          this.warehouses = warehouses;
          this.loadStock();
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudieron cargar almacenes para filtros.",
          );
        },
      });
  }

  private loadStock(): void {
    const value = this.filtersForm.getRawValue();
    const requestId = ++this.stockRequestId;

    this.loading = true;
    this.errorMessage = "";

    this.inventoryService
      .listStocks({
        page: this.page,
        size: this.pageSize,
        productId: value.productId ?? undefined,
        warehouseId: value.warehouseId ?? undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          this.stocks = response.content;
          this.page = response.number;
          this.totalElements = response.totalElements;
          this.totalPages = Math.max(response.totalPages, 1);
          this.loadVisibleProductDetails(response.content, requestId, () => {
            this.loading = false;
          });
        },
        error: (error: unknown) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo consultar el stock.",
          );
        },
      });
  }

  private loadVisibleProductDetails(
    stocks: StockResponse[],
    requestId: number,
    done: () => void,
  ): void {
    const missingIds = Array.from(
      new Set(
        stocks
          .map((stock) => stock.productId)
          .filter((productId) => !this.productCache.has(productId)),
      ),
    );

    if (missingIds.length === 0) {
      done();
      return;
    }

    forkJoin(
      missingIds.map((productId) =>
        this.productService.getById(productId).pipe(
          catchError(() => of(null)),
        ),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          products.forEach((product) => {
            if (product) {
              this.productCache.set(product.id, product);
            }
          });
          done();
        },
        error: () => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          done();
        },
      });
  }

}
