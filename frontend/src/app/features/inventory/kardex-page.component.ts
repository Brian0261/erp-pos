import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import {
  InventoryMovementResponse,
  WarehouseResponse,
} from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

@Component({
  selector: "app-kardex-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Kardex</h1>
          <p class="ui-page-description">
            Consulta movimientos por producto, almacen y fechas.
          </p>
        </div>
      </header>

      <form
        [formGroup]="filtersForm"
        (ngSubmit)="search()"
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

        <label class="field">
          <span>Desde</span>
          <input type="date" formControlName="from" />
        </label>

        <label class="field">
          <span>Hasta</span>
          <input type="date" formControlName="to" />
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

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Consultando movimientos...
      </p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table kardex-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Almacen</th>
              <th>Movimiento</th>
              <th>Cantidad</th>
              <th>Delta</th>
              <th>Stock anterior</th>
              <th>Stock nuevo</th>
              <th>Motivo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let movement of movements">
              <td class="cell-date">
                {{ movement.createdAt | date: "yyyy-MM-dd HH:mm" }}
              </td>
              <td>{{ resolveProductName(movement.productId) }}</td>
              <td>{{ resolveWarehouseName(movement.warehouseId) }}</td>
              <td>
                <span class="ui-badge" [class]="movementBadgeClass(movement)">
                  {{ movement.movementType }}
                </span>
              </td>
              <td class="cell-number">
                {{ movement.quantity | number: "1.0-3" }}
              </td>
              <td>
                <span
                  class="delta"
                  [class.delta--in]="stockDelta(movement) > 0"
                  [class.delta--out]="stockDelta(movement) < 0"
                >
                  {{ stockDelta(movement) | number: "1.0-3" }}
                </span>
              </td>
              <td class="cell-number">
                {{ movement.previousStock | number: "1.0-3" }}
              </td>
              <td class="cell-number">
                {{ movement.newStock | number: "1.0-3" }}
              </td>
              <td>{{ movement.reason }}</td>
              <td>{{ movement.createdBy || "-" }}</td>
            </tr>
            <tr *ngIf="movements.length === 0">
              <td colspan="10" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay movimientos para los filtros seleccionados.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
        grid-template-columns: repeat(6, minmax(150px, 1fr));
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

      input,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      .field-action {
        display: flex;
        justify-content: flex-end;
      }

      .kardex-table {
        min-width: 1380px;
      }

      .cell-date,
      .cell-number {
        white-space: nowrap;
      }

      .cell-number {
        text-align: right;
      }

      .delta {
        font-weight: 700;
      }

      .delta--in {
        color: var(--color-success);
      }

      .delta--out {
        color: var(--color-danger);
      }

      .ui-badge--movement-in {
        background: #dcfce7;
        color: var(--color-success);
      }

      .ui-badge--movement-out {
        background: #fee2e2;
        color: var(--color-danger);
      }

      .ui-badge--movement-neutral {
        background: #dbeafe;
        color: var(--color-info);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1200px) {
        .inventory-page {
          padding: var(--space-4);
        }

        .filters-grid {
          grid-template-columns: 1fr;
        }

        .field-action {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class KardexPageComponent implements OnInit {
  readonly filtersForm = this.formBuilder.group({
    productId: [null as number | null],
    warehouseId: [null as number | null],
    from: [""],
    to: [""],
  });

  products: Product[] = [];
  warehouses: WarehouseResponse[] = [];
  movements: InventoryMovementResponse[] = [];

  loading = true;
  errorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
  ) {}

  ngOnInit(): void {
    this.loadLookupsAndSearch();
  }

  search(): void {
    const value = this.filtersForm.getRawValue();
    if (value.from && value.to && value.from > value.to) {
      this.errorMessage =
        "El rango de fechas es invalido: desde no puede ser mayor que hasta.";
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.inventoryService
      .kardex({
        productId: value.productId ?? undefined,
        warehouseId: value.warehouseId ?? undefined,
        from: value.from ? value.from : undefined,
        to: value.to ? value.to : undefined,
      })
      .subscribe({
        next: (movements) => {
          this.loading = false;
          this.movements = movements;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo consultar el kardex.",
          );
        },
      });
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.search();
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

  stockDelta(movement: InventoryMovementResponse): number {
    return Number(movement.newStock) - Number(movement.previousStock);
  }

  movementBadgeClass(movement: InventoryMovementResponse): string {
    const type = (movement.movementType || "").toUpperCase();
    if (type.includes("OUT") || type.includes("VOID")) {
      return "ui-badge--movement-out";
    }

    if (
      type.includes("IN") ||
      type.includes("INITIAL") ||
      type.includes("ADJUST")
    ) {
      return "ui-badge--movement-in";
    }

    return "ui-badge--movement-neutral";
  }

  private loadLookupsAndSearch(): void {
    this.loading = true;
    this.errorMessage = "";

    forkJoin({
      productsPage: this.productService.list(0, 300),
      warehouses: this.warehouseService.list(),
    }).subscribe({
      next: ({ productsPage, warehouses }) => {
        this.products = productsPage.content;
        this.warehouses = warehouses;
        this.search();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar productos/almacenes.",
        );
      },
    });
  }
}
