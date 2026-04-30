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

import { ProductService } from "../catalog/data/product.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  PurchaseOrderResponse,
  ReceivePurchaseItemRequest,
  ReceivePurchaseOrderRequest,
} from "./data/purchases.models";
import { PurchaseOrderService } from "./data/purchase-order.service";

interface ReceiveItemView {
  purchaseOrderItemId: number;
  productId: number;
  quantityOrdered: number;
  quantityReceived: number;
  quantityPending: number;
}

@Component({
  selector: "app-purchase-order-receive-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card receive-page" *ngIf="order">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Recepcion de orden #{{ order.id }}</h1>
          <p class="ui-page-description">
            Registra el ingreso parcial o total respetando cantidades pendientes
            por item.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/compras/ordenes', order.id]"
        >
          Volver al detalle
        </a>
      </header>

      <section class="summary-strip">
        <p>
          <span>Estado actual</span>
          <strong>{{ order.status }}</strong>
        </p>
        <p>
          <span>Items</span>
          <strong>{{ order.items.length }}</strong>
        </p>
      </section>

      <p
        class="ui-alert ui-alert--error"
        *ngIf="!isReceivableStatus(order.status)"
      >
        Solo se puede recibir una orden en estado aprobada o recepcion parcial.
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form
        *ngIf="isReceivableStatus(order.status)"
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="form-layout"
      >
        <section class="form-section">
          <header class="section-head">
            <h2>Datos de recepcion</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Fecha de recepcion</span>
              <input type="date" formControlName="receiptDate" />
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
          <header class="section-head">
            <h2>Items pendientes</h2>
          </header>

          <div formArrayName="items" class="items-list">
            <div
              class="item-row"
              *ngFor="let control of items.controls; let i = index"
              [formGroupName]="i"
            >
              <div class="item-head">
                <p class="product">
                  {{ productName(receiveItems[i].productId) }}
                </p>
                <span class="ui-badge ui-badge--warning">
                  Pendiente
                  {{ receiveItems[i].quantityPending | number: "1.3-3" }}
                </span>
              </div>

              <div class="item-metrics">
                <p>
                  <span>Ordenado</span>
                  <strong>{{
                    receiveItems[i].quantityOrdered | number: "1.3-3"
                  }}</strong>
                </p>
                <p>
                  <span>Recibido</span>
                  <strong>{{
                    receiveItems[i].quantityReceived | number: "1.3-3"
                  }}</strong>
                </p>
              </div>

              <label class="field field-inline">
                <span>Recibir ahora</span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  formControlName="quantityReceived"
                />
              </label>
            </div>
          </div>
        </section>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Registrando..." : "Registrar recepcion" }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .receive-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .summary-strip {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
      }

      .summary-strip p {
        margin: 0;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg-soft);
        display: grid;
        gap: 0.2rem;
      }

      .summary-strip span {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
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
        gap: var(--space-2);
      }

      .item-head {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--space-2);
        align-items: center;
      }

      .product {
        margin: 0;
        font-weight: 700;
      }

      .item-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
      }

      .item-metrics p {
        margin: 0;
        display: grid;
        gap: 0.2rem;
      }

      .item-metrics span {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .field-inline {
        grid-template-columns: 1fr;
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

      @media (max-width: 800px) {
        .receive-page {
          padding: var(--space-4);
        }

        .form-grid--two {
          grid-template-columns: 1fr;
        }

        .item-head {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PurchaseOrderReceivePageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    receiptDate: [this.todayIsoDate()],
    notes: ["", [Validators.maxLength(400)]],
    items: this.formBuilder.array([]),
  });

  order: PurchaseOrderResponse | null = null;
  receiveItems: ReceiveItemView[] = [];

  productNames = new Map<number, string>();

  saving = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly productService: ProductService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!id) {
      this.router.navigate(["/compras/ordenes"]);
      return;
    }

    this.loadProducts();
    this.loadOrder(id);
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as unknown as FormArray<FormGroup>;
  }

  submit(): void {
    if (!this.order || !this.isReceivableStatus(this.order.status)) {
      this.errorMessage =
        "La orden no se encuentra en estado valido para recepcion.";
      return;
    }

    const payloadItems: ReceivePurchaseItemRequest[] = [];

    for (let i = 0; i < this.items.length; i += 1) {
      const group = this.items.at(i);
      const quantityReceived = Number(
        group.get("quantityReceived")?.value ?? 0,
      );
      const pending = this.receiveItems[i]?.quantityPending ?? 0;
      const purchaseOrderItemId = Number(
        group.get("purchaseOrderItemId")?.value ?? 0,
      );

      if (quantityReceived < 0) {
        this.errorMessage = "La cantidad a recibir no puede ser negativa.";
        return;
      }

      if (quantityReceived > pending) {
        this.errorMessage =
          "La cantidad a recibir no puede exceder la cantidad pendiente.";
        return;
      }

      if (quantityReceived > 0) {
        payloadItems.push({ purchaseOrderItemId, quantityReceived });
      }
    }

    if (payloadItems.length === 0) {
      this.errorMessage =
        "Ingresa al menos una cantidad mayor a cero para registrar recepcion.";
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const raw = this.form.getRawValue();
    const payload: ReceivePurchaseOrderRequest = {
      receiptDate: this.normalizeOptional(raw.receiptDate),
      notes: this.normalizeOptional(raw.notes),
      items: payloadItems,
    };

    this.purchaseOrderService.receive(this.order.id, payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.successMessage = "Recepcion registrada correctamente.";
        this.router.navigate(["/compras/ordenes", updated.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo registrar la recepcion.",
        );
      },
    });
  }

  isReceivableStatus(status: string): boolean {
    return status === "APPROVED" || status === "PARTIALLY_RECEIVED";
  }

  productName(productId: number): string {
    return this.productNames.get(productId) ?? `Producto #${productId}`;
  }

  private loadOrder(id: number): void {
    this.purchaseOrderService.getById(id).subscribe({
      next: (order) => {
        this.order = order;
        this.receiveItems = order.items.map((item) => ({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          quantityPending: Math.max(
            item.quantityOrdered - item.quantityReceived,
            0,
          ),
        }));

        this.items.clear();
        for (const item of this.receiveItems) {
          this.items.push(
            this.formBuilder.group({
              purchaseOrderItemId: [item.purchaseOrderItemId],
              quantityReceived: [0, [Validators.min(0)]],
            }),
          );
        }
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar la orden.",
        );
      },
    });
  }

  private loadProducts(): void {
    this.productService.list(0, 500).subscribe({
      next: (page) => {
        this.productNames = new Map(
          page.content.map((product) => [
            product.id,
            `${product.name} (${product.sku})`,
          ]),
        );
      },
      error: () => {
        this.productNames = new Map();
      },
    });
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
