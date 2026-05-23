import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { ProductLookupResponse } from "../catalog/data/catalog.models";
import { ProductAutocompleteComponent } from "../../shared/components/product-autocomplete/product-autocomplete.component";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import {
  InventoryMovementResponse,
  WarehouseResponse,
} from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

type MovementKind =
  | "INITIAL_STOCK"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "PURCHASE_IN"
  | "SALE_OUT"
  | "SALE_VOID_IN";

@Component({
  selector: "app-kardex-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProductAutocompleteComponent],
  template: `
    <section class="ui-card ui-module-page kardex-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Kardex</h1>
          <p class="ui-page-description">
            Consulta movimientos por producto, almacen y fechas con trazabilidad clara.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">{{ errorMessage }}</p>

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Filtros de consulta</h2>
        </header>

        <form class="kardex-filters" [formGroup]="filtersForm" (ngSubmit)="search()">
          <div class="kardex-filters__row kardex-filters__row--product">
            <app-product-autocomplete
              class="kardex-product"
              [placeholder]="'Buscar producto por nombre, SKU o código de barras'"
              [minChars]="2"
              [limit]="10"
              [activeOnly]="true"
              [compact]="true"
              [allowClear]="false"
              [showSelectedCard]="false"
              [selectedProduct]="selectedProduct"
              (productSelected)="onProductSelected($event)"
              (cleared)="clearProductSelection()"
            ></app-product-autocomplete>
          </div>

          <div class="kardex-filters__row kardex-filters__row--secondary">
            <label class="ui-field">
              <span>Almacén</span>
              <select formControlName="warehouseId" [title]="selectedWarehouseTitle">
                <option [ngValue]="null">Todos</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                  [title]="warehouseTitle(warehouse)"
                >
                  {{ warehouseDisplayLabel(warehouse) }}
                </option>
              </select>
            </label>

            <label class="ui-field">
              <span>Desde</span>
              <input type="date" formControlName="from" />
            </label>

            <label class="ui-field">
              <span>Hasta</span>
              <input type="date" formControlName="to" />
            </label>

            <div class="kardex-actions">
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

          <p class="field-error field-error--visible" *ngIf="dateRangeErrorMessage">
            {{ dateRangeErrorMessage }}
          </p>
        </form>
      </section>

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Detalle de movimientos</h2>
          <span class="ui-chip ui-chip--neutral">{{ totalElements }} registros</span>
        </header>

        <p class="ui-alert ui-alert--info" *ngIf="loading">Consultando movimientos...</p>

        <div class="ui-table-wrapper kardex-table-wrapper" *ngIf="!loading">
          <table class="ui-table kardex-table">
            <colgroup>
              <col class="col-date" />
              <col class="col-product" />
              <col class="col-warehouse" />
              <col class="col-movement" />
              <col class="col-quantity" />
              <col class="col-variation" />
              <col class="col-stock-before" />
              <col class="col-stock-after" />
              <col class="col-reason" />
              <col class="col-user" />
            </colgroup>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Almacén</th>
                <th>Movimiento</th>
                <th>Cantidad</th>
                <th>Variación</th>
                <th>Stock antes</th>
                <th>Stock después</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of movements">
                <td class="cell-date" [title]="formatDateTime(row.createdAt)">
                  {{ row.createdAt | date: "dd/MM/yyyy HH:mm" }}
                </td>
                <td class="cell-product" [title]="productTitle(row)">
                  <div class="cell-product__body">
                    <strong>{{ row.productName || productFallback(row.productId) }}</strong>
                    <span *ngIf="row.productSku || row.productBarcode">
                      {{ productSubtitle(row) }}
                    </span>
                  </div>
                </td>
                <td class="cell-warehouse" [title]="warehouseTitleFromRow(row)">
                  <div class="cell-warehouse__body">
                    {{ row.warehouseName || warehouseFallback(row.warehouseId) }}
                  </div>
                </td>
                <td>
                  <span
                    class="ui-chip"
                    [ngClass]="movementChipClass(row.movementType)"
                    [title]="row.movementType"
                  >
                    {{ movementLabel(row.movementType) }}
                  </span>
                </td>
                <td class="cell-number">
                  {{ numberOf(row.quantity) | number: "1.0-3" }}
                </td>
                <td class="cell-number">
                  <span
                    class="variation"
                    [class.variation--positive]="stockDelta(row) > 0"
                    [class.variation--negative]="stockDelta(row) < 0"
                    [title]="stockDelta(row) > 0 ? 'Variación positiva' : stockDelta(row) < 0 ? 'Variación negativa' : 'Sin variación'"
                  >
                    {{ stockDelta(row) > 0 ? '+' : '' }}{{ numberOf(stockDelta(row)) | number: "1.0-3" }}
                  </span>
                </td>
                <td class="cell-number">
                  {{ numberOf(row.previousStock) | number: "1.0-3" }}
                </td>
                <td class="cell-number">
                  {{ numberOf(row.newStock) | number: "1.0-3" }}
                </td>
                <td class="cell-reason" [title]="row.reason || '-'">
                  {{ row.reason || '-' }}
                </td>
                <td class="cell-user">{{ row.createdBy || '-' }}</td>
              </tr>
              <tr *ngIf="!loading && movements.length === 0">
                <td colspan="10" class="ui-table__empty">
                  <div class="ui-empty-state">
                    No hay movimientos para los filtros seleccionados.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pagination" *ngIf="!loading">
          <p class="ui-muted pagination-copy">
            Pagina {{ page + 1 }} de {{ totalPages }} - {{ totalElements }} resultados
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
    </section>
  `,
  styles: [
    `
      .kardex-filters {
        display: grid;
        gap: var(--space-3);
      }

      .kardex-filters__row {
        display: grid;
        gap: var(--space-3);
      }

      .kardex-filters__row--product {
        grid-template-columns: minmax(0, 1fr);
      }

      .kardex-filters__row--secondary {
        grid-template-columns: minmax(180px, 1.1fr) repeat(2, minmax(160px, 0.8fr)) auto;
        align-items: end;
      }

      .kardex-actions {
        display: flex;
        gap: var(--space-2);
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .field-error {
        min-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        visibility: hidden;
      }

      .field-error--visible {
        visibility: visible;
      }

      .kardex-table-wrapper {
        overflow-x: auto;
      }

      .kardex-table {
        table-layout: fixed;
        min-width: 1500px;
      }

      .kardex-table th,
      .kardex-table td {
        vertical-align: top;
      }

      .kardex-table td {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .kardex-table .col-date {
        width: 9rem;
      }

      .kardex-table .col-product {
        width: 24rem;
      }

      .kardex-table .col-warehouse {
        width: 8.5rem;
      }

      .kardex-table .col-movement {
        width: 10.5rem;
      }

      .kardex-table .col-quantity {
        width: 6rem;
      }

      .kardex-table .col-variation {
        width: 6.75rem;
      }

      .kardex-table .col-stock-before,
      .kardex-table .col-stock-after {
        width: 7rem;
      }

      .kardex-table .col-reason {
        width: 9rem;
      }

      .kardex-table .col-user {
        width: 8rem;
      }

      .cell-date,
      .cell-number,
      .cell-warehouse,
      .cell-user {
        white-space: nowrap;
      }

      .cell-number {
        text-align: right;
      }

      .cell-reason,
      .cell-user {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cell-product__body,
      .cell-warehouse__body {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .cell-product__body strong,
      .cell-warehouse__body {
        color: var(--color-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-product__body span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-warehouse__body {
        white-space: nowrap;
      }

      .variation {
        font-weight: 700;
      }

      .variation--positive {
        color: var(--color-success);
      }

      .variation--negative {
        color: var(--color-danger);
      }

      .pagination {
        margin-top: var(--space-4);
        display: flex;
        gap: var(--space-3);
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }

      .pagination-copy {
        margin: 0;
      }

      .pagination-actions {
        display: flex;
        gap: var(--space-2);
        justify-content: flex-end;
        align-items: center;
        flex-wrap: wrap;
      }

      .page-jump {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .page-jump__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        white-space: nowrap;
      }

      .page-jump__input {
        width: 5rem;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1200px) {
        .kardex-filters__row--secondary {
          grid-template-columns: 1fr;
        }

        .kardex-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class KardexPageComponent implements OnInit, OnDestroy {
  readonly filtersForm = this.formBuilder.group(
    {
      productId: [null as number | null],
      warehouseId: [null as number | null],
      from: [""],
      to: [""],
    },
    { validators: [this.dateRangeValidator()] },
  );

  @ViewChild(ProductAutocompleteComponent)
  private productAutocomplete?: ProductAutocompleteComponent;

  readonly destroy$ = new Subject<void>();

  selectedProduct: ProductLookupResponse | null = null;
  warehouses: WarehouseResponse[] = [];
  movements: InventoryMovementResponse[] = [];
  page = 0;
  pageSize = 20;
  totalPages = 1;
  totalElements = 0;
  pageJumpValue = "";
  loading = true;
  errorMessage = "";
  dateRangeErrorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadMovements();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  search(): void {
    this.errorMessage = "";
    this.dateRangeErrorMessage = "";

    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      if (this.filtersForm.hasError("invalidDateRange")) {
        this.dateRangeErrorMessage = "La fecha Desde no puede ser mayor que Hasta.";
      }
      return;
    }

    this.page = 0;
    this.loadMovements();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      productId: null,
      warehouseId: null,
      from: "",
      to: "",
    });
    this.selectedProduct = null;
    this.dateRangeErrorMessage = "";
    this.errorMessage = "";
    this.page = 0;
    this.pageJumpValue = "";
    this.productAutocomplete?.clear();
    this.loadMovements();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }

    this.page -= 1;
    this.pageJumpValue = String(this.page + 1);
    this.loadMovements();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.pageJumpValue = String(this.page + 1);
    this.loadMovements();
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
    this.loadMovements();
  }

  onProductSelected(product: ProductLookupResponse): void {
    this.selectedProduct = product;
    this.filtersForm.patchValue({ productId: product.id });
  }

  clearProductSelection(): void {
    this.selectedProduct = null;
    this.filtersForm.patchValue({ productId: null });
  }

  warehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona un almacén";
  }

  warehouseTitle(warehouse: WarehouseResponse): string {
    const name = warehouse.name?.trim() || "";
    const code = warehouse.code?.trim() || "";
    return code && name ? `${code} - ${name}` : code || name || "Selecciona un almacén";
  }

  get selectedWarehouseTitle(): string {
    const warehouseId = this.filtersForm.getRawValue().warehouseId;
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse ? this.warehouseTitle(warehouse) : "Todos";
  }

  movementLabel(movementType: string): string {
    const map: Record<MovementKind, string> = {
      INITIAL_STOCK: "Stock inicial",
      ADJUSTMENT_IN: "Ajuste positivo",
      ADJUSTMENT_OUT: "Ajuste negativo",
      TRANSFER_IN: "Transferencia entrada",
      TRANSFER_OUT: "Transferencia salida",
      PURCHASE_IN: "Compra",
      SALE_OUT: "Venta",
      SALE_VOID_IN: "Anulación de venta",
    };

    return map[movementType as MovementKind] || movementType;
  }

  movementChipClass(movementType: string): string {
    switch (movementType as MovementKind) {
      case "SALE_OUT":
      case "TRANSFER_OUT":
        return "ui-chip--warning";
      case "SALE_VOID_IN":
      case "PURCHASE_IN":
      case "TRANSFER_IN":
      case "INITIAL_STOCK":
        return "ui-chip--success";
      case "ADJUSTMENT_IN":
      case "ADJUSTMENT_OUT":
        return "ui-chip--info";
      default:
        return "ui-chip--neutral";
    }
  }

  stockDelta(movement: InventoryMovementResponse): number {
    return Number(movement.newStock) - Number(movement.previousStock);
  }

  numberOf(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatDateTime(value: string): string {
    return value ? new Date(value).toLocaleString() : "";
  }

  productTitle(row: InventoryMovementResponse): string {
    return [
      row.productName || this.productFallback(row.productId),
      row.productSku ? `SKU: ${row.productSku}` : "",
      row.productBarcode ? `Código: ${row.productBarcode}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  productSubtitle(row: InventoryMovementResponse): string {
    const parts = [];
    if (row.productSku) {
      parts.push(`SKU: ${row.productSku}`);
    }
    if (row.productBarcode) {
      parts.push(`Código: ${row.productBarcode}`);
    }
    return parts.join(" · ");
  }

  warehouseTitleFromRow(row: InventoryMovementResponse): string {
    return row.warehouseCode && row.warehouseName
      ? `${row.warehouseCode} - ${row.warehouseName}`
      : row.warehouseName || this.warehouseFallback(row.warehouseId);
  }

  productFallback(productId: number): string {
    return `Producto #${productId}`;
  }

  warehouseFallback(warehouseId: number): string {
    return `Almacén #${warehouseId}`;
  }

  private loadMovements(): void {
    const value = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";

    this.inventoryService
      .kardex({
        productId: value.productId ?? undefined,
        warehouseId: value.warehouseId ?? undefined,
        from: value.from ? value.from : undefined,
        to: value.to ? value.to : undefined,
        page: this.page,
        size: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.movements = response.content;
          this.page = response.number;
          this.totalElements = response.totalElements;
          this.totalPages = Math.max(response.totalPages, 1);
          this.pageJumpValue = String(this.page + 1);
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(error, "No se pudo consultar el kardex.");
        },
      });
  }

  private loadWarehouses(): void {
    this.warehouseService
      .list(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (warehouses) => {
          this.warehouses = warehouses;
        },
        error: (error: unknown) => {
          this.errorMessage = toHttpErrorMessage(error, "No se pudieron cargar almacenes.");
        },
      });
  }

  private dateRangeValidator(): ValidatorFn {
    return (control): ValidationErrors | null => {
      const from = String(control.get("from")?.value ?? "").trim();
      const to = String(control.get("to")?.value ?? "").trim();

      if (!from || !to) {
        return null;
      }

      return from > to ? { invalidDateRange: true } : null;
    };
  }
}
