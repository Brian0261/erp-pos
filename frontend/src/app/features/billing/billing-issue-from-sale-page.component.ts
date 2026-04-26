import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { SaleResponse } from "../sales/data/sales.models";
import { SalesService } from "../sales/data/sales.service";
import {
  BillingSeriesResponse,
  CreateElectronicDocumentFromSaleRequest,
  ELECTRONIC_DOCUMENT_TYPES,
  ElectronicDocumentType,
} from "./data/billing.models";
import { BillingSeriesService } from "./data/billing-series.service";
import { ElectronicDocumentService } from "./data/electronic-document.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-billing-issue-from-sale-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card" *ngIf="sale">
      <header class="header">
        <div>
          <h1>Emitir comprobante desde venta</h1>
          <p class="muted">Venta {{ sale.saleNumber }} (ID #{{ sale.id }})</p>
        </div>
        <a class="button secondary" [routerLink]="['/ventas', sale.id]"
          >Ver venta</a
        >
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section class="summary-grid">
        <p><strong>Estado venta:</strong> {{ sale.status }}</p>
        <p><strong>Total:</strong> {{ sale.totalAmount | number: "1.2-2" }}</p>
        <p>
          <strong>Fecha:</strong> {{ sale.soldAt | date: "yyyy-MM-dd HH:mm" }}
        </p>
        <p><strong>Caja:</strong> #{{ sale.cashRegisterSessionId }}</p>
        <p><strong>Almacen:</strong> #{{ sale.warehouseId }}</p>
        <p><strong>Usuario:</strong> {{ sale.createdBy }}</p>
      </section>

      <form [formGroup]="form" class="grid" (ngSubmit)="submit()">
        <label>
          Tipo comprobante *
          <select formControlName="documentType" (change)="onTypeChanged()">
            <option *ngFor="let type of documentTypes" [value]="type">
              {{ typeLabel(type) }}
            </option>
          </select>
        </label>

        <label>
          Serie *
          <select formControlName="billingSeriesId">
            <option [ngValue]="null">Selecciona serie</option>
            <option *ngFor="let series of filteredSeries" [ngValue]="series.id">
              {{ series.series }} ({{ series.environment }})
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('billingSeriesId')">
            Debes seleccionar una serie.
          </small>
        </label>

        <label>
          Nombre cliente
          <input type="text" maxlength="180" formControlName="customerName" />
          <small class="error" *ngIf="invoiceCustomerInvalid()">
            Para FACTURA, customerName y customerDocument son obligatorios.
          </small>
        </label>

        <label>
          Documento cliente
          <input
            type="text"
            maxlength="40"
            formControlName="customerDocument"
          />
          <small class="error" *ngIf="invoiceCustomerInvalid()">
            Para FACTURA, customerName y customerDocument son obligatorios.
          </small>
        </label>

        <p
          class="full muted"
          *ngIf="form.controls.documentType.value === 'RECEIPT'"
        >
          BOLETA permite consumidor final si no se completa cliente.
        </p>

        <div class="actions full">
          <button type="submit" [disabled]="submitting || !canIssue">
            {{ submitting ? "Emitiendo..." : "Emitir comprobante" }}
          </button>
        </div>
      </form>

      <section class="panel">
        <h2>Items de venta</h2>
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
              <td>#{{ item.productId }}</td>
              <td>{{ item.quantity | number: "1.0-3" }}</td>
              <td>{{ item.unitPrice | number: "1.2-2" }}</td>
              <td>{{ item.discountAmount | number: "1.2-2" }}</td>
              <td>{{ item.lineTotal | number: "1.2-2" }}</td>
            </tr>
          </tbody>
        </table>
      </section>
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
      .muted {
        margin: 0.25rem 0 0;
        color: #6b7280;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 0.5rem 0.8rem;
      }
      .summary-grid p {
        margin: 0;
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
      button,
      .button {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
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
      .actions {
        display: flex;
        justify-content: flex-end;
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
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 900px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .summary-grid,
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class BillingIssueFromSalePageComponent implements OnInit {
  readonly documentTypes = ELECTRONIC_DOCUMENT_TYPES;

  readonly form = this.formBuilder.group({
    documentType: ["RECEIPT" as ElectronicDocumentType, Validators.required],
    billingSeriesId: [null as number | null, Validators.required],
    customerName: ["", Validators.maxLength(180)],
    customerDocument: ["", Validators.maxLength(40)],
  });

  sale: SaleResponse | null = null;
  saleId = 0;
  canIssue = false;

  seriesRows: BillingSeriesResponse[] = [];
  filteredSeries: BillingSeriesResponse[] = [];

  submitting = false;
  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly salesService: SalesService,
    private readonly billingSeriesService: BillingSeriesService,
    private readonly electronicDocumentService: ElectronicDocumentService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("saleId"));
    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = "saleId invalido.";
      return;
    }

    this.saleId = id;

    this.authService.me().subscribe({
      next: (user) => {
        this.canIssue = user.roles.some((role) =>
          ["ADMIN", "SUPERVISOR", "CAJERO"].includes(role),
        );

        if (!this.canIssue) {
          this.permissionMessage =
            "No tienes permisos para emitir comprobantes.";
          this.form.disable();
          return;
        }

        this.loadData();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  invoiceCustomerInvalid(): boolean {
    const type = this.form.controls.documentType.value;
    if (type !== "INVOICE") {
      return false;
    }

    const name = this.normalizeOptional(this.form.controls.customerName.value);
    const doc = this.normalizeOptional(
      this.form.controls.customerDocument.value,
    );

    const touched =
      this.form.controls.customerName.dirty ||
      this.form.controls.customerName.touched ||
      this.form.controls.customerDocument.dirty ||
      this.form.controls.customerDocument.touched;

    return touched && (!name || !doc);
  }

  onTypeChanged(): void {
    this.filterSeries();
  }

  typeLabel(type: ElectronicDocumentType): string {
    return type === "INVOICE" ? "FACTURA" : "BOLETA";
  }

  submit(): void {
    if (!this.canIssue || !this.sale) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    if (this.sale.status !== "COMPLETED") {
      this.errorMessage = "Solo ventas COMPLETED pueden emitir comprobantes.";
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const documentType = raw.documentType as ElectronicDocumentType;
    const customerName = this.normalizeOptional(raw.customerName);
    const customerDocument = this.normalizeOptional(raw.customerDocument);

    if (documentType === "INVOICE" && (!customerName || !customerDocument)) {
      this.errorMessage =
        "Para FACTURA debes completar customerName y customerDocument.";
      return;
    }

    const payload: CreateElectronicDocumentFromSaleRequest = {
      documentType,
      billingSeriesId: Number(raw.billingSeriesId),
      customerName,
      customerDocument,
    };

    this.submitting = true;

    this.electronicDocumentService
      .createFromSale(this.sale.id, payload)
      .subscribe({
        next: (document) => {
          this.submitting = false;
          this.successMessage = `Comprobante ${document.fullNumber} emitido correctamente.`;
          this.router.navigate(["/facturacion/comprobantes", document.id]);
        },
        error: (error: unknown) => {
          this.submitting = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo emitir comprobante desde venta.",
          );
        },
      });
  }

  private loadData(): void {
    forkJoin({
      sale: this.salesService.getById(this.saleId),
      seriesRows: this.billingSeriesService.list(),
    }).subscribe({
      next: ({ sale, seriesRows }) => {
        this.sale = sale;
        this.seriesRows = seriesRows.filter((series) => series.active);
        this.filterSeries();
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar datos para emitir comprobante.",
        );
      },
    });
  }

  private filterSeries(): void {
    const selectedType = this.form.controls.documentType.value;
    this.filteredSeries = this.seriesRows.filter(
      (series) => series.documentType === selectedType,
    );

    const currentSeriesId = Number(this.form.controls.billingSeriesId.value);
    if (!this.filteredSeries.some((row) => row.id === currentSeriesId)) {
      this.form.patchValue({ billingSeriesId: null });
    }
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
