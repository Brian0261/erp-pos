import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

import {
  ProductImportConfirmResponse,
  ProductImportPreviewRow,
  ProductImportPreviewResponse,
} from "./data/catalog.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { ProductImportService } from "./data/product-import.service";

@Component({
  selector: "app-product-import-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card import-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo InkToy</p>
          <h1 class="ui-page-title">Importar productos</h1>
          <p class="ui-page-description">
            Carga un archivo Excel, revisa la vista previa y confirma solo las
            filas validas.
          </p>
        </div>

        <a
          routerLink="/catalogo/productos"
          class="ui-button ui-button--secondary"
          >Volver a productos</a
        >
      </header>

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
            {{ confirmLoading ? "Importando..." : "Confirmar importación" }}
          </button>
        </div>

        <p class="ui-muted selected-file" *ngIf="selectedFile">
          Archivo seleccionado: {{ selectedFile.name }}
        </p>
      </section>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="downloadingTemplate">
        Preparando plantilla...
      </p>

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
          <span class="summary-label">Total filas</span>
          <strong>{{ preview.totalRows }}</strong>
        </article>
        <article class="summary-card summary-card--success">
          <span class="summary-label">Filas validas</span>
          <strong>{{ preview.validRows }}</strong>
        </article>
        <article class="summary-card summary-card--danger">
          <span class="summary-label">Filas con error</span>
          <strong>{{ preview.invalidRows }}</strong>
        </article>
      </section>

      <section class="ui-card error-summary" *ngIf="preview && preview.invalidRows > 0">
        <div class="error-summary__head">
          <div>
            <h2 class="result-title">Resumen de errores</h2>
            <p class="ui-muted error-summary__hint">
              Puedes importar las filas válidas y corregir aparte las filas con error.
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
        </div>

        <div class="error-summary__grid">
          <article class="error-summary__card" *ngFor="let item of errorSummaryItems">
            <strong>{{ item.count }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>

        <section class="error-summary__group" *ngIf="duplicateBarcodeGroups.length > 0">
          <h3 class="error-summary__subtitle">Códigos de barra duplicados</h3>
          <ul class="error-summary__list">
            <li *ngFor="let group of visibleDuplicateBarcodeGroups">
              <strong>{{ group.barcode }}</strong>
              <span> - {{ group.rowCount }} filas: {{ group.rowNumbers.join(', ') }}</span>
            </li>
          </ul>
          <p class="ui-muted error-summary__more" *ngIf="duplicateBarcodeGroups.length > 10">
            y {{ duplicateBarcodeGroups.length - 10 }} más
          </p>
        </section>
      </section>

      <section class="ui-card result-card" *ngIf="confirmResult">
        <h2 class="result-title">Resultado de importación</h2>
        <div class="result-grid">
          <p><strong>Total procesadas:</strong> {{ confirmResult.totalRows }}</p>
          <p><strong>Creados:</strong> {{ confirmResult.createdRows }}</p>
          <p><strong>Rechazados:</strong> {{ confirmResult.rejectedRows }}</p>
        </div>
      </section>

      <section class="preview-toolbar" *ngIf="preview">
        <p class="ui-muted preview-counter preview-toolbar__counter">
          {{ previewCounterText }}
        </p>

        <div class="preview-filters" role="group" aria-label="Filtro de preview">
          <button
            type="button"
            class="ui-button ui-button--secondary filter-button"
            [class.filter-button--active]="previewFilter === 'all'"
            (click)="setPreviewFilter('all')"
          >
            Todas
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary filter-button"
            [class.filter-button--active]="previewFilter === 'valid'"
            (click)="setPreviewFilter('valid')"
          >
            Válidas
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary filter-button"
            [class.filter-button--active]="previewFilter === 'error'"
            (click)="setPreviewFilter('error')"
          >
            Con error
          </button>
        </div>

        <div class="preview-pagination" *ngIf="filteredPreviewRows.length > previewPageSize">
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="goToPreviousPreviewPage()"
            [disabled]="previewPage === 1 || previewLoading || confirmLoading"
          >
            Anterior
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="goToNextPreviewPage()"
            [disabled]="previewPage === totalPreviewPages || previewLoading || confirmLoading"
          >
            Siguiente
          </button>
        </div>

        <button
          *ngIf="preview.invalidRows > 0"
          type="button"
          class="ui-button ui-button--secondary"
          (click)="setPreviewFilter('error')"
        >
          Ver errores
        </button>
      </section>

      <section class="ui-table-wrapper" *ngIf="preview && visiblePreviewRows.length > 0; else emptyPreviewState">
        <table class="ui-table import-table">
          <thead>
            <tr>
              <th>Fila</th>
              <th>SKU</th>
              <th>Codigo de barras</th>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Unidad</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of visiblePreviewRows; trackBy: trackPreviewRow">
              <td>{{ row.rowNumber }}</td>
              <td class="cell-code">{{ row.sku || "-" }}</td>
              <td class="cell-code">{{ row.barcode || "Sin codigo" }}</td>
              <td>{{ row.name || "-" }}</td>
              <td>{{ row.category || "-" }}</td>
              <td>{{ row.unit || "-" }}</td>
              <td>{{ row.salePrice || "-" }}</td>
              <td>{{ translateActive(row.active) }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="row.valid"
                  [class.ui-badge--danger]="!row.valid"
                >
                  {{ row.valid ? "Válida" : "Con error" }}
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

      .import-panel {
        display: grid;
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-bg-soft);
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

      .file-picker span,
      .summary-label,
      .result-title {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .selected-file {
        margin: 0;
      }

      .summary-grid,
      .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--space-3);
      }

      .summary-card,
      .result-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
      }

      .summary-card {
        padding: var(--space-3);
        display: grid;
        gap: var(--space-1);
      }

      .summary-card strong {
        font-size: 1.35rem;
      }

      .preview-toolbar {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
        gap: var(--space-3);
        align-items: center;
      }

      .preview-toolbar__counter {
        min-width: 220px;
        white-space: nowrap;
      }

      .preview-filters {
        display: inline-flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-self: center;
      }

      .filter-button--active {
        background: var(--color-brand-primary);
        color: var(--color-text-inverse);
      }

      .preview-counter {
        margin: 0;
      }

      .preview-pagination {
        display: flex;
        gap: var(--space-2);
        justify-self: end;
      }

      .summary-card--success {
        border-color: color-mix(in srgb, var(--color-success-text) 30%, transparent);
      }

      .summary-card--danger {
        border-color: color-mix(in srgb, var(--color-danger-text) 30%, transparent);
      }

      .ui-alert--warning {
        border-color: color-mix(in srgb, var(--color-warning-text) 36%, transparent);
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
      }

      .result-card {
        padding: var(--space-3);
        display: grid;
        gap: var(--space-2);
      }

      .result-title {
        margin: 0;
      }

      .result-grid p {
        margin: 0;
      }

      .error-summary {
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .error-summary__head {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        align-items: start;
        flex-wrap: wrap;
      }

      .error-summary__hint {
        margin: 0;
      }

      .error-summary__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--space-2);
      }

      .error-summary__card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-2) var(--space-3);
        display: grid;
        gap: 0.15rem;
        background: var(--color-bg-soft);
      }

      .error-summary__card strong {
        font-size: 1rem;
      }

      .error-summary__subtitle {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      .error-summary__group {
        display: grid;
        gap: var(--space-2);
      }

      .error-summary__list {
        margin: 0;
        padding-left: 1rem;
        display: grid;
        gap: 0.3rem;
      }

      .error-summary__more {
        margin: 0;
      }

      .empty-preview {
        padding: var(--space-4);
      }

      .import-table {
        min-width: 1180px;
      }

      .cell-code {
        white-space: nowrap;
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
        .preview-toolbar {
          grid-template-columns: 1fr;
          justify-items: start;
        }

        .preview-toolbar__counter {
          min-width: 0;
          white-space: normal;
        }

        .preview-filters,
        .preview-pagination {
          justify-self: start;
        }

        .import-page {
          padding: var(--space-4);
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
export class ProductImportPageComponent {
  readonly previewPageSize = 50;

  selectedFile: File | null = null;
  preview: ProductImportPreviewResponse | null = null;
  confirmResult: ProductImportConfirmResponse | null = null;
  downloadingTemplate = false;
  previewLoading = false;
  confirmLoading = false;
  previewPage = 1;
  previewFilter: "all" | "valid" | "error" = "all";
  downloadingErrorCsv = false;
  errorMessage = "";
  successMessage = "";

  get filteredPreviewRows(): ProductImportPreviewRow[] {
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

    if (totalRows === 0) {
      return 1;
    }

    return Math.ceil(totalRows / this.previewPageSize);
  }

  get previewRangeStart(): number {
    if (this.filteredPreviewRows.length === 0) {
      return 0;
    }

    return (this.previewPage - 1) * this.previewPageSize + 1;
  }

  get previewRangeEnd(): number {
    const totalRows = this.filteredPreviewRows.length;

    if (totalRows === 0) {
      return 0;
    }

    return Math.min(this.previewPage * this.previewPageSize, totalRows);
  }

  get visiblePreviewRows(): ProductImportPreviewRow[] {
    if (!this.preview) {
      return [];
    }

    const start = (this.previewPage - 1) * this.previewPageSize;
    return this.filteredPreviewRows.slice(start, start + this.previewPageSize);
  }

  get previewFilterLabel(): string {
    switch (this.previewFilter) {
      case "valid":
        return "filas válidas";
      case "error":
        return "filas con error";
      default:
        return "filas";
    }
  }

  get previewCounterText(): string {
    const totalRows = this.filteredPreviewRows.length;
    if (totalRows === 0) {
      return `Mostrando 0 de 0 ${this.previewFilterLabel}`;
    }

    return `Mostrando ${this.previewRangeStart}-${this.previewRangeEnd} de ${totalRows} ${this.previewFilterLabel}`;
  }

  get previewEmptyMessage(): string {
    switch (this.previewFilter) {
      case "valid":
        return "No hay filas válidas para mostrar.";
      case "error":
        return "No hay filas con error para mostrar.";
      default:
        return "No hay filas para mostrar.";
    }
  }

  get errorSummaryItems(): Array<{ label: string; count: number }> {
    if (!this.preview) {
      return [];
    }

    const counts = new Map<string, number>();
    for (const row of this.preview.rows) {
      for (const error of row.errors) {
        const label = this.translateError(error);
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    }

    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }

  get duplicateBarcodeGroups(): Array<{ barcode: string; rowCount: number; rowNumbers: number[] }> {
    if (!this.preview) {
      return [];
    }

    const groups = new Map<string, number[]>();
    for (const row of this.preview.rows) {
      if (row.valid || !row.barcode) {
        continue;
      }

      if (!row.errors.some((error) => error.trim() === "Barcode is duplicated in file")) {
        continue;
      }

      const key = row.barcode.trim();
      const existing = groups.get(key) || [];
      existing.push(row.rowNumber);
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .map(([barcode, rowNumbers]) => ({ barcode, rowCount: rowNumbers.length, rowNumbers }))
      .sort((left, right) => left.barcode.localeCompare(right.barcode));
  }

  get visibleDuplicateBarcodeGroups(): Array<{ barcode: string; rowCount: number; rowNumbers: number[] }> {
    return this.duplicateBarcodeGroups.slice(0, 10);
  }

  get previewBannerKind(): "success" | "warning" | "error" | null {
    if (!this.preview) {
      return null;
    }

    if (this.preview.validRows > 0 && this.preview.invalidRows === 0) {
      return "success";
    }

    if (this.preview.validRows > 0 && this.preview.invalidRows > 0) {
      return "warning";
    }

    if (this.preview.validRows === 0 && this.preview.invalidRows > 0) {
      return "error";
    }

    return null;
  }

  get previewBannerMessage(): string {
    if (!this.preview) {
      return "";
    }

    if (this.preview.validRows > 0 && this.preview.invalidRows === 0) {
      return "Validación terminada. Todas las filas están listas para importar.";
    }

    if (this.preview.validRows > 0 && this.preview.invalidRows > 0) {
      return "Validación completada con observaciones. Puedes importar las filas válidas o corregir el archivo.";
    }

    if (this.preview.validRows === 0 && this.preview.invalidRows > 0) {
      return "No hay filas válidas para importar. Revisa los errores del archivo.";
    }

    return "";
  }

  constructor(private readonly productImportService: ProductImportService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";
    this.previewPage = 1;

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

  setPreviewFilter(filter: "all" | "valid" | "error"): void {
    this.previewFilter = filter;
    this.previewPage = 1;
  }

  downloadTemplate(): void {
    this.downloadingTemplate = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.productImportService.downloadTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate = false;
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "products-import-template.xlsx";
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.downloadingTemplate = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo descargar la plantilla.",
        );
      },
    });
  }

  downloadErrorRowsCsv(): void {
    if (!this.preview || this.preview.invalidRows === 0 || this.downloadingErrorCsv) {
      return;
    }

    this.downloadingErrorCsv = true;
    try {
      const rows = this.preview.rows.filter((row) => !row.valid);
      const headers = ["rowNumber", "sku", "barcode", "name", "category", "unit", "salePrice", "active", "errors"];
      const csvLines = [headers.join(",")];

      for (const row of rows) {
        csvLines.push([
          row.rowNumber,
          this.csvValue(row.sku),
          this.csvValue(row.barcode),
          this.csvValue(row.name),
          this.csvValue(row.category),
          this.csvValue(row.unit),
          this.csvValue(row.salePrice),
          this.csvValue(row.active),
          this.csvValue(row.errors.map((error) => this.translateError(error)).join("; ")),
        ].join(","));
      }

      const blob = new Blob(["\ufeff" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "productos_importacion_errores.csv";
      anchor.click();
      window.URL.revokeObjectURL(url);
    } finally {
      this.downloadingErrorCsv = false;
    }
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

    this.productImportService.preview(this.selectedFile).subscribe({
      next: (response) => {
        this.previewLoading = false;
        this.preview = response;
        this.previewPage = 1;
        this.previewFilter = "all";
        this.successMessage = "";
      },
      error: (error: unknown) => {
        this.previewLoading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo validar el archivo.",
        );
      },
    });
  }

  confirmImport(): void {
    if (!this.preview || !this.selectedFile || this.previewLoading || this.confirmLoading) {
      if (!this.selectedFile) {
        this.errorMessage = "Selecciona un archivo .xlsx antes de confirmar la importación.";
      }
      return;
    }

    if (!this.isXlsxFile(this.selectedFile)) {
      this.errorMessage = "Selecciona un archivo .xlsx válido antes de confirmar.";
      return;
    }

    if (this.preview.validRows === 0) {
      return;
    }

    this.confirmLoading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.confirmResult = null;

    this.productImportService.confirmFile(this.selectedFile).subscribe({
      next: (response) => {
        this.confirmLoading = false;
        this.confirmResult = response;
        this.successMessage = `Importación finalizada. ${response.createdRows} producto(s) creado(s).`;
      },
      error: (error: unknown) => {
        this.confirmLoading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo confirmar la importación.",
        );
      },
    });
  }

  canConfirm(): boolean {
    return !!this.preview && !!this.selectedFile && this.preview.validRows > 0 && !this.confirmLoading && !this.previewLoading;
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

  trackPreviewRow(_: number, row: ProductImportPreviewRow): number {
    return row.rowNumber;
  }

  translateError(message: string): string {
    const normalized = message.trim();

    const translations: Record<string, string> = {
      "SKU is required": "El SKU es obligatorio.",
      "SKU is duplicated in file": "El SKU está duplicado en el archivo.",
      "SKU already exists": "El SKU ya existe.",
      "Barcode is duplicated in file": "El código de barras está duplicado en el archivo.",
      "Barcode already exists": "El código de barras ya existe.",
      "Category not found": "La categoría no existe.",
      "Category is inactive": "La categoría está inactiva.",
      "Unit not found": "La unidad no existe.",
      "Unit is inactive": "La unidad está inactiva.",
      "salePrice must be >= 0": "El precio de venta debe ser mayor o igual a 0.",
      "salePrice is invalid": "El precio de venta no es válido.",
      "salePrice is required": "El precio de venta es obligatorio.",
      "Name is required": "El nombre es obligatorio.",
      "active is invalid": "El estado no es válido.",
    };

    return translations[normalized] || message;
  }

  translateActive(value: string | null): string {
    if (value === null || value.trim() === "") {
      return "Activo";
    }

    return value.trim().toLowerCase() === "false" ? "Inactivo" : "Activo";
  }

  private isXlsxFile(file: File): boolean {
    return file.name.trim().toLowerCase().endsWith(".xlsx");
  }

  private csvValue(value: string | null): string {
    const text = value ?? "";
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
