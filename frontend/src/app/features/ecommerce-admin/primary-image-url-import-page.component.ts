import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { RouterLink } from "@angular/router";

import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  EcommercePrimaryImageUrlImportConfirmResponse,
  EcommercePrimaryImageUrlImportPreviewResponse,
  EcommercePrimaryImageUrlImportPreviewRow,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

type PreviewFilter = "all" | "valid" | "error" | "warning";

@Component({
  selector: "app-primary-image-url-import-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card import-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo online</p>
          <h1 class="ui-page-title">Importar imágenes principales</h1>
          <p class="ui-page-description">
            Asigna o actualiza imágenes principales URL-only por SKU, con preview y confirmación explícita.
          </p>
        </div>

        <a routerLink="/ecommerce-admin/perfiles" class="ui-button ui-button--secondary">
          Volver a perfiles
        </a>
      </header>

      <section class="safety-panel">
        <p>Esta importación solo usa SKU existentes con perfil online existente.</p>
        <p>No crea productos ERP ni modifica stock, inventario, unidades, costos o precios ERP.</p>
        <p>No descarga imágenes remotas: solo valida la URL contra la política pública y la allowlist backend.</p>
        <p>Storefront Next.js aún no está desplegado en Lightsail; esta fase no valida render staging.</p>
      </section>

      <section class="import-panel">
        <div class="import-actions">
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="downloadTemplate()"
            [disabled]="downloadingTemplate || previewLoading || confirmLoading"
          >
            {{ downloadingTemplate ? "Descargando..." : "Descargar plantilla" }}
          </button>

          <label class="file-picker">
            <span>Archivo .xlsx</span>
            <input
              #fileInput
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              (change)="onFileSelected($event)"
              [disabled]="previewLoading || confirmLoading || !!confirmResult"
            />
          </label>

          <button
            type="button"
            class="ui-button ui-button--primary"
            (click)="validateFile()"
            [disabled]="!selectedFile || previewLoading || confirmLoading || !!confirmResult"
          >
            {{ previewLoading ? "Validando..." : "Validar archivo" }}
          </button>

          <button
            *ngIf="!confirmResult"
            type="button"
            class="ui-button ui-button--primary"
            (click)="confirmImport()"
            [disabled]="!canConfirm()"
          >
            {{ confirmButtonLabel }}
          </button>

          <button
            *ngIf="confirmResult"
            type="button"
            class="ui-button ui-button--primary"
            (click)="startNewImport()"
            [disabled]="previewLoading || confirmLoading"
          >
            Nueva importación
          </button>
        </div>

        <div class="selected-file" *ngIf="selectedFile">
          <p class="ui-muted selected-file__name">
            Archivo seleccionado: <span [attr.title]="selectedFile.name">{{ selectedFile.name }}</span>
          </p>
          <button
            type="button"
            class="ui-button ui-button--secondary selected-file__clear"
            (click)="clearSelectedFile()"
            [disabled]="previewLoading || confirmLoading || !!confirmResult"
          >
            Quitar archivo
          </button>
        </div>
      </section>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">{{ successMessage }}</p>
      <p class="ui-alert ui-alert--info" *ngIf="downloadingTemplate">Preparando plantilla...</p>

      <p
        class="ui-alert"
        *ngIf="preview && !confirmResult && previewBannerMessage"
        [class.ui-alert--success]="previewBannerKind === 'success'"
        [class.ui-alert--warning]="previewBannerKind === 'warning'"
        [class.ui-alert--error]="previewBannerKind === 'error'"
      >
        {{ previewBannerMessage }}
      </p>

      <section class="summary-grid" *ngIf="preview">
        <article class="summary-card">
          <span>Total filas</span>
          <strong>{{ preview.totalRows }}</strong>
        </article>
        <article class="summary-card summary-card--success">
          <span>Se crearán</span>
          <strong>{{ preview.createRows }}</strong>
        </article>
        <article class="summary-card summary-card--warning">
          <span>Se actualizarán</span>
          <strong>{{ preview.updateRows }}</strong>
        </article>
        <article class="summary-card">
          <span>Sin cambios</span>
          <strong>{{ preview.unchangedRows }}</strong>
        </article>
        <article class="summary-card summary-card--notice">
          <span>Advertencias</span>
          <strong>{{ preview.warningRows }}</strong>
        </article>
        <article class="summary-card summary-card--danger">
          <span>Rechazadas</span>
          <strong>{{ preview.rejectedRows }}</strong>
        </article>
      </section>

      <section class="ui-card global-warnings" *ngIf="globalWarnings.length > 0">
        <div class="global-warnings__summary">
          <p>{{ globalWarningsSummary }}</p>
          <button type="button" class="detail-link" (click)="toggleGlobalWarningsDetails()">
            {{ showGlobalWarningsDetails ? "Ocultar detalles" : "Ver detalles" }}
          </button>
        </div>
        <ul *ngIf="showGlobalWarningsDetails">
          <li *ngFor="let warning of globalWarnings">{{ translateWarning(warning) }}</li>
        </ul>
      </section>

      <section class="ui-card result-card" *ngIf="confirmResult">
        <div class="result-card__head">
          <div>
            <p class="overview-kicker">Resultado de importación</p>
            <h2>{{ importResultTitle }}</h2>
          </div>
          <button type="button" class="ui-button ui-button--secondary" (click)="startNewImport()">
            Nueva importación
          </button>
        </div>
        <p
          class="ui-alert"
          [class.ui-alert--success]="importResultKind === 'success'"
          [class.ui-alert--warning]="importResultKind === 'warning'"
          [class.ui-alert--error]="importResultKind === 'error'"
        >
          {{ importResultMessage }}
        </p>
        <div class="result-grid">
          <p><strong>Total:</strong> {{ confirmResult.totalRows }}</p>
          <p><strong>Creados:</strong> {{ confirmResult.createdRows }}</p>
          <p><strong>Actualizados:</strong> {{ confirmResult.updatedRows }}</p>
          <p><strong>Sin cambios:</strong> {{ confirmResult.unchangedRows }}</p>
          <p><strong>Advertencias:</strong> {{ confirmResult.warningRows }}</p>
          <p><strong>Rechazados:</strong> {{ confirmResult.rejectedRows }}</p>
        </div>
      </section>

      <section class="preview-toolbar" *ngIf="preview">
        <div class="preview-title">
          <p class="overview-kicker">{{ previewModeLabel }}</p>
          <p class="ui-muted preview-counter">{{ previewCounterText }}</p>
        </div>

        <div class="preview-filters" role="group" aria-label="Filtro de preview">
          <button type="button" class="ui-button ui-button--secondary filter-button" [class.filter-button--active]="previewFilter === 'all'" (click)="setPreviewFilter('all')">
            Todas
          </button>
          <button type="button" class="ui-button ui-button--secondary filter-button" [class.filter-button--active]="previewFilter === 'valid'" (click)="setPreviewFilter('valid')">
            Validas
          </button>
          <button type="button" class="ui-button ui-button--secondary filter-button" [class.filter-button--active]="previewFilter === 'error'" (click)="setPreviewFilter('error')">
            Con error
          </button>
          <button type="button" class="ui-button ui-button--secondary filter-button" [class.filter-button--active]="previewFilter === 'warning'" (click)="setPreviewFilter('warning')">
            Con advertencias
          </button>
        </div>

        <div class="preview-pagination" *ngIf="filteredPreviewRows.length > previewPageSize">
          <button type="button" class="ui-button ui-button--secondary" (click)="goToPreviousPreviewPage()" [disabled]="previewPage === 1 || previewLoading || confirmLoading">
            Anterior
          </button>
          <button type="button" class="ui-button ui-button--secondary" (click)="goToNextPreviewPage()" [disabled]="previewPage === totalPreviewPages || previewLoading || confirmLoading">
            Siguiente
          </button>
        </div>
      </section>

      <section class="preview-layout" *ngIf="preview">
        <div class="ui-table-wrapper preview-table-card">
          <table class="ui-table import-table" *ngIf="visiblePreviewRows.length > 0; else emptyPreviewState">
            <colgroup>
              <col class="col-row" />
              <col class="col-sku" />
              <col class="col-product" />
              <col class="col-status" />
              <col class="col-action" />
              <col class="col-url" />
              <col class="col-result" />
            </colgroup>
            <thead>
              <tr>
                <th>Fila</th>
                <th>SKU</th>
                <th>Producto</th>
                <th>Estado</th>
                <th>Acción</th>
                <th>URL de imagen</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let row of visiblePreviewRows; trackBy: trackPreviewRow"
                class="preview-row"
                [class.preview-row--selected]="selectedPreviewRowNumber === row.rowNumber"
                (click)="selectPreviewRow(row)"
              >
                <td class="cell-compact">{{ row.rowNumber }}</td>
                <td class="cell-code cell-truncate">{{ row.sku || "-" }}</td>
                <td class="cell-product cell-truncate">{{ row.productName || "-" }}</td>
                <td class="cell-status">
                  <span class="ui-badge" [ngClass]="publicationBadgeClass(row.publicationStatus)">{{ publicationLabel(row.publicationStatus) }}</span>
                </td>
                <td class="cell-action">
                  <span class="ui-badge" [ngClass]="actionBadgeClass(row.action)">{{ actionLabel(row.action) }}</span>
                </td>
                <td class="cell-code cell-url cell-truncate">{{ shortUrl(row.imageUrl) }}</td>
                <td class="cell-result-compact">
                  <span class="ui-badge" [ngClass]="resultBadgeClass(row)">{{ resultLabel(row) }}</span>
                  <span class="result-note" *ngIf="rowSummaryIssue(row) as issue">{{ issue }}</span>
                  <button
                    type="button"
                    class="detail-link"
                    (click)="$event.stopPropagation(); selectPreviewRow(row)"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside class="detail-panel" *ngIf="selectedPreviewRow as selectedRow; else noSelectedRow">
          <header class="detail-panel__head">
            <div>
              <p class="overview-kicker">Detalle de fila</p>
              <h2>Fila {{ selectedRow.rowNumber }}</h2>
              <p class="ui-muted">SKU: {{ selectedRow.sku || "-" }}</p>
            </div>
            <span class="ui-badge" [ngClass]="actionBadgeClass(selectedRow.action)">{{ actionLabel(selectedRow.action) }}</span>
          </header>

          <section class="detail-section detail-section--error" *ngIf="selectedRow.errors.length > 0">
            <h3>Errores bloqueantes</h3>
            <ul>
              <li *ngFor="let error of selectedRow.errors">{{ translateIssue(error) }}</li>
            </ul>
          </section>

          <section class="detail-section detail-section--warning" *ngIf="rowSpecificWarnings(selectedRow).length > 0">
            <h3>Advertencias de esta fila</h3>
            <ul>
              <li *ngFor="let warning of rowSpecificWarnings(selectedRow)">{{ translateWarning(warning) }}</li>
            </ul>
          </section>

          <section class="detail-section">
            <h3>Imagen</h3>
            <dl class="detail-grid">
              <dt>URL actual</dt>
              <dd class="detail-url">{{ selectedRow.currentAssetUrl || "-" }}</dd>
              <dt>URL de imagen</dt>
              <dd class="detail-url">{{ selectedRow.imageUrl || "-" }}</dd>
              <dt>Texto alternativo</dt>
              <dd>{{ selectedRow.altText || "-" }}</dd>
              <dt>Fuente</dt>
              <dd>{{ sourceLabel(selectedRow.source) }}</dd>
              <dt>Derechos confirmados</dt>
              <dd>{{ booleanLabel(selectedRow.rightsConfirmed) }}</dd>
              <dt>Orden de visualización</dt>
              <dd>{{ selectedRow.displayOrder ?? 0 }}</dd>
            </dl>
          </section>

          <section class="detail-section detail-section--trace">
            <h3>Trazabilidad</h3>
            <dl class="detail-grid">
              <dt>Producto</dt>
              <dd>{{ selectedRow.productName || "-" }}</dd>
              <dt>Estado</dt>
              <dd>{{ publicationLabel(selectedRow.publicationStatus) }}</dd>
            </dl>
          </section>

          <details class="detail-section technical-trace">
            <summary>Trazabilidad técnica</summary>
            <dl class="detail-grid detail-grid--technical">
              <dt>productId</dt>
              <dd>{{ selectedRow.productId || "-" }}</dd>
              <dt>profileId</dt>
              <dd>{{ selectedRow.profileId || "-" }}</dd>
            </dl>
          </details>
        </aside>

        <ng-template #noSelectedRow>
          <aside class="detail-panel detail-panel--empty">
            <p class="ui-muted">Selecciona una fila para ver el detalle.</p>
          </aside>
        </ng-template>
      </section>

      <ng-template #emptyPreviewState>
        <section class="ui-card empty-preview">
          <p class="ui-muted">{{ previewEmptyMessage }}</p>
        </section>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .import-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .safety-panel,
      .import-panel {
        display: grid;
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-bg-soft);
      }

      .safety-panel p,
      .selected-file__name,
      .preview-counter,
      .result-grid p {
        margin: 0;
      }

      .import-actions,
      .selected-file,
      .preview-toolbar,
      .preview-filters,
      .preview-pagination {
        display: flex;
        gap: var(--space-3);
        align-items: center;
        flex-wrap: wrap;
      }

      .import-actions {
        align-items: end;
      }

      .selected-file,
      .result-card__head,
      .preview-toolbar {
        justify-content: space-between;
      }

      .result-card__head,
      .preview-title {
        display: grid;
        gap: var(--space-1);
      }

      .result-card__head {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }

      .result-card__head h2 {
        margin: 0;
      }

      .file-picker {
        display: grid;
        gap: var(--space-1);
        min-width: 260px;
      }

      .file-picker span,
      .summary-card span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .selected-file__name span {
        display: inline-block;
        max-width: min(620px, 72vw);
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
        white-space: nowrap;
      }

      .summary-grid,
      .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-3);
      }

      .summary-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-bg-surface);
        display: grid;
        gap: var(--space-1);
      }

      .summary-card strong {
        font-size: 1.7rem;
      }

      .summary-card--success strong {
        color: var(--color-success-text);
      }

      .summary-card--warning strong,
      .summary-card--notice strong {
        color: var(--color-warning-text);
      }

      .summary-card--danger strong {
        color: var(--color-danger-text);
      }

      .global-warnings {
        padding: var(--space-3);
        display: grid;
        gap: var(--space-2);
        border-color: color-mix(in srgb, var(--color-warning-bg) 70%, var(--color-border-default));
        background: var(--color-warning-bg);
      }

      .global-warnings__summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
      }

      .global-warnings__summary p {
        margin: 0;
        color: var(--color-warning-text);
        font-weight: 800;
      }

      .global-warnings h2,
      .global-warnings ul {
        margin: 0;
      }

      .overview-kicker {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .global-warnings ul {
        display: grid;
        gap: var(--space-2);
        margin-top: var(--space-1);
        padding-left: var(--space-4);
        color: var(--color-warning-text);
      }

      .filter-button--active {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      .preview-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 400px;
        gap: var(--space-4);
        align-items: start;
        min-height: 380px;
      }

      .preview-table-card {
        min-width: 0;
        min-height: 320px;
        overflow-x: auto;
        overflow-y: visible;
      }

      .import-table {
        width: 100%;
        min-width: 1080px;
        table-layout: fixed;
      }

      .import-table th,
      .import-table td {
        overflow: hidden;
        vertical-align: top;
      }

      .col-row {
        width: 64px;
      }

      .col-sku {
        width: 140px;
      }

      .col-product {
        width: 20%;
      }

      .col-status {
        width: 132px;
      }

      .col-action {
        width: 164px;
      }

      .col-url {
        width: 24%;
      }

      .col-result {
        width: 220px;
      }

      .preview-row {
        cursor: pointer;
      }

      .preview-row--selected {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
        background: var(--color-bg-soft);
      }

      .cell-compact {
        width: 56px;
      }

      .cell-status,
      .cell-action {
        white-space: nowrap;
      }

      .cell-code {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
      }

      .cell-truncate {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-product,
      .cell-url {
        min-width: 0;
      }

      .cell-result {
        min-width: 260px;
      }

      .cell-result-compact {
        min-width: 0;
        display: grid;
        gap: var(--space-1);
      }

      .result-note {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .detail-link {
        border: 0;
        background: transparent;
        color: var(--color-primary);
        cursor: pointer;
        font: inherit;
        font-size: var(--font-size-sm);
        font-weight: 700;
        padding: 0;
        text-align: left;
      }

      .detail-panel {
        position: sticky;
        top: var(--space-4);
        min-height: 320px;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: var(--space-4);
        display: grid;
        gap: var(--space-4);
        box-shadow: var(--shadow-sm);
      }

      .detail-panel--empty {
        min-height: 220px;
        place-items: center;
        text-align: center;
      }

      .detail-panel__head {
        display: flex;
        gap: var(--space-3);
        justify-content: space-between;
        align-items: start;
      }

      .detail-panel__head h2,
      .detail-panel__head p,
      .detail-section h3,
      .detail-section ul,
      .detail-grid {
        margin: 0;
      }

      .detail-section {
        display: grid;
        gap: var(--space-2);
        border-top: 1px solid var(--color-border-default);
        padding-top: var(--space-3);
      }

      .detail-section--error {
        color: var(--color-danger-text);
      }

      .detail-section--warning {
        color: var(--color-warning-text);
      }

      .detail-section--trace {
        color: var(--color-text-primary);
      }

      .technical-trace {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .technical-trace summary {
        cursor: pointer;
        font-weight: 800;
      }

      .technical-trace[open] summary {
        margin-bottom: var(--space-2);
      }

      .detail-section ul {
        display: grid;
        gap: var(--space-2);
        padding-left: var(--space-4);
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr);
        gap: var(--space-2) var(--space-3);
      }

      .detail-grid dt {
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .detail-grid dd {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .detail-grid--technical dt,
      .detail-grid--technical dd {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .detail-url {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
      }

      .row-errors,
      .row-warnings {
        margin: var(--space-2) 0 0;
        padding-left: var(--space-3);
        font-size: var(--font-size-sm);
      }

      .row-errors {
        color: var(--color-danger-text);
      }

      .row-warnings {
        color: var(--color-warning-text);
      }

      .result-card,
      .empty-preview {
        padding: var(--space-4);
      }

      @media (max-width: 760px) {
        .import-page {
          padding: var(--space-3);
        }

        .import-actions,
        .preview-toolbar,
        .preview-filters,
        .preview-pagination {
          align-items: stretch;
          flex-direction: column;
        }

        .import-actions > *,
        .preview-filters > *,
        .preview-pagination > * {
          width: 100%;
        }

        .preview-layout {
          grid-template-columns: 1fr;
        }

        .detail-panel {
          position: static;
        }

        .global-warnings__summary {
          align-items: flex-start;
          flex-direction: column;
        }

        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PrimaryImageUrlImportPageComponent {
  @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  preview: EcommercePrimaryImageUrlImportPreviewResponse | null = null;
  confirmResult: EcommercePrimaryImageUrlImportConfirmResponse | null = null;
  previewLoading = false;
  confirmLoading = false;
  downloadingTemplate = false;
  errorMessage = "";
  successMessage = "";
  previewFilter: PreviewFilter = "all";
  previewPage = 1;
  selectedPreviewRowNumber: number | null = null;
  showGlobalWarningsDetails = false;
  readonly previewPageSize = 25;

  constructor(
    private readonly ecommerceAdminService: EcommerceAdminService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  get filteredPreviewRows(): EcommercePrimaryImageUrlImportPreviewRow[] {
    if (!this.preview) {
      return [];
    }
    switch (this.previewFilter) {
      case "valid":
        return this.preview.rows.filter((row) => row.valid);
      case "error":
        return this.preview.rows.filter((row) => !row.valid);
      case "warning":
        return this.preview.rows.filter((row) => row.warnings.length > 0);
      default:
        return this.preview.rows;
    }
  }

  get totalPreviewPages(): number {
    const totalRows = this.filteredPreviewRows.length;
    return totalRows === 0 ? 1 : Math.ceil(totalRows / this.previewPageSize);
  }

  get visiblePreviewRows(): EcommercePrimaryImageUrlImportPreviewRow[] {
    const start = (this.previewPage - 1) * this.previewPageSize;
    return this.filteredPreviewRows.slice(start, start + this.previewPageSize);
  }

  get selectedPreviewRow(): EcommercePrimaryImageUrlImportPreviewRow | null {
    if (!this.preview || this.selectedPreviewRowNumber === null) {
      return null;
    }
    return this.preview.rows.find((row) => row.rowNumber === this.selectedPreviewRowNumber) || null;
  }

  get importableRows(): number {
    return this.preview ? this.preview.createRows + this.preview.updateRows : 0;
  }

  get appliedRows(): number {
    if (!this.confirmResult) {
      return 0;
    }
    return this.confirmResult.createdRows + this.confirmResult.updatedRows + this.confirmResult.unchangedRows;
  }

  get confirmButtonLabel(): string {
    if (this.confirmLoading) {
      return `Importando ${this.importableRows} fila${this.importableRows === 1 ? "" : "s"}...`;
    }
    if (this.importableRows === 0) {
      return "No hay filas válidas para importar";
    }
    return this.importableRows === 1 ? "Importar 1 fila válida" : `Importar ${this.importableRows} filas válidas`;
  }

  get importResultKind(): "success" | "warning" | "error" {
    if (!this.confirmResult || this.appliedRows === 0) {
      return "error";
    }
    return this.confirmResult.rejectedRows > 0 ? "warning" : "success";
  }

  get importResultTitle(): string {
    if (!this.confirmResult || this.appliedRows === 0) {
      return "No se importó ninguna fila";
    }
    return this.confirmResult.rejectedRows > 0
      ? "Importación finalizada parcialmente"
      : "Importación finalizada correctamente";
  }

  get importResultMessage(): string {
    if (!this.confirmResult || this.appliedRows === 0) {
      return "No se importó ninguna fila. Corrige el archivo y vuelve a validar.";
    }
    return this.confirmResult.rejectedRows > 0
      ? "Importación finalizada parcialmente. Se aplicaron las filas válidas y algunas filas fueron rechazadas."
      : "Importación finalizada correctamente. Se aplicaron todas las filas válidas.";
  }

  get previewModeLabel(): string {
    return this.confirmResult ? "Resultado de importación" : "Preview de importación";
  }

  get globalWarnings(): string[] {
    if (!this.preview) {
      return [];
    }
    return Array.from(new Set(this.preview.rows.flatMap((row) => row.warnings)));
  }

  get globalWarningsSummary(): string {
    const count = this.globalWarnings.length;
    return `Notas de validación: ${count} advertencia${count === 1 ? "" : "s"} general${count === 1 ? "" : "es"}`;
  }

  get previewCounterText(): string {
    const totalRows = this.filteredPreviewRows.length;
    if (totalRows === 0) {
      return `Mostrando 0 de 0 ${this.previewFilterLabel}`;
    }
    const start = (this.previewPage - 1) * this.previewPageSize + 1;
    const end = Math.min(this.previewPage * this.previewPageSize, totalRows);
    return `Mostrando ${start}-${end} de ${totalRows} ${this.previewFilterLabel}`;
  }

  get previewFilterLabel(): string {
    switch (this.previewFilter) {
      case "valid":
        return "filas válidas";
      case "error":
        return "filas con error";
      case "warning":
        return "filas con advertencias";
      default:
        return "filas";
    }
  }

  get previewEmptyMessage(): string {
    switch (this.previewFilter) {
      case "valid":
        return "No hay filas válidas para mostrar.";
      case "error":
        return "No hay filas con error para mostrar.";
      case "warning":
        return "No hay filas con advertencias para mostrar.";
      default:
        return "No hay filas para mostrar.";
    }
  }

  get previewBannerKind(): "success" | "warning" | "error" | null {
    if (!this.preview) {
      return null;
    }
    const importableRows = this.preview.createRows + this.preview.updateRows;
    if (this.preview.rejectedRows === 0 && importableRows > 0) {
      return this.preview.warningRows > 0 ? "warning" : "success";
    }
    if (this.preview.rejectedRows > 0 && importableRows > 0) {
      return "warning";
    }
    if (this.preview.rejectedRows > 0) {
      return "error";
    }
    return null;
  }

  get previewBannerMessage(): string {
    if (!this.preview) {
      return "";
    }
    const importableRows = this.preview.createRows + this.preview.updateRows;
    if (this.preview.rejectedRows === 0 && importableRows > 0) {
      return this.preview.warningRows > 0
        ? "Validación terminada con advertencias. Revisa el preview antes de confirmar."
        : "Validación terminada. Las filas están listas para confirmar.";
    }
    if (this.preview.rejectedRows > 0 && importableRows > 0) {
      return "Validación completada con errores. Se aplicarán solo las filas válidas si confirmas.";
    }
    if (this.preview.rejectedRows > 0) {
      return "No hay filas aplicables. Corrige el archivo antes de confirmar.";
    }
    return "Validación terminada. No hay cambios para aplicar.";
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resetImportState();
    const file = input.files?.item(0) || null;
    if (!file) {
      this.selectedFile = null;
      return;
    }
    if (!this.isXlsxFile(file)) {
      this.selectedFile = null;
      input.value = "";
      this.errorMessage = "Selecciona un archivo .xlsx válido.";
      return;
    }
    this.selectedFile = file;
  }

  clearSelectedFile(): void {
    this.resetImportState();
    this.selectedFile = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = "";
    }
  }

  startNewImport(): void {
    this.clearSelectedFile();
  }

  setPreviewFilter(filter: PreviewFilter): void {
    this.previewFilter = filter;
    this.previewPage = 1;
    this.syncSelectedPreviewRow();
  }

  selectPreviewRow(row: EcommercePrimaryImageUrlImportPreviewRow): void {
    this.selectedPreviewRowNumber = row.rowNumber;
  }

  toggleGlobalWarningsDetails(): void {
    this.showGlobalWarningsDetails = !this.showGlobalWarningsDetails;
  }

  downloadTemplate(): void {
    this.downloadingTemplate = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.ecommerceAdminService.downloadPrimaryImageUrlImportTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate = false;
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "ecommerce-primary-images-url-import-template.xlsx";
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.downloadingTemplate = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo descargar la plantilla.");
      },
    });
  }

  validateFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = "Selecciona un archivo .xlsx para validar.";
      return;
    }
    if (!this.isXlsxFile(this.selectedFile)) {
      this.errorMessage = "Selecciona un archivo .xlsx válido.";
      return;
    }

    this.previewLoading = true;
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";
    this.previewPage = 1;
    this.previewFilter = "all";
    this.selectedPreviewRowNumber = null;
    this.showGlobalWarningsDetails = false;

    this.ecommerceAdminService.previewPrimaryImageUrlImport(this.selectedFile).subscribe({
      next: (response) => {
        this.previewLoading = false;
        this.preview = response;
        this.syncSelectedPreviewRow();
      },
      error: (error: unknown) => {
        this.previewLoading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo validar el archivo.");
      },
    });
  }

  async confirmImport(): Promise<void> {
    if (!this.preview || !this.selectedFile || this.previewLoading || this.confirmLoading) {
      return;
    }
    if (!this.isXlsxFile(this.selectedFile)) {
      this.errorMessage = "Selecciona un archivo .xlsx válido antes de confirmar.";
      return;
    }

    const importableRows = this.preview.createRows + this.preview.updateRows;
    const confirmed = await this.confirmDialogService.confirm({
      title: "Confirmar importación de imágenes principales",
      description:
        `Se aplicarán ${importableRows} fila(s): ${this.preview.createRows} para crear y ${this.preview.updateRows} para actualizar. ` +
        `${this.preview.rejectedRows} fila(s) rechazadas no se aplicarán y ${this.preview.warningRows} fila(s) tienen advertencias. ` +
        "No se descargan imágenes remotas ni se modifica stock, inventario, unidades, costos o precios ERP.",
      highlightText: "Verifica el preview y los perfiles publicados antes de continuar.",
      confirmText: "Confirmar importación",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    this.confirmLoading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.confirmResult = null;

    this.ecommerceAdminService.confirmPrimaryImageUrlImportFile(this.selectedFile).subscribe({
      next: (response) => {
        this.confirmLoading = false;
        this.confirmResult = response;
        this.successMessage = "";
      },
      error: (error: unknown) => {
        this.confirmLoading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo confirmar la importación.");
      },
    });
  }

  canConfirm(): boolean {
    return !!this.preview &&
      !!this.selectedFile &&
      !this.confirmResult &&
      this.importableRows > 0 &&
      !this.confirmLoading &&
      !this.previewLoading;
  }

  goToPreviousPreviewPage(): void {
    this.previewPage = Math.max(1, this.previewPage - 1);
    this.syncSelectedPreviewRow();
  }

  goToNextPreviewPage(): void {
    this.previewPage = Math.min(this.totalPreviewPages, this.previewPage + 1);
    this.syncSelectedPreviewRow();
  }

  trackPreviewRow(_index: number, row: EcommercePrimaryImageUrlImportPreviewRow): number {
    return row.rowNumber;
  }

  actionLabel(action: string | null): string {
    switch (action) {
      case "CREATE":
        return "Se creará";
      case "UPDATE":
        return "Se actualizará";
      case "NO_CHANGE":
        return "Sin cambios";
      case "REJECT":
        return "No se importará";
      default:
        return "-";
    }
  }

  publicationLabel(status: string | null): string {
    switch (status) {
      case "PUBLISHED":
        return "Publicado";
      case "DRAFT":
        return "Borrador";
      case "READY_FOR_REVIEW":
        return "Listo para revision";
      case "INCOMPLETE":
        return "Incompleto";
      case "UNPUBLISHED":
        return "No publicado";
      case "BLOCKED":
        return "Bloqueado";
      default:
        return "-";
    }
  }

  sourceLabel(source: string | null): string {
    switch (source) {
      case "OWN":
        return "Propia";
      case "SUPPLIER":
        return "Proveedor";
      case "GENERATED":
        return "Generada";
      case "OTHER":
        return "Otra";
      default:
        return "-";
    }
  }

  booleanLabel(value: boolean | null): string {
    if (value === null) {
      return "-";
    }
    return value ? "Si" : "No";
  }

  shortUrl(url: string | null): string {
    if (!url) {
      return "-";
    }
    return url.length > 48 ? `${url.slice(0, 30)}...${url.slice(-14)}` : url;
  }

  resultLabel(row: EcommercePrimaryImageUrlImportPreviewRow): string {
    if (!row.valid) {
      return "Con errores";
    }
    if (row.warnings.length > 0) {
      return "Con advertencias";
    }
    return "Valida";
  }

  resultBadgeClass(row: EcommercePrimaryImageUrlImportPreviewRow): Record<string, boolean> {
    return {
      "ui-badge--success": row.valid && row.warnings.length === 0,
      "ui-badge--warning": row.valid && row.warnings.length > 0,
      "ui-badge--danger": !row.valid,
    };
  }

  rowSummaryIssue(row: EcommercePrimaryImageUrlImportPreviewRow): string {
    if (row.errors.length > 0) {
      return this.translateIssue(row.errors[0]);
    }
    if (row.warnings.length > 0) {
      return this.translateWarning(row.warnings[0]);
    }
    return "";
  }

  rowSpecificWarnings(row: EcommercePrimaryImageUrlImportPreviewRow): string[] {
    return row.warnings;
  }

  translateIssue(issue: string): string {
    const labels: Record<string, string> = {
      "SKU is required": "El SKU es obligatorio.",
      "SKU is duplicated in file": "El SKU está duplicado en el archivo.",
      "SKU not found": "No existe un producto con este SKU.",
      "Product is inactive": "El producto está inactivo.",
      "Online profile not found": "El producto no tiene perfil online.",
      "imageUrl is required": "La URL de imagen es obligatoria.",
      "Asset URL is required": "La URL de imagen es obligatoria.",
      "Asset URL max length is 500": "La URL de imagen supera el máximo de 500 caracteres.",
      "altText is required": "El texto alternativo es obligatorio.",
      "altText max length is 250": "El texto alternativo supera el máximo de 250 caracteres.",
      "Published profile update requires explicit confirmation": "Actualizar un perfil publicado requiere confirmación explícita en la plantilla.",
      "source is required": "La fuente es obligatoria.",
      "source is invalid": "La fuente no es válida.",
      "assetType must be PRODUCT_IMAGE": "El tipo de asset debe ser imagen de producto.",
      "rightsConfirmed must be true": "Debes confirmar que tienes derechos de uso de la imagen.",
      "displayOrder is invalid": "El orden de visualización no es válido.",
      "La URL de imagen no es publica o usa un dominio no permitido.": "La URL de imagen no es pública o usa un dominio no permitido.",
      "No se permiten dominios localhost, test o example.": "No se permiten dominios localhost, test o example.",
    };
    return labels[issue] || issue;
  }

  translateWarning(warning: string): string {
    const labels: Record<string, string> = {
      "Sobrescribira imagen principal existente.": "Se sobrescribirá la imagen principal existente.",
      "Perfil publicado cambiara imagen visible publicamente.": "El perfil publicado cambiará la imagen visible públicamente.",
      "Si reemplaza un asset con metadata S3, la importacion URL-only limpiara metadata storage del asset, pero NO borrara el objeto S3 previo en esta fase.":
        "Si reemplazas un asset con metadata S3, la importación URL-only limpiará la metadata local, pero no borrará el objeto S3 previo en esta fase.",
      "La URL fue validada por politica, pero no se verifico MIME, dimensiones, peso ni existencia remota.":
        "La URL fue validada por política, pero no se verificó MIME, dimensiones, peso ni existencia remota.",
      "Storefront Next.js no esta desplegado en Lightsail; render staging no queda validado por esta fase.":
        "Storefront Next.js no está desplegado en Lightsail; el render staging no queda validado por esta fase.",
      "Backend allowlist y Storefront allowlist deben mantenerse alineadas.":
        "La allowlist del backend y la allowlist del Storefront deben mantenerse alineadas.",
    };
    return labels[warning] || warning;
  }

  actionBadgeClass(action: string | null): Record<string, boolean> {
    return {
      "ui-badge--success": action === "CREATE",
      "ui-badge--warning": action === "UPDATE",
      "ui-badge--neutral": action === "NO_CHANGE",
      "ui-badge--danger": action === "REJECT",
    };
  }

  publicationBadgeClass(status: string | null): Record<string, boolean> {
    return {
      "ui-badge--success": status === "PUBLISHED",
      "ui-badge--warning": status === "READY_FOR_REVIEW" || status === "INCOMPLETE",
      "ui-badge--neutral": status === "DRAFT" || status === "UNPUBLISHED",
      "ui-badge--danger": status === "BLOCKED",
    };
  }

  private resetImportState(): void {
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";
    this.previewPage = 1;
    this.previewFilter = "all";
    this.selectedPreviewRowNumber = null;
    this.showGlobalWarningsDetails = false;
  }

  private syncSelectedPreviewRow(): void {
    const rows = this.visiblePreviewRows;
    if (rows.length === 0) {
      this.selectedPreviewRowNumber = null;
      return;
    }
    const selectedRowStillVisible = rows.some((row) => row.rowNumber === this.selectedPreviewRowNumber);
    if (!selectedRowStillVisible) {
      this.selectedPreviewRowNumber = rows[0].rowNumber;
    }
  }

  private isXlsxFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(".xlsx");
  }
}
