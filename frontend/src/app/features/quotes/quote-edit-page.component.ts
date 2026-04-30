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
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuoteService } from "./data/quote.service";
import {
  QuoteItemRequest,
  QuoteResponse,
  QuoteStatus,
  UpdateQuoteRequest,
} from "./data/quotes.models";

@Component({
  selector: "app-quote-edit-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card quote-edit-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Comercial InkToy</p>
          <h1 class="ui-page-title">Editar cotizacion</h1>
          <p class="ui-page-description">
            Actualiza solo cotizaciones en estado DRAFT o SENT.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/cotizaciones', quoteId]"
        >
          Volver al detalle
        </a>
      </header>

      <p class="quote-reference" *ngIf="quote">
        Cotizacion: {{ quote.quoteNumber }}
        <span
          class="ui-badge status-badge"
          [ngClass]="statusClass(quote.status)"
        >
          {{ quote.status }}
        </span>
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="form-layout"
        *ngIf="loaded"
      >
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
              <small class="field-error" *ngIf="isInvalid('customerName')">
                customerName es obligatorio.
              </small>
            </label>

            <label class="field">
              <span>Documento</span>
              <input
                type="text"
                formControlName="customerDocument"
                maxlength="40"
              />
            </label>

            <label class="field">
              <span>Telefono</span>
              <input
                type="text"
                formControlName="customerPhone"
                maxlength="40"
              />
            </label>

            <label class="field">
              <span>Correo</span>
              <input
                type="email"
                formControlName="customerEmail"
                maxlength="160"
              />
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
            </label>

            <label class="field">
              <span>Fecha vencimiento *</span>
              <input type="date" formControlName="expiresAt" />
              <small class="field-error" *ngIf="isInvalid('expiresAt')">
                expiresAt es obligatorio.
              </small>
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
                <small class="field-error" *ngIf="itemInvalid(i, 'productId')">
                  productId es obligatorio.
                </small>
              </label>

              <label class="field">
                <span>Cantidad *</span>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  formControlName="quantity"
                />
                <small class="field-error" *ngIf="itemInvalid(i, 'quantity')">
                  quantity debe ser mayor que 0.
                </small>
              </label>

              <label class="field">
                <span>Descuento</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="discountAmount"
                />
                <small
                  class="field-error"
                  *ngIf="itemInvalid(i, 'discountAmount')"
                >
                  discountAmount debe ser mayor o igual que 0.
                </small>
              </label>

              <div class="line-total">
                <p>
                  <span>Subtotal</span>
                  <strong>{{ lineSubtotal(item) | number: "1.2-2" }}</strong>
                </p>
                <p>
                  <span>Total linea</span>
                  <strong>{{ lineTotal(item) | number: "1.2-2" }}</strong>
                </p>
              </div>

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

        <section class="totals-panel">
          <article class="total-box">
            <p class="label">Subtotal</p>
            <p class="value">{{ subtotal | number: "1.2-2" }}</p>
          </article>
          <article class="total-box">
            <p class="label">Descuento</p>
            <p class="value">{{ discountTotal | number: "1.2-2" }}</p>
          </article>
          <article class="total-box total-box--strong">
            <p class="label">Total visual</p>
            <p class="value">{{ total | number: "1.2-2" }}</p>
          </article>
        </section>

        <p class="ui-alert ui-alert--error" *ngIf="!editable">
          Esta cotizacion no se puede editar en su estado actual.
        </p>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving || !editable"
          >
            {{ saving ? "Guardando..." : "Guardar cambios" }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .quote-edit-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .quote-reference {
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .status-badge {
        font-weight: 700;
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
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
        grid-template-columns: minmax(220px, 1.8fr) 150px 150px minmax(
            180px,
            1fr
          ) auto;
        gap: var(--space-2);
        align-items: end;
      }

      .item-product {
        min-width: 0;
      }

      .line-total {
        display: grid;
        gap: var(--space-1);
      }

      .line-total p {
        margin: 0;
        display: grid;
        gap: 0.1rem;
      }

      .line-total span {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .line-total strong {
        font-size: var(--font-size-sm);
      }

      .totals-panel {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: var(--space-3);
      }

      .total-box {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: 0.15rem;
      }

      .total-box--strong {
        border-color: #c7d2fe;
        background: #eef2ff;
      }

      .total-box .label {
        margin: 0;
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .total-box .value {
        margin: 0;
        font-size: 1.15rem;
        font-family: var(--font-family-display);
        font-weight: 700;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .field-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .status-draft {
        background: #dbeafe;
        color: var(--color-info);
      }

      .status-sent {
        background: #ede9fe;
        color: #6d28d9;
      }

      .status-expired {
        background: #fee2e2;
        color: var(--color-danger);
      }

      .status-converted {
        background: #dcfce7;
        color: var(--color-success);
      }

      .status-cancelled {
        background: #e5e7eb;
        color: #1f2937;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1200px) {
        .item-row {
          grid-template-columns: 1fr;
        }

        .totals-panel {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 800px) {
        .quote-edit-page {
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
export class QuoteEditPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    customerName: ["", [Validators.required, Validators.maxLength(180)]],
    customerDocument: ["", Validators.maxLength(40)],
    customerPhone: ["", Validators.maxLength(40)],
    customerEmail: ["", Validators.maxLength(160)],
    issueDate: [{ value: "", disabled: true }],
    expiresAt: ["", Validators.required],
    notes: ["", Validators.maxLength(400)],
    items: this.formBuilder.array<FormGroup>([]),
  });

  quoteId = 0;
  quote: QuoteResponse | null = null;
  products: Product[] = [];
  private readonly productById = new Map<number, Product>();

  loaded = false;
  editable = false;
  saving = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly quoteService: QuoteService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.router.navigate(["/cotizaciones"]);
      return;
    }

    this.quoteId = id;
    this.loadData(id);
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  get subtotal(): number {
    return this.items.controls.reduce(
      (sum, itemGroup) => sum + this.lineSubtotal(itemGroup),
      0,
    );
  }

  get discountTotal(): number {
    return this.items.controls.reduce((sum, itemGroup) => {
      const discountAmount = this.normalizeNumber(
        itemGroup.get("discountAmount")?.value,
      );
      return sum + Math.max(discountAmount, 0);
    }, 0);
  }

  get total(): number {
    return Math.max(this.subtotal - this.discountTotal, 0);
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
    this.errorMessage = "";
    this.successMessage = "";

    if (!this.editable) {
      this.errorMessage = "Solo se permite editar cotizaciones DRAFT o SENT.";
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.items.length === 0) {
      this.errorMessage = "Debes registrar al menos un item.";
      return;
    }

    const payloadItems = this.items.controls
      .map((group) => this.mapItem(group))
      .filter((item) => item !== null) as QuoteItemRequest[];

    if (payloadItems.length === 0) {
      this.errorMessage = "Ingresa al menos un item valido para la cotizacion.";
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UpdateQuoteRequest = {
      customerName: String(raw.customerName ?? "").trim(),
      customerDocument: this.normalizeOptional(raw.customerDocument),
      customerPhone: this.normalizeOptional(raw.customerPhone),
      customerEmail: this.normalizeOptional(raw.customerEmail),
      expiresAt: String(raw.expiresAt ?? "").trim(),
      notes: this.normalizeOptional(raw.notes),
      items: payloadItems,
    };

    this.saving = true;

    this.quoteService.update(this.quoteId, payload).subscribe({
      next: (quote) => {
        this.saving = false;
        this.successMessage = "Cotizacion actualizada correctamente.";
        this.router.navigate(["/cotizaciones", quote.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo actualizar la cotizacion.",
        );
      },
    });
  }

  statusClass(status: QuoteStatus): string {
    switch (status) {
      case "DRAFT":
        return "status-draft";
      case "SENT":
        return "status-sent";
      case "EXPIRED":
        return "status-expired";
      case "CONVERTED":
        return "status-converted";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "";
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  itemInvalid(index: number, controlName: string): boolean {
    const group = this.items.at(index);
    const control = group?.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  lineSubtotal(group: FormGroup): number {
    const productId = this.normalizeNumber(group.get("productId")?.value);
    const quantity = this.normalizeNumber(group.get("quantity")?.value);

    if (quantity <= 0) {
      return 0;
    }

    const product = this.productById.get(productId);
    const snapshotPrice = this.normalizeNumber(group.get("unitPrice")?.value);
    const unitPrice = product
      ? this.normalizeNumber(product.salePrice)
      : snapshotPrice;

    return unitPrice * quantity;
  }

  lineTotal(group: FormGroup): number {
    const subtotal = this.lineSubtotal(group);
    const discountAmount = this.normalizeNumber(
      group.get("discountAmount")?.value,
    );
    return Math.max(subtotal - Math.max(discountAmount, 0), 0);
  }

  private loadData(id: number): void {
    this.loaded = false;
    this.errorMessage = "";

    forkJoin({
      quote: this.quoteService.getById(id),
      productsPage: this.productService.list(0, 500),
    }).subscribe({
      next: ({ quote, productsPage }) => {
        this.quote = quote;
        this.products = productsPage.content;
        this.productById.clear();
        for (const product of this.products) {
          this.productById.set(product.id, product);
        }

        this.editable = this.canEditStatus(quote.status);
        if (!this.editable) {
          this.errorMessage =
            "La cotizacion no se puede editar porque esta en estado CONVERTED, CANCELLED o EXPIRED.";
          this.loaded = true;
          this.router.navigate(["/cotizaciones", id]);
          return;
        }

        this.patchForm(quote);
        this.loaded = true;
      },
      error: (error: unknown) => {
        this.loaded = true;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar la cotizacion para editar.",
        );
      },
    });
  }

  private patchForm(quote: QuoteResponse): void {
    this.form.patchValue({
      customerName: quote.customerName,
      customerDocument: quote.customerDocument ?? "",
      customerPhone: quote.customerPhone ?? "",
      customerEmail: quote.customerEmail ?? "",
      issueDate: quote.issueDate,
      expiresAt: quote.expiresAt,
      notes: quote.notes ?? "",
    });

    this.items.clear();

    for (const item of quote.items) {
      this.items.push(
        this.createItemGroup(
          item.productId,
          this.normalizeNumber(item.quantity),
          this.normalizeNumber(item.discountAmount),
          this.normalizeNumber(item.unitPrice),
        ),
      );
    }

    if (this.items.length === 0) {
      this.items.push(this.createItemGroup());
    }
  }

  private createItemGroup(
    productId: number | null = null,
    quantity = 1,
    discountAmount = 0,
    unitPrice = 0,
  ): FormGroup {
    return this.formBuilder.group({
      productId: [productId, Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(0.0001)]],
      discountAmount: [
        discountAmount,
        [Validators.required, Validators.min(0)],
      ],
      unitPrice: [unitPrice],
    });
  }

  private canEditStatus(status: QuoteStatus): boolean {
    return status === "DRAFT" || status === "SENT";
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

  private normalizeOptional(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }
}
