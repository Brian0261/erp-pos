import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

@Component({
  selector: "app-initial-stock-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Stock inicial</h1>
          <p class="ui-page-description">
            Registra la carga inicial por producto y almacen con motivo
            trazable.
          </p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label class="field">
          <span>Producto *</span>
          <select formControlName="productId">
            <option [ngValue]="null">Selecciona un producto</option>
            <option *ngFor="let product of products" [ngValue]="product.id">
              {{ product.name }} (SKU: {{ product.sku }})
            </option>
          </select>
          <small class="field-error" *ngIf="isInvalid('productId')"
            >Producto es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Almacen *</span>
          <select formControlName="warehouseId">
            <option [ngValue]="null">Selecciona un almacen</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
          <small class="field-error" *ngIf="isInvalid('warehouseId')"
            >Almacen es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Cantidad *</span>
          <input
            type="number"
            min="0"
            step="0.001"
            formControlName="quantity"
            placeholder="0.000"
          />
          <small class="field-error" *ngIf="isInvalid('quantity')">
            Cantidad es obligatoria y debe ser mayor o igual que 0.
          </small>
        </label>

        <label class="field full">
          <span>Motivo *</span>
          <textarea
            rows="3"
            formControlName="reason"
            placeholder="Describe el contexto de la carga inicial"
          ></textarea>
          <small class="field-error" *ngIf="isInvalid('reason')"
            >Motivo es obligatorio.</small
          >
        </label>

        <div class="actions full">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Registrando..." : "Registrar stock inicial" }}
          </button>
        </div>
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
    </section>
  `,
  styles: [
    `
      .inventory-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .full {
        grid-column: 1 / -1;
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
      select,
      textarea {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      textarea {
        resize: vertical;
        min-height: 90px;
      }

      .field-error {
        color: var(--color-danger);
        font-size: var(--font-size-xs);
      }

      .actions {
        display: flex;
        justify-content: flex-end;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1000px) {
        .inventory-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class InitialStockPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    productId: [null as number | null, Validators.required],
    warehouseId: [null as number | null, Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0)]],
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
      .registerInitialStock({
        productId: Number(value.productId),
        warehouseId: Number(value.warehouseId),
        quantity: Number(value.quantity),
        reason: (value.reason ?? "").trim(),
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Stock inicial registrado correctamente.";
          this.form.reset();
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo registrar el stock inicial.",
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
