import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
  FormControl,
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
          <small class="field-error" *ngIf="isInvalid('productId')"
            >Producto es obligatorio.</small
          >
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
                [title]="warehouse.code + ' - ' + warehouse.name"
              >
                {{ getWarehouseDisplayLabel(warehouse) }}
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
              min="1"
              step="1"
              inputmode="numeric"
              pattern="[0-9]*"
              formControlName="quantity"
              placeholder="1"
              (keydown)="blockInvalidQuantityKeys($event)"
            />
            <small class="field-error" *ngIf="isInvalid('quantity')">
              Cantidad es obligatoria y debe ser un entero mayor que 0.
            </small>
          </label>
        </div>

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
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
        align-items: start;
      }

      .full {
        grid-column: 1 / -1;
      }

      .field {
        display: grid;
        gap: var(--space-1);
        align-content: start;
      }

      .field--product {
        min-width: 0;
      }

      .field > span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .field-error {
        min-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
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
export class InitialStockPageComponent implements OnInit, OnDestroy {
  readonly productSearchControl = new FormControl("", { nonNullable: true });

  readonly integerPositiveValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      return { integerPositive: true };
    }

    return null;
  };

  readonly form = this.formBuilder.group({
    productId: [null as number | null, Validators.required],
    warehouseId: [null as number | null, Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(1), this.integerPositiveValidator]],
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
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.watchProductLookup();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || !this.selectedProduct) {
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
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Stock inicial registrado correctamente.";
          this.resetFormState();
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
    const blockedKeys = ["e", "E", ".", ",", "-", "+"];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  get selectedWarehouseLabel(): string {
    const warehouseId = this.form.value.warehouseId;
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse
      ? `${warehouse.code} - ${warehouse.name}`
      : "Selecciona un almacén";
  }

  getWarehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona un almacén";
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

  private resetFormState(): void {
    this.form.reset({
      productId: null,
      warehouseId: null,
      quantity: null,
      reason: "",
    });
    this.clearSelectedProduct();
  }

  private getProductLookupLabel(product: ProductLookupResponse): string {
    return `${product.name} (SKU: ${product.sku})`;
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

  private toSubmitErrorMessage(error: unknown): string {
    const message = toHttpErrorMessage(
      error,
      "No se pudo registrar el stock inicial.",
    );
    if (message.includes("Product is inactive")) {
      return "El producto seleccionado esta inactivo. Elige un producto activo.";
    }
    return message;
  }
}
