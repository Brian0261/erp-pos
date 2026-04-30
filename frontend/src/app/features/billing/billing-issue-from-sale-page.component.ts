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
    <section class="ui-card billing-issue-page" *ngIf="sale">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Facturacion electronica MVP</p>
          <h1 class="ui-page-title">Emitir comprobante desde venta</h1>
          <p class="ui-page-description">
            Venta {{ sale.saleNumber }} (ID #{{ sale.id }}): define tipo, serie
            y datos de cliente para emitir sin alterar reglas tributarias.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          [routerLink]="['/ventas', sale.id]"
        >
          Ver venta
        </a>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <section class="steps-strip">
        <span class="ui-badge step-badge">Paso 1: Venta</span>
        <span class="ui-badge step-badge">Paso 2: Tipo y serie</span>
        <span class="ui-badge step-badge">Paso 3: Cliente</span>
        <span class="ui-badge step-badge">Paso 4: Confirmacion</span>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <h2>Resumen de venta</h2>
          <p>
            <span class="label">Estado venta</span>
            <strong>{{ sale.status }}</strong>
          </p>
          <p>
            <span class="label">Total</span>
            <strong>{{ sale.totalAmount | number: "1.2-2" }}</strong>
          </p>
          <p>
            <span class="label">Fecha</span>
            <strong>{{ sale.soldAt | date: "yyyy-MM-dd HH:mm" }}</strong>
          </p>
        </article>

        <article class="summary-card">
          <h2>Operacion</h2>
          <p>
            <span class="label">Caja</span>
            <strong>#{{ sale.cashRegisterSessionId }}</strong>
          </p>
          <p>
            <span class="label">Almacen</span>
            <strong>#{{ sale.warehouseId }}</strong>
          </p>
          <p>
            <span class="label">Usuario</span>
            <strong>{{ sale.createdBy }}</strong>
          </p>
        </article>
      </section>

      <form [formGroup]="form" class="form-layout" (ngSubmit)="submit()">
        <section class="form-section">
          <header class="section-head">
            <h2>Paso 2: Tipo y serie</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Tipo comprobante *</span>
              <select formControlName="documentType" (change)="onTypeChanged()">
                <option *ngFor="let type of documentTypes" [value]="type">
                  {{ typeLabel(type) }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>Serie *</span>
              <select formControlName="billingSeriesId">
                <option [ngValue]="null">Selecciona serie</option>
                <option
                  *ngFor="let series of filteredSeries"
                  [ngValue]="series.id"
                >
                  {{ series.series }} ({{ series.environment }})
                </option>
              </select>
              <small class="field-error" *ngIf="isInvalid('billingSeriesId')">
                Debes seleccionar una serie.
              </small>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Paso 3: Datos del cliente</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Nombre cliente</span>
              <input
                type="text"
                maxlength="180"
                formControlName="customerName"
              />
              <small class="field-error" *ngIf="invoiceCustomerInvalid()">
                Para FACTURA, customerName y customerDocument son obligatorios.
              </small>
            </label>

            <label class="field">
              <span>Documento cliente</span>
              <input
                type="text"
                maxlength="40"
                formControlName="customerDocument"
              />
              <small class="field-error" *ngIf="invoiceCustomerInvalid()">
                Para FACTURA, customerName y customerDocument son obligatorios.
              </small>
            </label>
          </div>

          <p
            class="ui-alert ui-alert--info"
            *ngIf="form.controls.documentType.value === 'RECEIPT'"
          >
            BOLETA permite consumidor final si no se completa cliente.
          </p>
        </section>

        <div class="form-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="submitting || !canIssue"
          >
            {{ submitting ? "Emitiendo..." : "Emitir comprobante" }}
          </button>
        </div>
      </form>

      <section class="data-section">
        <header class="section-head">
          <h2>Items de venta</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table issue-table">
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
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .billing-issue-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .steps-strip {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .step-badge {
        background: #e0e7ff;
        color: #3730a3;
        font-weight: 700;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
        gap: var(--space-3);
      }

      .summary-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-2);
      }

      .summary-card p {
        margin: 0;
        display: grid;
        gap: 0.1rem;
      }

      .summary-card .label {
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

      .form-section,
      .data-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .section-head {
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

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field > span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      input,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .field-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .issue-table {
        min-width: 820px;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .billing-issue-page {
          padding: var(--space-4);
        }

        .summary-grid,
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
