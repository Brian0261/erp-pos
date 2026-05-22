import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { ProductLookupResponse } from "../catalog/data/catalog.models";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { ProductAutocompleteComponent } from "../../shared/components/product-autocomplete/product-autocomplete.component";
import { toHttpErrorMessage } from "./data/http-error-message";
import { InventoryService } from "./data/inventory.service";
import { TransferRequest, WarehouseResponse } from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

const QUANTITY_PATTERN = /^(?:0\.[1-9]|[1-9]\d*(?:\.[0-9])?)$/;

@Component({
  selector: "app-transfers-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProductAutocompleteComponent],
  template: `
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Transferencias</h1>
          <p class="ui-page-description">
            Mueve stock entre almacenes con lista operativa y validación estable.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="transfer-form">
        <section class="transfer-panel">
          <header class="panel-head">
            <div>
              <h2>Datos de transferencia</h2>
              <p class="panel-copy">Origen, destino y motivo antes de mover stock real.</p>
            </div>
          </header>

          <div class="meta-grid">
            <label class="field">
              <span>Almacén origen *</span>
              <select formControlName="sourceWarehouseId">
                <option [ngValue]="null">Selecciona un almacén</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                  [title]="warehouseTitle(warehouse)"
                >
                  {{ warehouseDisplayLabel(warehouse) }}
                </option>
              </select>
              <small class="field-error" [class.field-error--visible]="isInvalid('sourceWarehouseId')">
                Almacén origen es obligatorio.
              </small>
            </label>

            <label class="field">
              <span>Almacén destino *</span>
              <select formControlName="targetWarehouseId">
                <option [ngValue]="null">Selecciona un almacén</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                  [title]="warehouseTitle(warehouse)"
                >
                  {{ warehouseDisplayLabel(warehouse) }}
                </option>
              </select>
              <small class="field-error" [class.field-error--visible]="isInvalid('targetWarehouseId') || form.hasError('sameWarehouses')">
                <ng-container *ngIf="form.hasError('sameWarehouses')">
                  Origen y destino deben ser distintos.
                </ng-container>
                <ng-container *ngIf="!form.hasError('sameWarehouses')">
                  Almacén destino es obligatorio.
                </ng-container>
              </small>
            </label>

            <label class="field full">
              <span>Motivo *</span>
              <textarea
                rows="3"
                formControlName="reason"
                placeholder="Describe el motivo operativo de la transferencia"
              ></textarea>
              <small class="field-error" [class.field-error--visible]="isInvalid('reason')">
                Motivo es obligatorio.
              </small>
            </label>
          </div>
        </section>

        <section class="transfer-panel">
          <header class="panel-head panel-head--split">
            <div>
              <h2>Agregar producto</h2>
              <p class="panel-copy">
                Busca por nombre, SKU o código de barras desde un autocomplete compartido.
              </p>
            </div>
            <span class="ui-chip ui-chip--neutral">{{ itemsCountLabel }}</span>
          </header>

          <div class="lookup-toolbar">
            <app-product-autocomplete
              class="lookup-field"
              [placeholder]="'Buscar producto por nombre, SKU o código de barras'"
              [minChars]="2"
              [limit]="10"
              [activeOnly]="true"
              [disabled]="saving"
              [selectedProduct]="selectedProduct"
              [compact]="true"
              [allowClear]="false"
              (productSelected)="onProductSelected($event)"
              (cleared)="onProductCleared()"
              (queryChange)="onProductQueryChange($event)"
              (focused)="onProductFocused()"
              (blurred)="onProductBlurred()"
            ></app-product-autocomplete>

            <div class="lookup-actions">
              <button
                type="button"
                class="ui-button ui-button--primary"
                (click)="addSelectedProduct()"
                [disabled]="saving || !selectedProduct"
              >
                Agregar producto
              </button>
              <button
                type="button"
                class="ui-button ui-button--secondary"
                (click)="clearSelectedProduct()"
                [disabled]="saving || (!selectedProduct && !selectedProductQuery)"
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>

          <p class="ui-alert ui-alert--info transfer-helper" [class.transfer-helper--visible]="helperMessage">
            {{ helperMessage || ' ' }}
          </p>
        </section>

        <section class="transfer-panel">
          <header class="panel-head panel-head--split">
            <div>
              <h2>Productos a transferir</h2>
              <p class="panel-copy">Cantidad editable y acción separada para evitar superposiciones.</p>
            </div>
            <span class="ui-chip ui-chip--neutral">{{ itemsCountLabel }}</span>
          </header>

          <p class="field-error field-error--visible items-error" *ngIf="items.length === 0 && submitAttempted">
            Agrega al menos un producto para registrar la transferencia.
          </p>

          <div class="ui-table-wrapper transfer-list-wrapper">
            <div class="transfer-list">
              <div class="transfer-list__header">
                <div class="transfer-list__cell transfer-list__cell--product">Producto</div>
                <div class="transfer-list__cell transfer-list__cell--quantity">Cantidad</div>
                <div class="transfer-list__cell transfer-list__cell--action">Acción</div>
              </div>

              <div class="transfer-list__body" formArrayName="items">
                <div class="transfer-list__row" *ngFor="let item of items.controls; let i = index" [formGroupName]="i">
                  <div class="transfer-list__cell transfer-list__cell--product product-cell">
                    <strong>{{ item.get('productName')?.value }}</strong>
                    <span>SKU: {{ item.get('productSku')?.value }}</span>
                    <span *ngIf="item.get('productBarcode')?.value">Código: {{ item.get('productBarcode')?.value }}</span>
                  </div>
                  <div class="transfer-list__cell transfer-list__cell--quantity quantity-cell">
                    <input
                      [id]="quantityInputId(i)"
                      type="text"
                      inputmode="decimal"
                      autocomplete="off"
                      formControlName="quantity"
                      placeholder="1.0"
                      (input)="onQuantityInput(i, $event)"
                      (keydown)="blockInvalidQuantityKeys($event)"
                      (blur)="normalizeQuantityOnBlur(i)"
                    />
                    <small class="field-error field-error--inline" [class.field-error--visible]="isItemQuantityInvalid(i)">
                      Mayor que 0. Máx. 1 decimal.
                    </small>
                  </div>
                  <div class="transfer-list__cell transfer-list__cell--action action-cell">
                    <button
                      type="button"
                      class="ui-button ui-button--danger"
                      (click)="removeItem(i)"
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <div *ngIf="items.length === 0" class="ui-empty-state transfer-list__empty">
                  Aún no hay productos. Búscalos arriba y agrégalos a la lista.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="actions full">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? 'Registrando...' : 'Registrar transferencia' }}
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

      .transfer-form {
        display: grid;
        gap: var(--space-4);
      }

      .transfer-panel {
        display: grid;
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .panel-head {
        display: grid;
        gap: var(--space-1);
      }

      .panel-head--split {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: var(--space-3);
      }

      .panel-head h2,
      .panel-head p {
        margin: 0;
      }

      .panel-head h2 {
        font-family: var(--font-family-display);
        font-size: var(--font-size-xl);
      }

      .panel-copy {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .meta-grid {
        display: grid;
        gap: var(--space-3);
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .field,
      .selected-product {
        display: grid;
        gap: var(--space-1);
        align-content: start;
      }

      .field--product {
        min-width: 0;
      }

      .full {
        grid-column: 1 / -1;
      }

      .field > span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
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

      .field-error--inline {
        min-height: 1rem;
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
      }

      .lookup-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--space-3);
        align-items: start;
      }

      .lookup-field {
        min-width: 0;
      }

      .lookup-actions {
        display: flex;
        gap: var(--space-2);
        align-self: end;
        flex-wrap: wrap;
      }

      .transfer-helper {
        margin: 0;
        min-height: 2.25rem;
        visibility: hidden;
      }

      .transfer-helper--visible {
        visibility: visible;
      }

      .transfer-list-wrapper {
        overflow-x: auto;
      }

      .transfer-list {
        min-width: 44rem;
        display: grid;
      }

      .transfer-list__header,
      .transfer-list__row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 9.5rem 8rem;
        column-gap: var(--space-2);
        align-items: start;
      }

      .transfer-list__header {
        border-bottom: 1px solid var(--color-border-default);
        padding: var(--space-2) 0;
        color: var(--color-text-secondary);
        font-weight: 700;
        font-size: var(--font-size-sm);
      }

      .transfer-list__row {
        border-bottom: 1px solid var(--color-border-default);
        padding: var(--space-2) 0;
      }

      .transfer-list__cell {
        min-width: 0;
      }

      .transfer-list__cell--quantity,
      .transfer-list__cell--action {
        padding-top: 0.1rem;
      }

      .transfer-list__empty {
        padding: var(--space-5) var(--space-3);
      }

      .product-cell {
        display: grid;
        gap: 0.15rem;
      }

      .product-cell strong {
        color: var(--color-text-primary);
      }

      .product-cell span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .quantity-cell {
        display: grid;
        gap: 0.3rem;
        width: 100%;
      }

      .quantity-cell input {
        width: 100%;
      }

      .action-cell {
        width: 100%;
        justify-self: start;
      }

      .action-cell .ui-button {
        width: auto;
      }

      .items-error {
        margin: 0;
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

        .meta-grid,
        .lookup-toolbar,
        .panel-head--split {
          grid-template-columns: 1fr;
        }

        .lookup-actions,
        .actions {
          justify-content: flex-start;
        }

        .quantity-cell,
        .action-cell {
          width: auto;
        }

        .action-cell .ui-button {
          width: auto;
        }

        .transfer-list__header,
        .transfer-list__row {
          grid-template-columns: minmax(0, 1fr) 9rem 7rem;
        }
      }
    `,
  ],
})
export class TransfersPageComponent implements OnInit, OnDestroy {
  readonly form = this.formBuilder.group(
    {
      sourceWarehouseId: [null as number | null, Validators.required],
      targetWarehouseId: [null as number | null, Validators.required],
      reason: ["", [Validators.required, Validators.maxLength(300)]],
      items: this.formBuilder.array([], [this.atLeastOneItemValidator()]),
    },
    { validators: [this.differentWarehousesValidator()] },
  );

