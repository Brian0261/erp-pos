import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderCreateRequest,
  PurchaseOrderItemRequest,
  SupplierResponse,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";
import { SupplierService } from "./data/supplier.service";

@Component({
  selector: "app-purchase-order-new-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1>Nueva orden de compra</h1>
          <p class="muted">Registra una orden en estado borrador.</p>
        </div>
        <a [routerLink]="['/compras/ordenes']">Volver al listado</a>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <label>
          Proveedor *
          <select formControlName="supplierId">
            <option [ngValue]="null">Selecciona proveedor</option>
            <option *ngFor="let supplier of suppliers" [ngValue]="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('supplierId')"
            >Proveedor es obligatorio.</small
          >
        </label>

        <label>
          Almacen *
          <select formControlName="warehouseId">
            <option [ngValue]="null">Selecciona almacen</option>
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
          Fecha orden
          <input type="date" formControlName="orderDate" />
        </label>

        <label>
          Fecha esperada
          <input type="date" formControlName="expectedDate" />
        </label>

        <label class="full">
          Notas
          <textarea rows="3" maxlength="400" formControlName="notes"></textarea>
        </label>

        <section class="items full">
          <header class="items-header">
            <h2>Items</h2>
            <button type="button" class="secondary" (click)="addItem()">
              Agregar item
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
                    {{ product.name }} ({{ product.sku }})
                  </option>
                </select>
              </label>

              <label>
                Cantidad *
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  formControlName="quantityOrdered"
                />
              </label>

              <label>
                Costo unitario *
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  formControlName="unitCost"
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

        <p class="muted full total">
          Total estimado: {{ totalAmount | number: "1.2-2" }}
        </p>

        <div class="actions full">
          <button type="submit" [disabled]="saving">
            {{ saving ? "Guardando..." : "Crear orden" }}
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
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .header a {
        color: #1e3a8a;
        text-decoration: none;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.65rem;
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
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      .items {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.75rem;
        display: grid;
        gap: 0.7rem;
      }
      .items-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .items-list {
        display: grid;
        gap: 0.55rem;
      }
      .item-row {
        display: grid;
        grid-template-columns: 1fr 180px 180px auto;
        gap: 0.55rem;
        align-items: end;
      }
      button {
        padding: 0.45rem 0.8rem;
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
      .total {
        font-weight: 700;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 1100px) {
        .item-row {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 800px) {
        .grid {
          grid-template-columns: 1fr;
        }
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class PurchaseOrderNewPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    supplierId: [null as number | null, Validators.required],
    warehouseId: [null as number | null, Validators.required],
    orderDate: [this.todayIsoDate()],
    expectedDate: [""],
    notes: ["", [Validators.maxLength(400)]],
    items: this.formBuilder.array([this.createItemGroup()]),
  });

  suppliers: SupplierResponse[] = [];
  warehouses: WarehouseResponse[] = [];
  products: Product[] = [];

  saving = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierService: SupplierService,
    private readonly warehouseService: WarehouseService,
    private readonly productService: ProductService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.items.valueChanges.subscribe(() => {
      this.successMessage = "";
    });
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  get totalAmount(): number {
    return this.items.controls.reduce((sum, group) => {
      const quantity = Number(group.get("quantityOrdered")?.value ?? 0);
      const unitCost = Number(group.get("unitCost")?.value ?? 0);
      return sum + quantity * unitCost;
    }, 0);
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
      this.errorMessage = "La orden debe contener al menos un item.";
      return;
    }

    const payloadItems = this.items.controls
      .map((group) => this.mapItem(group))
      .filter((item) => item !== null) as PurchaseOrderItemRequest[];

    if (payloadItems.length === 0) {
      this.errorMessage = "Ingresa al menos un item valido para la orden.";
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const raw = this.form.getRawValue();
    const payload: PurchaseOrderCreateRequest = {
      supplierId: Number(raw.supplierId),
      warehouseId: Number(raw.warehouseId),
      orderDate: this.normalizeOptional(raw.orderDate),
      expectedDate: this.normalizeOptional(raw.expectedDate),
      notes: this.normalizeOptional(raw.notes),
      items: payloadItems,
    };

    this.purchaseOrderService.create(payload).subscribe({
      next: (order) => {
        this.saving = false;
        this.successMessage = "Orden creada correctamente.";
        this.router.navigate(["/compras/ordenes", order.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo crear la orden.",
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
      quantityOrdered: [
        null as number | null,
        [Validators.required, Validators.min(0.0001)],
      ],
      unitCost: [
        null as number | null,
        [Validators.required, Validators.min(0)],
      ],
    });
  }

  private loadLookups(): void {
    forkJoin({
      suppliers: this.supplierService.list(),
      warehouses: this.warehouseService.list(true),
      productsPage: this.productService.list(0, 500),
    }).subscribe({
      next: ({ suppliers, warehouses, productsPage }) => {
        this.suppliers = suppliers.filter((supplier) => supplier.active);
        this.warehouses = warehouses.filter((warehouse) => warehouse.active);
        this.products = productsPage.content.filter(
          (product) => product.active,
        );
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar proveedores, almacenes y productos.",
        );
      },
    });
  }

  private mapItem(group: FormGroup): PurchaseOrderItemRequest | null {
    const productId = Number(group.get("productId")?.value ?? 0);
    const quantityOrdered = Number(group.get("quantityOrdered")?.value ?? 0);
    const unitCost = Number(group.get("unitCost")?.value ?? 0);

    if (!productId || quantityOrdered <= 0 || unitCost < 0) {
      return null;
    }

    return {
      productId,
      quantityOrdered,
      unitCost,
    };
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
