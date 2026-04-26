import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";

@Component({
  selector: "app-sale-void-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header>
        <h1>Anular venta</h1>
        <p class="muted">Registra el motivo y confirma la anulacion.</p>
      </header>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>
      <p class="muted" *ngIf="loading">Cargando venta...</p>

      <ng-container *ngIf="sale && !loading">
        <article class="summary">
          <p><strong>Venta:</strong> {{ sale.saleNumber }} (#{{ sale.id }})</p>
          <p><strong>Estado:</strong> {{ sale.status }}</p>
          <p>
            <strong>Total:</strong> {{ sale.totalAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Fecha:</strong> {{ sale.soldAt | date: "yyyy-MM-dd HH:mm" }}
          </p>
        </article>

        <form [formGroup]="voidForm" (ngSubmit)="voidSale()" class="void-form">
          <label>
            Motivo *
            <textarea formControlName="reason" maxlength="400"></textarea>
          </label>

          <div class="actions">
            <a class="button secondary" [routerLink]="['/ventas', sale.id]"
              >Cancelar</a
            >
            <button
              type="submit"
              class="danger"
              [disabled]="submitting || !canVoidSale()"
            >
              Confirmar anulacion
            </button>
          </div>
        </form>

        <p class="muted" *ngIf="!canVoidSale()">
          Solo ADMIN/SUPERVISOR puede anular ventas en estado COMPLETED.
        </p>
      </ng-container>
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
      h1 {
        margin: 0;
      }
      .summary {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.7rem;
        display: grid;
        gap: 0.4rem;
      }
      .summary p,
      .muted,
      .error,
      .success {
        margin: 0;
      }
      .void-form {
        display: grid;
        gap: 0.75rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      textarea,
      button,
      .button {
        padding: 0.5rem 0.7rem;
        border-radius: 0.35rem;
      }
      textarea {
        min-height: 100px;
        border: 1px solid #d1d5db;
        resize: vertical;
      }
      button,
      .button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
        text-decoration: none;
      }
      .secondary {
        background: #374151;
      }
      .danger {
        background: #b91c1c;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .muted {
        color: #6b7280;
      }
      .error {
        color: #b91c1c;
      }
      .success {
        color: #166534;
      }
    `,
  ],
})
export class SaleVoidPageComponent implements OnInit {
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

  voidSale(): void {
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

    if (
      !window.confirm(
        `Confirmar anulacion de la venta ${this.sale.saleNumber}?`,
      )
    ) {
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
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo anular la venta.",
        );
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
}
