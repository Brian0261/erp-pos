import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { RouterLink } from "@angular/router";

import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  EcommercePrimaryImageBinaryImportConfirmResponse,
  EcommercePrimaryImageBinaryImportConfirmRowResponse,
  EcommercePrimaryImageBinaryImportPreviewResponse,
  EcommercePrimaryImageBinaryImportPreviewRow,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

type PreviewFilter = "all" | "valid" | "error" | "warning";

@Component({
  selector: "app-primary-image-binary-import-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card import-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catálogo online</p>
          <h1 class="ui-page-title">Importar imágenes por Excel + ZIP</h1>
          <p class="ui-page-description">
            Carga imágenes principales desde un .xlsx y un .zip local, con preview y confirmación explícita.
          </p>
        </div>

        <div class="header-actions">
          <a routerLink="/ecommerce-admin/perfiles/imagenes/importar" class="ui-button ui-button--secondary">
            Importación por URL
          </a>
          <a routerLink="/ecommerce-admin/perfiles" class="ui-button ui-button--secondary">
            Volver a perfiles
          </a>
        </div>
      </header>

      <section class="safety-panel">
        <p>Preview no aplica cambios ni sube imágenes al storage.</p>
        <p>Confirmación aplica solo filas válidas; las filas rechazadas no se importan.</p>
        <p>El ZIP debe contener las imágenes referenciadas por la columna imageFile del Excel.</p>
        <p>Los productos publicados pueden requerir publishedUpdateConfirmed=true para cambiar la imagen visible.</p>
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
            <span>Excel .xlsx</span>
            <input
              #workbookInput
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              (change)="onWorkbookSelected($event)"
              [disabled]="previewLoading || confirmLoading || !!confirmResult"
            />
          </label>

          <label class="file-picker">
            <span>Archivo .zip</span>
            <input
              #archiveInput
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              (change)="onArchiveSelected($event)"
              [disabled]="previewLoading || confirmLoading || !!confirmResult"
            />
          </label>

          <button
            type="button"
            class="ui-button ui-button--primary"
            (click)="validateFiles()"
            [disabled]="!selectedWorkbook || !selectedArchive || previewLoading || confirmLoading || !!confirmResult"
          >
            {{ previewLoading ? "Validando..." : "Preview" }}
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

        <div class="selected-files" *ngIf="selectedWorkbook || selectedArchive">
          <p class="ui-muted" *ngIf="selectedWorkbook">
            Excel: <span [attr.title]="selectedWorkbook.name">{{ selectedWorkbook.name }}</span>
          </p>
          <p class="ui-muted" *ngIf="selectedArchive">
            ZIP: <span [attr.title]="selectedArchive.name">{{ selectedArchive.name }}</span>
          </p>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="clearSelectedFiles()"
            [disabled]="previewLoading || confirmLoading || !!confirmResult"
          >
            Quitar archivos
          </button>
        </div>
      </section>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">{{ errorMessage }}</p>
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
            Válidas
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
            <thead>
              <tr>
                <th>Fila</th>
                <th>SKU</th>
                <th>Producto</th>
                <th>Estado</th>
                <th>Acción</th>
                <th>imageFile</th>
                <th>Archivo</th>
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
                <td>{{ row.rowNumber }}</td>
                <td class="cell-code cell-truncate">{{ row.sku || "-" }}</td>
                <td class="cell-product cell-truncate">{{ row.productName || "-" }}</td>
                <td><span class="ui-badge" [ngClass]="publicationBadgeClass(row.publicationStatus)">{{ publicationLabel(row.publicationStatus) }}</span></td>
                <td><span class="ui-badge" [ngClass]="actionBadgeClass(row.action)">{{ actionLabel(row.action) }}</span></td>
                <td class="cell-code cell-truncate">{{ row.imageFile || "-" }}</td>
                <td class="cell-code">{{ fileSummary(row) }}</td>
                <td class="cell-result-compact">
                  <span class="ui-badge" [ngClass]="resultBadgeClass(row)">{{ resultLabel(row) }}</span>
                  <span class="result-note" *ngIf="rowSummaryIssue(row) as issue">{{ issue }}</span>
                  <button type="button" class="detail-link" (click)="$event.stopPropagation(); selectPreviewRow(row)">
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

          <section class="detail-section detail-section--warning" *ngIf="selectedRow.warnings.length > 0">
            <h3>Advertencias</h3>
            <ul>
              <li *ngFor="let warning of selectedRow.warnings">{{ translateWarning(warning) }}</li>
            </ul>
          </section>

          <section class="detail-section">
            <h3>Imagen ZIP</h3>
            <dl class="detail-grid">
              <dt>Imagen actual</dt>
              <dd class="detail-url">{{ selectedRow.currentAssetUrl || "-" }}</dd>
              <dt>imageFile</dt>
              <dd class="detail-url">{{ selectedRow.imageFile || "-" }}</dd>
              <dt>Tipo MIME</dt>
              <dd>{{ selectedRow.mimeType || "-" }}</dd>
              <dt>Dimensiones</dt>
              <dd>{{ dimensionsLabel(selectedRow) }}</dd>
              <dt>Peso</dt>
              <dd>{{ sizeLabel(selectedRow.sizeBytes) }}</dd>
              <dt>Checksum SHA-256</dt>
              <dd class="detail-url">{{ selectedRow.checksumSha256 || "-" }}</dd>
            </dl>
          </section>

          <section class="detail-section">
            <h3>Metadata ecommerce</h3>
            <dl class="detail-grid">
              <dt>Texto alternativo</dt>
              <dd>{{ selectedRow.altText || "-" }}</dd>
              <dt>Fuente</dt>
              <dd>{{ sourceLabel(selectedRow.source) }}</dd>
              <dt>Derechos confirmados</dt>
              <dd>{{ booleanLabel(selectedRow.rightsConfirmed) }}</dd>
              <dt>Orden de visualización</dt>
              <dd>{{ selectedRow.displayOrder ?? 0 }}</dd>
              <dt>Producto</dt>
              <dd>{{ selectedRow.productName || "-" }}</dd>
              <dt>Estado</dt>
              <dd>{{ publicationLabel(selectedRow.publicationStatus) }}</dd>
            </dl>
          </section>

          <section class="detail-section" *ngIf="confirmRowFor(selectedRow) as confirmRow">
            <h3>Resultado de confirmación</h3>
            <dl class="detail-grid">
              <dt>Aplicada</dt>
              <dd>{{ booleanLabel(confirmRow.applied) }}</dd>
              <dt>URL generada</dt>
              <dd class="detail-url">{{ confirmRow.assetUrl || "-" }}</dd>
              <dt>Storage key</dt>
              <dd class="detail-url">{{ confirmRow.storageKey || "-" }}</dd>
            </dl>
            <ul *ngIf="confirmRow.errors.length > 0">
              <li *ngFor="let error of confirmRow.errors">{{ translateIssue(error) }}</li>
            </ul>
            <ul *ngIf="confirmRow.warnings.length > 0">
              <li *ngFor="let warning of confirmRow.warnings">{{ translateWarning(warning) }}</li>
            </ul>
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

      .header-actions,
      .import-actions,
      .selected-files,
      .preview-toolbar,
      .preview-filters,
      .preview-pagination {
        display: flex;
        gap: var(--space-3);
        align-items: center;
        flex-wrap: wrap;
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
      .selected-files p,
      .preview-counter,
      .result-grid p {
        margin: 0;
      }

      .import-actions {
        align-items: end;
      }

      .file-picker {
        display: grid;
        gap: var(--space-1);
        min-width: 220px;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        font-weight: 600;
      }

      .file-picker input {
        border: 1px dashed var(--color-border-default);
        border-radius: var(--radius-sm);
        padding: var(--space-2);
        background: var(--color-bg-default);
        color: var(--color-text-default);
      }

      .selected-files,
      .result-card__head,
      .preview-toolbar {
        justify-content: space-between;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-3);
      }

      .summary-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-bg-default);
        display: grid;
        gap: var(--space-1);
      }

      .summary-card span {
        color: var(--color-text-muted);
        font-size: 0.84rem;
      }

      .summary-card strong {
        font-size: 1.6rem;
      }

      .summary-card--success strong { color: var(--color-success); }
      .summary-card--warning strong { color: var(--color-warning); }
      .summary-card--danger strong { color: var(--color-danger); }
      .summary-card--notice strong { color: var(--color-info); }

      .result-card,
      .preview-table-card,
      .detail-panel,
      .empty-preview {
        padding: var(--space-4);
      }

      .result-card__head {
        display: flex;
        gap: var(--space-3);
        align-items: center;
      }

      .result-card__head h2 {
        margin: 0;
      }

      .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-2);
      }

      .preview-title {
        display: grid;
        gap: var(--space-1);
      }

      .filter-button--active {
        border-color: var(--color-primary);
        color: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary);
      }

      .preview-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 0.36fr);
        gap: var(--space-4);
        align-items: start;
      }

      .import-table {
        min-width: 980px;
      }

      .import-table th,
      .import-table td {
        vertical-align: top;
      }

      .preview-row {
        cursor: pointer;
      }

      .preview-row--selected {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
        background: var(--color-bg-soft);
      }

      .cell-code {
        font-family: var(--font-mono, monospace);
        font-size: 0.84rem;
      }

      .cell-truncate {
        max-width: 230px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-result-compact {
        display: grid;
        gap: var(--space-1);
        min-width: 180px;
      }

      .result-note {
        color: var(--color-text-muted);
        font-size: 0.82rem;
      }

      .detail-link {
        border: 0;
        padding: 0;
        background: transparent;
        color: var(--color-primary);
        cursor: pointer;
        font-weight: 600;
        text-align: left;
      }

      .detail-panel {
        position: sticky;
        top: var(--space-4);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-default);
        display: grid;
        gap: var(--space-3);
      }

      .detail-panel__head {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
      }

      .detail-panel__head h2,
      .detail-panel__head p,
      .detail-section h3 {
        margin: 0;
      }

      .detail-section {
        display: grid;
        gap: var(--space-2);
        border-top: 1px solid var(--color-border-default);
        padding-top: var(--space-3);
      }

      .detail-section--error { color: var(--color-danger); }
      .detail-section--warning { color: var(--color-warning); }

      .detail-grid {
        display: grid;
        grid-template-columns: minmax(110px, 0.4fr) minmax(0, 1fr);
        gap: var(--space-2) var(--space-3);
      }

      .detail-grid dt {
        color: var(--color-text-muted);
        font-weight: 600;
      }

      .detail-grid dd {
        margin: 0;
        min-width: 0;
      }

      .detail-url {
        overflow-wrap: anywhere;
      }

      @media (max-width: 1100px) {
        .preview-layout {
          grid-template-columns: 1fr;
        }

        .detail-panel {
          position: static;
        }
      }

      @media (max-width: 720px) {
        .import-page {
          padding: var(--space-3);
        }

        .header-actions,
        .import-actions,
        .selected-files,
        .preview-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .header-actions > *,
        .import-actions > *,
        .selected-files > * {
          width: 100%;
        }

        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PrimaryImageBinaryImportPageComponent {
  @ViewChild("workbookInput") workbookInput?: ElementRef<HTMLInputElement>;
  @ViewChild("archiveInput") archiveInput?: ElementRef<HTMLInputElement>;

  selectedWorkbook: File | null = null;
  selectedArchive: File | null = null;
  preview: EcommercePrimaryImageBinaryImportPreviewResponse | null = null;
  confirmResult: EcommercePrimaryImageBinaryImportConfirmResponse | null = null;
  previewLoading = false;
  confirmLoading = false;
  confirmDialogOpen = false;
  downloadingTemplate = false;
  errorMessage = "";
  previewFilter: PreviewFilter = "all";
  previewPage = 1;
  selectedPreviewRowNumber: number | null = null;
  readonly previewPageSize = 25;

  constructor(
    private readonly ecommerceAdminService: EcommerceAdminService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  get filteredPreviewRows(): EcommercePrimaryImageBinaryImportPreviewRow[] {
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

  get visiblePreviewRows(): EcommercePrimaryImageBinaryImportPreviewRow[] {
    const start = (this.previewPage - 1) * this.previewPageSize;
    return this.filteredPreviewRows.slice(start, start + this.previewPageSize);
  }

  get selectedPreviewRow(): EcommercePrimaryImageBinaryImportPreviewRow | null {
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

  get previewModeLabel(): string {
    return this.confirmResult ? "Resultado de importación" : "Preview de importación";
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
    if (this.preview.rejectedRows === 0 && this.importableRows > 0) {
      return this.preview.warningRows > 0 ? "warning" : "success";
    }
    if (this.preview.rejectedRows > 0 && this.importableRows > 0) {
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
    if (this.preview.rejectedRows === 0 && this.importableRows > 0) {
      return this.preview.warningRows > 0
        ? "Preview terminado con advertencias. Revisa las filas antes de confirmar."
        : "Preview terminado. Las filas válidas están listas para confirmar.";
    }
    if (this.preview.rejectedRows > 0 && this.importableRows > 0) {
      return "Preview completado con errores. Si confirmas, se aplicarán solo las filas válidas.";
    }
    if (this.preview.rejectedRows > 0) {
      return "No hay filas aplicables. Corrige el Excel o el ZIP antes de confirmar.";
    }
    return "Preview terminado. No hay cambios para aplicar.";
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
      return "No se importó ninguna fila. Corrige el Excel o el ZIP y vuelve a validar.";
    }
    return this.confirmResult.rejectedRows > 0
      ? "Importación finalizada parcialmente. Se aplicaron las filas válidas y algunas fueron rechazadas."
      : "Importación finalizada correctamente. Se aplicaron todas las filas válidas.";
  }

  onWorkbookSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resetImportState();
    const file = input.files?.item(0) || null;
    if (!file) {
      this.selectedWorkbook = null;
      return;
    }
    if (!this.isXlsxFile(file)) {
      this.selectedWorkbook = null;
      input.value = "";
      this.errorMessage = "Selecciona un archivo .xlsx válido.";
      return;
    }
    this.selectedWorkbook = file;
  }

  onArchiveSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resetImportState();
    const file = input.files?.item(0) || null;
    if (!file) {
      this.selectedArchive = null;
      return;
    }
    if (!this.isZipFile(file)) {
      this.selectedArchive = null;
      input.value = "";
      this.errorMessage = "Selecciona un archivo .zip válido.";
      return;
    }
    this.selectedArchive = file;
  }

  clearSelectedFiles(): void {
    this.resetImportState();
    this.selectedWorkbook = null;
    this.selectedArchive = null;
    if (this.workbookInput?.nativeElement) {
      this.workbookInput.nativeElement.value = "";
    }
    if (this.archiveInput?.nativeElement) {
      this.archiveInput.nativeElement.value = "";
    }
  }

  startNewImport(): void {
    this.clearSelectedFiles();
  }

  setPreviewFilter(filter: PreviewFilter): void {
    this.previewFilter = filter;
    this.previewPage = 1;
    this.syncSelectedPreviewRow();
  }

  selectPreviewRow(row: EcommercePrimaryImageBinaryImportPreviewRow): void {
    this.selectedPreviewRowNumber = row.rowNumber;
  }

  downloadTemplate(): void {
    this.downloadingTemplate = true;
    this.errorMessage = "";

    this.ecommerceAdminService.downloadPrimaryImageBinaryImportTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate = false;
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "ecommerce-primary-images-binary-import-template.xlsx";
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.downloadingTemplate = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo descargar la plantilla.");
      },
    });
  }

  validateFiles(): void {
    if (!this.selectedWorkbook || !this.selectedArchive) {
      this.errorMessage = "Selecciona el Excel .xlsx y el ZIP antes de validar.";
      return;
    }
    if (!this.isXlsxFile(this.selectedWorkbook) || !this.isZipFile(this.selectedArchive)) {
      this.errorMessage = "Verifica que el Excel sea .xlsx y el archivo de imágenes sea .zip.";
      return;
    }

    this.previewLoading = true;
    this.resetImportState();

    this.ecommerceAdminService.previewPrimaryImageBinaryImport(this.selectedWorkbook, this.selectedArchive).subscribe({
      next: (response) => {
        this.previewLoading = false;
        this.preview = response;
        this.syncSelectedPreviewRow();
      },
      error: (error: unknown) => {
        this.previewLoading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo generar el preview.");
      },
    });
  }

  async confirmImport(): Promise<void> {
    if (!this.preview || !this.selectedWorkbook || !this.selectedArchive || this.previewLoading || this.confirmLoading || this.confirmDialogOpen) {
      return;
    }
    if (!this.isXlsxFile(this.selectedWorkbook) || !this.isZipFile(this.selectedArchive)) {
      this.errorMessage = "Selecciona un Excel .xlsx y un ZIP válidos antes de confirmar.";
      return;
    }

    this.confirmDialogOpen = true;
    let confirmed = false;
    try {
      confirmed = await this.confirmDialogService.confirm({
        title: "Confirmar importación de imágenes por ZIP",
        description:
          `Se aplicarán ${this.importableRows} fila(s): ${this.preview.createRows} para crear y ${this.preview.updateRows} para actualizar. ` +
          `${this.preview.rejectedRows} fila(s) rechazadas no se aplicarán. ` +
          "El backend revalidará el Excel y el ZIP antes de subir imágenes.",
        highlightText: "Preview no aplicó cambios. Esta confirmación sí subirá imágenes y actualizará las filas válidas.",
        confirmText: "Confirmar importación",
        cancelText: "Cancelar",
        variant: "warning",
      });
    } finally {
      this.confirmDialogOpen = false;
    }

    if (!confirmed) {
      return;
    }

    this.confirmLoading = true;
    this.errorMessage = "";
    this.confirmResult = null;

    this.ecommerceAdminService.confirmPrimaryImageBinaryImportFile(this.selectedWorkbook, this.selectedArchive).subscribe({
      next: (response) => {
        this.confirmLoading = false;
        this.confirmResult = response;
      },
      error: (error: unknown) => {
        this.confirmLoading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo confirmar la importación.");
      },
    });
  }

  canConfirm(): boolean {
    return !!this.preview &&
      !!this.selectedWorkbook &&
      !!this.selectedArchive &&
      !this.confirmResult &&
      this.importableRows > 0 &&
      !this.confirmDialogOpen &&
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

  trackPreviewRow(_index: number, row: EcommercePrimaryImageBinaryImportPreviewRow): number {
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
        return "Listo para revisión";
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
    return value ? "Sí" : "No";
  }

  fileSummary(row: EcommercePrimaryImageBinaryImportPreviewRow): string {
    if (!row.mimeType && !row.sizeBytes && !row.width && !row.height) {
      return "-";
    }
    return `${row.mimeType || "archivo"} · ${this.dimensionsLabel(row)} · ${this.sizeLabel(row.sizeBytes)}`;
  }

  dimensionsLabel(row: EcommercePrimaryImageBinaryImportPreviewRow): string {
    return row.width && row.height ? `${row.width} x ${row.height}px` : "-";
  }

  sizeLabel(sizeBytes: number | null): string {
    if (!sizeBytes && sizeBytes !== 0) {
      return "-";
    }
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
  }

  resultLabel(row: EcommercePrimaryImageBinaryImportPreviewRow): string {
    const confirmRow = this.confirmRowFor(row);
    if (confirmRow) {
      if (confirmRow.applied) {
        return "Aplicada";
      }
      return confirmRow.errors.length > 0 ? "No aplicada" : "Sin cambios";
    }
    if (!row.valid) {
      return "Con errores";
    }
    if (row.warnings.length > 0) {
      return "Con advertencias";
    }
    return "Válida";
  }

  resultBadgeClass(row: EcommercePrimaryImageBinaryImportPreviewRow): Record<string, boolean> {
    const confirmRow = this.confirmRowFor(row);
    if (confirmRow) {
      return {
        "ui-badge--success": confirmRow.applied,
        "ui-badge--warning": !confirmRow.applied && confirmRow.errors.length === 0,
        "ui-badge--danger": confirmRow.errors.length > 0,
      };
    }
    return {
      "ui-badge--success": row.valid && row.warnings.length === 0,
      "ui-badge--warning": row.valid && row.warnings.length > 0,
      "ui-badge--danger": !row.valid,
    };
  }

  rowSummaryIssue(row: EcommercePrimaryImageBinaryImportPreviewRow): string {
    const confirmRow = this.confirmRowFor(row);
    if (confirmRow?.errors.length) {
      return this.translateIssue(confirmRow.errors[0]);
    }
    if (confirmRow?.warnings.length) {
      return this.translateWarning(confirmRow.warnings[0]);
    }
    if (row.errors.length > 0) {
      return this.translateIssue(row.errors[0]);
    }
    if (row.warnings.length > 0) {
      return this.translateWarning(row.warnings[0]);
    }
    return "";
  }

  translateIssue(issue: string): string {
    const labels: Record<string, string> = {
      "SKU is required": "El SKU es obligatorio.",
      "SKU is duplicated in file": "El SKU está duplicado en el Excel.",
      "SKU not found": "No existe un producto con este SKU.",
      "Product is inactive": "El producto está inactivo.",
      "Online profile not found": "El producto no tiene perfil online.",
      "imageFile is required": "imageFile es obligatorio.",
      "imageFile is duplicated in file": "imageFile está duplicado en el Excel.",
      "Image file not found in ZIP": "La imagen indicada no existe en el ZIP.",
      "Only JPEG, PNG and WebP product images are supported": "Solo se aceptan imágenes JPEG, PNG o WebP.",
      "Image extension does not match file content": "La extensión no coincide con el contenido real del archivo.",
      "altText is required": "El texto alternativo es obligatorio.",
      "altText max length is 180": "El texto alternativo supera el máximo de 180 caracteres.",
      "Published profile update requires explicit confirmation": "Actualizar un perfil publicado requiere publishedUpdateConfirmed=true.",
      "source is required": "La fuente es obligatoria.",
      "source is invalid": "La fuente no es válida.",
      "assetType must be PRODUCT_IMAGE": "El tipo de asset debe ser imagen de producto.",
      "rightsConfirmed must be true": "Debes confirmar derechos de uso de la imagen.",
      "displayOrder is invalid": "El orden de visualización no es válido.",
    };
    return labels[issue] || issue;
  }

  translateWarning(warning: string): string {
    const labels: Record<string, string> = {
      "Sobrescribira imagen principal existente.": "Se sobrescribirá la imagen principal existente.",
      "Perfil publicado cambiara imagen visible publicamente.": "El perfil publicado cambiará la imagen visible públicamente.",
      "Objeto previo en storage no se borra automaticamente en esta fase.": "El objeto previo en storage no se borra automáticamente en esta fase.",
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

  confirmRowFor(row: EcommercePrimaryImageBinaryImportPreviewRow): EcommercePrimaryImageBinaryImportConfirmRowResponse | null {
    if (!this.confirmResult) {
      return null;
    }
    return this.confirmResult.rows.find((confirmRow) => confirmRow.rowNumber === row.rowNumber) || null;
  }

  private resetImportState(): void {
    this.preview = null;
    this.confirmResult = null;
    this.confirmDialogOpen = false;
    this.errorMessage = "";
    this.previewPage = 1;
    this.previewFilter = "all";
    this.selectedPreviewRowNumber = null;
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

  private isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(".zip");
  }
}
