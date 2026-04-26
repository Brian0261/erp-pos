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

import { Product } from "../catalog/data/catalog.models";
import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { QuoteService } from "./data/quote.service";
import { CreateQuoteRequest, QuoteItemRequest } from "./data/quotes.models";

@Component({
  selector: "app-quote-new-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1>Nueva cotizacion</h1>
          <p class="muted">Crea una cotizacion en estado DRAFT.</p>
        </div>
        <a [routerLink]="['/cotizaciones']">Volver al listado</a>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <label>
          Cliente *
          <input type="text" formControlName="customerName" maxlength="180" />
          <small class="error" *ngIf="isInvalid('customerName')">
            customerName es obligatorio.
          </small>
        </label>

        <label>
          Documento
          <input
            type="text"
            formControlName="customerDocument"
            maxlength="40"
          />
        </label>

        <label>
          Telefono
          <input type="text" formControlName="customerPhone" maxlength="40" />
        </label>

        <label>
          Correo
          <input type="email" formControlName="customerEmail" maxlength="160" />
        </label>

        <label>
          Fecha emision
          <input type="date" formControlName="issueDate" />
        </label>

        <label>
          Fecha vencimiento *
          <input type="date" formControlName="expiresAt" />
          <small class="error" *ngIf="isInvalid('expiresAt')">
            expiresAt es obligatorio.
          </small>
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
                <small class="error" *ngIf="itemInvalid(i, 'productId')">
                  productId es obligatorio.
                </small>
              </label>

              <label>
                Cantidad *
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  formControlName="quantity"
                />
                <small class="error" *ngIf="itemInvalid(i, 'quantity')">
                  quantity debe ser mayor que 0.
                </small>
              </label>

              <label>
                Descuento
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="discountAmount"
                />
                <small class="error" *ngIf="itemInvalid(i, 'discountAmount')">
                  discountAmount debe ser mayor o igual que 0.
                </small>
              </label>

              <div class="line-total">
                <span
                  >Subtotal: {{ lineSubtotal(item) | number: "1.2-2" }}</span
                >
                <span
                  >Total linea: {{ lineTotal(item) | number: "1.2-2" }}</span
                >
              </div>

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

        <section class="totals full">
          <p><strong>Subtotal:</strong> {{ subtotal | number: "1.2-2" }}</p>
          <p>
            <strong>Descuento:</strong> {{ discountTotal | number: "1.2-2" }}
          </p>
          <p><strong>Total visual:</strong> {{ total | number: "1.2-2" }}</p>
        </section>

        <div class="actions full">
          <button type="submit" [disabled]="saving">
            {{ saving ? "Guardando..." : "Crear cotizacion" }}
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
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      h1,
      h2 {
        margin: 0;
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
      textarea,
      button {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        border: 0;
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
        gap: 0.75rem;
      }
      .item-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto auto;
        gap: 0.55rem;
        align-items: end;
        border: 1px solid #e5e7eb;
        border-radius: 0.4rem;
        padding: 0.55rem;
      }
      .line-total {
        display: grid;
        gap: 0.2rem;
        font-size: 0.85rem;
        color: #374151;
      }
      .totals {
        display: grid;
        grid-template-columns: repeat(3, minmax(140px, 1fr));
        gap: 0.5rem;
      }
      .totals p {
        margin: 0;
        background: #f3f4f6;
        padding: 0.5rem;
        border-radius: 0.35rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 1200px) {
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

  products: Product[] = [];
  private readonly productById = new Map<number, Product>();

  saving = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productService: ProductService,
    private readonly quoteService: QuoteService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
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

    this.saving = true;

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

    const product = this.productById.get(productId);
    if (!product || quantity <= 0) {
      return 0;
    }

    return this.normalizeNumber(product.salePrice) * quantity;
  }

  lineTotal(group: FormGroup): number {
    const subtotal = this.lineSubtotal(group);
    const discountAmount = this.normalizeNumber(
      group.get("discountAmount")?.value,
    );
    return Math.max(subtotal - Math.max(discountAmount, 0), 0);
  }

  private createItemGroup(): FormGroup {
    return this.formBuilder.group({
      productId: [null as number | null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      discountAmount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private loadProducts(): void {
    this.productService.list(0, 500).subscribe({
      next: (page) => {
        this.products = page.content.filter((product) => product.active);
        this.productById.clear();
        for (const product of this.products) {
          this.productById.set(product.id, product);
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

  private todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
