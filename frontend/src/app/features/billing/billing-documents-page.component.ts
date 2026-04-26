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
    <section class="card">
      <header class="header">
        <div>
          <h1>Facturacion - Comprobantes electronicos</h1>
          <p class="muted">Consulta comprobantes emitidos y su estado.</p>
        </div>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <form
        [formGroup]="filtersForm"
        class="filters"
        (ngSubmit)="applyFilters()"
      >
        <label>
          Tipo
          <select formControlName="type">
            <option value="">Todos</option>
            <option *ngFor="let type of documentTypes" [value]="type">
              {{ typeLabel(type) }}
            </option>
          </select>
        </label>

        <label>
          Estado
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statuses" [value]="status">
              {{ status }}
            </option>
          </select>
        </label>

        <label>
          Serie
          <input
            type="text"
            maxlength="4"
            formControlName="series"
            placeholder="F001 / B001"
          />
        </label>

        <label>
          Numero
          <input
            type="text"
            maxlength="30"
            formControlName="number"
            placeholder="00000001 o F001-00000001"
          />
        </label>

        <label>
          Desde
          <input type="date" formControlName="from" />
        </label>

        <label>
          Hasta
          <input type="date" formControlName="to" />
        </label>

        <label>
          Venta (saleId)
          <input type="number" min="1" step="1" formControlName="saleId" />
        </label>

        <label>
          Emitir desde venta
          <div class="inline-group">
            <input
              type="number"
              min="1"
              step="1"
              formControlName="emitSaleId"
            />
            <button
              type="button"
              class="secondary"
              (click)="goToIssue()"
              [disabled]="loading"
            >
              Ir
            </button>
          </div>
        </label>

        <div class="actions full">
          <button type="submit" [disabled]="loading || !canView">
            Filtrar
          </button>
          <button
            type="button"
            class="secondary"
            (click)="clearFilters()"
            [disabled]="loading || !canView"
          >
            Limpiar
          </button>
        </div>
      </form>

      <section class="table-wrap">
        <table>
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
              <td>{{ typeLabel(document.documentType) }}</td>
              <td>
                <strong>{{ document.fullNumber }}</strong>
                <div class="muted tiny">
                  Serie {{ document.series }} - Nro {{ document.number }}
                </div>
              </td>
              <td>
                <strong>{{
                  document.customerName || "CONSUMIDOR FINAL"
                }}</strong>
                <div class="muted tiny">
                  {{ document.customerDocument || "Sin documento" }}
                </div>
              </td>
              <td>{{ document.totalAmount | number: "1.2-2" }}</td>
              <td>
                <span class="status" [ngClass]="statusClass(document.status)">{{
                  document.status
                }}</span>
              </td>
              <td>{{ document.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
              <td class="row-actions">
                <a
                  class="link-btn"
                  [routerLink]="['/facturacion/comprobantes', document.id]"
                  >Ver detalle</a
                >
                <a class="link-btn" [routerLink]="['/ventas', document.saleId]"
                  >Ver venta</a
                >
                <a
                  class="link-btn secondary"
                  [routerLink]="['/facturacion/emitir', document.saleId]"
                  >Emitir desde venta</a
                >
              </td>
            </tr>
            <tr *ngIf="!loading && documents.length === 0">
              <td colspan="7" class="empty">
                No hay comprobantes para los filtros seleccionados.
              </td>
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
        align-items: center;
        gap: 1rem;
      }
      h1 {
        margin: 0;
      }
      .muted {
        color: #6b7280;
        margin: 0.25rem 0 0;
      }
      .tiny {
        font-size: 0.8rem;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
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
        padding: 0.5rem 0.7rem;
        border-radius: 0.35rem;
        border: 1px solid #d1d5db;
      }
      button,
      .button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
      }
      .inline-group {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.4rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.45rem;
        border-bottom: 1px solid #e5e7eb;
        vertical-align: top;
      }
      .row-actions {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .link-btn {
        padding: 0.35rem 0.55rem;
        border-radius: 0.3rem;
        background: #1f2937;
        color: #fff;
        border: 0;
        cursor: pointer;
        text-decoration: none;
        font-size: 0.85rem;
      }
      .status {
        display: inline-flex;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .status-draft {
        background: #dbeafe;
        color: #1d4ed8;
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
        color: #92400e;
      }
      .status-accepted {
        background: #dcfce7;
        color: #166534;
      }
      .status-rejected,
      .status-error,
      .status-cancelled {
        background: #fee2e2;
        color: #b91c1c;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 1080px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .filters {
          grid-template-columns: 1fr;
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
