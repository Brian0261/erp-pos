import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { toHttpErrorMessage } from "./data/http-error-message";
import {
  ProductCleanupExecuteResponse,
  ProductCleanupInventoryMovementPreview,
  ProductCleanupPreviewRequest,
  ProductCleanupPreviewResponse,
  ProductCleanupSalePreview,
} from "./data/product-cleanup.models";
import { ProductCleanupService } from "./data/product-cleanup.service";

@Component({
  selector: "app-product-cleanup-preview-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card cleanup-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Administracion InkToy</p>
          <h1 class="ui-page-title">Limpieza de datos de prueba</h1>
          <p class="ui-page-description">
            Analiza productos de prueba antes de ejecutar cualquier eliminacion.
            Esta pantalla no borra datos hasta que confirmes una purga de forma explicita.
          </p>
        </div>

        <a routerLink="/dashboard" class="ui-button ui-button--secondary"
          >Volver al dashboard</a
        >
      </header>

      <form class="criteria-card" [formGroup]="form" (ngSubmit)="analyzeImpact()">
        <div class="criteria-grid criteria-grid--single">
          <label class="criteria-field">
            <span>Productos a analizar</span>
            <textarea
              rows="4"
              formControlName="productQuery"
              placeholder="Ejemplo: SKU-001, SKU-002, 15, 28"
              (input)="onCriteriaChange()"
            ></textarea>
          </label>
        </div>

        <div class="criteria-actions">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="loading || executing"
          >
            {{ loading ? "Analizando..." : "Analizar impacto" }}
          </button>

          <button
            type="button"
            class="ui-button ui-button--danger"
            (click)="openExecuteDialog()"
            [disabled]="!canExecute()"
          >
            {{ executing ? "Ejecutando..." : "Ejecutar purga" }}
          </button>
        </div>

        <p class="ui-muted criteria-help">
          Ingresa SKUs o IDs separados por coma, espacio o salto de linea.
          Recomendado: usa SKUs; el ID interno es opcional.
        </p>
        <p class="ui-alert ui-alert--warning criteria-warning" *ngIf="preview?.purgeable">
          Esta accion elimina datos de prueba de forma permanente y requiere confirmacion explicita.
        </p>
        <p class="ui-alert ui-alert--warning criteria-warning" *ngIf="previewStale">
          Los criterios cambiaron despues del ultimo analisis. Vuelve a analizar antes de ejecutar.
        </p>
      </form>

      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Consultando impacto en ventas, stock, compras y documentos relacionados...
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="executing">
        Ejecutando purga segura. No cierres esta pantalla hasta recibir respuesta del servidor...
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">{{ successMessage }}</p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">{{ errorMessage }}</p>

      <section class="ui-card execution-result-card" *ngIf="executionResult as result">
        <div class="detail-head">
          <div>
            <h2>Resultado de la purga</h2>
            <p class="ui-muted">
              El backend confirmo la eliminacion transaccional de los datos de prueba seleccionados.
            </p>
          </div>
          <span class="ui-badge ui-badge--success">Purga completada</span>
        </div>

        <section class="summary-grid">
          <article class="summary-card summary-card--success" *ngFor="let item of executeSummaryCards(result)">
            <span class="summary-label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </section>
      </section>

      <section class="ui-card outcome-card" *ngIf="preview as result">
        <section
          class="decision-card"
          [class.decision-card--success]="result.purgeable"
          [class.decision-card--danger]="!result.purgeable"
        >
          <div class="decision-card__head">
            <div>
              <p class="decision-card__eyebrow">Decision del preview</p>
              <h2>
                {{
                  result.purgeable
                    ? "Este conjunto parece purgable"
                    : "No se puede purgar"
                }}
              </h2>
            </div>

            <span
              class="ui-badge decision-card__badge"
              [class.ui-badge--success]="result.purgeable"
              [class.ui-badge--danger]="!result.purgeable"
            >
              Puede purgarse: {{ result.purgeable ? "Sí" : "No" }}
            </span>
          </div>

          <p class="decision-card__text">
            {{
              result.purgeable
                ? "El preview no encontro bloqueos, pero la ejecucion destructiva aun no esta habilitada hasta que confirmes la purga."
                : "Este conjunto tiene bloqueos o riesgos que impiden una eliminacion segura."
            }}
          </p>

          <div class="decision-card__reasons">
            <span class="decision-pill" *ngFor="let reason of decisionReasons(result)">
              {{ reason }}
            </span>
          </div>
        </section>

        <section class="summary-grid">
          <article
            class="summary-card"
            *ngFor="let item of summaryCards(result)"
            [class.summary-card--success]="item.tone === 'success'"
            [class.summary-card--warning]="item.tone === 'warning'"
            [class.summary-card--danger]="item.tone === 'danger'"
          >
            <span class="summary-label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <span class="summary-note" *ngIf="item.note">{{ item.note }}</span>
          </article>
        </section>

        <section class="message-grid" *ngIf="result.blockers.length > 0">
          <article class="message-card message-card--danger message-card--full">
            <h2>Bloqueos</h2>
            <ul>
              <li *ngFor="let blocker of result.blockers">
                {{ translateRiskMessage(blocker) }}
              </li>
            </ul>
          </article>
        </section>

        <section class="message-grid" *ngIf="result.warnings.length > 0">
          <article class="message-card message-card--warning message-card--full">
            <h2>Advertencias</h2>
            <ul>
              <li *ngFor="let warning of result.warnings">
                {{ translateRiskMessage(warning) }}
              </li>
            </ul>
          </article>
        </section>

        <section class="detail-grid">
          <article class="detail-card">
            <div class="detail-head">
              <div>
                <h2>Productos encontrados</h2>
                <p class="ui-muted">
                  Se muestran los productos que el backend pudo resolver con los criterios ingresados.
                </p>
              </div>
              <span class="ui-badge">{{ result.foundProducts.length }} encontrados</span>
            </div>

            <div class="ui-table-wrapper" *ngIf="result.foundProducts.length > 0; else noProductsFound">
              <table class="ui-table compact-table compact-table--products">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Activo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let product of result.foundProducts">
                    <td>{{ product.productId }}</td>
                    <td class="cell-code">{{ product.sku || "-" }}</td>
                    <td class="cell-name">{{ product.name }}</td>
                    <td>{{ product.active ? "Sí" : "No" }}</td>
                    <td>
                      <span
                        class="ui-badge"
                        [class.ui-badge--success]="product.purgeCandidate"
                        [class.ui-badge--danger]="!product.purgeCandidate"
                      >
                        {{ product.purgeCandidate ? "Candidato" : "Bloqueado" }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noProductsFound>
              <p class="ui-muted">No se encontraron productos para los criterios enviados.</p>
            </ng-template>

            <div class="not-found-grid" *ngIf="result.notFoundProductIds.length > 0 || result.notFoundSkus.length > 0">
              <div class="not-found-card" *ngIf="result.notFoundSkus.length > 0">
                <h3>SKUs no encontrados</h3>
                <p>{{ result.notFoundSkus.join(", ") }}</p>
              </div>
              <div class="not-found-card" *ngIf="result.notFoundProductIds.length > 0">
                <h3>IDs no encontrados</h3>
                <p>{{ result.notFoundProductIds.join(", ") }}</p>
              </div>
            </div>
          </article>

          <article class="detail-card">
            <div class="detail-head">
              <div>
                <h2>Ventas relacionadas</h2>
                <p class="ui-muted">
                  El preview diferencia ventas puras y mixtas para evitar borrados riesgosos.
                </p>
              </div>
              <div class="split-pills">
                <span class="ui-badge ui-badge--success">Puras: {{ pureSales(result).length }}</span>
                <span class="ui-badge ui-badge--warning">Mixtas: {{ mixedSales(result).length }}</span>
              </div>
            </div>

            <div class="ui-table-wrapper" *ngIf="result.relatedSales.length > 0; else noSales">
              <table class="ui-table compact-table">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Items sel.</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let sale of result.relatedSales">
                    <td>{{ sale.saleNumber }}</td>
                    <td>{{ translateSaleStatus(sale.status) }}</td>
                    <td>{{ formatAmount(sale.totalAmount) }}</td>
                    <td>{{ sale.selectedItemCount }}/{{ sale.itemCount }}</td>
                    <td>
                      <span
                        class="ui-badge"
                        [class.ui-badge--success]="sale.pureSale"
                        [class.ui-badge--warning]="sale.mixedSale"
                      >
                        {{ saleTypeLabel(sale) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noSales><p class="ui-muted">No hay ventas relacionadas.</p></ng-template>
          </article>

          <article class="detail-card" *ngIf="result.electronicDocumentItems.length > 0">
            <div class="detail-head">
              <div>
                <h2>Documentos electronicos relacionados</h2>
                <p class="ui-muted">Si existen, se consideran bloqueo de purga.</p>
              </div>
              <span class="ui-badge ui-badge--danger">{{ result.electronicDocumentItems.length }} documento(s)</span>
            </div>

            <div class="ui-table-wrapper">
              <table class="ui-table compact-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Venta</th>
                    <th>Estado</th>
                    <th>Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of result.electronicDocumentItems">
                    <td>{{ item.fullNumber }}</td>
                    <td>{{ item.saleId }}</td>
                    <td>{{ translateSaleStatus(item.status) }}</td>
                    <td class="cell-name">{{ item.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article
            class="detail-card"
            *ngIf="result.inventoryMovements.length > 0 || result.stockBalances.length > 0 || result.stockTransferItems.length > 0"
          >
            <div class="detail-head">
              <div>
                <h2>Stock y movimientos relacionados</h2>
                <p class="ui-muted">Se listan referencias de inventario detectadas para los productos analizados.</p>
              </div>
              <div class="impact-tags">
                <span class="ui-badge">Saldos: {{ result.stockBalances.length }}</span>
                <span class="ui-badge">Movimientos: {{ result.inventoryMovements.length }}</span>
                <span class="ui-badge">Transferencias: {{ result.stockTransferItems.length }}</span>
              </div>
            </div>

            <div class="ui-table-wrapper" *ngIf="result.inventoryMovements.length > 0">
              <table class="ui-table compact-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let movement of visibleInventoryMovements(result.inventoryMovements)">
                    <td>{{ movement.inventoryMovementId }}</td>
                    <td>{{ movement.productId }}</td>
                    <td>{{ translateMovementType(movement.movementType) }}</td>
                    <td>{{ movement.quantity }}</td>
                    <td class="cell-name">{{ movement.reason }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </section>

      <section class="execute-modal-backdrop" *ngIf="executeDialogOpen" (click)="cancelExecuteDialog()">
        <article class="ui-card execute-modal" (click)="$event.stopPropagation()">
          <header class="execute-modal__head">
            <span class="ui-chip ui-chip--danger">Accion destructiva</span>
            <h2>Confirmar purga permanente</h2>
          </header>

          <p class="execute-modal__text">
            Esta accion elimina datos de prueba de forma permanente. Para continuar, escribe exactamente:
          </p>
          <strong class="execute-modal__highlight">ELIMINAR PRUEBAS</strong>

          <label class="criteria-field">
            <span>Texto de confirmacion</span>
            <input
              type="text"
              [value]="executeConfirmationText"
              (input)="onExecuteConfirmationInput($event)"
              [disabled]="executing"
              placeholder="ELIMINAR PRUEBAS"
            />
          </label>

          <p class="ui-alert ui-alert--error" *ngIf="executeDialogError">{{ executeDialogError }}</p>

          <footer class="execute-modal__actions">
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="cancelExecuteDialog()"
              [disabled]="executing"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ui-button ui-button--danger"
              (click)="confirmExecute()"
              [disabled]="executing"
            >
              {{ executing ? "Ejecutando..." : "Confirmar y ejecutar purga" }}
            </button>
          </footer>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .cleanup-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .criteria-card,
      .outcome-card,
      .detail-card,
      .message-card,
      .not-found-card,
      .execution-result-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
      }

      .criteria-card,
      .outcome-card,
      .execution-result-card {
        padding: var(--space-4);
      }

      .criteria-grid,
      .detail-grid,
      .message-grid,
      .summary-grid,
      .not-found-grid {
        display: grid;
        gap: var(--space-3);
      }

      .criteria-grid--single {
        grid-template-columns: minmax(0, 1fr);
      }

      .detail-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }

      .summary-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        margin-top: var(--space-3);
      }

      .decision-card {
        display: grid;
        gap: var(--space-3);
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border-default);
        margin-bottom: var(--space-3);
      }

      .decision-card--success {
        border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-success) 10%, var(--color-bg-soft));
      }

      .decision-card--danger {
        border-color: color-mix(in srgb, var(--color-danger) 42%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg-soft));
      }

      .decision-card__head {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        align-items: start;
        flex-wrap: wrap;
      }

      .decision-card__head h2,
      .decision-card__text,
      .decision-card__eyebrow,
      .execute-modal__head h2,
      .execute-modal__text {
        margin: 0;
      }

      .decision-card__eyebrow {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .decision-card__text,
      .execute-modal__text {
        font-size: var(--font-size-md);
        line-height: 1.5;
      }

      .decision-card__reasons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .decision-pill {
        border-radius: 999px;
        padding: 0.45rem 0.75rem;
        background: var(--color-bg-default);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: 600;
      }

      .criteria-field {
        display: grid;
        gap: var(--space-2);
      }

      .criteria-field span,
      .summary-label,
      .detail-card h2,
      .message-card h2,
      .detail-card h3,
      .execute-modal__head h2 {
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      textarea,
      input {
        width: 100%;
      }

      textarea {
        resize: vertical;
        min-height: 108px;
      }

      .criteria-actions,
      .impact-tags,
      .split-pills,
      .execute-modal__actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
      }

      .criteria-actions {
        margin-top: var(--space-3);
      }

      .criteria-warning {
        margin-top: var(--space-3);
      }

      .summary-card,
      .detail-card,
      .message-card,
      .not-found-card {
        padding: var(--space-3);
      }

      .summary-card {
        display: grid;
        gap: 0.35rem;
        align-content: start;
      }

      .summary-card strong {
        font-size: 1.28rem;
        line-height: 1.15;
      }

      .summary-note {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .summary-card--success {
        border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-success) 8%, var(--color-bg-soft));
      }

      .summary-card--warning {
        border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-warning) 10%, var(--color-bg-soft));
      }

      .summary-card--danger {
        border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg-soft));
      }

      .message-card--danger {
        border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg-soft));
      }

      .message-card--warning {
        border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-warning) 10%, var(--color-bg-soft));
      }

      .message-card--full {
        grid-column: 1 / -1;
      }

      .message-card ul {
        margin: var(--space-2) 0 0;
        padding-left: 1rem;
      }

      .detail-card {
        display: grid;
        gap: var(--space-3);
      }

      .detail-head {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: var(--space-3);
        flex-wrap: wrap;
      }

      .detail-head h2,
      .detail-card h3,
      .message-card h2 {
        margin: 0;
      }

      .detail-head p {
        margin: 0.25rem 0 0;
      }

      .ui-table-wrapper {
        overflow-x: auto;
      }

      .compact-table {
        width: 100%;
        table-layout: fixed;
      }

      .compact-table--products th:nth-child(1),
      .compact-table--products td:nth-child(1) {
        width: 68px;
      }

      .compact-table--products th:nth-child(2),
      .compact-table--products td:nth-child(2) {
        width: 136px;
      }

      .compact-table--products th:nth-child(4),
      .compact-table--products td:nth-child(4) {
        width: 72px;
      }

      .compact-table--products th:nth-child(5),
      .compact-table--products td:nth-child(5) {
        width: 118px;
      }

      .compact-table th,
      .compact-table td {
        white-space: normal;
        overflow-wrap: anywhere;
        vertical-align: top;
      }

      .compact-table td {
        line-height: 1.35;
      }

      .cell-code {
        font-family: var(--font-family-mono, monospace);
        font-size: 0.92em;
      }

      .cell-name {
        min-width: 0;
      }

      .execute-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 120;
        display: grid;
        place-items: center;
        padding: var(--space-4);
        background: rgba(16, 17, 20, 0.74);
        backdrop-filter: blur(4px);
      }

      .execute-modal {
        width: min(34rem, calc(100vw - 2rem));
        display: grid;
        gap: var(--space-4);
        padding: var(--space-5);
        border-radius: calc(var(--radius-lg) + 0.15rem);
        border-color: color-mix(in srgb, var(--color-danger-text) 30%, var(--color-border-default));
      }

      .execute-modal__head {
        display: grid;
        gap: var(--space-2);
      }

      .execute-modal__highlight {
        display: block;
        padding: var(--space-3);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-default);
        background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg-soft));
      }

      .execute-modal__actions {
        justify-content: flex-end;
      }

      @media (max-width: 768px) {
        .cleanup-page {
          padding: var(--space-4);
        }

        .criteria-actions,
        .execute-modal__actions {
          flex-direction: column;
          align-items: stretch;
        }

        .detail-head,
        .decision-card__head {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ProductCleanupPreviewPageComponent {
  private static readonly REQUIRED_CONFIRMATION_TEXT = "ELIMINAR PRUEBAS";

  protected readonly form = this.formBuilder.group({
    productQuery: [""],
  });

  protected loading = false;
  protected executing = false;
  protected previewStale = false;
  protected executeDialogOpen = false;
  protected executeConfirmationText = "";
  protected executeDialogError = "";
  protected errorMessage = "";
  protected successMessage = "";
  protected preview: ProductCleanupPreviewResponse | null = null;
  protected executionResult: ProductCleanupExecuteResponse | null = null;

  private lastPreviewPayload: ProductCleanupPreviewRequest | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly productCleanupService: ProductCleanupService,
  ) {}

  protected onCriteriaChange(): void {
    if (this.preview) {
      this.previewStale = true;
    }
    this.executionResult = null;
    this.successMessage = "";
  }

  protected analyzeImpact(): void {
    this.errorMessage = "";
    this.successMessage = "";
    this.executionResult = null;
    const payload = this.buildPayload();
    if (!payload) {
      this.preview = null;
      this.lastPreviewPayload = null;
      this.previewStale = false;
      this.errorMessage =
        "Ingresa al menos un SKU o un productId valido para analizar el impacto.";
      return;
    }

    this.loading = true;
    this.preview = null;
    this.previewStale = false;
    this.productCleanupService.preview(payload).subscribe({
      next: (response) => {
        this.preview = response;
        this.lastPreviewPayload = payload;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.lastPreviewPayload = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo consultar el preview de limpieza.",
        );
      },
    });
  }

  protected canExecute(): boolean {
    return !!this.preview &&
      !!this.lastPreviewPayload &&
      this.preview.purgeable &&
      !this.previewStale &&
      !this.loading &&
      !this.executing;
  }

  protected openExecuteDialog(): void {
    if (!this.canExecute()) {
      return;
    }
    this.executeDialogOpen = true;
    this.executeConfirmationText = "";
    this.executeDialogError = "";
    this.errorMessage = "";
  }

  protected cancelExecuteDialog(): void {
    if (this.executing) {
      return;
    }
    this.executeDialogOpen = false;
    this.executeConfirmationText = "";
    this.executeDialogError = "";
  }

  protected onExecuteConfirmationInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.executeConfirmationText = input?.value ?? "";
    this.executeDialogError = "";
  }

  protected confirmExecute(): void {
    if (!this.canExecute() || !this.lastPreviewPayload) {
      return;
    }
    if (
      this.executeConfirmationText !==
      ProductCleanupPreviewPageComponent.REQUIRED_CONFIRMATION_TEXT
    ) {
      this.executeDialogError =
        "Debes escribir exactamente ELIMINAR PRUEBAS para ejecutar la purga.";
      return;
    }

    this.executing = true;
    this.executeDialogError = "";
    this.errorMessage = "";
    this.successMessage = "";

    this.productCleanupService
      .execute({
        ...this.lastPreviewPayload,
        confirmationText:
          ProductCleanupPreviewPageComponent.REQUIRED_CONFIRMATION_TEXT,
      })
      .subscribe({
        next: (response) => {
          this.executing = false;
          this.executeDialogOpen = false;
          this.executeConfirmationText = "";
          this.preview = null;
          this.previewStale = false;
          this.lastPreviewPayload = null;
          this.executionResult = response;
          this.successMessage =
            "Purga ejecutada correctamente. Los datos de prueba fueron eliminados de forma permanente.";
        },
        error: (error) => {
          this.executing = false;
          this.executeDialogOpen = false;
          this.executeConfirmationText = "";
          this.executeDialogError = "";
          this.preview = null;
          this.previewStale = false;
          this.lastPreviewPayload = null;
          this.errorMessage = this.toExecuteErrorMessage(error);
        },
      });
  }

  protected executeSummaryCards(
    result: ProductCleanupExecuteResponse,
  ): Array<{ label: string; value: string }> {
    return [
      { label: "Productos eliminados", value: String(result.deletedProducts) },
      { label: "Ventas eliminadas", value: String(result.deletedSales) },
      { label: "Items de venta", value: String(result.deletedSaleItems) },
      { label: "Pagos eliminados", value: String(result.deletedSalePayments) },
      { label: "Items de cotizacion", value: String(result.deletedQuoteItems) },
      { label: "Saldos de stock", value: String(result.deletedStockBalances) },
      { label: "Movimientos", value: String(result.deletedInventoryMovements) },
      { label: "Transferencias", value: String(result.deletedStockTransferItems) },
    ];
  }

  protected summaryCards(
    result: ProductCleanupPreviewResponse,
  ): Array<{
    label: string;
    value: string;
    note?: string;
    tone?: "success" | "warning" | "danger";
  }> {
    return [
      { label: "Total productos", value: String(result.summary.totalProducts) },
      { label: "Encontrados", value: String(result.summary.foundProducts) },
      { label: "Activos", value: String(result.summary.activeProducts) },
      { label: "Inactivos", value: String(result.summary.inactiveProducts) },
      { label: "Ventas relacionadas", value: String(result.summary.relatedSales) },
      { label: "Ventas mixtas", value: String(result.summary.mixedSales) },
      { label: "Ventas puras", value: String(result.summary.pureSales) },
      { label: "Movimientos", value: String(result.summary.relatedInventoryMovements) },
      { label: "Documentos", value: String(result.summary.relatedDocuments) },
      {
        label: "Puede purgarse",
        value: result.summary.purgeable ? "Sí" : "No",
        note: result.summary.purgeable
          ? "Sin bloqueos en este preview"
          : "Hay bloqueos detectados",
        tone: result.summary.purgeable
          ? "success"
          : result.blockers.length > 0
            ? "danger"
            : "warning",
      },
    ];
  }

  protected pureSales(
    result: ProductCleanupPreviewResponse,
  ): ProductCleanupSalePreview[] {
    return result.relatedSales.filter((sale) => sale.pureSale);
  }

  protected mixedSales(
    result: ProductCleanupPreviewResponse,
  ): ProductCleanupSalePreview[] {
    return result.relatedSales.filter((sale) => sale.mixedSale);
  }

  protected saleTypeLabel(sale: ProductCleanupSalePreview): string {
    if (sale.mixedSale) {
      return "Venta mixta";
    }
    if (sale.pureSale) {
      return "Venta pura";
    }
    return "Relacionada";
  }

  protected decisionReasons(result: ProductCleanupPreviewResponse): string[] {
    const reasons: string[] = [];

    if (result.summary.activeProducts > 0) {
      reasons.push(`${result.summary.activeProducts} producto(s) activo(s)`);
    }
    if (result.summary.mixedSales > 0) {
      reasons.push(`${result.summary.mixedSales} venta(s) mixta(s)`);
    }
    if (result.summary.relatedDocuments > 0) {
      reasons.push(`${result.summary.relatedDocuments} documento(s) relacionado(s)`);
    }
    if (result.summary.pureSales > 0) {
      reasons.push(`${result.summary.pureSales} venta(s) pura(s)`);
    }
    if (result.summary.relatedInventoryMovements > 0) {
      reasons.push(`${result.summary.relatedInventoryMovements} movimiento(s) de inventario`);
    }
    if (result.stockBalances.length > 0) {
      reasons.push(`${result.stockBalances.length} saldo(s) de stock`);
    }
    if (result.purchaseOrderItems.length > 0) {
      reasons.push(`${result.purchaseOrderItems.length} item(s) de orden de compra`);
    }
    if (result.purchaseReceiptItems.length > 0) {
      reasons.push(`${result.purchaseReceiptItems.length} item(s) de recepcion de compra`);
    }
    if (result.stockTransferItems.length > 0) {
      reasons.push(`${result.stockTransferItems.length} item(s) de transferencia`);
    }

    return reasons.length > 0 ? reasons : ["Sin bloqueos detectados en este preview"];
  }

  protected visibleInventoryMovements(
    movements: ProductCleanupInventoryMovementPreview[],
  ): ProductCleanupInventoryMovementPreview[] {
    return movements.slice(0, 12);
  }

  protected formatAmount(value: number | null): string {
    if (value == null) {
      return "-";
    }
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected translateRiskMessage(message: string): string {
    const normalized = message.trim();

    const exactMap: Record<string, string> = {
      "Active products detected. Deactivate them before any purge attempt.":
        "Hay productos activos. Desactivalos antes de intentar una purga.",
      "Some requested products were not found in the catalog.":
        "Algunos productos solicitados no fueron encontrados en el catalogo.",
      "No matching products were found for the requested identifiers.":
        "No se encontraron productos para los identificadores enviados.",
    };

    if (exactMap[normalized]) {
      return exactMap[normalized];
    }

    if (normalized.includes("pure sale(s) detected")) {
      return "Se detectaron ventas puras. Una ejecucion futura tendria que eliminar ventas completas y pagos relacionados.";
    }
    if (normalized.includes("sale payment(s) are linked")) {
      return "Hay pagos asociados a las ventas afectadas.";
    }
    if (normalized.includes("stock balance row(s) detected")) {
      return "Hay saldos de stock relacionados con los productos seleccionados.";
    }
    if (normalized.includes("inventory movement row(s) detected")) {
      return "Hay movimientos de inventario relacionados con los productos seleccionados.";
    }
    if (normalized.includes("mixed sale(s) detected")) {
      return "Hay ventas mixtas que combinan productos seleccionados con no seleccionados.";
    }
    if (normalized.includes("electronic document item(s) detected")) {
      return "Hay documentos electronicos relacionados que bloquean una purga segura.";
    }
    if (normalized.includes("purchase order item(s) detected")) {
      return "Hay ordenes de compra relacionadas que bloquean una purga segura.";
    }
    if (normalized.includes("purchase receipt item(s) detected")) {
      return "Hay recepciones de compra relacionadas que bloquean una purga segura.";
    }
    if (normalized.includes("stock transfer item(s) detected")) {
      return "Hay transferencias de stock relacionadas que bloquean una purga segura.";
    }
    return message;
  }

  protected translateSaleStatus(status: string | null): string {
    switch ((status ?? "").trim().toUpperCase()) {
      case "COMPLETED":
        return "Completada";
      case "VOIDED":
        return "Anulada";
      case "CANCELLED":
        return "Cancelada";
      case "GENERATED":
        return "Generado";
      default:
        return status || "-";
    }
  }

  protected translateMovementType(type: string | null): string {
    switch ((type ?? "").trim().toUpperCase()) {
      case "INITIAL_STOCK":
        return "Stock inicial";
      case "SALE_OUT":
        return "Salida por venta";
      case "SALE_VOID_IN":
        return "Entrada por anulacion de venta";
      case "PURCHASE_RECEIPT":
        return "Recepcion de compra";
      case "TRANSFER_OUT":
        return "Salida por transferencia";
      case "TRANSFER_IN":
        return "Entrada por transferencia";
      default:
        return type || "-";
    }
  }

  private toExecuteErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      return "El preview cambio. Vuelve a analizar antes de ejecutar.";
    }
    return toHttpErrorMessage(
      error,
      "No se pudo ejecutar la purga de datos de prueba.",
    );
  }

  private buildPayload(): ProductCleanupPreviewRequest | null {
    const tokens = this.splitTokens(this.form.controls.productQuery.value ?? "");
    const productIds = tokens
      .filter((item) => /^\d+$/.test(item))
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
    const skus = tokens.filter((item) => !/^\d+$/.test(item));

    if (productIds.length === 0 && skus.length === 0) {
      return null;
    }

    return {
      ...(productIds.length > 0 ? { productIds } : {}),
      ...(skus.length > 0 ? { skus } : {}),
    };
  }

  private splitTokens(rawValue: string): string[] {
    return Array.from(
      new Set(
        rawValue
          .split(/[\s,;]+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }
}