  @ViewChild(ProductAutocompleteComponent)
  private productAutocomplete?: ProductAutocompleteComponent;

  readonly destroy$ = new Subject<void>();

  warehouses: WarehouseResponse[] = [];
  selectedProduct: ProductLookupResponse | null = null;
  selectedProductQuery = "";
  saving = false;
  errorMessage = "";
  successMessage = "";
  helperMessage = "";
  submitAttempted = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly warehouseService: WarehouseService,
    private readonly inventoryService: InventoryService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as unknown as FormArray<FormGroup>;
  }

  get itemsCountLabel(): string {
    return this.items.length === 1 ? "1 producto" : `${this.items.length} productos`;
  }

  submit(): void {
    this.submitAttempted = true;
    this.errorMessage = "";

    if (this.form.invalid || this.items.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildTransferPayload();

    void this.confirmDialog
      .confirm({
        title: "Confirmar transferencia",
        description: this.buildConfirmationDescription(payload),
        highlightText: "Movimiento real de stock",
        confirmText: "Registrar transferencia",
        cancelText: "Cancelar",
        variant: "warning",
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.saving = true;

        this.inventoryService.transfer(payload).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.saving = false;
            this.resetAfterSuccess();
            this.successMessage = "Transferencia registrada correctamente.";
          },
          error: (error: unknown) => {
            this.saving = false;
            this.errorMessage = this.toSubmitErrorMessage(error);
          },
        });
      });
  }

  onProductSelected(product: ProductLookupResponse): void {
    this.selectedProduct = product;
    this.selectedProductQuery = this.getProductLookupLabel(product);
    this.helperMessage = "";
  }

  onProductCleared(): void {
    this.selectedProduct = null;
    this.helperMessage = "";
  }

  onProductQueryChange(query: string): void {
    this.selectedProductQuery = query;
    this.helperMessage = "";
  }

  onProductFocused(): void {}

  onProductBlurred(): void {}

  addSelectedProduct(): void {
    if (!this.selectedProduct || this.saving) {
      return;
    }

    const existingIndex = this.findItemIndex(this.selectedProduct.id);
    if (existingIndex >= 0) {
      this.helperMessage = "Producto ya agregado. Ajusta su cantidad en la lista.";
      this.focusQuantityInput(existingIndex);
      this.clearSelectedProduct();
      return;
    }

    const addedIndex = this.items.length;
    this.items.push(this.createItemGroup(this.selectedProduct));
    this.clearSelectedProduct();
    this.focusQuantityInput(addedIndex);
  }

  clearSelectedProduct(): void {
    this.selectedProduct = null;
    this.selectedProductQuery = "";
    this.helperMessage = "";
    this.productAutocomplete?.clear();
  }

  removeItem(index: number): void {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this.items.removeAt(index);
    this.items.markAsDirty();
    this.items.updateValueAndValidity();
  }

  blockInvalidQuantityKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "-", "+", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  onQuantityInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const control = this.getQuantityControl(index);

    if (!input || !control) {
      return;
    }

    const sanitized = this.sanitizeQuantityValue(input.value, true);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }

    control.setValue(sanitized, { emitEvent: false });
    control.markAsDirty();
  }

  normalizeQuantityOnBlur(index: number): void {
    const control = this.getQuantityControl(index);
    if (!control) {
      return;
    }

    const normalized = this.sanitizeQuantityValue(String(control.value ?? ""), false);
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

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty || this.submitAttempted);
  }

  isItemQuantityInvalid(index: number): boolean {
    const control = this.getQuantityControl(index);
    return !!control && control.invalid && (control.touched || control.dirty || this.submitAttempted);
  }

  quantityInputId(index: number): string {
    return `transfer-quantity-${index}`;
  }

  warehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona un almacén";
  }

  warehouseTitle(warehouse: WarehouseResponse): string {
    const code = warehouse.code?.trim() || "";
    const name = warehouse.name?.trim() || "";
    return code && name ? `${code} - ${name}` : code || name || "Selecciona un almacén";
  }

  getProductLookupLabel(product: ProductLookupResponse): string {
    return `${product.name} (SKU: ${product.sku})`;
  }

  private createItemGroup(product: ProductLookupResponse): FormGroup {
    return this.formBuilder.group({
      productId: [product.id, Validators.required],
      productName: [product.name, Validators.required],
      productSku: [product.sku, Validators.required],
      productBarcode: [product.barcode],
      quantity: ["1", [Validators.required, Validators.pattern(QUANTITY_PATTERN)]],
    });
  }

  private getQuantityControl(index: number) {
    return this.items.at(index)?.get("quantity") ?? null;
  }

  private findItemIndex(productId: number): number {
    return this.items.controls.findIndex(
      (control) => Number(control.get("productId")?.value) === productId,
    );
  }

  private focusQuantityInput(index: number): void {
    queueMicrotask(() => {
      document.getElementById(this.quantityInputId(index))?.focus();
    });
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

  private buildTransferPayload(): TransferRequest {
    const value = this.form.getRawValue();
    return {
      sourceWarehouseId: Number(value.sourceWarehouseId),
      targetWarehouseId: Number(value.targetWarehouseId),
      reason: String(value.reason ?? "").trim(),
      items: this.items.controls.map((control) => ({
        productId: Number(control.get("productId")?.value),
        quantity: Number(control.get("quantity")?.value),
      })),
    };
  }

  private buildConfirmationDescription(payload: TransferRequest): string {
    const sourceLabel = this.resolveWarehouseLabel(payload.sourceWarehouseId);
    const targetLabel = this.resolveWarehouseLabel(payload.targetWarehouseId);
    const reason = payload.reason.trim() || "Sin motivo";

    return [
      `Origen: ${sourceLabel}`,
      `Destino: ${targetLabel}`,
      `Items: ${payload.items.length}`,
      `Motivo: ${reason}`,
      "Esta accion movera stock real.",
    ].join("\n");
  }

  private resolveWarehouseLabel(warehouseId: number | null): string {
    if (warehouseId === null) {
      return "Selecciona un almacén";
    }

    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse ? this.warehouseDisplayLabel(warehouse) : `Almacén #${warehouseId}`;
  }

  private resetAfterSuccess(): void {
    const { sourceWarehouseId, targetWarehouseId } = this.form.getRawValue();

    while (this.items.length > 0) {
      this.items.removeAt(this.items.length - 1);
    }

    this.form.patchValue(
      {
        sourceWarehouseId,
        targetWarehouseId,
        reason: "",
      },
      { emitEvent: false },
    );

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity({ emitEvent: false });

    this.clearSelectedProduct();
    this.errorMessage = "";
    this.helperMessage = "";
    this.submitAttempted = false;
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
          this.errorMessage = toHttpErrorMessage(error, "No se pudieron cargar almacenes.");
        },
      });
  }

  private toSubmitErrorMessage(error: unknown): string {
    const message = toHttpErrorMessage(error, "No se pudo registrar la transferencia.");

    if (message.includes("Product is inactive")) {
      return "El producto seleccionado está inactivo. Elige un producto activo.";
    }

    if (message.includes("Warehouse is inactive")) {
      return "Uno de los almacenes está inactivo. Selecciona almacenes activos.";
    }

    if (message.includes("Insufficient stock for transfer")) {
      return "No hay stock suficiente en el almacén origen para completar la transferencia.";
    }

    if (message.includes("Source and target warehouses must be different")) {
      return "El almacén origen debe ser distinto al almacén destino.";
    }

    if (message.includes("Transfer must include at least one item")) {
      return "La transferencia debe incluir al menos un producto.";
    }

    return message;
  }

  private differentWarehousesValidator(): ValidatorFn {
    return (control): ValidationErrors | null => {
      const sourceWarehouseId = control.get("sourceWarehouseId")?.value as number | null;
      const targetWarehouseId = control.get("targetWarehouseId")?.value as number | null;

      if (
        sourceWarehouseId === null ||
        targetWarehouseId === null ||
        sourceWarehouseId !== targetWarehouseId
      ) {
        return null;
      }

      return { sameWarehouses: true };
    };
  }

  private atLeastOneItemValidator(): ValidatorFn {
    return (control): ValidationErrors | null => {
      const value = control.value as unknown[] | null | undefined;
      return Array.isArray(value) && value.length > 0 ? null : { itemsRequired: true };
    };
  }
}
