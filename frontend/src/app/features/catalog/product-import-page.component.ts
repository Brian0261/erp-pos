import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

import {
  ProductImportConfirmRequest,
  ProductImportConfirmResponse,
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

      <section class="ui-card result-card" *ngIf="confirmResult">
        <h2 class="result-title">Resultado de importación</h2>
        <div class="result-grid">
          <p><strong>Creados:</strong> {{ confirmResult.createdRows }}</p>
          <p><strong>Rechazados:</strong> {{ confirmResult.rejectedRows }}</p>
        </div>
      </section>

      <section class="ui-table-wrapper" *ngIf="preview">
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
            <tr *ngFor="let row of preview.rows">
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
  selectedFile: File | null = null;
  preview: ProductImportPreviewResponse | null = null;
  confirmResult: ProductImportConfirmResponse | null = null;
  downloadingTemplate = false;
  previewLoading = false;
  confirmLoading = false;
  errorMessage = "";
  successMessage = "";

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
    this.selectedFile = input.files?.item(0) || null;
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";
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

  validateFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = "Selecciona un archivo .xlsx para validar.";
      return;
    }

    this.previewLoading = true;
    this.preview = null;
    this.confirmResult = null;
    this.errorMessage = "";
    this.successMessage = "";

    this.productImportService.preview(this.selectedFile).subscribe({
      next: (response) => {
        this.previewLoading = false;
        this.preview = response;
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
    if (!this.preview) {
      return;
    }

    const payload: ProductImportConfirmRequest = {
      rows: this.preview.rows
        .filter((row) => row.valid)
        .map((row) => ({
          rowNumber: row.rowNumber,
          sku: row.sku,
          barcode: row.barcode,
          name: row.name,
          description: row.description,
          category: row.category,
          unit: row.unit,
          salePrice: row.salePrice,
          active: row.active,
        })),
    };

    if (payload.rows.length === 0) {
      return;
    }

    this.confirmLoading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.confirmResult = null;

    this.productImportService.confirm(payload).subscribe({
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
    return !!this.preview && this.preview.validRows > 0 && !this.confirmLoading && !this.previewLoading;
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
}
