import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderItemRequest,
  PurchaseOrderResponse,
  PurchaseOrderUpdateRequest,
  SupplierResponse,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";
import { SupplierService } from "./data/supplier.service";

@Component({
  selector: "app-purchase-order-edit-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card order-edit-page" *ngIf="order">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Editar orden #{{ order.id }}</h1>
          <p class="ui-page-description">
            Solo las ordenes en estado BORRADOR se pueden modificar.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/compras/ordenes', order.id]"
        >
          Volver al detalle
        </a>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="order.status !== 'DRAFT'">
        Esta orden no esta en borrador. No es posible editarla.
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form
        *ngIf="order.status === 'DRAFT'"
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="form-layout"
      >
        <section class="form-section">
          <header class="section-head">
            <h2>Proveedor y almacen</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Proveedor *</span>
              <select formControlName="supplierId">
                <option [ngValue]="null">Selecciona proveedor</option>
                <option
                  *ngFor="let supplier of suppliers"
                  [ngValue]="supplier.id"
                >
                  {{ supplier.name }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>Almacen *</span>
              <select formControlName="warehouseId">
                <option [ngValue]="null">Selecciona almacen</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                >
                  {{ warehouse.code }} - {{ warehouse.name }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Datos generales</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Fecha esperada</span>
              <input type="date" formControlName="expectedDate" />
            </label>

            <label class="field full">
              <span>Notas</span>
              <textarea
                rows="3"
                maxlength="400"
                formControlName="notes"
              ></textarea>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head section-head--actions">
            <h2>Items</h2>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="addItem()"
            >
              Agregar item
            </button>
          </header>

          <div formArrayName="items" class="items-list">
            <div
              class="item-row"
              *ngFor="let item of items.controls; let i = index"
              [formGroupName]="i"
            >
              <label class="field item-product">
                <span>Producto *</span>
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

              <label class="field">
                <span>Cantidad *</span>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  formControlName="quantityOrdered"
                />
              </label>

              <label class="field">
                <span>Costo unitario *</span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  formControlName="unitCost"
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

          <aside class="totals-panel">
            <p class="label">Total estimado</p>
            <p class="value">{{ totalAmount | number: "1.2-2" }}</p>
          </aside>
        </section>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Actualizando..." : "Guardar cambios" }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .order-edit-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .form-layout {
        display: grid;
        gap: var(--space-4);
      }

      .form-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .section-head--actions {
        border-bottom: 1px solid var(--color-border-default);
        padding-bottom: var(--space-2);
      }

      .form-grid {
        display: grid;
        gap: var(--space-3);
      }

      .form-grid--two {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
      }

      .full {
        grid-column: 1 / -1;
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      input,
      select,
      textarea {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .items-list {
        display: grid;
        gap: var(--space-3);
      }

      .item-row {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        padding: var(--space-3);
        display: grid;
        grid-template-columns: minmax(220px, 1fr) 170px 170px auto;
        gap: var(--space-2);
        align-items: end;
      }

      .totals-panel {
        border-top: 1px dashed var(--color-border-default);
        padding-top: var(--space-3);
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-2);
      }

      .totals-panel .label {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      .totals-panel .value {
        margin: 0;
        font-size: 1.35rem;
        font-family: var(--font-family-display);
        font-weight: 700;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1100px) {
        .item-row {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 800px) {
        .order-edit-page {
          padding: var(--space-4);
        }

        .form-grid--two {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PurchaseOrderEditPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    supplierId: [null as number | null, Validators.required],
    warehouseId: [null as number | null, Validators.required],
    expectedDate: [""],
    notes: ["", [Validators.maxLength(400)]],
    items: this.formBuilder.array([]),
  });

  order: PurchaseOrderResponse | null = null;

  suppliers: SupplierResponse[] = [];
  warehouses: WarehouseResponse[] = [];
  products: Product[] = [];

  saving = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly supplierService: SupplierService,
    private readonly warehouseService: WarehouseService,
    private readonly productService: ProductService,
    private readonly purchaseOrderService: PurchaseOrderService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.router.navigate(["/compras/ordenes"]);
      return;
    }

    this.loadLookupsAndOrder(id);
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as unknown as FormArray<FormGroup>;
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
    if (this.items.length <= 1) {
      return;
    }
    this.items.removeAt(index);
  }

  submit(): void {
    if (!this.order || this.order.status !== "DRAFT") {
      this.errorMessage = "Solo se pueden editar ordenes en estado borrador.";
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payloadItems = this.items.controls
      .map((group) => this.mapItem(group))
      .filter((item) => item !== null) as PurchaseOrderItemRequest[];

    if (payloadItems.length === 0) {
      this.errorMessage = "La orden debe contener al menos un item valido.";
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const raw = this.form.getRawValue();
    const payload: PurchaseOrderUpdateRequest = {
      supplierId: Number(raw.supplierId),
      warehouseId: Number(raw.warehouseId),
      expectedDate: this.normalizeOptional(raw.expectedDate),
      notes: this.normalizeOptional(raw.notes),
      items: payloadItems,
    };

    this.purchaseOrderService.update(this.order.id, payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.successMessage = "Orden actualizada correctamente.";
        this.router.navigate(["/compras/ordenes", updated.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo actualizar la orden.",
        );
      },
    });
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

  private loadLookupsAndOrder(id: number): void {
    forkJoin({
      suppliers: this.supplierService.list(),
      warehouses: this.warehouseService.list(true),
      productsPage: this.productService.list(0, 500),
      order: this.purchaseOrderService.getById(id),
    }).subscribe({
      next: ({ suppliers, warehouses, productsPage, order }) => {
        this.order = order;
        this.suppliers = suppliers.filter((supplier) => supplier.active);
        this.warehouses = warehouses.filter((warehouse) => warehouse.active);
        this.products = productsPage.content.filter(
          (product) => product.active,
        );

        this.form.patchValue({
          supplierId: order.supplierId,
          warehouseId: order.warehouseId,
          expectedDate: order.expectedDate ?? "",
          notes: order.notes ?? "",
        });

        this.items.clear();
        for (const item of order.items) {
          const group = this.createItemGroup();
          group.patchValue({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
          });
          this.items.push(group);
        }

        if (this.items.length === 0) {
          this.items.push(this.createItemGroup());
        }
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar datos de la orden para edicion.",
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

    return { productId, quantityOrdered, unitCost };
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
