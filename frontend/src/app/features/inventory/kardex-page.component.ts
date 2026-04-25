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
    <section class="card">
      <header>
        <h1>Inventario - Kardex</h1>
        <p class="muted">
          Consulta movimientos por producto, almacen y fechas.
        </p>
      </header>

      <form [formGroup]="filtersForm" (ngSubmit)="search()" class="form-grid">
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

        <label>
          Desde
          <input type="date" formControlName="from" />
        </label>

        <label>
          Hasta
          <input type="date" formControlName="to" />
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
      <p class="muted" *ngIf="loading">Consultando movimientos...</p>

      <div class="table-wrapper" *ngIf="!loading">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Almacen</th>
              <th>Movimiento</th>
              <th>Cantidad</th>
              <th>Stock anterior</th>
              <th>Stock nuevo</th>
              <th>Motivo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let movement of movements">
              <td>{{ movement.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
              <td>{{ resolveProductName(movement.productId) }}</td>
              <td>{{ resolveWarehouseName(movement.warehouseId) }}</td>
              <td>{{ movement.movementType }}</td>
              <td>{{ movement.quantity | number: "1.0-3" }}</td>
              <td>{{ movement.previousStock | number: "1.0-3" }}</td>
              <td>{{ movement.newStock | number: "1.0-3" }}</td>
              <td>{{ movement.reason }}</td>
              <td>{{ movement.createdBy || "-" }}</td>
            </tr>
            <tr *ngIf="movements.length === 0">
              <td colspan="9" class="empty">
                No hay movimientos para los filtros seleccionados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
        grid-template-columns: repeat(6, minmax(150px, 1fr));
        gap: 0.75rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
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
        min-width: 1300px;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #e5e7eb;
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
      @media (max-width: 1200px) {
        .form-grid {
          grid-template-columns: 1fr;
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
