import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import {
  BillingXmlResponse,
  ElectronicDocumentHistoryResponse,
  ElectronicDocumentResponse,
  ElectronicDocumentStatus,
  ElectronicDocumentType,
} from "./data/billing.models";
import { ElectronicDocumentService } from "./data/electronic-document.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-billing-document-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="card" *ngIf="document">
      <header class="header">
        <div>
          <h1>Detalle de comprobante</h1>
          <p class="muted">
            {{ typeLabel(document.documentType) }} {{ document.fullNumber }} |
            Estado
            <span class="status" [ngClass]="statusClass(document.status)">
              {{ document.status }}
            </span>
          </p>
        </div>
        <a
          class="button secondary"
          [routerLink]="['/facturacion/comprobantes']"
        >
          Volver al listado
        </a>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section class="summary-grid">
        <p><strong>ID:</strong> #{{ document.id }}</p>
        <p>
          <strong>Venta asociada:</strong>
          <a [routerLink]="['/ventas', document.saleId]"
            >#{{ document.saleId }}</a
          >
        </p>
        <p><strong>Serie:</strong> {{ document.series }}</p>
        <p><strong>Numero:</strong> {{ document.number }}</p>
        <p>
          <strong>Cliente:</strong>
          {{ document.customerName || "CONSUMIDOR FINAL" }}
        </p>
        <p>
          <strong>Documento:</strong> {{ document.customerDocument || "-" }}
        </p>
        <p>
          <strong>Total:</strong> {{ document.totalAmount | number: "1.2-2" }}
        </p>
        <p><strong>Ambiente:</strong> {{ document.environment }}</p>
        <p>
          <strong>XML generado:</strong>
          {{
            document.xmlGeneratedAt
              ? (document.xmlGeneratedAt | date: "yyyy-MM-dd HH:mm")
              : "-"
          }}
        </p>
        <p>
          <strong>Firmado:</strong>
          {{
            document.signedAt
              ? (document.signedAt | date: "yyyy-MM-dd HH:mm")
              : "-"
          }}
        </p>
        <p>
          <strong>Enviado:</strong>
          {{
            document.sentAt ? (document.sentAt | date: "yyyy-MM-dd HH:mm") : "-"
          }}
        </p>
        <p>
          <strong>Mensaje proveedor:</strong>
          {{ document.providerMessage || "-" }}
        </p>
      </section>

      <section class="actions">
        <button
          type="button"
          (click)="generateXml()"
          [disabled]="processing || !canGenerate()"
        >
          Generar XML
        </button>
        <button
          type="button"
          (click)="signXml()"
          [disabled]="processing || !canSign()"
        >
          Firmar XML
        </button>
        <button
          type="button"
          (click)="sendToProvider()"
          [disabled]="processing || !canSend()"
        >
          Enviar mock/sandbox
        </button>
        <button
          type="button"
          class="secondary"
          (click)="loadData()"
          [disabled]="processing"
        >
          Ver historial
        </button>
      </section>

      <section class="panel">
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Descripcion</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Descuento</th>
              <th>Total linea</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of document.items">
              <td>#{{ item.productId }}</td>
              <td>{{ item.description }}</td>
              <td>{{ item.quantity | number: "1.0-3" }}</td>
              <td>{{ item.unitPrice | number: "1.2-2" }}</td>
              <td>{{ item.discountAmount | number: "1.2-2" }}</td>
              <td>{{ item.lineTotal | number: "1.2-2" }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>XML generado/firmado</h2>
        <p class="muted" *ngIf="xmlFile">
          Archivo: {{ xmlFile.fileName }} ({{ xmlFile.fileType }})
        </p>
        <p class="muted" *ngIf="!xmlFile && !xmlMessage">
          No hay XML disponible.
        </p>
        <p class="error" *ngIf="xmlMessage">{{ xmlMessage }}</p>
        <pre class="xml-content" *ngIf="xmlFile">{{ xmlFile.content }}</pre>
      </section>

      <section class="panel">
        <h2>Historial</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Previo</th>
              <th>Nuevo</th>
              <th>Mensaje</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of historyRows">
              <td>{{ row.changedAt | date: "yyyy-MM-dd HH:mm" }}</td>
              <td>{{ row.previousStatus || "-" }}</td>
              <td>{{ row.newStatus }}</td>
              <td>{{ row.message || "-" }}</td>
              <td>{{ row.changedBy }}</td>
            </tr>
            <tr *ngIf="historyRows.length === 0">
              <td colspan="5" class="empty">No hay historial disponible.</td>
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
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
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
      .xml-content {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 360px;
        overflow: auto;
        background: #111827;
        color: #e5e7eb;
        padding: 0.75rem;
        border-radius: 0.4rem;
      }
      button,
      .button {
        padding: 0.5rem 0.75rem;
        border: 0;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
        text-decoration: none;
      }
      .secondary {
        background: #374151;
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
      @media (max-width: 900px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class BillingDocumentDetailPageComponent implements OnInit {
  document: ElectronicDocumentResponse | null = null;
  historyRows: ElectronicDocumentHistoryResponse[] = [];
  xmlFile: BillingXmlResponse | null = null;
  xmlMessage = "";

  canView = false;
  canApproveActions = false;

  processing = false;
  errorMessage = "";
  successMessage = "";
  permissionMessage = "";

  private documentId = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly electronicDocumentService: ElectronicDocumentService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = "ID de comprobante invalido.";
      return;
    }

    this.documentId = id;

    this.authService.me().subscribe({
      next: (user) => {
        this.canView = user.roles.some((role) =>
          ["ADMIN", "SUPERVISOR", "CAJERO"].includes(role),
        );
        this.canApproveActions = user.roles.some((role) =>
          ["ADMIN", "SUPERVISOR"].includes(role),
        );

        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para ver este comprobante.";
          return;
        }

        this.loadData();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
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

  canGenerate(): boolean {
    if (!this.document) {
      return false;
    }

    return (
      this.document.status === "DRAFT" || this.document.status === "GENERATED"
    );
  }

  canSign(): boolean {
    if (!this.document || !this.canApproveActions) {
      return false;
    }

    if (!this.document.xmlGeneratedAt) {
      return false;
    }

    return (
      this.document.status === "GENERATED" || this.document.status === "SIGNED"
    );
  }

  canSend(): boolean {
    if (!this.document || !this.canApproveActions) {
      return false;
    }

    if (!this.document.xmlGeneratedAt) {
      return false;
    }

    return this.document.status === "SIGNED";
  }

  generateXml(): void {
    if (!this.canGenerate()) {
      return;
    }

    this.processing = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.electronicDocumentService.generateXml(this.documentId).subscribe({
      next: () => {
        this.processing = false;
        this.successMessage = "XML generado correctamente.";
        this.loadData();
      },
      error: (error: unknown) => {
        this.processing = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo generar XML.",
        );
      },
    });
  }

  signXml(): void {
    if (!this.canSign()) {
      return;
    }

    this.processing = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.electronicDocumentService.sign(this.documentId).subscribe({
      next: () => {
        this.processing = false;
        this.successMessage = "XML firmado correctamente.";
        this.loadData();
      },
      error: (error: unknown) => {
        this.processing = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo firmar XML.");
      },
    });
  }

  sendToProvider(): void {
    if (!this.canSend()) {
      return;
    }

    this.processing = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.electronicDocumentService.send(this.documentId).subscribe({
      next: () => {
        this.processing = false;
        this.successMessage = "Comprobante enviado a proveedor mock/sandbox.";
        this.loadData();
      },
      error: (error: unknown) => {
        this.processing = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo enviar el comprobante.",
        );
      },
    });
  }

  loadData(): void {
    if (!this.canView) {
      return;
    }

    this.errorMessage = "";

    forkJoin({
      document: this.electronicDocumentService.getById(this.documentId),
      historyRows: this.electronicDocumentService.history(this.documentId),
      xmlFile: this.electronicDocumentService
        .getXml(this.documentId)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ document, historyRows, xmlFile }) => {
        this.document = document;
        this.historyRows = historyRows;
        this.xmlFile = xmlFile;
        this.xmlMessage = xmlFile
          ? ""
          : "XML no disponible aun para este comprobante.";
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el detalle del comprobante.",
        );
      },
    });
  }
}
