import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { toHttpErrorMessage } from "./data/http-error-message";
import {
  ProductCleanupExecuteResponse,
  ProductCleanupInventoryMovementPreview,
  ProductCleanupPurchaseOrderPreview,
  ProductCleanupPurchaseReceiptPreview,
  ProductCleanupProductPreview,
  ProductCleanupPreviewRequest,
  ProductCleanupPreviewResponse,
  ProductCleanupSalePreview,
  ProductCleanupStockBalancePreview,
  ProductCleanupStockTransferItemPreview,
} from "./data/product-cleanup.models";
import { ProductCleanupService } from "./data/product-cleanup.service";

type DetailTabId =
  | "products"
  | "sales"
  | "purchaseOrders"
  | "purchaseReceipts"
  | "inventory";

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
          <p class="ui-page-description">Analiza productos de prueba antes de purgar.</p>
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
              rows="2"
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
        </div>

        <p class="ui-muted criteria-help">
          Ingresa SKUs o IDs separados por coma, espacio o salto de linea.
        </p>
        <p class="ui-alert ui-alert--warning criteria-warning" *ngIf="preview?.purgeable">
          La purga elimina datos permanentemente y requiere escribir ELIMINAR PRUEBAS.
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

          <div class="decision-card__actions">
            <button
              *ngIf="preview"
              type="button"
              class="ui-button ui-button--secondary"
              (click)="downloadPreviewEvidence()"
              [disabled]="loading || executing"
              title="Descarga una copia del analisis antes de ejecutar cambios."
            >
              Descargar preview
            </button>
            <button
              *ngIf="result.purgeable"
              type="button"
              class="ui-button ui-button--danger"
              (click)="openExecuteDialog()"
              [disabled]="!canExecute()"
            >
              {{ executing ? "Ejecutando..." : "Ejecutar purga" }}
            </button>
            <p class="ui-muted decision-card__hint" *ngIf="result.purgeable && !canExecute()">
              {{ executeAvailabilityMessage() }}
            </p>
            <p class="ui-muted decision-card__hint" *ngIf="!result.purgeable">
              La purga queda bloqueada hasta resolver los bloqueos detectados.
            </p>
          </div>
        </section>

        <p class="ui-alert ui-alert--info cleanup-education">
          Solo se eliminaran ventas, ordenes o recepciones que incluyan unicamente los productos seleccionados.
          Si tambien incluyen otros productos, bloquearan la purga.
        </p>

        <section class="summary-groups">
          <article class="summary-group-card" *ngFor="let group of summaryGroups(result)">
            <div class="summary-group-head">
              <h2>{{ group.title }}</h2>
            </div>
            <div class="summary-group-metrics">
              <div class="summary-metric" *ngFor="let item of group.items">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
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

        <section class="detail-tabs-card">
          <div class="detail-tabs" role="tablist" aria-label="Detalle del preview">
            <button
              type="button"
              class="detail-tab"
              *ngFor="let tab of detailTabs(result)"
              [class.is-active]="activeDetailTab === tab.id"
              [class.is-alert]="tab.alert"
              (click)="setActiveDetailTab(tab.id)"
            >
              <span>{{ tab.label }}</span>
              <span class="ui-badge">{{ tab.count }}</span>
            </button>
          </div>

          <article class="detail-card detail-card--active" *ngIf="activeDetailTab === 'products'">
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

          <article class="detail-card detail-card--active" *ngIf="activeDetailTab === 'sales'">
            <div class="detail-head">
              <div>
                <h2>Ventas relacionadas</h2>
                <p class="ui-muted">
                  El preview diferencia ventas completas y mezcladas para evitar borrados riesgosos.
                </p>
              </div>
              <div class="split-pills">
                <span class="ui-badge ui-badge--success">Completas: {{ pureSales(result).length }}</span>
                <span class="ui-badge ui-badge--warning">Mezcladas: {{ mixedSales(result).length }}</span>
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

          <article class="detail-card detail-card--active" *ngIf="activeDetailTab === 'purchaseOrders'">
            <div class="detail-head">
              <div>
                <h2>Ordenes de compra relacionadas</h2>
                <p class="ui-muted">
                  Las ordenes completas se eliminan enteras; las mezcladas bloquean la purga.
                </p>
              </div>
              <div class="split-pills">
                <span class="ui-badge ui-badge--success">Completas: {{ purePurchaseOrders(result).length }}</span>
                <span class="ui-badge ui-badge--warning">Mezcladas: {{ mixedPurchaseOrders(result).length }}</span>
              </div>
            </div>

            <div class="ui-table-wrapper" *ngIf="result.purchaseOrders.length > 0; else noPurchaseOrders">
              <table class="ui-table compact-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Estado</th>
                    <th>Items</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let order of result.purchaseOrders">
                    <td>{{ order.purchaseOrderId }}</td>
                    <td>{{ translatePurchaseStatus(order.status) }}</td>
                    <td>{{ order.selectedItemCount }}/{{ order.itemCount }}</td>
                    <td>
                      <span
                        class="ui-badge"
                        [class.ui-badge--success]="order.purePurchaseOrder"
                        [class.ui-badge--warning]="order.mixedPurchaseOrder"
                      >
                        {{ purchaseOrderTypeLabel(order) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noPurchaseOrders><p class="ui-muted">No hay ordenes de compra relacionadas.</p></ng-template>
          </article>

          <article class="detail-card detail-card--active" *ngIf="activeDetailTab === 'purchaseReceipts'">
            <div class="detail-head">
              <div>
                <h2>Recepciones de compra relacionadas</h2>
                <p class="ui-muted">
                  Las recepciones completas se eliminan enteras; las mezcladas bloquean la purga.
                </p>
              </div>
              <div class="split-pills">
                <span class="ui-badge ui-badge--success">Completas: {{ purePurchaseReceipts(result).length }}</span>
                <span class="ui-badge ui-badge--warning">Mezcladas: {{ mixedPurchaseReceipts(result).length }}</span>
              </div>
            </div>

            <div class="ui-table-wrapper" *ngIf="result.purchaseReceipts.length > 0; else noPurchaseReceipts">
              <table class="ui-table compact-table">
                <thead>
                  <tr>
                    <th>Recepcion</th>
                    <th>Orden</th>
                    <th>Items</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let receipt of result.purchaseReceipts">
                    <td>{{ receipt.purchaseReceiptId }}</td>
                    <td>{{ receipt.purchaseOrderId }}</td>
                    <td>{{ receipt.selectedItemCount }}/{{ receipt.itemCount }}</td>
                    <td>
                      <span
                        class="ui-badge"
                        [class.ui-badge--success]="receipt.purePurchaseReceipt"
                        [class.ui-badge--warning]="receipt.mixedPurchaseReceipt"
                      >
                        {{ purchaseReceiptTypeLabel(receipt) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noPurchaseReceipts><p class="ui-muted">No hay recepciones de compra relacionadas.</p></ng-template>
          </article>

          <article class="detail-card detail-card--active" *ngIf="activeDetailTab === 'inventory'">
            <div class="detail-head">
              <div>
                <h2>Stock y movimientos relacionados</h2>
                <p class="ui-muted">Se listan movimientos, saldos, transferencias y documentos detectados.</p>
              </div>
              <div class="impact-tags">
                <span class="ui-badge">Saldos: {{ result.stockBalances.length }}</span>
                <span class="ui-badge">Movimientos: {{ result.inventoryMovements.length }}</span>
                <span class="ui-badge">Transferencias: {{ result.stockTransferItems.length }}</span>
                <span class="ui-badge ui-badge--danger">Documentos: {{ result.electronicDocumentItems.length }}</span>
              </div>
            </div>

            <div class="ui-table-wrapper" *ngIf="inventoryRows(result).length > 0; else noInventoryRows">
              <table class="ui-table compact-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of inventoryRows(result)">
                    <td>{{ row.id }}</td>
                    <td>{{ row.productId }}</td>
                    <td>{{ row.type }}</td>
                    <td class="cell-name">{{ row.reference }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noInventoryRows><p class="ui-muted">No hay referencias de inventario o documentos relacionadas.</p></ng-template>
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
      .message-grid,
      .summary-grid,
      .not-found-grid {
        display: grid;
        gap: var(--space-3);
      }

      .criteria-grid--single {
        grid-template-columns: minmax(0, 1fr);
      }

      .summary-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        margin-top: var(--space-3);
        align-items: stretch;
      }

      .summary-groups {
        display: grid;
        gap: var(--space-3);
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

      .decision-card__actions {
        display: flex;
        gap: var(--space-3);
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .decision-card__hint {
        margin: 0;
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
        min-height: 64px;
        padding: 0.45rem 1rem 0.85rem;
        box-sizing: border-box;
        line-height: 1.4;
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

      .cleanup-education {
        margin: 0;
      }

      .summary-card,
      .detail-card,
      .message-card,
      .not-found-card {
        padding: var(--space-3);
      }

      .summary-group-card,
      .detail-tabs-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .summary-group-card {
        display: grid;
        gap: var(--space-3);
      }

      .summary-group-head h2 {
        margin: 0;
        font-size: var(--font-size-md);
        color: var(--color-text-secondary);
      }

      .summary-group-metrics {
        display: grid;
        gap: var(--space-2);
      }

      .summary-metric {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--space-3);
        align-items: start;
        min-height: 1.9rem;
      }

      .summary-metric span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .summary-metric strong {
        font-size: 1rem;
      }

      .summary-card {
        display: grid;
        grid-template-rows: minmax(2.6rem, auto) auto;
        gap: 0.45rem;
        height: 100%;
      }

      .summary-label {
        display: flex;
        align-items: flex-start;
        min-height: 2.6rem;
      }

      .summary-card strong {
        font-size: 1.28rem;
        line-height: 1.15;
        margin-top: auto;
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

      .message-card {
        padding-block: var(--space-2);
      }

      .detail-tabs-card {
        display: grid;
        gap: var(--space-3);
      }

      .detail-tabs {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .detail-tab {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: 0.65rem 0.85rem;
        border-radius: 999px;
        border: 1px solid var(--color-border-default);
        background: var(--color-bg-default);
        color: var(--color-text-primary);
        font: inherit;
        cursor: pointer;
      }

      .detail-tab.is-active {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-soft));
      }

      .detail-tab.is-alert {
        border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-border-default));
      }

      .detail-card--active {
        padding: 0;
        border: none;
        background: transparent;
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
        width: 100%;
        overflow-x: hidden;
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

      .compact-table th:last-child,
      .compact-table td:last-child {
        width: 22%;
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

        .detail-tabs,
        .detail-head,
        .decision-card__head,
        .decision-card__actions,
        .summary-metric {
          flex-direction: column;
          align-items: stretch;
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
  protected activeDetailTab: DetailTabId = "products";

  private lastPreviewPayload: ProductCleanupPreviewRequest | null = null;
  private lastPreviewCriteriaRaw = "";

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
        this.activeDetailTab = this.selectDefaultDetailTab(response);
        this.lastPreviewPayload = payload;
        this.lastPreviewCriteriaRaw = this.form.controls.productQuery.value ?? "";
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.lastPreviewPayload = null;
        this.lastPreviewCriteriaRaw = "";
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
          this.lastPreviewCriteriaRaw = "";
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
          this.lastPreviewCriteriaRaw = "";
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
      { label: "Ordenes eliminadas", value: String(result.deletedPurchaseOrders) },
      { label: "Items de orden", value: String(result.deletedPurchaseOrderItems) },
      { label: "Recepciones eliminadas", value: String(result.deletedPurchaseReceipts) },
      { label: "Items de recepcion", value: String(result.deletedPurchaseReceiptItems) },
      { label: "Saldos de stock", value: String(result.deletedStockBalances) },
      { label: "Movimientos", value: String(result.deletedInventoryMovements) },
      { label: "Transferencias", value: String(result.deletedStockTransferItems) },
    ];
  }

  protected summaryGroups(
    result: ProductCleanupPreviewResponse,
  ): Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }> {
    return [
      {
        title: "Productos",
        items: [
          { label: "Total", value: String(result.summary.totalProducts) },
          { label: "Encontrados", value: String(result.summary.foundProducts) },
          { label: "Activos", value: String(result.summary.activeProducts) },
          { label: "Inactivos", value: String(result.summary.inactiveProducts) },
        ],
      },
      {
        title: "Ventas",
        items: [
          { label: "Relacionadas", value: String(result.summary.relatedSales) },
          { label: "Completas", value: String(result.summary.pureSales) },
          { label: "Mezcladas", value: String(result.summary.mixedSales) },
        ],
      },
      {
        title: "Compras",
        items: [
          { label: "Ordenes", value: String(result.summary.relatedPurchaseOrders) },
          { label: "Ordenes completas", value: String(result.summary.purePurchaseOrders) },
          { label: "Ordenes mezcladas", value: String(result.summary.mixedPurchaseOrders) },
          { label: "Recepciones", value: String(result.summary.relatedPurchaseReceipts) },
          { label: "Recepciones completas", value: String(result.summary.purePurchaseReceipts) },
          { label: "Recepciones mezcladas", value: String(result.summary.mixedPurchaseReceipts) },
        ],
      },
      {
        title: "Inventario",
        items: [
          { label: "Movimientos", value: String(result.summary.relatedInventoryMovements) },
          { label: "Saldos", value: String(result.stockBalances.length) },
          { label: "Transferencias", value: String(result.stockTransferItems.length) },
        ],
      },
      {
        title: "Documentos",
        items: [
          { label: "Relacionados", value: String(result.summary.relatedDocuments) },
        ],
      },
      {
        title: "Bloqueos",
        items: [
          { label: "Detectados", value: String(result.blockers.length) },
        ],
      },
    ];
  }

  protected detailTabs(result: ProductCleanupPreviewResponse): Array<{
    id: DetailTabId;
    label: string;
    count: number;
    alert: boolean;
  }> {
    return [
      { id: "products", label: "Productos", count: result.foundProducts.length, alert: result.summary.activeProducts > 0 },
      { id: "sales", label: "Ventas", count: result.relatedSales.length, alert: result.summary.mixedSales > 0 },
      {
        id: "purchaseOrders",
        label: "Ordenes",
        count: result.purchaseOrders.length,
        alert: result.summary.mixedPurchaseOrders > 0,
      },
      {
        id: "purchaseReceipts",
        label: "Recepciones",
        count: result.purchaseReceipts.length,
        alert: result.summary.mixedPurchaseReceipts > 0,
      },
      {
        id: "inventory",
        label: "Stock y movimientos",
        count: this.inventoryRows(result).length,
        alert: result.summary.relatedDocuments > 0 || result.stockTransferItems.length > 0,
      },
    ];
  }

  protected setActiveDetailTab(tab: DetailTabId): void {
    this.activeDetailTab = tab;
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

  protected purePurchaseOrders(
    result: ProductCleanupPreviewResponse,
  ): ProductCleanupPurchaseOrderPreview[] {
    return result.purchaseOrders.filter((order) => order.purePurchaseOrder);
  }

  protected mixedPurchaseOrders(
    result: ProductCleanupPreviewResponse,
  ): ProductCleanupPurchaseOrderPreview[] {
    return result.purchaseOrders.filter((order) => order.mixedPurchaseOrder);
  }

  protected purePurchaseReceipts(
    result: ProductCleanupPreviewResponse,
  ): ProductCleanupPurchaseReceiptPreview[] {
    return result.purchaseReceipts.filter((receipt) => receipt.purePurchaseReceipt);
  }

  protected mixedPurchaseReceipts(
    result: ProductCleanupPreviewResponse,
  ): ProductCleanupPurchaseReceiptPreview[] {
    return result.purchaseReceipts.filter((receipt) => receipt.mixedPurchaseReceipt);
  }

  protected saleTypeLabel(sale: ProductCleanupSalePreview): string {
    if (sale.mixedSale) {
      return "Venta mezclada";
    }
    if (sale.pureSale) {
      return "Venta completa";
    }
    return "Relacionada";
  }

  protected purchaseOrderTypeLabel(order: ProductCleanupPurchaseOrderPreview): string {
    if (order.mixedPurchaseOrder) {
      return "Orden mezclada";
    }
    if (order.purePurchaseOrder) {
      return "Orden completa";
    }
    return "Relacionada";
  }

  protected purchaseReceiptTypeLabel(
    receipt: ProductCleanupPurchaseReceiptPreview,
  ): string {
    if (receipt.mixedPurchaseReceipt) {
      return "Recepcion mezclada";
    }
    if (receipt.purePurchaseReceipt) {
      return "Recepcion completa";
    }
    return "Relacionada";
  }

  protected decisionReasons(result: ProductCleanupPreviewResponse): string[] {
    const reasons: string[] = [];

    if (result.summary.activeProducts > 0) {
      reasons.push(`${result.summary.activeProducts} producto(s) activo(s)`);
    }
    if (result.summary.mixedSales > 0) {
      reasons.push(`${result.summary.mixedSales} venta(s) mezclada(s)`);
    }
    if (result.summary.relatedDocuments > 0) {
      reasons.push(`${result.summary.relatedDocuments} documento(s) relacionado(s)`);
    }
    if (result.summary.pureSales > 0) {
      reasons.push(`${result.summary.pureSales} venta(s) completa(s)`);
    }
    if (result.summary.mixedPurchaseOrders > 0) {
      reasons.push(`${result.summary.mixedPurchaseOrders} orden(es) mezclada(s)`);
    }
    if (result.summary.purePurchaseOrders > 0) {
      reasons.push(`${result.summary.purePurchaseOrders} orden(es) completa(s)`);
    }
    if (result.summary.mixedPurchaseReceipts > 0) {
      reasons.push(`${result.summary.mixedPurchaseReceipts} recepcion(es) mezclada(s)`);
    }
    if (result.summary.purePurchaseReceipts > 0) {
      reasons.push(`${result.summary.purePurchaseReceipts} recepcion(es) completa(s)`);
    }
    if (result.summary.relatedInventoryMovements > 0) {
      reasons.push(`${result.summary.relatedInventoryMovements} movimiento(s) de inventario`);
    }
    if (result.stockBalances.length > 0) {
      reasons.push(`${result.stockBalances.length} saldo(s) de stock`);
    }
    if (result.stockTransferItems.length > 0) {
      reasons.push(`${result.stockTransferItems.length} item(s) de transferencia`);
    }

    return reasons.length > 0 ? reasons : ["Sin bloqueos detectados en este preview"];
  }

  protected executeAvailabilityMessage(): string {
    if (this.previewStale) {
      return "Vuelve a analizar antes de ejecutar la purga.";
    }
    if (this.loading) {
      return "Espera a que termine el analisis actual.";
    }
    if (this.executing) {
      return "La purga ya se esta ejecutando.";
    }
    return "Confirma el preview actual para habilitar la purga.";
  }

  protected downloadPreviewEvidence(): void {
    if (!this.preview) {
      return;
    }

    const payload = this.buildPreviewEvidence();
    const filename = `cleanup-preview-${this.formatEvidenceTimestamp(new Date())}.json`;
    this.downloadJson(filename, payload);
  }

  protected inventoryRows(
    result: ProductCleanupPreviewResponse,
  ): Array<{ id: string; productId: number; type: string; reference: string }> {
    const movementRows = result.inventoryMovements.map((movement) => ({
      id: String(movement.inventoryMovementId),
      productId: movement.productId,
      type: this.translateMovementType(movement.movementType),
      reference: movement.referenceType || movement.referenceId
        ? `${movement.referenceType || "Referencia"}${movement.referenceId ? ` #${movement.referenceId}` : ""}`
        : movement.reason,
    }));
    const balanceRows = result.stockBalances.map((balance) => ({
      id: `SB-${balance.stockBalanceId}`,
      productId: balance.productId,
      type: "Saldo de stock",
      reference: `Almacen ${balance.warehouseId} · Cantidad ${balance.quantity}`,
    }));
    const transferRows = result.stockTransferItems.map((transfer) => ({
      id: `TR-${transfer.stockTransferItemId}`,
      productId: transfer.productId,
      type: "Transferencia",
      reference: `Transferencia #${transfer.transferId} · Cantidad ${transfer.quantity}`,
    }));
    const documentRows = result.electronicDocumentItems.map((document) => ({
      id: `DOC-${document.electronicDocumentItemId}`,
      productId: document.productId,
      type: "Documento electronico",
      reference: `${document.fullNumber} · Venta ${document.saleId}`,
    }));

    return [...movementRows, ...balanceRows, ...transferRows, ...documentRows];
  }

  private buildPreviewEvidence(): Record<string, unknown> {
    const parsedQuery = this.splitTokens(this.lastPreviewCriteriaRaw);
    const productIds = parsedQuery
      .filter((item) => /^\d+$/.test(item))
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
    const skus = parsedQuery.filter((item) => !/^\d+$/.test(item));

    return {
      generatedAt: new Date().toISOString(),
      criteria: {
        inputOriginal: this.lastPreviewCriteriaRaw,
        productIds,
        skus,
      },
      summary: this.preview?.summary ?? null,
      purgeable: this.preview?.purgeable ?? false,
      blockers: this.preview?.blockers ?? [],
      warnings: this.preview?.warnings ?? [],
      productsFound: this.preview?.foundProducts ?? [],
      productsNotFound: {
        productIds: this.preview?.notFoundProductIds ?? [],
        skus: this.preview?.notFoundSkus ?? [],
      },
      sales: this.preview?.relatedSales ?? [],
      purchaseOrders: this.preview?.purchaseOrders ?? [],
      purchaseReceipts: this.preview?.purchaseReceipts ?? [],
      stockBalances: this.preview?.stockBalances ?? [],
      inventoryMovements: this.preview?.inventoryMovements ?? [],
      stockTransferItems: this.preview?.stockTransferItems ?? [],
      documents: this.preview?.electronicDocumentItems ?? [],
      note: "Este archivo es una evidencia del preview antes de ejecutar una purga. No representa una auditoria persistida.",
    };
  }

  private downloadJson(filename: string, data: unknown): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private formatEvidenceTimestamp(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, "0");
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("") + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
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
      return "Se detectaron ventas completas. Una ejecucion futura tendria que eliminar ventas enteras y pagos relacionados.";
    }
    if (normalized.includes("pure purchase order(s) detected")) {
      return "Se detectaron ordenes de compra completas. La purga eliminaria las ordenes enteras y sus items relacionados.";
    }
    if (normalized.includes("pure purchase receipt(s) detected")) {
      return "Se detectaron recepciones de compra completas. La purga eliminaria las recepciones enteras y sus items relacionados.";
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
      return "Hay ventas mezcladas que combinan productos seleccionados con no seleccionados.";
    }
    if (normalized.includes("electronic document item(s) detected")) {
      return "Hay documentos electronicos relacionados que bloquean una purga segura.";
    }
    if (normalized.includes("mixed purchase order(s) detected")) {
      return "Hay ordenes de compra mezcladas que combinan productos seleccionados con no seleccionados.";
    }
    if (normalized.includes("mixed purchase receipt(s) detected")) {
      return "Hay recepciones de compra mezcladas o con orden padre mezclada que bloquean una purga segura.";
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
      case "PURCHASE_IN":
        return "Entrada por compra";
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

  protected translatePurchaseStatus(status: string | null): string {
    switch ((status ?? "").trim().toUpperCase()) {
      case "DRAFT":
        return "Borrador";
      case "APPROVED":
        return "Aprobada";
      case "PARTIALLY_RECEIVED":
        return "Recepcion parcial";
      case "RECEIVED":
        return "Recepcionada";
      case "CANCELLED":
        return "Cancelada";
      default:
        return status || "-";
    }
  }

  private selectDefaultDetailTab(result: ProductCleanupPreviewResponse): DetailTabId {
    if (result.summary.mixedSales > 0 && result.relatedSales.length > 0) {
      return "sales";
    }
    if (result.summary.mixedPurchaseOrders > 0 && result.purchaseOrders.length > 0) {
      return "purchaseOrders";
    }
    if (result.summary.mixedPurchaseReceipts > 0 && result.purchaseReceipts.length > 0) {
      return "purchaseReceipts";
    }
    if (result.foundProducts.length > 0) {
      return "products";
    }
    if (result.relatedSales.length > 0) {
      return "sales";
    }
    if (result.purchaseOrders.length > 0) {
      return "purchaseOrders";
    }
    if (result.purchaseReceipts.length > 0) {
      return "purchaseReceipts";
    }
    return "inventory";
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
