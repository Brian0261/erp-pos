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
    <section class="ui-card billing-document-detail-page" *ngIf="document">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Facturacion electronica MVP</p>
          <h1 class="ui-page-title">Detalle de comprobante</h1>
          <p class="ui-page-description">
            {{ typeLabel(document.documentType) }} {{ document.fullNumber }}
          </p>
        </div>
        <div class="header-actions">
          <span
            class="ui-badge status-badge"
            [ngClass]="statusClass(document.status)"
          >
            {{ document.status }}
          </span>
          <a
            class="ui-button ui-button--secondary"
            [routerLink]="['/facturacion/comprobantes']"
          >
            Volver al listado
          </a>
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

      <section class="summary-grid">
        <article class="summary-card">
          <h2>Comprobante</h2>
          <p>
            <span class="label">ID</span>
            <strong>#{{ document.id }}</strong>
          </p>
          <p>
            <span class="label">Serie y numero</span>
            <strong>{{ document.series }}-{{ document.number }}</strong>
          </p>
          <p>
            <span class="label">Total</span>
            <strong>{{ document.totalAmount | number: "1.2-2" }}</strong>
          </p>
          <p>
            <span class="label">Ambiente</span>
            <strong>{{ document.environment }}</strong>
          </p>
        </article>

        <article class="summary-card">
          <h2>Cliente y venta</h2>
          <p>
            <span class="label">Cliente</span>
            <strong>{{ document.customerName || "CONSUMIDOR FINAL" }}</strong>
          </p>
          <p>
            <span class="label">Documento</span>
            <strong>{{ document.customerDocument || "-" }}</strong>
          </p>
          <p>
            <span class="label">Venta asociada</span>
            <strong>
              <a
                class="inline-link"
                [routerLink]="['/ventas', document.saleId]"
              >
                #{{ document.saleId }}
              </a>
            </strong>
          </p>
        </article>

        <article class="summary-card">
          <h2>Trazabilidad electronica</h2>
          <p>
            <span class="label">XML generado</span>
            <strong>
              {{
                document.xmlGeneratedAt
                  ? (document.xmlGeneratedAt | date: "yyyy-MM-dd HH:mm")
                  : "-"
              }}
            </strong>
          </p>
          <p>
            <span class="label">Firmado</span>
            <strong>
              {{
                document.signedAt
                  ? (document.signedAt | date: "yyyy-MM-dd HH:mm")
                  : "-"
              }}
            </strong>
          </p>
          <p>
            <span class="label">Enviado</span>
            <strong>
              {{
                document.sentAt
                  ? (document.sentAt | date: "yyyy-MM-dd HH:mm")
                  : "-"
              }}
            </strong>
          </p>
          <p>
            <span class="label">Mensaje proveedor</span>
            <strong>{{ document.providerMessage || "-" }}</strong>
          </p>
        </article>
      </section>

      <section class="workflow-actions">
        <button
          type="button"
          class="ui-button action-generate"
          (click)="generateXml()"
          [disabled]="processing || !canGenerate()"
        >
          Generar XML
        </button>
        <button
          type="button"
          class="ui-button action-sign"
          (click)="signXml()"
          [disabled]="processing || !canSign()"
        >
          Firmar XML
        </button>
        <button
          type="button"
          class="ui-button action-send"
          (click)="sendToProvider()"
          [disabled]="processing || !canSend()"
        >
          Enviar mock/sandbox
        </button>
        <button
          type="button"
          class="ui-button ui-button--secondary"
          (click)="loadData()"
          [disabled]="processing"
        >
          Recargar historial
        </button>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Items</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table detail-table">
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
        </div>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>XML generado/firmado</h2>
        </header>

        <p class="xml-meta" *ngIf="xmlFile">
          Archivo: {{ xmlFile.fileName }} ({{ xmlFile.fileType }})
        </p>
        <p class="ui-alert ui-alert--info" *ngIf="!xmlFile">
          {{ xmlMessage || "XML aun no generado." }}
        </p>
        <pre class="xml-content" *ngIf="xmlFile">{{ xmlFile.content }}</pre>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Historial</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table detail-table">
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
                <td colspan="5" class="ui-table__empty">
                  <div class="ui-empty-state">No hay historial disponible.</div>
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
      .billing-document-detail-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .status-badge {
        font-weight: 700;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(230px, 1fr));
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

      .inline-link {
        text-decoration: underline;
        font-weight: 700;
      }

      .workflow-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .action-generate {
        background: #4338ca;
        color: var(--color-text-on-dark);
      }

      .action-sign {
        background: #0e7490;
        color: var(--color-text-on-dark);
      }

      .action-send {
        background: var(--color-brand-primary);
        color: var(--color-text-on-dark);
      }

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

      .detail-table {
        min-width: 940px;
      }

      .xml-meta {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .xml-content {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 360px;
        overflow: auto;
        background: #111827;
        color: #e5e7eb;
        padding: var(--space-3);
        border-radius: var(--radius-sm);
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

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .billing-document-detail-page {
          padding: var(--space-4);
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

    if (!window.confirm(this.buildGenerateXmlConfirmationMessage())) {
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

    if (!window.confirm(this.buildSignXmlConfirmationMessage())) {
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

    if (!window.confirm(this.buildSendConfirmationMessage())) {
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
    this.xmlFile = null;
    this.xmlMessage = "";

    forkJoin({
      document: this.electronicDocumentService.getById(this.documentId),
      historyRows: this.electronicDocumentService.history(this.documentId),
    }).subscribe({
      next: ({ document, historyRows }) => {
        this.document = document;
        this.historyRows = historyRows;

        if (!document.xmlGeneratedAt) {
          this.xmlMessage = "XML aun no generado.";
          return;
        }

        this.electronicDocumentService
          .getXml(this.documentId)
          .pipe(catchError(() => of(null)))
          .subscribe((xmlFile) => {
            this.xmlFile = xmlFile;
            this.xmlMessage = xmlFile ? "" : "XML aun no generado.";
          });
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el detalle del comprobante.",
        );
      },
    });
  }

  private buildGenerateXmlConfirmationMessage(): string {
    const number = this.document?.fullNumber ?? `#${this.documentId}`;
    return [
      `Vas a generar el XML del comprobante ${number}.`,
      "",
      "Se creara/actualizara el archivo XML del comprobante.",
      "",
      "Confirmas generar el XML?",
    ].join("\n");
  }

  private buildSignXmlConfirmationMessage(): string {
    const number = this.document?.fullNumber ?? `#${this.documentId}`;
    return [
      `Vas a firmar el XML del comprobante ${number}.`,
      "",
      "Se aplicara la firma sobre el XML generado.",
      "",
      "Confirmas firmar el XML?",
    ].join("\n");
  }

  private buildSendConfirmationMessage(): string {
    const number = this.document?.fullNumber ?? `#${this.documentId}`;
    return [
      `Vas a enviar el comprobante ${number} al proveedor mock/sandbox.`,
      "",
      "Esta accion intentara cambiar el estado electronico del comprobante.",
      "",
      "Confirmas enviar el comprobante?",
    ].join("\n");
  }
}
