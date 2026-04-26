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
    <section class="card" *ngIf="order">
      <header class="header">
        <div>
          <h1>Recepcion de orden #{{ order.id }}</h1>
          <p class="muted">
            Registra ingreso parcial o total contra pendientes.
          </p>
        </div>
        <a [routerLink]="['/compras/ordenes', order.id]">Volver al detalle</a>
      </header>

      <p class="error" *ngIf="!isReceivableStatus(order.status)">
        Solo se puede recibir una orden en estado aprobada o recepcion parcial.
      </p>

      <form
        *ngIf="isReceivableStatus(order.status)"
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="grid"
      >
        <label>
          Fecha de recepcion
          <input type="date" formControlName="receiptDate" />
        </label>

        <label class="full">
          Notas
          <textarea rows="3" maxlength="400" formControlName="notes"></textarea>
        </label>

        <section class="items full">
          <h2>Items pendientes</h2>
          <div formArrayName="items" class="items-list">
            <div
              class="item-row"
              *ngFor="let control of items.controls; let i = index"
              [formGroupName]="i"
            >
              <p class="product">
                {{ productName(receiveItems[i].productId) }}
              </p>
              <p>
                Ordenado:
                {{ receiveItems[i].quantityOrdered | number: "1.3-3" }}
              </p>
              <p>
                Recibido:
                {{ receiveItems[i].quantityReceived | number: "1.3-3" }}
              </p>
              <p>
                Pendiente:
                {{ receiveItems[i].quantityPending | number: "1.3-3" }}
              </p>

              <label>
                Recibir ahora
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

        <div class="actions full">
          <button type="submit" [disabled]="saving">
            {{ saving ? "Registrando..." : "Registrar recepcion" }}
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
        gap: 0.7rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
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
        gap: 0.6rem;
      }
      .items-list {
        display: grid;
        gap: 0.55rem;
      }
      .item-row {
        border: 1px solid #e5e7eb;
        border-radius: 0.45rem;
        padding: 0.6rem;
        display: grid;
        gap: 0.35rem;
      }
      .product {
        margin: 0;
        font-weight: 700;
      }
      p {
        margin: 0;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      button {
        border: 0;
        border-radius: 0.35rem;
        padding: 0.45rem 0.8rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 800px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
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
