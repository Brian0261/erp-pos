import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

@Component({
  selector: "app-transfers-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <h1>Inventario - Transferencias</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <label>
          Almacen origen *
          <select formControlName="sourceWarehouseId">
            <option [ngValue]="null">Selecciona origen</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('sourceWarehouseId')"
            >Almacen origen es obligatorio.</small
          >
        </label>

        <label>
          Almacen destino *
          <select formControlName="targetWarehouseId">
            <option [ngValue]="null">Selecciona destino</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('targetWarehouseId')"
            >Almacen destino es obligatorio.</small
          >
        </label>

        <label class="full">
          Motivo *
          <textarea rows="2" formControlName="reason"></textarea>
          <small class="error" *ngIf="isInvalid('reason')"
            >Motivo es obligatorio.</small
          >
        </label>

        <section class="items full">
          <header class="items-header">
            <h2>Productos a transferir</h2>
            <button type="button" class="secondary" (click)="addItem()">
              Agregar producto
            </button>
          </header>

          <div formArrayName="items" class="items-list">
            <div
              class="item-row"
              *ngFor="let item of items.controls; let i = index"
              [formGroupName]="i"
            >
              <label>
                Producto *
                <select formControlName="productId">
                  <option [ngValue]="null">Selecciona producto</option>
                  <option
                    *ngFor="let product of products"
                    [ngValue]="product.id"
                  >
                    {{ product.name }} (SKU: {{ product.sku }})
                  </option>
                </select>
              </label>

              <label>
                Cantidad *
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  formControlName="quantity"
                />
              </label>

              <button
                type="button"
                class="danger"
                (click)="removeItem(i)"
                [disabled]="items.length === 1"
              >
                Quitar
              </button>
            </div>
          </div>
        </section>

        <div class="actions full">
          <button type="submit" [disabled]="saving">
            {{ saving ? "Registrando..." : "Registrar transferencia" }}
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
      h1,
      h2 {
        margin: 0;
      }
      .grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
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
      .items {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.75rem;
        display: grid;
        gap: 0.75rem;
      }
      .items-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .items-list {
        display: grid;
        gap: 0.6rem;
      }
      .item-row {
        display: grid;
        grid-template-columns: 1fr 180px auto;
        gap: 0.6rem;
        align-items: end;
      }
      button {
        padding: 0.55rem 0.9rem;
        border: 0;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
      }
      .danger {
        background: #b91c1c;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
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
        .grid {
          grid-template-columns: 1fr;
        }
        .item-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TransfersPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    sourceWarehouseId: [null as number | null, Validators.required],
    targetWarehouseId: [null as number | null, Validators.required],
    reason: ["", [Validators.required, Validators.maxLength(300)]],
    items: this.formBuilder.array([this.createItemGroup()]),
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

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }
    this.items.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.items.length === 0) {
      this.errorMessage = "La transferencia debe tener al menos un producto.";
      return;
    }

    const value = this.form.getRawValue();
    if (value.sourceWarehouseId === value.targetWarehouseId) {
      this.errorMessage =
        "El almacen origen debe ser distinto al almacen destino.";
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.inventoryService
      .transfer({
        sourceWarehouseId: Number(value.sourceWarehouseId),
        targetWarehouseId: Number(value.targetWarehouseId),
        reason: (value.reason ?? "").trim(),
        items:
          value.items?.map((item) => ({
            productId: Number(item["productId"]),
            quantity: Number(item["quantity"]),
          })) ?? [],
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Transferencia registrada correctamente.";
          this.form.patchValue({
            reason: "",
            sourceWarehouseId: null,
            targetWarehouseId: null,
          });
          while (this.items.length > 1) {
            this.items.removeAt(this.items.length - 1);
          }
          this.items.at(0).reset({ productId: null, quantity: null });
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo registrar la transferencia.",
          );
        },
      });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private createItemGroup(): FormGroup {
    return this.formBuilder.group({
      productId: [null as number | null, Validators.required],
      quantity: [
        null as number | null,
        [Validators.required, Validators.min(0.0001)],
      ],
    });
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
