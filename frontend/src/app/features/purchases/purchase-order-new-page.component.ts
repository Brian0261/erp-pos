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

import {
  ProductAutocompleteComponent,
} from "../../shared/components/product-autocomplete/product-autocomplete.component";
import { ProductLookupResponse } from "../catalog/data/catalog.models";
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

const QUANTITY_PATTERN = /^(?:0\.[1-9]|[1-9]\d*(?:\.[0-9])?)$/;
const UNIT_COST_PATTERN = /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d*(?:\.\d{1,2})?)$/;

@Component({
  selector: "app-purchase-order-new-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ProductAutocompleteComponent,
  ],
  template: `
    <section class="ui-card order-form-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Nueva orden de compra</h1>
          <p class="ui-page-description">
            Registra una orden en estado borrador para aprobarla y recibirla en
            una fase posterior.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/compras/ordenes']"
        >
          Volver al listado
        </a>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-layout">
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
              <small class="field-error" [class.field-error--hidden]="!isInvalid('supplierId')">
                Proveedor es obligatorio.
              </small>
            </label>

            <label class="field">
              <span>Almacen *</span>
              <select formControlName="warehouseId" [title]="selectedWarehouseTitle">
                <option [ngValue]="null">Selecciona almacen</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                  [title]="warehouseTitle(warehouse)"
                >
                  {{ warehouseDisplayLabel(warehouse) }}
                </option>
              </select>
              <small class="field-error" [class.field-error--hidden]="!isInvalid('warehouseId')">
                Almacen es obligatorio.
              </small>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Datos generales</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Fecha orden</span>
              <input type="date" formControlName="orderDate" />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Fecha esperada</span>
              <input type="date" formControlName="expectedDate" />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field full">
              <span>Notas</span>
              <textarea
                rows="3"
                maxlength="400"
                formControlName="notes"
              ></textarea>
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head section-head--actions">
            <div>
              <h2>Items de orden</h2>
              <p class="section-copy">
                Busca productos por nombre, SKU o codigo de barras y ajusta
                cantidad/costo sin perder el total estimado.
              </p>
            </div>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="addItem()"
            >
              Agregar item
            </button>
          </header>

          <div class="items-table" formArrayName="items">
            <div class="items-table__header" aria-hidden="true">
              <div>Producto</div>
              <div>Cantidad</div>
              <div>Costo unitario</div>
              <div>Subtotal</div>
              <div>Accion</div>
            </div>

            <div
              class="items-table__row"
              *ngFor="let item of items.controls; let i = index"
              [formGroupName]="i"
            >
              <div class="items-table__cell items-table__cell--product">
                <label class="field field--product">
                  <span>Producto *</span>
                  <app-product-autocomplete
                    [placeholder]="'Buscar producto por nombre, SKU o código de barras'"
                    [minChars]="2"
                    [limit]="10"
                    [activeOnly]="true"
                    [compact]="true"
                    [allowClear]="false"
                    [showSelectedCard]="false"
                    [selectedProduct]="selectedProducts[i]"
                    [disabled]="saving"
                    (productSelected)="onProductSelected(i, $event)"
                    (cleared)="clearSelectedProduct(i)"
                  ></app-product-autocomplete>
                  <small class="field-error" [class.field-error--hidden]="!isItemInvalid(i, 'productId')">
                    Producto es obligatorio.
                  </small>
                </label>
              </div>

              <div class="items-table__cell items-table__cell--quantity">
                <label class="field field--inline">
                  <span>Cantidad *</span>
                  <input
                    [id]="quantityInputId(i)"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    formControlName="quantityOrdered"
                    placeholder="1"
                    (input)="onQuantityInput(i, $event)"
                    (keydown)="blockInvalidDecimalKeys($event)"
                    (blur)="normalizeQuantityOnBlur(i)"
                  />
                  <small class="field-error" [class.field-error--hidden]="!isItemInvalid(i, 'quantityOrdered')">
                    Mayor que 0. Max. 1 decimal.
                  </small>
                </label>
              </div>

              <div class="items-table__cell items-table__cell--cost">
                <label class="field field--inline">
                  <span>Costo unitario *</span>
                  <input
                    [id]="unitCostInputId(i)"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    formControlName="unitCost"
                    placeholder="0.00"
                    (input)="onUnitCostInput(i, $event)"
                    (keydown)="blockInvalidDecimalKeys($event)"
                    (blur)="normalizeUnitCostOnBlur(i)"
                  />
                  <small class="field-error" [class.field-error--hidden]="!isItemInvalid(i, 'unitCost')">
                    Mayor que 0. Max. 2 decimales.
                  </small>
                </label>
              </div>

              <div class="items-table__cell items-table__cell--subtotal">
                <span class="items-table__label">Subtotal</span>
                <strong>S/ {{ lineTotal(i) | number: "1.2-2" }}</strong>
              </div>

              <div class="items-table__cell items-table__cell--action">
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
          </div>

          <aside class="totals-panel">
            <p class="label">Total estimado</p>
            <p class="value">S/ {{ totalAmount | number: "1.2-2" }}</p>
          </aside>
        </section>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Guardando..." : "Crear orden" }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .order-form-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
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

      h2 {
        margin: 0;
        font-size: 1.05rem;
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

      .section-head--actions > div {
        display: grid;
        gap: 0.35rem;
      }

      .section-copy {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
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
        min-width: 0;
      }

      .field--product app-product-autocomplete::ng-deep .product-autocomplete__label {
        display: none;
      }

      .field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      input,
      select,
      textarea {
        width: 100%;
        min-width: 0;
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        box-sizing: border-box;
      }

      textarea {
        resize: vertical;
      }

      .items-table {
        display: grid;
        gap: var(--space-2);
      }

      .items-table__header,
      .items-table__row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 9rem 10rem 8rem 8rem;
        gap: var(--space-3);
        align-items: start;
      }

      .items-table__header {
        padding: 0 var(--space-2);
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .items-table__row {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .items-table__cell {
        min-width: 0;
      }

      .items-table__cell--subtotal {
        display: grid;
        gap: var(--space-1);
        align-self: start;
        padding-top: 1.65rem;
      }

      .items-table__cell--subtotal strong {
        white-space: nowrap;
      }

      .items-table__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .items-table__cell--action {
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding-top: 1.65rem;
      }

      .items-table__cell--action .ui-button {
        width: 100%;
        min-width: 7rem;
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
        white-space: nowrap;
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

      .field-error {
        margin: 0;
        min-height: 1rem;
        line-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .field-error--hidden {
        visibility: hidden;
      }

      @media (max-width: 1200px) {
        .items-table__header,
        .items-table__row {
          grid-template-columns: minmax(0, 1fr) 8rem 9rem 7rem 7rem;
        }
      }

      @media (max-width: 960px) {
        .items-table__header {
          display: none;
        }

        .items-table__row {
          grid-template-columns: 1fr;
        }

        .items-table__cell--subtotal,
        .items-table__cell--action {
          padding-top: 0;
        }

        .items-table__cell--action {
          justify-content: flex-start;
        }
      }

      @media (max-width: 800px) {
        .order-form-page {
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
  selectedProducts: Array<ProductLookupResponse | null> = [null];

  saving = false;
  errorMessage = "";
  successMessage = "";
  submitAttempted = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierService: SupplierService,
    private readonly warehouseService: WarehouseService,
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
    return this.items.controls.reduce(
      (sum, _group, index) => sum + this.lineTotal(index),
      0,
    );
  }

  get selectedWarehouseTitle(): string {
    const warehouseId = this.form.value.warehouseId;
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse ? this.warehouseTitle(warehouse) : "Selecciona almacen";
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
    this.selectedProducts.push(null);
  }

  removeItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }

    this.items.removeAt(index);
    this.selectedProducts.splice(index, 1);
  }

  onProductSelected(index: number, product: ProductLookupResponse): void {
    const group = this.items.at(index);
    if (!group) {
      return;
    }

    this.selectedProducts[index] = product;
    group.patchValue({ productId: product.id });
    group.get("productId")?.markAsDirty();
  }

  clearSelectedProduct(index: number): void {
    const group = this.items.at(index);
    if (!group) {
      return;
    }

    this.selectedProducts[index] = null;
    group.patchValue({ productId: null });
    group.get("productId")?.markAsDirty();
  }

  onQuantityInput(index: number, event: Event): void {
    this.onDecimalInput(index, "quantityOrdered", event, 1);
  }

  onUnitCostInput(index: number, event: Event): void {
    this.onDecimalInput(index, "unitCost", event, 2);
  }

  normalizeQuantityOnBlur(index: number): void {
    this.normalizeDecimalOnBlur(index, "quantityOrdered", 1);
  }

  normalizeUnitCostOnBlur(index: number): void {
    this.normalizeDecimalOnBlur(index, "unitCost", 2);
  }

  blockInvalidDecimalKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "+", "-", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  quantityInputId(index: number): string {
    return `purchase-order-quantity-${index}`;
  }

  unitCostInputId(index: number): string {
    return `purchase-order-cost-${index}`;
  }

  submit(): void {
    this.submitAttempted = true;
    this.errorMessage = "";

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
    return !!control && control.invalid && (control.touched || control.dirty || this.submitAttempted);
  }

  isItemInvalid(index: number, controlName: string): boolean {
    const control = this.items.at(index)?.get(controlName) ?? null;
    return !!control && control.invalid && (control.touched || control.dirty || this.submitAttempted);
  }

  warehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona almacen";
  }

  warehouseTitle(warehouse: WarehouseResponse): string {
    const code = warehouse.code?.trim() || "";
    const name = warehouse.name?.trim() || "";
    return code && name ? `${code} - ${name}` : code || name || "Selecciona almacen";
  }

  lineTotal(index: number): number {
    const group = this.items.at(index);
    const quantity = Number(group?.get("quantityOrdered")?.value ?? 0);
    const unitCost = Number(group?.get("unitCost")?.value ?? 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) {
      return 0;
    }

    return quantity * unitCost;
  }

  private createItemGroup(): FormGroup {
    return this.formBuilder.group({
      productId: [null as number | null, Validators.required],
      quantityOrdered: [
        "",
        [Validators.required, Validators.pattern(QUANTITY_PATTERN)],
      ],
      unitCost: [
        "",
        [Validators.required, Validators.pattern(UNIT_COST_PATTERN)],
      ],
    });
  }

  private loadLookups(): void {
    forkJoin({
      suppliers: this.supplierService.list(),
      warehouses: this.warehouseService.list(true),
    }).subscribe({
      next: ({ suppliers, warehouses }) => {
        this.suppliers = suppliers.filter((supplier) => supplier.active);
        this.warehouses = warehouses.filter((warehouse) => warehouse.active);
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar proveedores y almacenes.",
        );
      },
    });
  }

  private mapItem(group: FormGroup): PurchaseOrderItemRequest | null {
    const productId = Number(group.get("productId")?.value ?? 0);
    const quantityOrdered = Number(group.get("quantityOrdered")?.value ?? 0);
    const unitCost = Number(group.get("unitCost")?.value ?? 0);

    if (!productId || quantityOrdered <= 0 || unitCost <= 0) {
      return null;
    }

    return {
      productId,
      quantityOrdered,
      unitCost,
    };
  }

  private onDecimalInput(
    index: number,
    controlName: "quantityOrdered" | "unitCost",
    event: Event,
    maxDecimals: number,
  ): void {
    const input = event.target as HTMLInputElement | null;
    const control = this.items.at(index)?.get(controlName) ?? null;
    if (!input || !control) {
      return;
    }

    const sanitized = this.sanitizeDecimalValue(input.value, maxDecimals, true);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }

    control.setValue(sanitized, { emitEvent: false });
    control.markAsDirty();
  }

  private normalizeDecimalOnBlur(
    index: number,
    controlName: "quantityOrdered" | "unitCost",
    maxDecimals: number,
  ): void {
    const control = this.items.at(index)?.get(controlName) ?? null;
    if (!control) {
      return;
    }

    const normalized = this.sanitizeDecimalValue(
      String(control.value ?? ""),
      maxDecimals,
      false,
    );

    if (!normalized) {
      control.setValue("", { emitEvent: false });
      control.markAsTouched();
      return;
    }

    const numericValue = Number(normalized);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      control.setValue("", { emitEvent: false });
      control.markAsTouched();
      return;
    }

    control.setValue(String(numericValue), { emitEvent: false });
    control.markAsTouched();
  }

  private sanitizeDecimalValue(
    rawValue: string,
    maxDecimals: number,
    keepTrailingDot: boolean,
  ): string {
    const digitsAndDots = (rawValue ?? "").replace(/[^\d.]/g, "");
    if (!digitsAndDots) {
      return "";
    }

    const [integerRaw = "", ...decimalParts] = digitsAndDots.split(".");
    const decimalRaw = decimalParts.join("");
    const hasDot = digitsAndDots.includes(".");

    let integerPart = integerRaw.replace(/\D/g, "");
    if (integerPart.length > 0) {
      if (/^0+$/.test(integerPart)) {
        integerPart = "0";
      } else {
        integerPart = integerPart.replace(/^0+/, "");
      }
    }

    if (!integerPart && (hasDot || decimalRaw.length > 0)) {
      integerPart = "0";
    }

    const decimalPart = decimalRaw.replace(/\D/g, "").slice(0, maxDecimals);
    if (hasDot) {
      if (decimalPart.length > 0) {
        return `${integerPart || "0"}.${decimalPart}`;
      }

      return keepTrailingDot ? `${integerPart || "0"}.` : `${integerPart || "0"}`;
    }

    return integerPart;
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
