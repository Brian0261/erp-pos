import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import {
  BillingXmlResponse,
  BillingEnvironment,
  ElectronicDocumentHistoryResponse,
  ElectronicDocumentResponse,
  ElectronicDocumentStatus,
  ElectronicDocumentType,
} from "./data/billing.models";
import { ElectronicDocumentService } from "./data/electronic-document.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";

@Component({
  selector: "app-billing-document-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card billing-document-detail-page" *ngIf="document">
      <header class="ui-page-head">
        <div>
          <h1 class="ui-page-title">Detalle de comprobante</h1>
          <p class="ui-page-description">
            {{ formatDocumentType(document.documentType) }} {{ document.fullNumber }}
          </p>
          <p class="ui-page-description">
            Consulta el estado electronico, XML, historial y venta asociada.
          </p>
        </div>
        <div class="header-actions">
          <span
            class="ui-badge status-badge"
            [ngClass]="statusClass(document.status)"
          >
            {{ formatStatus(document.status) }}
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
          <div class="kv-row"><span class="label">Tipo</span><strong>{{ formatDocumentType(document.documentType) }}</strong></div>
          <div class="kv-row"><span class="label">Numero</span><strong>{{ document.fullNumber }}</strong></div>
          <div class="kv-row"><span class="label">Estado</span><strong class="ui-badge status-badge" [ngClass]="statusClass(document.status)">{{ formatStatus(document.status) }}</strong></div>
          <div class="kv-row"><span class="label">Total</span><strong>{{ formatCurrency(document.totalAmount) }}</strong></div>
          <div class="kv-row"><span class="label">Ambiente</span><strong>{{ formatEnvironment(document.environment) }}</strong></div>
        </article>

        <article class="summary-card">
          <h2>Cliente y venta</h2>
          <div class="kv-row"><span class="label">Cliente</span><strong>{{ document.customerName || "CONSUMIDOR FINAL" }}</strong></div>
          <div class="kv-row"><span class="label">Documento</span><strong>{{ document.customerDocument || "Sin documento" }}</strong></div>
          <div class="kv-row">
            <span class="label">Venta asociada</span>
            <strong>
              <a
                class="inline-link"
                [routerLink]="['/ventas', document.saleId]"
              >
                #{{ document.saleId }}
              </a>
            </strong>
          </div>
          <div class="kv-row"><span class="label">Referencia</span><strong>Venta #{{ document.saleId }}</strong></div>
        </article>

        <article class="summary-card">
          <h2>Estado electronico</h2>
          <div class="kv-row kv-row--top">
            <span class="label">XML</span>
            <span class="kv-value">
              <strong>{{ document.xmlGeneratedAt ? "Generado" : "No generado" }}</strong>
              <span class="summary-note" *ngIf="document.xmlGeneratedAt">{{ formatDateTime(document.xmlGeneratedAt) }}</span>
            </span>
          </div>
          <div class="kv-row kv-row--top">
            <span class="label">Firma</span>
            <span class="kv-value">
              <strong>{{ document.signedAt ? "Firmado" : "Pendiente" }}</strong>
              <span class="summary-note" *ngIf="document.signedAt">{{ formatDateTime(document.signedAt) }}</span>
            </span>
          </div>
          <div class="kv-row kv-row--top">
            <span class="label">Envio</span>
            <span class="kv-value">
              <strong>{{ document.sentAt ? "Enviado" : "Pendiente" }}</strong>
              <span class="summary-note" *ngIf="document.sentAt">{{ formatDateTime(document.sentAt) }}</span>
            </span>
          </div>
          <div class="kv-row kv-row--top"><span class="label">Respuesta</span><strong class="response-value">{{ document.providerMessage || "Sin respuesta" }}</strong></div>
        </article>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>Progreso electronico</h2>
        </header>
        <div class="progress-track">
          <span class="progress-step" [ngClass]="stepClass(0)">1. Borrador</span>
          <span class="progress-step" [ngClass]="stepClass(1)">2. XML generado</span>
          <span class="progress-step" [ngClass]="stepClass(2)">3. Firmado</span>
          <span class="progress-step" [ngClass]="stepClass(3)">4. Enviado</span>
          <span class="progress-step" [ngClass]="stepClass(4)">5. Aceptado</span>
        </div>
        <p class="ui-alert ui-alert--warning" *ngIf="isSpecialTerminalStatus()">
          Estado actual: {{ formatStatus(document.status) }}. Revisa historial y mensaje del proveedor.
        </p>
      </section>

      <section class="workflow-actions">
        <button type="button" class="ui-button action-generate" (click)="generateXml()" [disabled]="processing" *ngIf="canGenerate()">
          Generar XML
        </button>
        <button type="button" class="ui-button action-sign" (click)="signXml()" [disabled]="processing" *ngIf="canSign()">
          Firmar comprobante
        </button>
        <button type="button" class="ui-button action-send" (click)="sendToProvider()" [disabled]="processing" *ngIf="canSend()">
          {{ getSendLabel(document.environment) }}
        </button>
        <button
          type="button"
          class="ui-button ui-button--secondary"
          (click)="loadData()"
          [disabled]="processing"
        >
          Actualizar historial
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
                <th>Cant.</th>
                <th>P. unitario</th>
                <th>Descuento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of document.items">
                <td>
                  <div class="item-primary">{{ productPrimaryLabel(item.productName, item.description) }}</div>
                  <div class="item-secondary">SKU: {{ item.sku || "Sin SKU" }}</div>
                  <div class="item-secondary" *ngIf="item.barcode">Codigo: {{ item.barcode }}</div>
                </td>
                <td>{{ item.quantity | number: "1.0-3" }}</td>
                <td>{{ formatCurrency(item.unitPrice) }}</td>
                <td>{{ formatCurrency(item.discountAmount) }}</td>
                <td>{{ formatCurrency(item.lineTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="data-section">
        <header class="section-head">
          <h2>XML generado/firmado</h2>
        </header>

        <div class="xml-summary" *ngIf="xmlFile">
          <p class="xml-meta"><strong>Archivo:</strong> {{ xmlFile.fileName }}</p>
          <p class="xml-meta"><strong>Estado:</strong> XML generado</p>
          <p class="xml-meta"><strong>Generado el:</strong> {{ formatDateTime(document.xmlGeneratedAt) }}</p>
          <button type="button" class="ui-button ui-button--secondary" (click)="xmlTechnicalOpen = !xmlTechnicalOpen">
            {{ xmlTechnicalOpen ? "Ocultar XML tecnico" : "Ver XML tecnico" }}
          </button>
        </div>
        <p class="ui-alert ui-alert--info" *ngIf="!xmlFile">
          {{
            xmlMessage ||
              "Aun no se ha generado el XML. Genera el XML para continuar con la firma y envio."
          }}
        </p>
        <pre class="xml-content" *ngIf="xmlFile && xmlTechnicalOpen">{{ xmlFile.content }}</pre>
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
                <th>Estado anterior</th>
                <th>Estado nuevo</th>
                <th>Evento</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of historyRows">
                <td>{{ formatDateTime(row.changedAt) }}</td>
                <td>
                  <span class="ui-badge" [ngClass]="row.previousStatus ? statusClass(row.previousStatus) : ''">
                    {{ row.previousStatus ? formatStatus(row.previousStatus) : "-" }}
                  </span>
                </td>
                <td>
                  <span class="ui-badge" [ngClass]="statusClass(row.newStatus)">
                    {{ formatStatus(row.newStatus) }}
                  </span>
                </td>
                <td>{{ translateHistoryMessage(row.message) }}</td>
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

      .kv-row {
        display: grid;
        grid-template-columns: minmax(110px, 0.42fr) minmax(0, 1fr);
        gap: var(--space-2);
        align-items: center;
      }

      .kv-row--top {
        align-items: start;
      }

      .kv-value {
        display: grid;
        gap: 0.15rem;
      }

      .response-value {
        line-height: 1.25;
      }

      .summary-note {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
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

      .progress-track {
        display: grid;
        grid-template-columns: repeat(5, minmax(120px, 1fr));
        gap: var(--space-2);
      }

      .progress-step {
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-pill);
        text-align: center;
        font-size: var(--font-size-sm);
        font-weight: 800;
        color: var(--color-text-primary);
        background: var(--color-bg-surface);
      }

      .progress-step.is-done {
        border-color: #166534;
        color: #14532d;
        background: #dcfce7;
      }

      .progress-step.is-current {
        border-color: var(--color-brand-primary);
        background: var(--color-brand-primary);
        color: var(--color-text-on-dark);
        box-shadow: 0 0 0 2px rgba(18, 23, 184, 0.25);
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

      .detail-table td:nth-child(2),
      .detail-table td:nth-child(3),
      .detail-table td:nth-child(4),
      .detail-table td:nth-child(5),
      .detail-table th:nth-child(2),
      .detail-table th:nth-child(3),
      .detail-table th:nth-child(4),
      .detail-table th:nth-child(5) {
        text-align: right;
      }

      .item-primary {
        font-weight: 700;
      }

      .item-secondary {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .xml-meta {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .xml-summary {
        display: grid;
        gap: var(--space-2);
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

        .kv-row {
          grid-template-columns: minmax(120px, 0.5fr) minmax(0, 1fr);
        }

        .progress-track {
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
  xmlTechnicalOpen = false;

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
    private readonly confirmDialogService: ConfirmDialogService,
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

  formatDocumentType(type: ElectronicDocumentType): string {
    return type === "INVOICE" ? "Factura" : "Boleta";
  }

  formatStatus(status: ElectronicDocumentStatus): string {
    switch (status) {
      case "DRAFT":
        return "BORRADOR";
      case "GENERATED":
        return "XML GENERADO";
      case "SIGNED":
        return "FIRMADO";
      case "SENT":
        return "ENVIADO";
      case "ACCEPTED":
        return "ACEPTADO";
      case "REJECTED":
        return "RECHAZADO";
      case "ERROR":
        return "ERROR";
      case "CANCELLED":
        return "ANULADO";
      default:
        return status;
    }
  }

  formatEnvironment(environment: BillingEnvironment): string {
    switch (environment) {
      case "LOCAL":
        return "Local";
      case "BETA":
        return "SUNAT Beta";
      case "PROD":
        return "SUNAT";
      default:
        return environment;
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

  translateHistoryMessage(message: string | null | undefined): string {
    if (!message) {
      return "-";
    }
    if (message === "Document created from sale") {
      return "Comprobante creado desde venta";
    }
    if (message === "XML generated") {
      return "XML generado";
    }
    if (message === "XML signed") {
      return "XML firmado";
    }
    if (message === "Document sent to mock provider") {
      return "Comprobante enviado al proveedor";
    }
    return message;
  }

  productPrimaryLabel(
    productName: string | null | undefined,
    description: string | null | undefined,
  ): string {
    const name = String(productName ?? "").trim();
    if (name) {
      return name;
    }
    const normalized = String(description ?? "").trim();
    if (!normalized) {
      return "Producto sin nombre registrado";
    }
    const lower = normalized.toLowerCase();
    if (/^product\s+\d+$/.test(lower) || /^producto\s+\d+$/.test(lower)) {
      return "Producto sin nombre registrado";
    }
    return normalized;
  }

  getSendLabel(environment: BillingEnvironment): string {
    switch (environment) {
      case "LOCAL":
        return "Enviar a entorno local";
      case "BETA":
        return "Enviar a SUNAT Beta";
      case "PROD":
        return "Enviar a SUNAT";
      default:
        return "Enviar comprobante";
    }
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

    return this.document.status === "DRAFT";
  }

  canSign(): boolean {
    if (!this.document || !this.canApproveActions) {
      return false;
    }

    if (!this.document.xmlGeneratedAt) {
      return false;
    }

    return this.document.status === "GENERATED";
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

  progressStepIndex(): number {
    if (!this.document) {
      return -1;
    }
    switch (this.document.status) {
      case "DRAFT":
        return 0;
      case "GENERATED":
        return 1;
      case "SIGNED":
        return 2;
      case "SENT":
        return 3;
      case "ACCEPTED":
        return 4;
      default:
        return 0;
    }
  }

  stepClass(step: number): string {
    const current = this.progressStepIndex();
    if (step === current) {
      return "is-current";
    }
    if (step < current) {
      return "is-done";
    }
    return "";
  }

  isSpecialTerminalStatus(): boolean {
    if (!this.document) {
      return false;
    }
    return ["REJECTED", "ERROR", "CANCELLED"].includes(this.document.status);
  }

  async generateXml(): Promise<void> {
    if (!this.canGenerate()) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Generar XML",
      description: this.buildGenerateXmlConfirmationMessage(),
      confirmText: "Generar",
      cancelText: "Cancelar",
      variant: "info",
    });
    if (!confirmed) {
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

  async signXml(): Promise<void> {
    if (!this.canSign()) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Firmar comprobante",
      description: this.buildSignXmlConfirmationMessage(),
      confirmText: "Firmar",
      cancelText: "Cancelar",
      variant: "info",
    });
    if (!confirmed) {
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

  async sendToProvider(): Promise<void> {
    if (!this.canSend()) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Enviar comprobante",
      description: this.buildSendConfirmationMessage(),
      confirmText: "Enviar",
      cancelText: "Cancelar",
      variant: "info",
    });
    if (!confirmed) {
      return;
    }

    this.processing = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.electronicDocumentService.send(this.documentId).subscribe({
      next: () => {
        this.processing = false;
        this.successMessage = `${this.getSendLabel(this.document?.environment || "LOCAL")} completado.`;
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
    this.xmlTechnicalOpen = false;

    forkJoin({
      document: this.electronicDocumentService.getById(this.documentId),
      historyRows: this.electronicDocumentService.history(this.documentId),
    }).subscribe({
      next: ({ document, historyRows }) => {
        this.document = document;
        this.historyRows = [...historyRows].sort((a, b) => {
          const left = new Date(a.changedAt).getTime();
          const right = new Date(b.changedAt).getTime();
          return right - left;
        });

        if (!document.xmlGeneratedAt) {
          this.xmlMessage =
            "Aun no se ha generado el XML. Genera el XML para continuar con la firma y envio.";
          return;
        }

        this.electronicDocumentService
          .getXml(this.documentId)
          .pipe(catchError(() => of(null)))
          .subscribe((xmlFile) => {
            this.xmlFile = xmlFile;
            this.xmlMessage =
              xmlFile
                ? ""
                : "Aun no se ha generado el XML. Genera el XML para continuar con la firma y envio.";
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
      "Se creara o actualizara el archivo XML del comprobante.",
      "",
      "Confirma para continuar.",
    ].join("\n");
  }

  private buildSignXmlConfirmationMessage(): string {
    const number = this.document?.fullNumber ?? `#${this.documentId}`;
    return [
      `Vas a firmar el XML del comprobante ${number}.`,
      "",
      "Se aplicara la firma sobre el XML generado.",
      "",
      "Confirma para continuar.",
    ].join("\n");
  }

  private buildSendConfirmationMessage(): string {
    const number = this.document?.fullNumber ?? `#${this.documentId}`;
    const label = this.document
      ? this.getSendLabel(this.document.environment)
      : "Enviar comprobante";
    return [
      `${label} ${number}.`,
      "",
      "Esta accion intentara cambiar el estado electronico del comprobante.",
      "",
      "Confirma para continuar.",
    ].join("\n");
  }

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
}
