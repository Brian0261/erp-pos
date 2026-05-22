import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Subject, of } from "rxjs";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";

import { ProductLookupResponse } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { AdjustmentType, WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";

const QUANTITY_PATTERN = /^(?:0\.[1-9]|[1-9]\d*(?:\.[0-9])?)$/;

@Component({
  selector: "app-adjustments-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Ajustes de stock</h1>
          <p class="ui-page-description">
            Registra ajustes de aumento o disminucion de stock con trazabilidad.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label class="field full">
          <span>Tipo de ajuste *</span>
          <select formControlName="type">
            <option [ngValue]="'IN'">Aumentar stock (IN)</option>
            <option [ngValue]="'OUT'">Disminuir stock (OUT)</option>
          </select>
          <small class="field-help">IN suma stock, OUT lo reduce.</small>
        </label>

        <label class="field field--product full">
          <span>Producto *</span>
          <div class="autocomplete">
            <input
              type="text"
              [formControl]="productSearchControl"
              placeholder="Buscar producto por nombre, SKU o codigo de barras"
              autocomplete="off"
              [disabled]="saving"
              (focus)="openProductLookup()"
              (blur)="closeProductLookup()"
              (keydown.enter)="selectFirstProductLookupResult($event)"
              (keydown.escape)="closeProductLookup()"
            />

            <div class="autocomplete-panel" *ngIf="productLookupOpen">
              <p class="autocomplete-state" *ngIf="productLookupLoading">
                Buscando...
              </p>

              <p
                class="autocomplete-state autocomplete-state--error"
                *ngIf="!productLookupLoading && productLookupErrorMessage"
              >
                {{ productLookupErrorMessage }}
              </p>

              <p
                class="autocomplete-state"
                *ngIf="
                  !productLookupLoading &&
                  !productLookupErrorMessage &&
                  productSearchControl.value.trim().length >= 2 &&
                  productLookupResults.length === 0
                "
              >
                Sin resultados.
              </p>

              <button
                type="button"
                class="autocomplete-option"
                *ngFor="let product of productLookupResults"
                (mousedown)="selectProduct(product)"
              >
                <strong>{{ product.name }}</strong>
                <span>
                  SKU: {{ product.sku }}
                  <ng-container *ngIf="product.barcode">
                    - Codigo: {{ product.barcode }}
                  </ng-container>
                </span>
              </button>
            </div>
          </div>
          <small class="field-error" [class.field-error--visible]="isInvalid('productId')">
            Producto es obligatorio.
          </small>
        </label>

        <div class="selected-product full" *ngIf="selectedProduct">
          <div class="selected-product__copy">
            <span class="selected-product__label">Producto seleccionado</span>
            <strong>{{ selectedProduct.name }}</strong>
            <span>SKU: {{ selectedProduct.sku }}</span>
            <span *ngIf="selectedProduct.barcode"
              >Codigo: {{ selectedProduct.barcode }}</span
            >
          </div>

          <button
            type="button"
            class="ui-button ui-button--secondary selected-product__clear"
            (click)="clearSelectedProduct()"
            [disabled]="saving"
          >
            Limpiar producto
          </button>
        </div>

        <div class="grid-two full">
          <label class="field">
            <span>Almacen *</span>
            <select formControlName="warehouseId" [title]="selectedWarehouseLabel">
              <option [ngValue]="null">Selecciona un almacen</option>
              <option
                *ngFor="let warehouse of warehouses"
                [ngValue]="warehouse.id"
                [title]="getWarehouseTitle(warehouse)"
              >
                {{ getWarehouseDisplayLabel(warehouse) }}
              </option>
            </select>
            <small class="field-error" [class.field-error--visible]="isInvalid('warehouseId')">
              Almacen es obligatorio.
            </small>
          </label>

          <label class="field">
            <span>Cantidad *</span>
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              formControlName="quantity"
              placeholder="0.0"
              (input)="onQuantityInput($event)"
              (keydown)="blockInvalidQuantityKeys($event)"
              (blur)="normalizeQuantityOnBlur()"
            />
            <small class="field-error" [class.field-error--visible]="isInvalid('quantity')">
              Cantidad debe ser mayor que 0 y tener maximo 1 decimal.
            </small>
          </label>
        </div>

        <label class="field full">
          <span>Motivo *</span>
          <textarea
            rows="3"
            formControlName="reason"
            placeholder="Describe por que se realiza el ajuste"
          ></textarea>
          <small class="field-error" [class.field-error--visible]="isInvalid('reason')">
            Motivo es obligatorio.
          </small>
        </label>

        <div class="actions full">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Registrando..." : "Registrar ajuste" }}
          </button>
        </div>
      </form>

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
        grid-template-columns: repeat(2, minmax(0, 1fr));
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

      .field--product {
        min-width: 0;
      }

      .field > span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .field-help {
        min-height: 1rem;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .field-error {
        display: block;
        min-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        visibility: hidden;
      }

      .field-error--visible {
        visibility: visible;
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
        color: var(--color-text-primary);
        box-sizing: border-box;
      }

      .autocomplete {
        position: relative;
        display: grid;
        gap: var(--space-2);
      }

      .autocomplete-panel {
        position: absolute;
        top: calc(100% + 0.35rem);
        left: 0;
        right: 0;
        z-index: 20;
        max-height: 18rem;
        overflow: auto;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-md);
      }

      .autocomplete-state,
      .autocomplete-option {
        padding: var(--space-2) var(--space-3);
      }

      .autocomplete-state {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .autocomplete-state--error {
        color: var(--color-danger);
      }

      .autocomplete-option {
        width: 100%;
        display: grid;
        gap: 0.15rem;
        border: 0;
        border-bottom: 1px solid var(--color-border-default);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .autocomplete-option:last-child {
        border-bottom: 0;
      }

      .autocomplete-option:hover,
      .autocomplete-option:focus-visible {
        background: var(--color-bg-soft);
      }

      .autocomplete-option strong {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
      }

      .autocomplete-option span {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .selected-product {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--space-2);
        align-items: center;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
      }

      .selected-product__copy {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .selected-product__label {
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
      }

      .selected-product__copy strong {
        color: var(--color-text-primary);
      }

      .selected-product__copy span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .grid-two {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
      }

      .grid-two .field {
        min-width: 0;
      }

      textarea {
        resize: vertical;
        min-height: 90px;
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

        .grid-two {
          grid-template-columns: 1fr;
        }

        .selected-product {
          grid-template-columns: 1fr;
          align-items: start;
        }

        .actions {
          justify-content: flex-start;
        }

        .autocomplete-panel {
          position: static;
          margin-top: 0.35rem;
        }
      }
    `,
  ],
})
export class AdjustmentsPageComponent implements OnInit, OnDestroy {
  readonly productSearchControl = new FormControl("", { nonNullable: true });

  readonly form = this.formBuilder.group({
    type: ["IN" as AdjustmentType, Validators.required],
    productId: [null as number | null, Validators.required],
    warehouseId: [null as number | null, Validators.required],
    quantity: ["", [Validators.required, Validators.pattern(QUANTITY_PATTERN)]],
    reason: ["", [Validators.required, Validators.maxLength(300)]],
  });

  warehouses: WarehouseResponse[] = [];
  selectedProduct: ProductLookupResponse | null = null;
  productLookupResults: ProductLookupResponse[] = [];
  productLookupLoading = false;
  productLookupErrorMessage = "";
  productLookupOpen = false;
  productLookupFocused = false;

  saving = false;
  errorMessage = "";
  successMessage = "";

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.watchProductLookup();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.selectedProduct) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    const value = this.form.getRawValue();
    const type = value.type as AdjustmentType;
    const quantity = Number(value.quantity);
    const reason = (value.reason ?? "").trim();
    const warehouseLabel = this.selectedWarehouseLabel;
    const productLabel = this.getProductLookupLabel(this.selectedProduct);
    const confirmed = await this.confirmDialog.confirm({
      title: "Confirmar ajuste de stock",
      description: this.buildConfirmationDescription({
        productLabel,
        warehouseLabel,
        type,
        quantity,
        reason,
      }),
      highlightText: this.getAdjustmentTypeLabel(type),
      confirmText: "Registrar ajuste",
      cancelText: "Cancelar",
      variant: type === "OUT" ? "warning" : "info",
    });

    if (!confirmed) {
      return;
    }

    this.saving = true;
    this.inventoryService
      .registerAdjustment({
        type,
        productId: Number(value.productId),
        warehouseId: Number(value.warehouseId),
        quantity,
        reason,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Ajuste registrado correctamente.";
          this.resetAfterSuccess();
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

  openProductLookup(): void {
    this.productLookupFocused = true;
    const currentValue = this.productSearchControl.value.trim();
    if (
      this.selectedProduct &&
      currentValue === this.getProductLookupLabel(this.selectedProduct)
    ) {
      this.productLookupOpen = false;
      return;
    }

    this.productLookupOpen = currentValue.length >= 2;
  }

  closeProductLookup(): void {
    this.productLookupFocused = false;
    this.productLookupOpen = false;
  }

  selectFirstProductLookupResult(event: Event): void {
    if (this.productLookupResults.length === 0) {
      return;
    }

    event.preventDefault();
    this.selectProduct(this.productLookupResults[0]);
  }

  selectProduct(product: ProductLookupResponse): void {
    this.selectedProduct = product;
    this.form.patchValue({ productId: product.id });
    this.productSearchControl.setValue(this.getProductLookupLabel(product), {
      emitEvent: false,
    });
    this.productLookupResults = [];
    this.productLookupErrorMessage = "";
    this.productLookupLoading = false;
    this.productLookupOpen = false;
  }

  clearSelectedProduct(): void {
    this.selectedProduct = null;
    this.form.patchValue({ productId: null });
    this.productSearchControl.setValue("", { emitEvent: false });
    this.productLookupResults = [];
    this.productLookupErrorMessage = "";
    this.productLookupLoading = false;
    this.productLookupOpen = false;
    this.productLookupFocused = false;
  }

  blockInvalidQuantityKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "-", "+", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  get selectedWarehouseLabel(): string {
    const warehouseId = this.form.value.warehouseId;
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse ? this.getWarehouseDisplayLabel(warehouse) : "Selecciona un almacen";
  }

  getWarehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona un almacen";
  }

  getWarehouseTitle(warehouse: WarehouseResponse): string {
    return warehouse.code?.trim()
      ? `${warehouse.code} - ${warehouse.name}`
      : this.getWarehouseDisplayLabel(warehouse);
  }

  getProductLookupLabel(product: ProductLookupResponse): string {
    return `${product.name} (SKU: ${product.sku})`;
  }

  getAdjustmentTypeLabel(type: AdjustmentType): string {
    return type === "IN" ? "Aumentar stock" : "Disminuir stock";
  }

  private watchProductLookup(): void {
    this.productSearchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(250),
        map((value) => value.trim()),
        distinctUntilChanged(),
        tap((query) => {
          if (
            this.selectedProduct &&
            query !== this.getProductLookupLabel(this.selectedProduct)
          ) {
            this.detachSelectedProduct();
          }
        }),
        switchMap((query) => {
          if (query.length < 2) {
            this.productLookupResults = [];
            this.productLookupLoading = false;
            this.productLookupErrorMessage = "";
            this.productLookupOpen = false;
            return of({ query, results: [] as ProductLookupResponse[] });
          }

          this.productLookupLoading = true;
          this.productLookupErrorMessage = "";
          this.productLookupOpen = this.productLookupFocused;

          return this.productService.lookup(query, true, 10).pipe(
            map((results) => ({ query, results })),
            catchError((error: unknown) => {
              this.productLookupErrorMessage = toHttpErrorMessage(
                error,
                "No se pudieron cargar sugerencias de producto.",
              );
              return of({ query, results: [] as ProductLookupResponse[] });
            }),
            finalize(() => {
              this.productLookupLoading = false;
            }),
          );
        }),
      )
      .subscribe(({ query, results }) => {
        if (query.length >= 2) {
          this.productLookupResults = results;
          this.productLookupOpen = this.productLookupFocused;
        }
      });
  }

  private detachSelectedProduct(): void {
    this.selectedProduct = null;
    this.form.patchValue({ productId: null });
  }

  private sanitizeQuantityValue(rawValue: string, keepTrailingDot: boolean): string {
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

    const decimalPart = decimalRaw.replace(/\D/g, "").slice(0, 1);
    if (hasDot) {
      if (decimalPart.length > 0) {
        return `${integerPart || "0"}.${decimalPart}`;
      }

      return keepTrailingDot ? `${integerPart || "0"}.` : `${integerPart || "0"}`;
    }

    return integerPart;
  }

  private resetAfterSuccess(): void {
    const { type, warehouseId } = this.form.getRawValue();
    this.form.reset({
      type,
      productId: null,
      warehouseId,
      quantity: "",
      reason: "",
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity({ emitEvent: false });
    this.clearSelectedProduct();
    this.errorMessage = "";
  }

  onQuantityInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const sanitized = this.sanitizeQuantityValue(input.value, true);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }

    this.form.patchValue({ quantity: sanitized }, { emitEvent: false });
  }

  normalizeQuantityOnBlur(): void {
    const control = this.form.get("quantity");
    if (!control) {
      return;
    }

    const normalized = this.sanitizeQuantityValue(String(control.value ?? ""), false);
    control.setValue(normalized, { emitEvent: false });
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
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudieron cargar almacenes.",
          );
        },
      });
  }

  private buildConfirmationDescription(payload: {
    productLabel: string;
    warehouseLabel: string;
    type: AdjustmentType;
    quantity: number;
    reason: string;
  }): string {
    const lines = [
      `Producto: ${payload.productLabel}`,
      `Almacen: ${payload.warehouseLabel}`,
      `Tipo: ${this.getAdjustmentTypeLabel(payload.type)} (${payload.type})`,
      `Cantidad: ${payload.quantity}`,
      `Motivo: ${payload.reason || "Sin motivo"}`,
    ];

    if (payload.type === "OUT") {
      lines.push("Este ajuste reducira stock real.");
    }

    return lines.join("\n");
  }

  private toSubmitErrorMessage(error: unknown): string {
    const message = toHttpErrorMessage(
      error,
      "No se pudo registrar el ajuste.",
    );
    if (message.includes("Product is inactive")) {
      return "El producto seleccionado esta inactivo. Elige un producto activo.";
    }
    return message;
  }
}
