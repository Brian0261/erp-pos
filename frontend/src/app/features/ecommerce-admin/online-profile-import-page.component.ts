import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { RouterLink } from "@angular/router";

import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  EcommerceOnlineProfileImportConfirmResponse,
  EcommerceOnlineProfileImportPreviewResponse,
  EcommerceOnlineProfileImportPreviewRow,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-online-profile-import-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card import-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo online</p>
          <h1 class="ui-page-title">Importar perfiles online</h1>
          <p class="ui-page-description">
            Importa contenido ecommerce por SKU, revisa el preview y confirma solo las filas validas.
          </p>
        </div>

        <a routerLink="/ecommerce-admin/perfiles" class="ui-button ui-button--secondary">
          Volver a perfiles
        </a>
      </header>

      <section class="safety-panel">
        <p>Esta importacion no crea productos ERP.</p>
        <p>Solo trabaja con SKU existentes y no modifica stock, inventario, unidad, costo ni precio ERP.</p>
        <p>Los perfiles se crean o actualizan como borrador/no publicados. Los publicados estan protegidos.</p>
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
              [disabled]="previewLoading || confirmLoading"
            />
          </label>

          <button
            type="button"
            class="ui-button ui-button--primary"
            (click)="validateFile()"
            [disabled]="!selectedFile || previewLoading || confirmLoading"
          >
            {{ previewLoading ? "Validando..." : "Validar archivo" }}
          </button>

          <button
            type="button"
            class="ui-button ui-button--primary"
            (click)="confirmImport()"
            [disabled]="!canConfirm()"
          >
            {{ confirmLoading ? "Importando..." : "Confirmar importacion" }}
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
            [disabled]="previewLoading || confirmLoading"
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
        *ngIf="preview && previewBannerMessage"
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
          <span>Crear</span>
          <strong>{{ preview.createRows }}</strong>
        </article>
        <article class="summary-card summary-card--warning">
          <span>Actualizar</span>
          <strong>{{ preview.updateRows }}</strong>
        </article>
        <article class="summary-card">
          <span>Sin cambios</span>
          <strong>{{ preview.unchangedRows }}</strong>
        </article>
        <article class="summary-card summary-card--danger">
          <span>Rechazadas</span>
          <strong>{{ preview.rejectedRows }}</strong>
        </article>
      </section>

      <section class="ui-card error-summary" *ngIf="preview && preview.rejectedRows > 0">
        <div>
          <h2>Filas rechazadas</h2>
          <p class="ui-muted">
            Corrige estas filas en el Excel o confirma solo las filas validas restantes.
          </p>
        </div>
        <button
          type="button"
          class="ui-button ui-button--secondary"
          (click)="downloadErrorRowsCsv()"
          [disabled]="downloadingErrorCsv"
        >
          {{ downloadingErrorCsv ? "Preparando CSV..." : "Descargar filas con error" }}
        </button>
      </section>

      <section class="ui-card result-card" *ngIf="confirmResult">
        <h2>Resultado de importacion</h2>
        <div class="result-grid">
          <p><strong>Total:</strong> {{ confirmResult.totalRows }}</p>
          <p><strong>Creados:</strong> {{ confirmResult.createdRows }}</p>
          <p><strong>Actualizados:</strong> {{ confirmResult.updatedRows }}</p>
          <p><strong>Sin cambios:</strong> {{ confirmResult.unchangedRows }}</p>
          <p><strong>Rechazados:</strong> {{ confirmResult.rejectedRows }}</p>
        </div>
      </section>

      <section class="preview-toolbar" *ngIf="preview">
        <p class="ui-muted preview-counter">{{ previewCounterText }}</p>

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

      <section class="ui-table-wrapper" *ngIf="preview && visiblePreviewRows.length > 0; else emptyPreviewState">
        <table class="ui-table import-table">
          <colgroup>
            <col class="col-row" />
            <col class="col-sku" />
            <col class="col-product" />
            <col class="col-action" />
            <col class="col-online-name" />
            <col class="col-slug" />
            <col class="col-category" />
            <col class="col-brand" />
            <col class="col-generated" />
            <col class="col-result" />
          </colgroup>
          <thead>
            <tr>
              <th>Fila</th>
              <th>SKU</th>
              <th>Producto ERP</th>
              <th>Accion</th>
              <th>Nombre online</th>
              <th>Slug</th>
              <th>Categoria online</th>
              <th>Marca / politica</th>
              <th>Autogenerado</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of visiblePreviewRows; trackBy: trackPreviewRow">
              <td class="cell-compact">{{ row.rowNumber }}</td>
              <td class="cell-code cell-truncate" [attr.title]="row.sku || '-'">{{ row.sku || "-" }}</td>
              <td class="cell-truncate" [attr.title]="row.productName || '-'">{{ row.productName || "-" }}</td>
              <td>
                <span class="ui-badge" [ngClass]="actionBadgeClass(row.action)">{{ actionLabel(row.action) }}</span>
              </td>
              <td class="cell-truncate" [attr.title]="row.onlineName || '-'">{{ row.onlineName || "-" }}</td>
              <td class="cell-code cell-truncate" [attr.title]="row.slug || '-'">{{ row.slug || "-" }}</td>
              <td class="cell-code cell-truncate" [attr.title]="row.onlineCategorySlug || 'Sin categoria'">{{ row.onlineCategorySlug || "Sin categoria" }}</td>
              <td class="cell-code cell-truncate" [attr.title]="brandSummary(row)">{{ brandSummary(row) }}</td>
              <td class="cell-truncate" [attr.title]="generatedFieldsLabel(row.generatedFields)">{{ generatedFieldsLabel(row.generatedFields) }}</td>
              <td class="cell-result">
                <span class="ui-badge" [class.ui-badge--success]="row.valid" [class.ui-badge--danger]="!row.valid">
                  {{ row.valid ? "Valida" : "Con error" }}
                </span>
                <ul class="row-errors" *ngIf="row.errors.length > 0">
                  <li *ngFor="let error of row.errors">{{ translateError(error) }}</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <ng-template #emptyPreviewState>
        <section class="ui-card empty-preview" *ngIf="preview">
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
      .result-grid p,
      .error-summary p {
        margin: 0;
      }

      .import-actions {
        display: flex;
        gap: var(--space-3);
        align-items: end;
        flex-wrap: wrap;
      }

      .file-picker {
        display: grid;
        gap: var(--space-1);
        min-width: 260px;
      }

      .selected-file {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .selected-file__name {
        min-width: 0;
      }

      .selected-file__name span {
        display: inline-block;
        max-width: min(620px, 72vw);
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
        white-space: nowrap;
      }

      .selected-file__clear {
        flex: 0 0 auto;
      }

      .file-picker span,
      .summary-card span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .summary-grid,
      .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: var(--space-3);
      }

      .summary-card,
      .result-card,
      .error-summary {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
      }

      .summary-card,
      .result-card,
      .error-summary,
      .empty-preview {
        padding: var(--space-3);
      }

      .summary-card {
        display: grid;
        gap: var(--space-1);
      }

      .summary-card strong {
        font-size: 1.35rem;
      }

      .summary-card--success {
        border-color: color-mix(in srgb, var(--color-success-text) 30%, transparent);
      }

      .summary-card--warning,
      .ui-alert--warning {
        border-color: color-mix(in srgb, var(--color-warning-text) 36%, transparent);
      }

      .summary-card--danger {
        border-color: color-mix(in srgb, var(--color-danger-text) 30%, transparent);
      }

      .ui-alert--warning {
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
      }

      .error-summary {
        display: flex;
        gap: var(--space-3);
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }

      .error-summary h2,
      .result-card h2 {
        margin: 0;
        font-size: 1rem;
      }

      .preview-toolbar {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
        gap: var(--space-3);
        align-items: center;
      }

      .preview-filters,
      .preview-pagination {
        display: inline-flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .preview-filters {
        justify-self: center;
      }

      .preview-pagination {
        justify-self: end;
      }

      .filter-button--active {
        background: var(--color-brand-primary);
        color: var(--color-text-inverse);
      }

      .import-table {
        min-width: 1360px;
        table-layout: fixed;
      }

      .col-row { width: 56px; }
      .col-sku { width: 150px; }
      .col-product { width: 220px; }
      .col-action { width: 104px; }
      .col-online-name { width: 220px; }
      .col-slug { width: 220px; }
      .col-category { width: 180px; }
      .col-brand { width: 132px; }
      .col-generated { width: 124px; }
      .col-result { width: 150px; }

      .cell-code {
        white-space: nowrap;
      }

      .cell-compact {
        text-align: right;
        white-space: nowrap;
      }

      .cell-truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cell-result {
        vertical-align: top;
      }

      .row-errors {
        margin: var(--space-2) 0 0;
        padding-left: 1rem;
        color: var(--color-danger);
        display: grid;
        gap: 0.2rem;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 980px) {
        .import-page {
          padding: var(--space-4);
        }

        .preview-toolbar {
          grid-template-columns: 1fr;
          justify-items: start;
        }

        .preview-filters,
        .preview-pagination {
          justify-self: start;
        }

        .import-actions {
          align-items: stretch;
        }

        .file-picker {
          min-width: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class OnlineProfileImportPageComponent {
  @ViewChild("fileInput") private fileInput?: ElementRef<HTMLInputElement>;

  readonly previewPageSize = 50;

  selectedFile: File | null = null;
  preview: EcommerceOnlineProfileImportPreviewResponse | null = null;
  confirmResult: EcommerceOnlineProfileImportConfirmResponse | null = null;
  downloadingTemplate = false;
  previewLoading = false;
  confirmLoading = false;
  downloadingErrorCsv = false;
  previewPage = 1;
  previewFilter: "all" | "valid" | "error" = "all";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly ecommerceAdminService: EcommerceAdminService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  get filteredPreviewRows(): EcommerceOnlineProfileImportPreviewRow[] {
    if (!this.preview) {
      return [];
    }
    switch (this.previewFilter) {
      case "valid":
        return this.preview.rows.filter((row) => row.valid);
      case "error":
        return this.preview.rows.filter((row) => !row.valid);
      default:
        return this.preview.rows;
    }
  }

  get totalPreviewPages(): number {
    const totalRows = this.filteredPreviewRows.length;
    return totalRows === 0 ? 1 : Math.ceil(totalRows / this.previewPageSize);
  }

  get visiblePreviewRows(): EcommerceOnlineProfileImportPreviewRow[] {
    const start = (this.previewPage - 1) * this.previewPageSize;
    return this.filteredPreviewRows.slice(start, start + this.previewPageSize);
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
        return "filas validas";
      case "error":
        return "filas con error";
      default:
        return "filas";
    }
  }

  get previewEmptyMessage(): string {
    switch (this.previewFilter) {
      case "valid":
        return "No hay filas validas para mostrar.";
      case "error":
        return "No hay filas con error para mostrar.";
      default:
        return "No hay filas para mostrar.";
    }
  }

  get previewBannerKind(): "success" | "warning" | "error" | null {
    if (!this.preview) {
      return null;
    }
    if (this.preview.rejectedRows === 0 && this.preview.createRows + this.preview.updateRows > 0) {
      return "success";
    }
    if (this.preview.rejectedRows > 0 && this.preview.createRows + this.preview.updateRows > 0) {
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
    if (this.preview.rejectedRows === 0 && this.preview.createRows + this.preview.updateRows > 0) {
      return "Validacion terminada. Las filas estan listas para confirmar.";
    }
    if (this.preview.rejectedRows > 0 && this.preview.createRows + this.preview.updateRows > 0) {
      return "Validacion completada con observaciones. Se confirmaran solo las filas validas.";
    }
    if (this.preview.rejectedRows > 0) {
      return "No hay filas aplicables. Corrige el archivo antes de confirmar.";
    }
    return "Validacion terminada. No hay cambios para aplicar.";
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";
    this.previewPage = 1;
    this.previewFilter = "all";

    const file = input.files?.item(0) || null;
    if (!file) {
      this.selectedFile = null;
      return;
    }
    if (!this.isXlsxFile(file)) {
      this.selectedFile = null;
      input.value = "";
      this.errorMessage = "Selecciona un archivo .xlsx valido.";
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

  setPreviewFilter(filter: "all" | "valid" | "error"): void {
    this.previewFilter = filter;
    this.previewPage = 1;
  }

  downloadTemplate(): void {
    this.downloadingTemplate = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.ecommerceAdminService.downloadOnlineProfilesImportTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate = false;
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "ecommerce-online-profiles-import-template.xlsx";
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
      this.errorMessage = "Selecciona un archivo .xlsx valido.";
      return;
    }

    this.previewLoading = true;
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";
    this.previewPage = 1;
    this.previewFilter = "all";

    this.ecommerceAdminService.previewOnlineProfilesImport(this.selectedFile).subscribe({
      next: (response) => {
        this.previewLoading = false;
        this.preview = response;
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
      this.errorMessage = "Selecciona un archivo .xlsx valido antes de confirmar.";
      return;
    }

    const importableRows = this.preview.createRows + this.preview.updateRows;
    const confirmed = await this.confirmDialogService.confirm({
      title: "Confirmar importacion de perfiles online",
      description:
        `Se importaran ${importableRows} fila(s) validas: ${this.preview.createRows} para crear y ${this.preview.updateRows} para actualizar. ` +
        `${this.preview.rejectedRows} fila(s) rechazadas no se importaran. No se crean productos ERP ni se modifica stock, inventario, unidad, costo o precio ERP.`,
      highlightText: "Verifica el preview antes de continuar.",
      confirmText: "Confirmar importacion",
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

    this.ecommerceAdminService.confirmOnlineProfilesImportFile(this.selectedFile).subscribe({
      next: (response) => {
        this.confirmLoading = false;
        this.confirmResult = response;
        this.successMessage = `Importacion finalizada. ${response.createdRows} creado(s), ${response.updatedRows} actualizado(s).`;
      },
      error: (error: unknown) => {
        this.confirmLoading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo confirmar la importacion.");
      },
    });
  }

  canConfirm(): boolean {
    return !!this.preview &&
      !!this.selectedFile &&
      this.preview.createRows + this.preview.updateRows > 0 &&
      !this.confirmLoading &&
      !this.previewLoading;
  }

  downloadErrorRowsCsv(): void {
    if (!this.preview || this.preview.rejectedRows === 0 || this.downloadingErrorCsv) {
      return;
    }
    this.downloadingErrorCsv = true;
    try {
      const rows = this.preview.rows.filter((row) => !row.valid);
      const headers = ["rowNumber", "sku", "productName", "onlineName", "slug", "onlineCategorySlug", "brandSlug", "brandAbsencePolicy", "errors"];
      const csvLines = [headers.join(",")];
      for (const row of rows) {
        csvLines.push([
          row.rowNumber,
          this.csvValue(row.sku),
          this.csvValue(row.productName),
          this.csvValue(row.onlineName),
          this.csvValue(row.slug),
          this.csvValue(row.onlineCategorySlug),
          this.csvValue(row.brandSlug),
          this.csvValue(row.brandAbsencePolicy),
          this.csvValue(row.errors.map((error) => this.translateError(error)).join("; ")),
        ].join(","));
      }
      const blob = new Blob(["\ufeff" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "perfiles_online_importacion_errores.csv";
      anchor.click();
      window.URL.revokeObjectURL(url);
    } finally {
      this.downloadingErrorCsv = false;
    }
  }

  goToPreviousPreviewPage(): void {
    if (this.previewPage > 1) {
      this.previewPage -= 1;
    }
  }

  goToNextPreviewPage(): void {
    if (this.previewPage < this.totalPreviewPages) {
      this.previewPage += 1;
    }
  }

  trackPreviewRow(_: number, row: EcommerceOnlineProfileImportPreviewRow): number {
    return row.rowNumber;
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATE: "Crear",
      UPDATE: "Actualizar",
      NO_CHANGE: "Sin cambios",
      REJECT: "Rechazar",
    };
    return labels[action] || action;
  }

  actionBadgeClass(action: string): string {
    switch (action) {
      case "CREATE":
        return "ui-badge--success";
      case "UPDATE":
        return "ui-badge--warning";
      case "REJECT":
        return "ui-badge--danger";
      default:
        return "";
    }
  }

  brandSummary(row: EcommerceOnlineProfileImportPreviewRow): string {
    if (row.brandSlug) {
      return row.brandSlug;
    }
    if (row.brandAbsencePolicy) {
      return row.brandAbsencePolicy;
    }
    return "Sin marca";
  }

  generatedFieldsLabel(fields: string[]): string {
    if (fields.length === 0) {
      return "-";
    }
    const labels: Record<string, string> = {
      ONLINE_NAME: "Nombre",
      SLUG: "Slug",
      SLUG_COLLISION_SUFFIX: "Slug con SKU",
    };
    return fields.map((field) => labels[field] || field).join(", ");
  }

  translateError(message: string): string {
    const translations: Record<string, string> = {
      "SKU is required": "El SKU es obligatorio.",
      "SKU is duplicated in file": "El SKU esta duplicado en el archivo.",
      "SKU not found": "El SKU no existe en productos ERP.",
      "Published profile cannot be changed by bulk import": "El perfil publicado esta protegido en esta version.",
      "onlineName max length is 180": "El nombre online supera 180 caracteres.",
      "onlineDescription max length is 2000": "La descripcion online supera 2000 caracteres.",
      "Slug is required": "El slug es obligatorio o no pudo generarse.",
      "Slug already exists": "El slug ya existe en otro perfil.",
      "Slug is duplicated in file": "El slug esta duplicado en el archivo.",
      "Generated slug already exists": "El slug generado ya existe.",
      "Slug contains prohibited test/demo term": "El slug contiene terminos test/demo no permitidos.",
      "Online category slug not found": "La categoria online no existe.",
      "Online category is inactive": "La categoria online esta inactiva.",
      "Brand slug not found": "La marca no existe.",
      "Brand is inactive": "La marca esta inactiva.",
      "brandSlug and brandAbsencePolicy cannot be combined": "No combines marca y politica de ausencia.",
      "brandAbsencePolicy is invalid": "La politica de ausencia de marca no es valida.",
      "Product is inactive": "El producto ERP esta inactivo.",
    };
    return translations[message.trim()] || message;
  }

  private isXlsxFile(file: File): boolean {
    return file.name.trim().toLowerCase().endsWith(".xlsx");
  }

  private resetImportState(): void {
    this.preview = null;
    this.confirmResult = null;
    this.previewPage = 1;
    this.previewFilter = "all";
    this.errorMessage = "";
    this.successMessage = "";
    this.downloadingErrorCsv = false;
  }

  private csvValue(value: string | number | null): string {
    const text = value === null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }
}
