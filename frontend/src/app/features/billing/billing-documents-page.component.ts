import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import {
  ELECTRONIC_DOCUMENT_STATUSES,
  ELECTRONIC_DOCUMENT_TYPES,
  ElectronicDocumentResponse,
  ElectronicDocumentStatus,
  ElectronicDocumentType,
} from "./data/billing.models";
import { ElectronicDocumentService } from "./data/electronic-document.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-billing-documents-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card billing-documents-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Facturacion electronica MVP</p>
          <h1 class="ui-page-title">Comprobantes electronicos</h1>
          <p class="ui-page-description">
            Consulta estado del ciclo DRAFT a ACCEPTED, revisa datos de cliente
            y accede al detalle o a la emision desde venta.
          </p>
        </div>
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

      <section class="filter-section">
        <header class="section-head">
          <h2>Filtros de comprobantes</h2>
        </header>

        <form
          [formGroup]="filtersForm"
          class="filters-grid"
          (ngSubmit)="applyFilters()"
        >
          <label class="field">
            <span>Tipo</span>
            <select formControlName="type">
              <option value="">Todos</option>
              <option *ngFor="let type of documentTypes" [value]="type">
                {{ typeLabel(type) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Estado</span>
            <select formControlName="status">
              <option value="">Todos</option>
              <option *ngFor="let status of statuses" [value]="status">
                {{ status }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Serie</span>
            <input
              type="text"
              maxlength="4"
              formControlName="series"
              placeholder="F001 / B001"
            />
          </label>

          <label class="field">
            <span>Numero</span>
            <input
              type="text"
              maxlength="30"
              formControlName="number"
              placeholder="00000001 o F001-00000001"
            />
          </label>

          <label class="field">
            <span>Desde</span>
            <input type="date" formControlName="from" />
          </label>

          <label class="field">
            <span>Hasta</span>
            <input type="date" formControlName="to" />
          </label>

          <label class="field">
            <span>Venta (saleId)</span>
            <input type="number" min="1" step="1" formControlName="saleId" />
          </label>

          <label class="field">
            <span>Emitir desde venta</span>
            <div class="inline-group">
              <input
                type="number"
                min="1"
                step="1"
                formControlName="emitSaleId"
              />
              <button
                type="button"
                class="ui-button ui-button--secondary quick-btn"
                (click)="goToIssue()"
                [disabled]="loading"
              >
                Ir
              </button>
            </div>
          </label>

          <div class="filter-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="loading || !canView"
            >
              Filtrar
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="clearFilters()"
              [disabled]="loading || !canView"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Listado de comprobantes</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table documents-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Numeracion</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let document of documents">
                <td>
                  <span
                    class="ui-badge type-badge"
                    [ngClass]="
                      document.documentType === 'INVOICE'
                        ? 'type-badge--invoice'
                        : 'type-badge--receipt'
                    "
                  >
                    {{ typeLabel(document.documentType) }}
                  </span>
                </td>
                <td>
                  <strong>{{ document.fullNumber }}</strong>
                  <div class="meta-note">
                    Serie {{ document.series }} - Nro {{ document.number }}
                  </div>
                </td>
                <td>
                  <strong>{{
                    document.customerName || "CONSUMIDOR FINAL"
                  }}</strong>
                  <div class="meta-note">
                    {{ document.customerDocument || "Sin documento" }}
                  </div>
                </td>
                <td>{{ document.totalAmount | number: "1.2-2" }}</td>
                <td>
                  <span
                    class="ui-badge status-badge"
                    [ngClass]="statusClass(document.status)"
                  >
                    {{ document.status }}
                  </span>
                </td>
                <td>{{ document.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
                <td class="row-actions">
                  <a
                    class="ui-button ui-button--secondary action-btn"
                    [routerLink]="['/facturacion/comprobantes', document.id]"
                  >
                    Ver detalle
                  </a>
                  <a
                    class="ui-button ui-button--secondary action-btn"
                    [routerLink]="['/ventas', document.saleId]"
                  >
                    Ver venta
                  </a>
                  <a
                    class="ui-button ui-button--primary action-btn"
                    [routerLink]="['/facturacion/emitir', document.saleId]"
                  >
                    Emitir desde venta
                  </a>
                </td>
              </tr>
              <tr *ngIf="!loading && documents.length === 0">
                <td colspan="7" class="ui-table__empty">
                  <div class="ui-empty-state">
                    No hay comprobantes para los filtros seleccionados.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .billing-documents-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .filter-section,
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

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: var(--space-3);
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
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      .inline-group {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--space-2);
      }

      .quick-btn {
        padding: 0.45rem 0.7rem;
        font-size: var(--font-size-xs);
      }

      .filter-actions {
        grid-column: 1 / -1;
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .documents-table {
        min-width: 1120px;
      }

      .type-badge {
        font-weight: 700;
      }

      .type-badge--invoice {
        background: #ede9fe;
        color: #6d28d9;
      }

      .type-badge--receipt {
        background: #dbeafe;
        color: var(--color-info);
      }

      .meta-note {
        margin-top: 0.1rem;
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .status-badge {
        font-weight: 700;
      }

      .status-draft {
        background: #dbeafe;
        color: var(--color-info);
      }

      .status-generated {
        background: #ede9fe;
        color: #6d28d9;
      }

      .status-signed {
        background: #cffafe;
        color: #0e7490;
      }

      .status-sent {
        background: #fef3c7;
        color: var(--color-warning);
      }

      .status-accepted {
        background: #dcfce7;
        color: var(--color-success);
      }

      .status-rejected,
      .status-error,
      .status-cancelled {
        background: #fee2e2;
        color: var(--color-danger);
      }

      .row-actions {
        display: grid;
        gap: var(--space-2);
      }

      .action-btn {
        width: 100%;
        padding: 0.45rem 0.7rem;
        font-size: var(--font-size-xs);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 1080px) {
        .billing-documents-page {
          padding: var(--space-4);
        }

        .filters-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 640px) {
        .filters-grid {
          grid-template-columns: 1fr;
        }

        .filter-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class BillingDocumentsPageComponent implements OnInit {
  readonly documentTypes = ELECTRONIC_DOCUMENT_TYPES;
  readonly statuses = ELECTRONIC_DOCUMENT_STATUSES;

  readonly filtersForm = this.formBuilder.group({
    type: [""],
    status: [""],
    series: [""],
    number: [""],
    from: [""],
    to: [""],
    saleId: [""],
    emitSaleId: [""],
  });

  canView = false;

  documents: ElectronicDocumentResponse[] = [];
  loading = false;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly electronicDocumentService: ElectronicDocumentService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canView = user.roles.some((role) =>
          ["ADMIN", "SUPERVISOR", "CAJERO"].includes(role),
        );

        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para consultar comprobantes electronicos.";
          return;
        }

        this.loadDocuments();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  applyFilters(): void {
    this.loadDocuments();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      type: "",
      status: "",
      series: "",
      number: "",
      from: "",
      to: "",
      saleId: "",
      emitSaleId: "",
    });

    this.loadDocuments();
  }

  goToIssue(): void {
    const saleId = Number(this.filtersForm.controls.emitSaleId.value);
    if (!Number.isFinite(saleId) || saleId <= 0) {
      this.errorMessage = "Ingresa un saleId valido para emitir comprobante.";
      return;
    }

    this.router.navigate(["/facturacion/emitir", saleId]);
  }

  typeLabel(type: ElectronicDocumentType): string {
    return type === "INVOICE" ? "FACTURA" : "BOLETA";
  }

  statusClass(status: ElectronicDocumentStatus): string {
    switch (status) {
      case "DRAFT":
        return "status-draft";
      case "GENERATED":
        return "status-generated";
      case "SIGNED":
        return "status-signed";
      case "SENT":
        return "status-sent";
      case "ACCEPTED":
        return "status-accepted";
      case "REJECTED":
        return "status-rejected";
      case "ERROR":
        return "status-error";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "";
    }
  }

  private loadDocuments(): void {
    if (!this.canView) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";
    this.loading = true;

    const raw = this.filtersForm.getRawValue();
    const typeValue = raw.type ? (raw.type as ElectronicDocumentType) : null;
    const statusValue = raw.status
      ? (raw.status as ElectronicDocumentStatus)
      : null;
    const saleIdValue = this.parseOptionalInt(raw.saleId);

    this.electronicDocumentService
      .list({
        type: typeValue,
        status: statusValue,
        saleId: saleIdValue,
        from: this.normalizeOptional(raw.from),
        to: this.normalizeOptional(raw.to),
      })
      .subscribe({
        next: (rows) => {
          this.loading = false;
          this.documents = this.applyClientFilters(rows);
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el listado de comprobantes.",
          );
        },
      });
  }

  private applyClientFilters(
    rows: ElectronicDocumentResponse[],
  ): ElectronicDocumentResponse[] {
    const raw = this.filtersForm.getRawValue();
    const series = String(raw.series || "")
      .trim()
      .toUpperCase();
    const number = String(raw.number || "")
      .trim()
      .toUpperCase();

    return rows.filter((row) => {
      if (series && row.series.toUpperCase() !== series) {
        return false;
      }

      if (number) {
        const fullNumber = row.fullNumber.toUpperCase();
        const numberAsText = String(row.number);
        if (!fullNumber.includes(number) && !numberAsText.includes(number)) {
          return false;
        }
      }

      return true;
    });
  }

  private parseOptionalInt(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
