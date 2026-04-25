import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { AdjustmentType, WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

@Component({
  selector: "app-adjustments-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <h1>Inventario - Ajustes</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label>
          Tipo de ajuste *
          <select formControlName="type">
            <option [ngValue]="'IN'">Positivo (IN)</option>
            <option [ngValue]="'OUT'">Negativo (OUT)</option>
          </select>
        </label>

        <label>
          Producto *
          <select formControlName="productId">
            <option [ngValue]="null">Selecciona un producto</option>
            <option *ngFor="let product of products" [ngValue]="product.id">
              {{ product.name }} (SKU: {{ product.sku }})
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('productId')"
            >Producto es obligatorio.</small
          >
        </label>

        <label>
          Almacen *
          <select formControlName="warehouseId">
            <option [ngValue]="null">Selecciona un almacen</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('warehouseId')"
            >Almacen es obligatorio.</small
          >
        </label>

        <label>
          Cantidad *
          <input
            type="number"
            min="0.001"
            step="0.001"
            formControlName="quantity"
          />
          <small class="error" *ngIf="isInvalid('quantity')">
            Cantidad es obligatoria y debe ser mayor que 0.
          </small>
        </label>

        <label class="full">
          Motivo *
          <textarea rows="3" formControlName="reason"></textarea>
          <small class="error" *ngIf="isInvalid('reason')"
            >Motivo es obligatorio.</small
          >
        </label>

        <div class="actions full">
          <button type="submit" [disabled]="saving">
            {{ saving ? "Registrando..." : "Registrar ajuste" }}
          </button>
        </div>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>
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
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: 0.75rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      textarea {
        padding: 0.55rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      button {
        padding: 0.55rem 0.9rem;
        border: 0;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .error {
        color: #b91c1c;
        margin: 0;
      }
      .success {
        color: #166534;
        margin: 0;
      }
      @media (max-width: 1000px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdjustmentsPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    type: ["IN" as AdjustmentType, Validators.required],
    productId: [null as number | null, Validators.required],
    warehouseId: [null as number | null, Validators.required],
    quantity: [
      null as number | null,
      [Validators.required, Validators.min(0.0001)],
    ],
    reason: ["", [Validators.required, Validators.maxLength(300)]],
  });

  products: Product[] = [];
  warehouses: WarehouseResponse[] = [];

  saving = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
  ) {}

  ngOnInit(): void {
    this.loadLookups();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.form.getRawValue();

    this.inventoryService
      .registerAdjustment({
        type: value.type as AdjustmentType,
        productId: Number(value.productId),
        warehouseId: Number(value.warehouseId),
        quantity: Number(value.quantity),
        reason: (value.reason ?? "").trim(),
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Ajuste registrado correctamente.";
          this.form.patchValue({ quantity: null, reason: "" });
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo registrar el ajuste.",
          );
        },
      });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private loadLookups(): void {
    forkJoin({
      productsPage: this.productService.list(0, 300),
      warehouses: this.warehouseService.list(true),
    }).subscribe({
      next: ({ productsPage, warehouses }) => {
        this.products = productsPage.content;
        this.warehouses = warehouses;
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar productos/almacenes.",
        );
      },
    });
  }
}
