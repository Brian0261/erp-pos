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
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Transferencias</h1>
          <p class="ui-page-description">
            Mueve stock entre almacenes con trazabilidad por motivo y detalle de
            items.
          </p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <label class="field">
          <span>Almacen origen *</span>
          <select formControlName="sourceWarehouseId">
            <option [ngValue]="null">Selecciona origen</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
          <small class="field-error" *ngIf="isInvalid('sourceWarehouseId')"
            >Almacen origen es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Almacen destino *</span>
          <select formControlName="targetWarehouseId">
            <option [ngValue]="null">Selecciona destino</option>
            <option
              *ngFor="let warehouse of warehouses"
              [ngValue]="warehouse.id"
            >
              {{ warehouse.code }} - {{ warehouse.name }}
            </option>
          </select>
          <small class="field-error" *ngIf="isInvalid('targetWarehouseId')"
            >Almacen destino es obligatorio.</small
          >
        </label>

        <label class="field full">
          <span>Motivo *</span>
          <textarea
            rows="2"
            formControlName="reason"
            placeholder="Motivo operativo de la transferencia"
          ></textarea>
          <small class="field-error" *ngIf="isInvalid('reason')"
            >Motivo es obligatorio.</small
          >
        </label>

        <section class="items full">
          <header class="items-header">
            <h2>Productos a transferir</h2>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="addItem()"
            >
              Agregar producto
            </button>
          </header>

          <div formArrayName="items" class="items-list">
            <div
              class="item-row"
              *ngFor="let item of items.controls; let i = index"
              [formGroupName]="i"
            >
              <span class="item-index">Item {{ i + 1 }}</span>

              <label class="field">
                <span>Producto *</span>
                <select formControlName="productId">
                  <option [ngValue]="null">
                    Selecciona un producto activo
                  </option>
                  <option
                    *ngFor="let product of activeProducts()"
                    [ngValue]="product.id"
                  >
                    {{ product.name }} (SKU: {{ product.sku }})
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Cantidad *</span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  formControlName="quantity"
                  placeholder="0.000"
                />
              </label>

              <button
                type="button"
                class="ui-button ui-button--danger"
                (click)="removeItem(i)"
                [disabled]="items.length === 1"
              >
                Quitar
              </button>
            </div>
          </div>
        </section>

        <div class="actions full">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Registrando..." : "Registrar transferencia" }}
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

      h1,
      h2 {
        margin: 0;
      }

      .grid {
        display: grid;
        gap: var(--space-3);
        grid-template-columns: repeat(2, minmax(240px, 1fr));
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
      }

      .field-error {
        color: var(--color-danger);
        font-size: var(--font-size-xs);
      }

      .items {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .items-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
      }

      .items-list {
        display: grid;
        gap: var(--space-2);
      }

      .item-row {
        display: grid;
        grid-template-columns: auto 1fr 180px auto;
        gap: var(--space-2);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        padding: var(--space-2);
      }

      .item-index {
        align-self: center;
        font-size: var(--font-size-xs);
        font-weight: 700;
        color: var(--color-text-secondary);
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-pill);
        padding: var(--space-1) var(--space-2);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
      }

      @media (max-width: 1000px) {
        .inventory-page {
          padding: var(--space-4);
        }

        .grid {
          grid-template-columns: 1fr;
        }

        .item-row {
          grid-template-columns: 1fr;
        }

        .actions {
          justify-content: flex-start;
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
          this.errorMessage = this.toSubmitErrorMessage(error);
        },
      });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  activeProducts(): Product[] {
    return this.products.filter((product) => product.active === true);
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
        this.products = productsPage.content.filter(
          (product) => product.active,
        );
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

  private toSubmitErrorMessage(error: unknown): string {
    const message = toHttpErrorMessage(
      error,
      "No se pudo registrar la transferencia.",
    );
    if (message.includes("Product is inactive")) {
      return "El producto seleccionado esta inactivo. Elige un producto activo.";
    }
    return message;
  }
}
