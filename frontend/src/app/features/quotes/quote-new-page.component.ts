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

import {
  ProductAutocompleteComponent,
} from "../../shared/components/product-autocomplete/product-autocomplete.component";
import { Product, ProductLookupResponse } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuoteService } from "./data/quote.service";
import { CreateQuoteRequest, QuoteItemRequest } from "./data/quotes.models";

const QUANTITY_PATTERN = /^(?:0\.[1-9]|[1-9]\d*(?:\.[0-9])?)$/;
const DISCOUNT_PATTERN = /^(?:0(?:\.\d{1,2})?|[1-9]\d*(?:\.\d{1,2})?)$/;

@Component({
  selector: "app-quote-new-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ProductAutocompleteComponent,
  ],
  template: `
    <section class="ui-card quote-form-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Comercial InkToy</p>
          <h1 class="ui-page-title">Nueva cotizacion</h1>
          <p class="ui-page-description">
            Registra una cotizacion en estado borrador con cliente, items,
            descuentos y totales listos para envio o conversion.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/cotizaciones']"
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
            <h2>Cliente</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Cliente *</span>
              <input
                type="text"
                formControlName="customerName"
                maxlength="180"
              />
              <small class="field-error" [class.field-error--hidden]="!isInvalid('customerName')">
                Cliente es obligatorio.
              </small>
            </label>

            <label class="field">
              <span>Documento</span>
              <input
                type="text"
                formControlName="customerDocument"
                maxlength="40"
              />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Telefono</span>
              <input
                type="text"
                formControlName="customerPhone"
                maxlength="40"
              />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Correo</span>
              <input
                type="email"
                formControlName="customerEmail"
                maxlength="160"
              />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Datos generales</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Fecha emision</span>
              <input type="date" formControlName="issueDate" />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Fecha vencimiento *</span>
              <input type="date" formControlName="expiresAt" />
              <small class="field-error" [class.field-error--hidden]="!isInvalid('expiresAt')">
                Fecha de vencimiento es obligatoria.
              </small>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head section-head--actions">
            <div>
              <h2>Items</h2>
              <p class="section-copy">
                Busca productos por nombre, SKU o codigo de barras y ajusta
                cantidad y descuento sin perder el total estimado.
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
              <div>P. Unit.</div>
              <div>Descuento</div>
              <div>Total</div>
              <div>Acción</div>
            </div>

            <div
              class="items-table__row"
              *ngFor="let item of items.controls; let i = index"
              [formGroupName]="i"
            >
              <div class="items-table__cell items-table__cell--product" data-label="Producto">
                <div class="field field--product">
                  <app-product-autocomplete
                    [placeholder]="'Buscar producto por nombre, SKU o codigo de barras'"
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
                </div>
              </div>

              <div class="items-table__cell items-table__cell--quantity" data-label="Cantidad">
                <div class="field">
                  <input
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    formControlName="quantity"
                    placeholder="1"
                    aria-label="Cantidad"
                    (input)="onQuantityInput(i, $event)"
                    (keydown)="blockInvalidDecimalKeys($event)"
                    (blur)="normalizeQuantityOnBlur(i)"
                  />
                  <small class="field-error" [class.field-error--hidden]="!isItemInvalid(i, 'quantity')">
                    Mayor que 0. Max. 1 decimal.
                  </small>
                </div>
              </div>

              <div class="items-table__cell items-table__cell--price" data-label="P. Unit.">
                <div class="field field--readonly">
                  <strong>{{ formatCurrency(itemUnitPrice(i)) }}</strong>
                </div>
              </div>

              <div class="items-table__cell items-table__cell--discount" data-label="Descuento">
                <div class="field">
                  <input
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    formControlName="discountAmount"
                    placeholder="0.00"
                    aria-label="Descuento"
                    (input)="onDiscountInput(i, $event)"
                    (keydown)="blockInvalidDecimalKeys($event)"
                    (blur)="normalizeDiscountOnBlur(i)"
                  />
                  <small class="field-error" [class.field-error--hidden]="!isDiscountInvalid(i)">
                    No puede ser negativo ni superar el subtotal.
                  </small>
                </div>
              </div>

              <div class="items-table__cell items-table__cell--total" data-label="Total">
                <div class="field field--readonly">
                  <strong>{{ formatCurrency(lineTotalValue(i)) }}</strong>
                </div>
              </div>

              <div class="items-table__cell items-table__cell--action" data-label="Acción">
                <div class="field field--action">
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
          </div>

          <aside class="totals-panel">
            <p class="label">Subtotal</p>
            <p class="value">{{ formatCurrency(subtotal) }}</p>
          </aside>
          <aside class="totals-panel">
            <p class="label">Descuento</p>
            <p class="value">{{ formatCurrency(discountTotal) }}</p>
          </aside>
          <aside class="totals-panel totals-panel--strong">
            <p class="label">Total</p>
            <p class="value">{{ formatCurrency(total) }}</p>
          </aside>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Notas</h2>
          </header>
          <label class="field full">
            <textarea
              rows="2"
              maxlength="400"
              formControlName="notes"
            ></textarea>
            <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
          </label>
        </section>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Guardando..." : "Crear cotizacion" }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .quote-form-page {
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
        gap: var(--space-3);
      }

      .form-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-2);
        display: grid;
        gap: var(--space-2);
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
        gap: var(--space-1);
      }

      .items-table__header,
      .items-table__row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) 6rem 7rem 7rem 7rem 6rem;
        gap: var(--space-2);
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
        padding: var(--space-2);
      }

      .items-table__cell {
        min-width: 0;
      }

      .field--readonly > strong {
        display: flex;
        align-items: center;
        white-space: nowrap;
        min-height: 2.4rem;
        width: 100%;
      }

      .field--action {
        grid-template-columns: 1fr;
      }

      .field--action > button {
        width: 100%;
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

      .totals-panel--strong {
        border-top: 2px solid var(--color-border-strong);
      }

      .totals-panel--strong .value {
        font-size: 1.5rem;
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
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .field-error--hidden {
        display: none;
      }

      @media (max-width: 1200px) {
        .items-table__header,
        .items-table__row {
          grid-template-columns: minmax(0, 2fr) 6rem 7rem 7rem 7rem 6rem;
        }
      }

      @media (max-width: 960px) {
        .items-table__header {
          display: none;
        }

        .items-table__row {
          grid-template-columns: 1fr;
          gap: var(--space-2);
        }

        .items-table__cell {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .items-table__cell::before {
          content: attr(data-label);
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .items-table__cell--action {
          justify-content: flex-start;
        }
      }

      @media (max-width: 800px) {
        .quote-form-page {
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
export class QuoteNewPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    customerName: ["", [Validators.required, Validators.maxLength(180)]],
    customerDocument: ["", Validators.maxLength(40)],
    customerPhone: ["", Validators.maxLength(40)],
    customerEmail: ["", Validators.maxLength(160)],
    issueDate: [this.todayIsoDate()],
    expiresAt: ["", Validators.required],
    notes: ["", Validators.maxLength(400)],
    items: this.formBuilder.array([this.createItemGroup()]),
  });

  selectedProducts: Array<ProductLookupResponse | null> = [null];

  private readonly productById = new Map<number, { salePrice: number }>();

  saving = false;
  errorMessage = "";
  successMessage = "";
  submitAttempted = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly quoteService: QuoteService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.items.valueChanges.subscribe(() => {
      this.successMessage = "";
    });
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  get subtotal(): number {
    return this.items.controls.reduce(
      (sum, _group, index) => sum + this.lineSubtotalValue(index),
      0,
    );
  }

  get discountTotal(): number {
    return this.items.controls.reduce((sum, _group, index) => {
      const discountAmount = this.normalizeNumber(
        this.items.at(index).get("discountAmount")?.value,
      );
      return sum + Math.max(discountAmount, 0);
    }, 0);
  }

  get total(): number {
    return Math.max(this.subtotal - this.discountTotal, 0);
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

    if (!this.productById.has(product.id)) {
      this.productService.getById(product.id).subscribe({
        next: (p: Product) => {
          this.productById.set(p.id, { salePrice: p.salePrice });
        },
        error: () => {
          // Silently ignore; price will show S/ 0.00 until resolved
        },
      });
    }
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
    this.onDecimalInput(index, "quantity", event, 1);
  }

  onDiscountInput(index: number, event: Event): void {
    this.onDecimalInput(index, "discountAmount", event, 2);
  }

  normalizeQuantityOnBlur(index: number): void {
    this.normalizeDecimalOnBlur(index, "quantity", 1, true);
  }

  normalizeDiscountOnBlur(index: number): void {
    this.normalizeDecimalOnBlur(index, "discountAmount", 2, false);
  }

  blockInvalidDecimalKeys(event: KeyboardEvent): void {
    const blockedKeys = ["e", "E", "+", "-", ","];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  itemUnitPrice(index: number): number {
    const group = this.items.at(index);
    const productId = this.normalizeNumber(group?.get("productId")?.value);
    const product = this.productById.get(productId);
    return product?.salePrice ?? 0;
  }

  lineSubtotalValue(index: number): number {
    const group = this.items.at(index);
    const quantity = this.normalizeNumber(group?.get("quantity")?.value);
    const unitPrice = this.itemUnitPrice(index);
    if (unitPrice <= 0 || quantity <= 0) {
      return 0;
    }
    return unitPrice * quantity;
  }

  lineTotalValue(index: number): number {
    const subtotal = this.lineSubtotalValue(index);
    const group = this.items.at(index);
    const discountAmount = this.normalizeNumber(
      group?.get("discountAmount")?.value,
    );
    return Math.max(subtotal - Math.max(discountAmount, 0), 0);
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return (
      !!control &&
      control.invalid &&
      (control.touched || control.dirty || this.submitAttempted)
    );
  }

  isItemInvalid(index: number, controlName: string): boolean {
    const control = this.items.at(index)?.get(controlName) ?? null;
    return (
      !!control &&
      control.invalid &&
      (control.touched || control.dirty || this.submitAttempted)
    );
  }

  isDiscountInvalid(index: number): boolean {
    const group = this.items.at(index);
    if (!group) {
      return false;
    }

    const control = group.get("discountAmount");
    const isTouchedOrDirty =
      control?.touched || control?.dirty || this.submitAttempted;

    if (!isTouchedOrDirty) {
      return false;
    }

    if (control?.invalid) {
      return true;
    }

    const discount = this.normalizeNumber(control?.value);
    const subtotal = this.lineSubtotalValue(index);
    return discount > subtotal;
  }

  formatCurrency(value: unknown): string {
    const amount = this.toNumber(value) ?? 0;
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  submit(): void {
    this.submitAttempted = true;
    this.errorMessage = "";

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.items.length === 0) {
      this.errorMessage = "Debes registrar al menos un item.";
      return;
    }

    for (let i = 0; i < this.items.length; i += 1) {
      const group = this.items.at(i);
      const discount = this.normalizeNumber(
        group.get("discountAmount")?.value,
      );
      const subtotal = this.lineSubtotalValue(i);
      if (discount > subtotal) {
        this.errorMessage = `El descuento del item ${i + 1} no puede superar el subtotal.`;
        return;
      }
    }

    const payloadItems = this.items.controls
      .map((group) => this.mapItem(group))
      .filter((item) => item !== null) as QuoteItemRequest[];

    if (payloadItems.length === 0) {
      this.errorMessage = "Ingresa al menos un item valido para la cotizacion.";
      return;
    }

    this.saving = true;
    this.successMessage = "";

    const raw = this.form.getRawValue();
    const payload: CreateQuoteRequest = {
      customerName: String(raw.customerName ?? "").trim(),
      customerDocument: this.normalizeOptional(raw.customerDocument),
      customerPhone: this.normalizeOptional(raw.customerPhone),
      customerEmail: this.normalizeOptional(raw.customerEmail),
      issueDate: this.normalizeOptional(raw.issueDate),
      expiresAt: String(raw.expiresAt ?? "").trim(),
      notes: this.normalizeOptional(raw.notes),
      items: payloadItems,
    };

    this.quoteService.create(payload).subscribe({
      next: (quote) => {
        this.saving = false;
        this.successMessage = "Cotizacion creada correctamente.";
        this.router.navigate(["/cotizaciones", quote.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo crear la cotizacion.",
        );
      },
    });
  }

  private createItemGroup(): FormGroup {
    return this.formBuilder.group({
      productId: [null as number | null, Validators.required],
      quantity: [
        "",
        [Validators.required, Validators.pattern(QUANTITY_PATTERN)],
      ],
      discountAmount: [
        "",
        [Validators.required, Validators.min(0), Validators.pattern(DISCOUNT_PATTERN)],
      ],
    });
  }

  private loadProducts(): void {
    this.productService.list(0, 500).subscribe({
      next: (page) => {
        this.productById.clear();
        for (const product of page.content) {
          this.productById.set(product.id, { salePrice: product.salePrice });
        }
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar los productos.",
        );
      },
    });
  }

  private mapItem(group: FormGroup): QuoteItemRequest | null {
    const productId = this.normalizeNumber(group.get("productId")?.value);
    const quantity = this.normalizeNumber(group.get("quantity")?.value);
    const discountAmount = this.normalizeNumber(
      group.get("discountAmount")?.value,
    );

    if (productId <= 0 || quantity <= 0 || discountAmount < 0) {
      return null;
    }

    return {
      productId,
      quantity,
      discountAmount,
    };
  }

  private onDecimalInput(
    index: number,
    controlName: "quantity" | "discountAmount",
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
    controlName: "quantity" | "discountAmount",
    maxDecimals: number,
    mustBePositive: boolean,
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
    if (!Number.isFinite(numericValue)) {
      control.setValue("", { emitEvent: false });
      control.markAsTouched();
      return;
    }

    if (mustBePositive) {
      if (numericValue <= 0) {
        control.setValue("", { emitEvent: false });
        control.markAsTouched();
        return;
      }
    } else {
      if (numericValue < 0) {
        control.setValue("", { emitEvent: false });
        control.markAsTouched();
        return;
      }
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
      return keepTrailingDot
        ? `${integerPart || "0"}.`
        : `${integerPart || "0"}`;
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

  private toNumber(value: unknown): number | null {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const numericValue = Number(trimmed);
      return Number.isFinite(numericValue) ? numericValue : null;
    }

    return null;
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }
}
