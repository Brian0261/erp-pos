import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { SalesService } from "./data/sales.service";
import { SaleResponse } from "./data/sales.models";

@Component({
  selector: "app-sale-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1 *ngIf="sale">Venta {{ sale.saleNumber }}</h1>
          <h1 *ngIf="!sale">Detalle de venta</h1>
          <p class="muted">Consulta de items, pagos y estado.</p>
        </div>
        <a class="button secondary" [routerLink]="['/ventas']"
          >Volver al listado</a
        >
      </header>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>
      <p class="muted" *ngIf="loading">Cargando detalle de venta...</p>

      <ng-container *ngIf="sale && !loading">
        <article class="summary-grid">
          <p><strong>ID:</strong> #{{ sale.id }}</p>
          <p><strong>Nro venta:</strong> {{ sale.saleNumber }}</p>
          <p><strong>Estado:</strong> {{ sale.status }}</p>
          <p>
            <strong>Fecha:</strong> {{ sale.soldAt | date: "yyyy-MM-dd HH:mm" }}
          </p>
          <p><strong>Usuario:</strong> {{ sale.createdBy }}</p>
          <p><strong>Caja:</strong> #{{ sale.cashRegisterSessionId }}</p>
          <p><strong>Almacen:</strong> #{{ sale.warehouseId }}</p>
          <p>
            <strong>Anulada en:</strong>
            {{
              sale.voidedAt ? (sale.voidedAt | date: "yyyy-MM-dd HH:mm") : "-"
            }}
          </p>
          <p><strong>Motivo anulacion:</strong> {{ sale.voidReason || "-" }}</p>
        </article>

        <article class="panel">
          <h2>Items</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Descuento</th>
                <th>Total linea</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of sale.items">
                <td>Producto #{{ item.productId }}</td>
                <td>{{ item.quantity | number: "1.0-3" }}</td>
                <td>{{ item.unitPrice | number: "1.2-2" }}</td>
                <td>{{ item.discountAmount | number: "1.2-2" }}</td>
                <td>{{ item.lineTotal | number: "1.2-2" }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="panel">
          <h2>Pagos</h2>
          <table>
            <thead>
              <tr>
                <th>Metodo</th>
                <th>Monto</th>
                <th>Referencia</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let payment of sale.payments">
                <td>{{ payment.paymentMethod }}</td>
                <td>{{ payment.amount | number: "1.2-2" }}</td>
                <td>{{ payment.reference || "-" }}</td>
                <td>{{ payment.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="totals">
          <p>
            <strong>Subtotal:</strong>
            {{ sale.subtotalAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Descuento:</strong>
            {{ sale.discountAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Total:</strong> {{ sale.totalAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Pagado:</strong> {{ sale.paidAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Vuelto:</strong> {{ sale.changeAmount | number: "1.2-2" }}
          </p>
        </article>

        <footer class="actions">
          <a
            *ngIf="canVoidSale()"
            class="button danger"
            [routerLink]="['/ventas', sale.id, 'anular']"
          >
            Anular venta
          </a>
        </footer>
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
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }
      h1,
      h2 {
        margin: 0;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 0.5rem 0.8rem;
      }
      .summary-grid p,
      .muted,
      .error,
      .success {
        margin: 0;
      }
      .panel {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.7rem;
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid #e5e7eb;
        padding: 0.45rem;
        text-align: left;
      }
      .totals {
        display: grid;
        grid-template-columns: repeat(5, minmax(150px, 1fr));
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
        gap: 0.5rem;
      }
      .button {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        text-decoration: none;
        padding: 0.5rem 0.75rem;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
      }
      .secondary {
        background: #374151;
      }
      .danger {
        background: #b91c1c;
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
      @media (max-width: 900px) {
        .header {
          flex-direction: column;
        }
        .summary-grid,
        .totals {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SaleDetailPageComponent implements OnInit {
  sale: SaleResponse | null = null;
  currentUser: UserProfile | null = null;

  loading = true;
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
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

    const statusMessage = this.route.snapshot.queryParamMap.get("status");
    if (statusMessage === "voided") {
      this.successMessage = "Venta anulada correctamente.";
    }

    this.loadSale();
  }

  canVoidSale(): boolean {
    if (!this.sale || !this.currentUser) {
      return false;
    }

    const canRole = this.currentUser.roles.some((role) =>
      ["ADMIN", "SUPERVISOR"].includes(role),
    );

    return canRole && this.sale.status === "COMPLETED";
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
          "No se pudo cargar el detalle de la venta.",
        );
      },
    });
  }
}
