import { HttpErrorResponse } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";

@Component({
  selector: "app-sale-void-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card sale-void-page">
      <header class="ui-page-head">
        <div>
          <h1 class="ui-page-title">Anular venta</h1>
          <p class="ui-page-description">
            Registra el motivo y confirma la anulacion para devolver stock y
            dejar trazabilidad operativa.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando venta...</p>

      <ng-container *ngIf="sale && !loading">
        <article class="summary">
          <div class="summary-head">
            <h2>Venta objetivo</h2>
            <span
              class="ui-badge"
              [class.ui-badge--success]="sale.status === 'COMPLETED'"
              [class.ui-badge--danger]="sale.status !== 'COMPLETED'"
            >
              {{ saleStatusLabel(sale.status) }}
            </span>
          </div>

          <div class="summary-grid">
            <p>
              <strong>Venta:</strong> {{ sale.saleNumber }} (#{{ sale.id }})
            </p>
            <p>
              <strong>Total:</strong> {{ formatCurrency(sale.totalAmount) }}
            </p>
            <p>
              <strong>Fecha:</strong>
              {{ formatDateTime(sale.soldAt) }}
            </p>
          </div>
        </article>

        <article class="warning-panel">
          <p>
            Esta accion anulara la venta y puede afectar stock, caja y pagos
            asociados. Verifica caja, montos y autorizacion antes de confirmar.
          </p>
          <p class="warning-panel__secondary">
            Si la venta tiene un comprobante electronico activo, no se puede
            anular internamente y requiere gestion desde Facturacion.
          </p>
        </article>

        <form [formGroup]="voidForm" (ngSubmit)="voidSale()" class="void-form">
          <label class="field">
            <span>Motivo *</span>
            <textarea
              formControlName="reason"
              maxlength="400"
              placeholder="Describe brevemente por que se anula la venta"
            ></textarea>
          </label>

          <div class="actions">
            <a
              class="ui-button ui-button--secondary"
              [routerLink]="['/ventas', sale.id]"
              >Cancelar</a
            >
            <button
              type="submit"
              class="ui-button ui-button--danger"
              [disabled]="submitting || !canVoidSale()"
            >
              Confirmar anulacion
            </button>
          </div>
        </form>

        <p class="ui-alert ui-alert--info" *ngIf="!canVoidSale()">
          Solo ADMIN/SUPERVISOR puede anular ventas en estado COMPLETED.
        </p>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .sale-void-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h1 {
        margin: 0;
      }

      .summary {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .summary-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: var(--space-2);
      }

      .summary p {
        margin: 0;
      }

      .warning-panel {
        border: 1px solid #fecaca;
        background: #fff1f2;
        color: #881337;
        border-radius: var(--radius-md);
        padding: var(--space-3);
      }

      .warning-panel p {
        margin: 0;
        font-weight: 700;
      }

      .warning-panel__secondary {
        margin-top: var(--space-2);
        font-weight: 600;
      }

      .void-form {
        display: grid;
        gap: var(--space-3);
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

      textarea,
      input {
        padding: 0.6rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .sale-void-page {
          padding: var(--space-4);
        }

        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SaleVoidPageComponent implements OnInit {
  private readonly currencyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  readonly voidForm = this.formBuilder.group({
    reason: ["", [Validators.required, Validators.maxLength(400)]],
  });

  sale: SaleResponse | null = null;
  currentUser: UserProfile | null = null;

  loading = true;
  submitting = false;

  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly salesService: SalesService,
    private readonly authService: AuthService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: () => {
        this.currentUser = null;
      },
    });

    this.loadSale();
  }

  canVoidSale(): boolean {
    if (!this.sale || !this.currentUser) {
      return false;
    }

    const allowedRole = this.currentUser.roles.some((role) =>
      ["ADMIN", "SUPERVISOR"].includes(role),
    );

    return allowedRole && this.sale.status === "COMPLETED";
  }

  saleStatusLabel(status: string): string {
    switch (status) {
      case "COMPLETED":
        return "Completada";
      case "VOIDED":
        return "Anulada";
      default:
        return status;
    }
  }

  formatCurrency(value: number | null | undefined): string {
    return this.currencyFormatter.format(value ?? 0);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return this.dateTimeFormatter.format(date);
  }

  async voidSale(): Promise<void> {
    if (!this.sale) {
      return;
    }

    if (!this.canVoidSale()) {
      this.errorMessage =
        "No tienes permisos o la venta no esta en estado COMPLETED.";
      return;
    }

    if (this.voidForm.invalid) {
      this.voidForm.markAllAsTouched();
      this.errorMessage = "El motivo es obligatorio.";
      return;
    }

    const reason = this.voidForm.value.reason?.trim() ?? "";
    if (!reason) {
      this.errorMessage = "El motivo es obligatorio.";
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Anular venta",
      description:
        `Se anulara la venta ${this.sale.saleNumber}. Esta accion afecta stock, caja y pagos asociados.`,
      confirmText: "Anular",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    this.submitting = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.salesService.voidSale(this.sale.id, { reason }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(["/ventas", this.sale?.id], {
          queryParams: { status: "voided" },
        });
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage = this.toVoidErrorMessage(error);
      },
    });
  }

  private loadSale(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading = false;
      this.errorMessage = "ID de venta invalido.";
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.salesService.getById(id).subscribe({
      next: (sale) => {
        this.loading = false;
        this.sale = sale;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar la venta para anular.",
        );
      },
    });
  }

  private toVoidErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return toHttpErrorMessage(
        error,
        "No se puede anular internamente. Requiere gestion desde Facturacion.",
      );
    }

    return toHttpErrorMessage(error, "No se pudo anular la venta.");
  }
}
