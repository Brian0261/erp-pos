import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { PosCartPanelComponent } from "./components/pos-cart-panel.component";
import { PosTotalsSummaryComponent } from "./components/pos-totals-summary.component";
import { CashRegisterService } from "./data/cash-register.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { PosService } from "./data/pos.service";
import { PosDraftState, PosStateService } from "./data/pos-state.service";
import { PaymentLine, PosCartItem, PosReceiptType } from "./data/pos-ui.models";
import { SalesService } from "./data/sales.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  BillingSeriesResponse,
  CreateElectronicDocumentFromSaleRequest,
  ElectronicDocumentType,
} from "../billing/data/billing.models";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import {
  CashRegisterResponse,
  CreateSaleRequest,
  SaleResponse,
  PosProductResponse,
} from "./data/sales.models";
import {
  calculatePosChange,
  calculatePosDiscountTotal,
  calculatePosLineSubtotal,
  calculatePosLineTotal,
  calculatePosPaidTotal,
  calculatePosSubtotal,
  calculatePosTotal,
  normalizePosNumber,
  normalizePosQuantity,
} from "./utils/pos-calculations";

@Component({
  selector: "app-pos-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PosTotalsSummaryComponent,
    PosCartPanelComponent,
  ],
  template: `
    <section class="ui-card pos-page">
      <header class="pos-hero">
        <div class="pos-hero__copy">
          <p class="ui-page-kicker">InkToy POS</p>
          <h1 class="ui-page-title">Punto de venta</h1>
          <p class="ui-page-description">
            Venta guiada para caja fisica: escanea, selecciona, cobra y conserva
            el control de caja en tiempo real.
          </p>
        </div>

        <div class="pos-hero__actions">
          <div
            class="pos-cash-status"
            [class.pos-cash-status--open]="currentCashSession"
            [class.pos-cash-status--closed]="!currentCashSession"
          >
            <span class="pos-cash-dot" aria-hidden="true"></span>
            <strong>{{
              currentCashSession ? "Caja abierta" : "Caja cerrada"
            }}</strong>
            <span *ngIf="currentCashSession">
              #{{ currentCashSession.id }} · desde
              {{ currentCashSession.openedAt | date: "HH:mm" }}
            </span>
            <span *ngIf="!currentCashSession">Abre caja antes de vender</span>
          </div>
          <a
            class="ui-button ui-button--secondary pos-button"
            [routerLink]="['/caja']"
            >Ir a Caja</a
          >
        </div>
      </header>

      <div class="pos-shell">
        <main class="pos-workspace">
          <form
            [formGroup]="saleForm"
            class="pos-command"
            (ngSubmit)="submitUnifiedSearch()"
          >
            <label class="field field--warehouse">
              <span>Almacen de salida *</span>
              <select
                formControlName="warehouseId"
                [title]="selectedWarehouseLabel"
              >
                <option [ngValue]="null">Selecciona almacen</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                  [title]="warehouse.code + ' - ' + warehouse.name"
                >
                  {{ getWarehouseDisplayLabel(warehouse) }}
                </option>
              </select>
            </label>

            <section class="scan-card" aria-label="Busqueda unificada POS">
              <label class="scan-field">
                <span class="scan-label">Buscar o escanear producto</span>
                <input
                  class="scan-input"
                  type="text"
                  formControlName="code"
                  placeholder="Escanea barcode/SKU o busca producto..."
                  autocomplete="off"
                />
              </label>

              <div class="scan-actions">
                <button
                  type="button"
                  class="ui-button ui-button--primary pos-button pos-button--scan"
                  (click)="addExactFromUnifiedSearch()"
                  [disabled]="loadingLookup"
                >
                  {{ loadingLookup ? "Agregando..." : "Agregar codigo" }}
                </button>
                <button
                  type="button"
                  class="ui-button ui-button--secondary pos-button pos-button--quiet"
                  (click)="submitUnifiedSearch()"
                  [disabled]="loadingSearch"
                >
                  {{ loadingSearch ? "Buscando..." : "Buscar" }}
                </button>
              </div>
            </section>

            <section
              class="quick-search"
              aria-label="Busquedas rapidas para productos sin barcode"
            >
              <span>BÚSQUEDAS RÁPIDAS</span>
              <div class="quick-search__buttons">
                <button
                  type="button"
                  class="ui-button quick-search__button"
                  *ngFor="let term of quickSearchTerms"
                  (click)="applyQuickSearch(term)"
                  [disabled]="loadingSearch"
                >
                  {{ term }}
                </button>
              </div>
            </section>
          </form>

          <div class="message-stack" *ngIf="errorMessage || warningMessage || successMessage">
            <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
              {{ errorMessage }}
            </p>
            <p class="ui-alert ui-alert--info" *ngIf="warningMessage">
              {{ warningMessage }}
            </p>
            <p class="ui-alert ui-alert--success" *ngIf="successMessage">
              {{ successMessage }}
            </p>
          </div>

          <section class="results-panel">
            <header class="panel-head">
              <div>
                <h2>Resultados de busqueda</h2>
              </div>
              <span class="ui-badge"
                >{{ searchResults.length }} resultados</span
              >
            </header>

            <p class="result-hint" *ngIf="searchResults.length > 1">
              Hay varias coincidencias. Revisa nombre, codigo, precio y stock
              antes de tocar Agregar.
            </p>

            <div class="empty-results" *ngIf="searchResults.length === 0">
              <strong>Sin resultados activos</strong>
              <span
                >Busca por nombre para elegir el producto antes de
                agregar.</span
              >
            </div>

            <div class="results-grid" *ngIf="searchResults.length > 0">
              <article class="result-card" *ngFor="let result of searchResults">
                <div class="result-card__body">
                  <div class="result-card__meta-row">
                    <p class="result-card__sku">{{ result.sku }}</p>
                    <span class="result-card__meta-separator" aria-hidden="true"
                      >·</span
                    >
                    <div class="result-meta">
                      <span *ngIf="result.barcode" class="result-meta__code">
                        {{ result.barcode }}
                      </span>
                      <span
                        *ngIf="!result.barcode"
                        class="barcode-badge barcode-badge--missing"
                      >
                        Sin código
                      </span>
                      <span class="result-meta__stock">
                        <span class="result-meta__label">Stock</span>
                        <span class="result-meta__value">{{
                          result.stockAvailable | number: "1.0-3"
                        }}</span>
                      </span>
                    </div>
                  </div>
                  <h3>{{ result.name }}</h3>
                </div>
                <div class="result-card__action">
                  <p class="result-price">
                    S/ {{ result.salePrice | number: "1.2-2" }}
                  </p>
                  <button
                    type="button"
                    class="ui-button ui-button--primary pos-button pos-button--add result-add-button"
                    (click)="addToCart(result)"
                  >
                    Agregar
                  </button>
                </div>
              </article>
            </div>
          </section>
        </main>

        <aside class="checkout-panel" aria-label="Carrito y cobro">
          <app-pos-cart-panel
            [cart]="cart"
            [cartTitle]="cartTitle"
            [lineTotals]="cartLineTotals"
            (openFullCart)="openFullCart()"
            (cancelSale)="cancelSale()"
            (decrease)="decreaseQuantity($event)"
            (increase)="increaseQuantity($event)"
            (remove)="removeFromCart($event)"
            (quantityFocus)="selectQuantityInput($event)"
            (setQuantity)="setQuantity($event.index, $event.value, $event.input)"
            (setDiscount)="setDiscount($event.index, $event.value)"
          ></app-pos-cart-panel>

          <section class="payment-panel">
            <header class="panel-head panel-head--compact">
              <div>
                <p class="panel-kicker">Cobro</p>
                <h2>Pagos</h2>
              </div>
              <button
                type="button"
                class="ui-button ui-button--secondary pos-button pos-button--quiet"
                (click)="addPaymentLine()"
              >
                + Pago
              </button>
            </header>

            <div class="payment-list">
              <article
                class="payment-line"
                *ngFor="let payment of payments; let index = index"
              >
                <label class="mini-field">
                  <span>Metodo *</span>
                  <select
                    [value]="payment.paymentMethod"
                    (change)="
                      setPaymentMethod(index, $any($event.target).value)
                    "
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </label>
                <label class="mini-field">
                  <span>Monto *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    [value]="payment.amount"
                    (input)="setPaymentAmount(index, $any($event.target).value)"
                  />
                </label>
                <label class="mini-field mini-field--wide">
                  <span>Referencia</span>
                  <input
                    type="text"
                    [value]="payment.reference"
                    (input)="
                      setPaymentReference(index, $any($event.target).value)
                    "
                    maxlength="120"
                    placeholder="Opcional"
                  />
                </label>
                <button
                  type="button"
                  class="ui-button ui-button--danger pos-button pos-button--small"
                  (click)="removePaymentLine(index)"
                  [disabled]="payments.length === 1"
                >
                  Quitar
                </button>
              </article>
            </div>
          </section>

          <section class="receipt-panel">
            <header class="panel-head panel-head--compact">
              <div>
                <p class="panel-kicker">Comprobante</p>
                <h2>Tipo de documento</h2>
              </div>
            </header>

            <div class="receipt-type-list">
              <button
                type="button"
                class="receipt-segment"
                [class.is-active]="receiptType === 'TICKET'"
                (click)="setReceiptType('TICKET')"
              >
                Ticket interno
              </button>
              <button
                type="button"
                class="receipt-segment"
                [class.is-active]="receiptType === 'RECEIPT'"
                (click)="setReceiptType('RECEIPT')"
              >
                Boleta
              </button>
              <button
                type="button"
                class="receipt-segment"
                [class.is-active]="receiptType === 'INVOICE'"
                (click)="setReceiptType('INVOICE')"
              >
                Factura
              </button>
            </div>

            <div class="receipt-customer-grid" *ngIf="receiptType !== 'TICKET'">
              <label class="mini-field mini-field--wide">
                <span>Serie de comprobante *</span>
                <select
                  [value]="receiptSeriesId"
                  (change)="setReceiptSeriesId($any($event.target).value)"
                >
                  <option value="">Selecciona serie</option>
                  <option *ngFor="let row of filteredBillingSeries" [value]="row.id">
                    {{ row.series }}
                  </option>
                </select>
                <small class="field-inline-error" *ngIf="receiptSeriesInvalid">
                  Debes seleccionar una serie para emitir el comprobante.
                </small>
              </label>
            </div>

            <div class="receipt-no-series" *ngIf="showNoSeriesMessage">
              <p class="field-inline-error">
                {{ noSeriesMessage }}
              </p>
              <a
                class="ui-button ui-button--secondary pos-button pos-button--quiet receipt-series-link"
                [routerLink]="['/facturacion/series']"
              >
                Ir a series
              </a>
            </div>

            <div class="receipt-customer-grid" *ngIf="receiptType === 'RECEIPT'">
              <label class="mini-field">
                <span>Documento (DNI)</span>
                <input
                  type="text"
                  inputmode="numeric"
                  [value]="receiptCustomerDocument"
                  maxlength="8"
                  (input)="setReceiptCustomerDocument($any($event.target).value)"
                  (keydown)="blockInvalidNumericKeys($event)"
                  placeholder="Opcional"
                />
                <small class="field-inline-error" *ngIf="boletaDniInvalid">
                  El DNI debe tener exactamente 8 dígitos.
                </small>
              </label>
              <label class="mini-field mini-field--wide">
                <span>Nombre del cliente</span>
                <input
                  type="text"
                  [value]="receiptCustomerName"
                  maxlength="180"
                  (input)="setReceiptCustomerName($any($event.target).value)"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div class="receipt-customer-grid" *ngIf="receiptType === 'INVOICE'">
              <label class="mini-field">
                <span>RUC *</span>
                <input
                  type="text"
                  inputmode="numeric"
                  [value]="receiptCustomerDocument"
                  maxlength="11"
                  (input)="setReceiptCustomerDocument($any($event.target).value)"
                  (keydown)="blockInvalidNumericKeys($event)"
                  placeholder="11 dígitos"
                />
                <small class="field-inline-error" *ngIf="invoiceRucInvalid">
                  El RUC debe tener exactamente 11 dígitos.
                </small>
              </label>
              <label class="mini-field mini-field--wide">
                <span>Razón social *</span>
                <input
                  type="text"
                  [value]="receiptCustomerName"
                  maxlength="180"
                  (input)="setReceiptCustomerName($any($event.target).value)"
                  placeholder="Requerido para factura"
                />
                <small class="field-inline-error" *ngIf="invoiceBusinessNameInvalid">
                  La razón social es obligatoria.
                </small>
              </label>
            </div>

            <div class="receipt-extra" *ngIf="receiptType === 'INVOICE'">
              <button
                type="button"
                class="ui-button ui-button--secondary pos-button pos-button--quiet receipt-extra-toggle"
                (click)="toggleFiscalDetails()"
              >
                {{ showFiscalDetails ? "Ocultar" : "Mostrar" }} datos fiscales adicionales
              </button>

              <label class="mini-field" *ngIf="showFiscalDetails">
                <span>Dirección fiscal</span>
                <input
                  type="text"
                  [value]="receiptCustomerAddress"
                  maxlength="240"
                  (input)="setReceiptCustomerAddress($any($event.target).value)"
                  placeholder="Opcional en esta fase"
                />
              </label>
            </div>

            <small class="field-inline-error" *ngIf="receiptValidationError">
              {{ receiptValidationError }}
            </small>
          </section>

          <app-pos-totals-summary
            [total]="total"
            [subtotal]="subtotal"
            [discountTotal]="discountTotal"
            [paidTotal]="paidTotal"
            [change]="change"
          ></app-pos-totals-summary>

          <footer class="checkout-actions">
            <button
              type="button"
              class="ui-button ui-button--primary checkout-button"
              (click)="finalizeSale()"
              [disabled]="submitting || !!receiptValidationError"
            >
              {{ submitting ? "Cobrando..." : checkoutButtonLabel }}
            </button>
            <a
              *ngIf="lastSaleId"
              class="ui-button ui-button--secondary pos-button sale-link"
              [routerLink]="['/ventas', lastSaleId]"
            >
              Ver venta #{{ lastSaleId }}
            </a>
            <a
              *ngIf="showGoToBillingAction"
              class="ui-button ui-button--secondary pos-button sale-link"
              [routerLink]="['/facturacion/comprobantes']"
            >
              Ir a Comprobantes
            </a>
          </footer>
        </aside>
      </div>

      <section
        class="full-cart-backdrop"
        *ngIf="isFullCartOpen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-cart-title"
      >
        <article class="full-cart-modal">
          <header class="full-cart-header">
            <div>
              <h2 id="full-cart-title">Carrito completo</h2>
              <span class="full-cart-count">{{ cartCountLabel }}</span>
            </div>
            <div class="full-cart-summary">
              <span>Total actual</span>
              <strong>S/ {{ total | number: "1.2-2" }}</strong>
            </div>
            <button
              type="button"
              class="ui-button ui-button--secondary pos-button pos-button--quiet"
              (click)="closeFullCart()"
            >
              Cerrar
            </button>
          </header>

          <div class="full-cart-empty" *ngIf="cart.length === 0">
            <strong>Carrito vacio</strong>
            <span>Agrega productos desde el POS para revisar la venta.</span>
          </div>

          <div class="full-cart-list" *ngIf="cart.length > 0">
            <article
              class="full-cart-row"
              *ngFor="let item of cart; let index = index"
            >
              <div class="full-cart-product">
                <div class="full-cart-product-meta-row">
                  <p class="cart-item__sku">{{ item.sku }}</p>
                  <span class="full-cart-meta-separator" aria-hidden="true"
                    >·</span
                  >
                  <span class="full-cart-product-price">
                    P.U. S/ {{ item.salePrice | number: "1.2-2" }}
                  </span>
                  <span *ngIf="item.barcode" class="full-cart-barcode-note">
                    {{ item.barcode }}
                  </span>
                  <span *ngIf="!item.barcode" class="full-cart-barcode-note">
                    Sin código
                  </span>
                </div>
                <h3>{{ item.name }}</h3>
              </div>

              <label class="mini-field full-cart-quantity">
                <span>Cantidad</span>
                <div class="quantity-tools">
                  <button
                    type="button"
                    class="ui-button quantity-stepper"
                    (click)="decreaseQuantity(index)"
                    [disabled]="item.quantity <= 1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    [value]="item.quantity"
                    (focus)="selectQuantityInput($any($event.target))"
                    (click)="selectQuantityInput($any($event.target))"
                    (input)="
                      setQuantity(
                        index,
                        $any($event.target).value,
                        $any($event.target)
                      )
                    "
                  />
                  <button
                    type="button"
                    class="ui-button quantity-stepper"
                    (click)="increaseQuantity(index)"
                  >
                    +
                  </button>
                </div>
              </label>

              <label class="mini-field full-cart-discount">
                <span>Descuento</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  [value]="item.discountAmount"
                  (input)="setDiscount(index, $any($event.target).value)"
                />
              </label>

              <div class="full-cart-line">
                <span>Subtotal</span>
                <strong>S/ {{ lineTotal(item) | number: "1.2-2" }}</strong>
              </div>

              <button
                type="button"
                class="ui-button ui-button--secondary pos-button pos-button--small full-cart-remove"
                (click)="removeFromCart(index)"
              >
                Quitar
              </button>
            </article>
          </div>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }

      .pos-page {
        --pos-gap: 0.625rem;
        height: calc(100dvh - 7.5rem);
        max-height: calc(100dvh - 7.5rem);
        min-height: 0;
        padding: var(--space-3);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: var(--pos-gap);
        overflow: hidden;
      }

      h1,
      h2,
      h3 {
        margin: 0;
      }

      .inline-link {
        text-decoration: underline;
        font-weight: 700;
      }

      .pos-hero {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--space-2);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.74),
            rgba(16, 17, 20, 0.86)
          ),
          var(--color-brand-primary);
        color: var(--color-text-on-dark);
        padding: 0.36rem 0.55rem;
        box-shadow: var(--shadow-sm);
      }

      .pos-hero .ui-page-title {
        display: none;
      }

      .pos-hero .ui-page-kicker {
        display: none;
      }

      .pos-hero .ui-page-description {
        display: none;
      }

      .pos-hero__copy {
        display: none;
      }

      .pos-hero__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .pos-hero__actions .pos-button {
        min-height: 2.12rem;
        padding: 0.38rem 0.75rem;
        font-size: var(--font-size-sm);
      }

      .pos-cash-status {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        min-height: 2.12rem;
        max-width: min(42vw, 22rem);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-pill);
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
        padding: 0.34rem 0.65rem;
        font-size: var(--font-size-sm);
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pos-cash-status strong,
      .pos-cash-status span:not(.pos-cash-dot) {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pos-cash-status strong {
        flex: 0 0 auto;
        font-weight: 900;
      }

      .pos-cash-status span:not(.pos-cash-dot) {
        color: rgba(255, 255, 255, 0.78);
      }

      .pos-cash-dot {
        width: 0.58rem;
        height: 0.58rem;
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-success);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
      }

      .pos-cash-status--closed .pos-cash-dot {
        background: var(--color-danger);
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
      }

      .pos-shell {
        display: grid;
        grid-template-columns: minmax(0, 0.94fr) minmax(420px, 0.74fr);
        gap: var(--pos-gap);
        align-items: stretch;
        min-height: 0;
        overflow: hidden;
      }

      .pos-workspace,
      .checkout-panel {
        display: grid;
        gap: var(--pos-gap);
        min-height: 0;
        overflow: hidden;
      }

      .pos-workspace {
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .checkout-panel {
        position: static;
        height: 100%;
        grid-template-rows:
          minmax(16rem, 1.35fr) minmax(4.6rem, auto) minmax(4.8rem, auto)
          auto;
      }

      .pos-command,
      .results-panel,
      .cart-panel,
      .payment-panel,
      .receipt-panel,
      .total-board {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
      }

      .pos-command {
        display: grid;
        grid-template-columns: minmax(240px, 0.34fr) minmax(0, 1fr);
        gap: var(--space-2);
        padding: var(--space-2);
        align-items: end;
      }

      .field,
      .mini-field,
      .scan-field {
        display: grid;
        gap: var(--space-1);
      }

      .field > span,
      .mini-field > span,
      .scan-label {
        font-size: var(--font-size-sm);
        font-weight: 800;
        color: var(--color-text-secondary);
      }

      .field--warehouse {
        grid-column: 1;
        grid-row: 2;
        max-width: none;
      }

      .field--warehouse select {
        min-width: 0;
      }

      input,
      select,
      textarea {
        width: 100%;
        min-height: 2.55rem;
        padding: 0.58rem 0.72rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
      }

      .scan-card {
        grid-column: 1 / -1;
        grid-row: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: var(--space-2);
        border-radius: calc(var(--radius-lg) + 0.2rem);
        border: 2px solid rgba(18, 23, 184, 0.3);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.14),
            rgba(34, 197, 246, 0.08)
          ),
          var(--color-bg-soft);
        padding: 0.65rem;
      }

      .scan-label {
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
      }

      .scan-input {
        min-height: 2.8rem;
        border-width: 2px;
        border-color: rgba(18, 23, 184, 0.38);
        border-radius: var(--radius-lg);
        font-size: clamp(1rem, 1.35vw, 1.2rem);
        font-weight: 800;
        letter-spacing: 0.01em;
      }

      .scan-actions {
        display: grid;
        grid-template-columns: repeat(2, max-content);
        gap: var(--space-2);
        justify-content: start;
      }

      .manual-search__row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--space-2);
      }

      .quick-search {
        grid-column: 2;
        grid-row: 2;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-1);
        align-items: center;
        min-width: 0;
      }

      .quick-search > span {
        display: none;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .quick-search__buttons {
        display: flex;
        gap: var(--space-1);
        overflow-x: auto;
        padding-bottom: 0.05rem;
      }

      .quick-search__button {
        min-height: 1.9rem;
        flex: 0 0 auto;
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-soft);
        color: var(--color-text-primary);
        padding: 0.26rem 0.58rem;
        font-size: var(--font-size-sm);
        white-space: nowrap;
      }

      .scan-help,
      .result-hint,
      .cart-item__stock,
      .empty-cart span {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .scan-help,
      .result-hint {
        font-weight: 700;
        font-size: var(--font-size-xs);
      }

      .scan-help {
        display: none;
      }

      .manual-search {
        grid-column: 2;
        grid-row: 2;
        border-top: 0;
        padding-top: 0;
      }

      .pos-button,
      .checkout-button {
        min-height: 2.55rem;
        border-radius: var(--radius-md);
        padding: 0.58rem var(--space-4);
        font-size: var(--font-size-md);
      }

      .pos-button--scan {
        min-height: 2.8rem;
        background: var(--color-brand-accent);
        font-size: var(--font-size-md);
        letter-spacing: 0.01em;
      }

      .pos-button--add {
        width: 100%;
        min-height: 2.35rem;
        background: var(--color-brand-accent);
        font-size: var(--font-size-md);
      }

      .pos-button--quiet {
        background: #4b5563;
      }

      .pos-button--small {
        min-height: 2.35rem;
        padding-inline: var(--space-3);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .message-stack {
        display: grid;
        gap: var(--space-2);
      }

      .results-panel,
      .cart-panel,
      .payment-panel,
      .receipt-panel,
      .total-board {
        padding: var(--space-2);
        display: grid;
        gap: var(--space-2);
        min-height: 0;
        overflow: hidden;
      }

      .results-panel {
        grid-row: 3;
        grid-template-rows: auto minmax(0, 1fr);
      }

      .cart-panel {
        grid-template-rows: auto minmax(0, 1fr);
      }

      .payment-panel {
        grid-template-columns: max-content minmax(0, 1fr);
        align-items: stretch;
        min-height: 5rem;
        padding: 0.35rem;
        border-color: color-mix(in srgb, var(--color-border-default) 76%, transparent);
      }

      .receipt-panel {
        grid-template-columns: 1fr;
        padding: 0.5rem;
        border-color: color-mix(in srgb, var(--color-border-default) 76%, transparent);
      }

      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .panel-head--compact {
        align-items: center;
      }

      .payment-panel .panel-head--compact {
        align-items: flex-start;
        align-self: center;
        flex-direction: column;
        justify-content: center;
        gap: 0.2rem;
      }

      .panel-head h2 {
        font-size: 1.05rem;
        line-height: 1.1;
      }

      .payment-panel .panel-head h2 {
        font-size: 0.9rem;
      }

      .payment-panel .panel-kicker {
        display: none;
      }

      .payment-panel .pos-button {
        min-height: 2rem;
        padding: 0.3rem var(--space-2);
        font-size: var(--font-size-sm);
      }

      .cart-panel .pos-button--quiet {
        min-height: 2rem;
        padding: 0.36rem var(--space-2);
        font-size: var(--font-size-sm);
      }

      .cart-head-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-1);
        flex-wrap: wrap;
      }

      .panel-kicker {
        margin: 0 0 var(--space-1);
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
      }

      .results-panel .result-hint {
        display: none;
      }

      .results-grid {
        grid-row: 2;
        display: grid;
        grid-template-columns: 1fr;
        align-content: start;
        gap: 0.25rem;
        min-height: 0;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .empty-results {
        grid-row: 2;
        display: grid;
        place-items: center;
        gap: var(--space-1);
        min-height: 0;
        border: 2px dashed var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        text-align: center;
        padding: var(--space-4);
      }

      .result-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(198px, auto);
        gap: 0.45rem;
        align-items: center;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(
            180deg,
            rgba(18, 23, 184, 0.04),
            rgba(18, 23, 184, 0)
          ),
          var(--color-bg-surface);
        padding: 0.35rem;
      }

      .result-card__body,
      .result-card__action,
      .cart-item__main {
        display: grid;
        gap: 0.14rem;
      }

      .result-card__body {
        min-width: 0;
      }

      .result-card__meta-row {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 0.34rem;
        min-width: 0;
        flex-wrap: wrap;
        opacity: 0.82;
      }

      .result-card h3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        font-size: 1.06rem;
        font-weight: 900;
        line-height: 1.18;
        color: var(--color-text-primary);
      }

      .result-card__action {
        grid-template-columns: minmax(72px, auto) minmax(7.5rem, 1fr);
        align-items: center;
        align-content: center;
        gap: 0.5rem;
      }

      .result-add-button {
        width: 100%;
        min-width: 7.5rem;
        justify-self: stretch;
      }

      .result-card__sku,
      .cart-item__sku {
        margin: 0;
        width: fit-content;
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        padding: 0.03rem 0.3rem;
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.03em;
      }

      .result-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 0.22rem;
        min-width: 0;
        margin: 0;
      }

      .result-card__meta-separator {
        color: var(--color-text-secondary);
        font-weight: 700;
        font-size: 0.56rem;
        line-height: 1;
      }

      .result-meta__code,
      .result-meta__stock,
      .total-grid article {
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: 0.3rem 0.45rem;
      }

      .result-meta__code,
      .result-meta__stock {
        display: inline-flex;
        align-items: center;
        gap: 0.22rem;
        padding: 0.03rem 0.3rem;
        white-space: nowrap;
        color: var(--color-text-secondary);
        font-size: 0.58rem;
        font-weight: 700;
      }

      .result-meta__label,
      .total-grid span,
      .cart-item__footer span,
      .total-main span {
        color: var(--color-text-secondary);
        font-size: 0.56rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .result-meta__value {
        margin: 0;
        font-weight: 700;
      }

      .barcode-badge {
        display: inline-flex;
        width: fit-content;
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        padding: 0.03rem 0.3rem;
        font-size: 0.58rem;
        font-weight: 700;
      }

      .barcode-badge--missing {
        border: 1px solid var(--color-border-default);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
      }

      .result-price {
        margin: 0;
        color: var(--color-brand-primary);
        font-size: clamp(0.98rem, 1.35vw, 1.18rem);
        font-weight: 900;
        text-align: right;
        line-height: 1;
      }

      .cart-list,
      .payment-list {
        display: grid;
        align-content: start;
        gap: var(--space-2);
        min-height: 0;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .cart-list {
        overflow: auto;
      }

      .payment-list {
        align-content: center;
        max-height: 5.4rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 0;
      }

      .cart-item,
      .payment-line {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: 0.55rem;
      }

      .cart-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(82px, auto);
        gap: 0.38rem var(--space-2);
        align-items: start;
      }

      .cart-item__main {
        grid-column: 1;
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
        gap: 0.18rem;
        align-content: start;
        min-width: 0;
      }

      .cart-item__meta-row {
        display: flex;
        align-items: center;
        gap: 0.28rem;
        min-width: 0;
        flex-wrap: wrap;
      }

      .cart-item__meta-separator {
        color: var(--color-text-secondary);
        font-size: 0.58rem;
        font-weight: 700;
        line-height: 1;
      }

      .cart-item__main h3 {
        font-size: 0.98rem;
        line-height: 1.15;
        font-weight: 900;
      }

      .cart-item__stock {
        margin: 0;
        font-size: 0.62rem;
        color: var(--color-text-secondary);
        font-weight: 700;
        letter-spacing: 0.03em;
      }

      .cart-item__controls {
        grid-column: 1;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-1);
        align-content: end;
      }

      .cart-item__footer {
        grid-column: 2;
        grid-row: 1 / span 2;
        display: grid;
        align-self: center;
        align-content: center;
        align-items: stretch;
        gap: 0.28rem;
        border-left: 1px solid var(--color-border-default);
        border-top: 0;
        padding-left: 0.38rem;
        padding-top: 0;
      }

      .cart-item__footer div {
        display: grid;
        align-content: start;
        gap: 0.06rem;
      }

      .cart-item__footer span {
        line-height: 1.05;
      }

      .cart-item__footer strong {
        font-size: var(--font-size-sm);
        line-height: 1.1;
      }

      .cart-item__remove {
        min-height: 2.05rem;
        box-shadow: none;
        opacity: 0.92;
      }

      .cart-item .mini-field > span {
        font-size: 0.68rem;
      }

      .mini-field input,
      .mini-field select {
        min-height: 2.35rem;
        font-weight: 800;
      }

      .cart-item .mini-field input {
        min-height: 1.75rem;
        padding: 0.24rem 0.42rem;
      }

      .quantity-tools {
        display: grid;
        grid-template-columns: 1.8rem minmax(3.2rem, 1fr) 1.8rem;
        gap: 0.22rem;
        align-items: center;
      }

      .quantity-tools input {
        text-align: center;
      }

      .quantity-stepper {
        min-height: 1.75rem;
        padding: 0;
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        border: 1px solid var(--color-border-strong);
        color: var(--color-text-primary);
        font-weight: 900;
      }

      .payment-line {
        display: grid;
        grid-template-columns:
          minmax(132px, 0.92fr) minmax(74px, 0.46fr) minmax(108px, 0.95fr)
          minmax(66px, auto);
        gap: 0.28rem;
        align-items: end;
        min-width: 0;
      }

      .payment-line .mini-field > span {
        font-size: 0.68rem;
      }

      .payment-line input,
      .payment-line select {
        min-height: 2rem;
        padding: 0.28rem 0.42rem;
      }

      .payment-line select {
        font-weight: 700;
      }

      .payment-line .pos-button--small {
        min-height: 2.05rem;
        padding-inline: var(--space-2);
      }

      .receipt-type-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: var(--space-2);
      }

      .receipt-segment {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        padding: 0.48rem 0.58rem;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--color-bg-soft);
        cursor: pointer;
        font-size: var(--font-size-sm);
        font-weight: 700;
        min-height: 2.15rem;
      }

      .receipt-segment.is-active {
        border-color: var(--color-brand-primary);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-brand-primary) 35%, transparent);
        background: color-mix(in srgb, var(--color-brand-primary) 8%, var(--color-bg-soft));
      }

      .receipt-customer-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: var(--space-2);
      }

      .receipt-extra {
        display: grid;
        gap: var(--space-2);
      }

      .receipt-no-series {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .receipt-series-link {
        min-height: 2rem;
        padding: 0.34rem var(--space-2);
        font-size: var(--font-size-sm);
      }

      .receipt-extra-toggle {
        min-height: 2rem;
        padding: 0.34rem var(--space-2);
        font-size: var(--font-size-sm);
      }

      .field-inline-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .empty-cart {
        display: grid;
        gap: var(--space-1);
        place-items: center;
        min-height: 4.6rem;
        border: 2px dashed var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        text-align: center;
        padding: var(--space-3);
      }

      .total-board {
        border-color: rgba(18, 23, 184, 0.28);
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        align-items: stretch;
        min-height: 4.35rem;
        padding: 0.35rem;
      }

      .total-main {
        display: grid;
        gap: var(--space-1);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(135deg, var(--color-brand-primary), #0f172a),
          var(--color-brand-primary);
        color: var(--color-text-on-dark);
        padding: 0.4rem var(--space-2);
      }

      .total-main span {
        color: rgba(255, 255, 255, 0.78);
      }

      .total-main strong {
        font-size: clamp(1.35rem, 2vw, 1.75rem);
        line-height: 1;
      }

      .total-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-1);
      }

      .total-grid article {
        display: grid;
        gap: 0;
        padding: 0.22rem var(--space-1);
      }

      .total-grid strong {
        font-size: var(--font-size-sm);
      }

      .total-change strong {
        color: var(--color-success);
      }

      .checkout-actions {
        display: grid;
        gap: var(--space-1);
      }

      .checkout-button {
        min-height: 2.65rem;
        border-radius: var(--radius-lg);
        background: var(--color-brand-accent);
        font-size: clamp(1.05rem, 1.7vw, 1.35rem);
        font-weight: 900;
        letter-spacing: 0.06em;
      }

      .full-cart-backdrop {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: grid;
        place-items: center;
        padding: var(--space-4);
        background: rgba(16, 17, 20, 0.62);
        backdrop-filter: blur(3px);
      }

      .full-cart-modal {
        width: min(980px, calc(100vw - 2rem));
        max-height: min(720px, calc(100dvh - 2rem));
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: calc(var(--radius-lg) + 0.35rem);
        background: var(--color-bg-surface);
        box-shadow: 0 24px 80px rgba(16, 17, 20, 0.36);
        padding: var(--space-4);
        overflow: hidden;
      }

      .full-cart-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: var(--space-3);
        align-items: center;
      }

      .full-cart-header h2 {
        font-size: clamp(1.25rem, 2vw, 1.6rem);
      }

      .full-cart-count {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 800;
      }

      .full-cart-summary {
        display: grid;
        place-items: center;
        gap: 0.05rem;
        min-width: 10.75rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(
            180deg,
            var(--color-bg-surface),
            var(--color-bg-soft)
          ),
          var(--color-bg-soft);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        padding: 0.62rem var(--space-3);
        text-align: center;
      }

      .full-cart-summary span,
      .full-cart-line span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .full-cart-summary strong {
        color: var(--color-text-primary);
        font-size: clamp(1.38rem, 2vw, 1.65rem);
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        letter-spacing: -0.03em;
        line-height: 1.05;
      }

      .full-cart-empty {
        display: grid;
        place-items: center;
        gap: var(--space-1);
        min-height: 16rem;
        border: 2px dashed var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        text-align: center;
      }

      .full-cart-list {
        display: grid;
        align-content: start;
        gap: var(--space-2);
        min-height: 0;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .full-cart-row {
        display: grid;
        grid-template-columns:
          minmax(240px, 1.6fr) minmax(142px, 0.58fr)
          minmax(96px, 0.36fr) minmax(108px, 0.42fr) minmax(76px, auto);
        gap: 0.55rem;
        align-items: center;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: 0.62rem 0.7rem;
      }

      .full-cart-product {
        display: grid;
        gap: 0.16rem;
        align-content: center;
        align-items: start;
        min-width: 0;
      }

      .full-cart-product-meta-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.22rem 0.32rem;
        min-width: 0;
        color: var(--color-text-secondary);
        font-size: 0.58rem;
        opacity: 0.8;
      }

      .full-cart-product .cart-item__sku {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        line-height: 1.15;
      }

      .full-cart-product h3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        text-overflow: ellipsis;
        white-space: normal;
        font-size: 1rem;
        font-weight: 900;
        line-height: 1.16;
      }

      .full-cart-product-price {
        font-weight: 700;
        color: var(--color-text-secondary);
        white-space: nowrap;
      }

      .full-cart-barcode-note {
        display: inline-flex;
        width: fit-content;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        padding: 0.03rem 0.34rem;
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .full-cart-meta-separator {
        color: var(--color-text-secondary);
        font-size: 0.58rem;
        font-weight: 700;
        line-height: 1;
      }

      .full-cart-line {
        display: grid;
        gap: 0.08rem;
        align-self: center;
        min-width: 0;
        justify-items: end;
      }

      .full-cart-line strong {
        color: var(--color-text-primary);
        font-size: 1rem;
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        line-height: 1.08;
      }

      .full-cart-remove {
        min-height: 2.2rem;
        border-color: var(--color-border-default);
        color: var(--color-danger);
        background: color-mix(
          in srgb,
          var(--color-danger) 8%,
          var(--color-bg-surface)
        );
        box-shadow: none;
        opacity: 0.96;
      }

      .sale-link {
        width: 100%;
      }

      :host-context(body[data-theme="dark"]) .scan-card {
        border-color: rgba(96, 165, 250, 0.46);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.34),
            rgba(56, 189, 248, 0.16)
          ),
          var(--color-bg-soft);
      }

      :host-context(body[data-theme="dark"]) .result-card {
        background:
          linear-gradient(
            180deg,
            rgba(244, 194, 13, 0.08),
            rgba(244, 194, 13, 0)
          ),
          var(--color-bg-surface);
      }

      :host-context(body[data-theme="dark"]) .full-cart-summary {
        border-color: rgba(96, 165, 250, 0.32);
        background:
          linear-gradient(
            180deg,
            rgba(30, 41, 59, 0.94),
            rgba(15, 23, 42, 0.88)
          ),
          var(--color-bg-soft);
      }

      :host-context(body[data-theme="dark"]) .full-cart-barcode-note {
        border-color: rgba(148, 163, 184, 0.24);
        background: rgba(148, 163, 184, 0.1);
      }

      :host-context(body[data-theme="dark"]) .full-cart-remove {
        background: rgba(220, 38, 38, 0.08);
      }

      .results-grid::-webkit-scrollbar,
      .cart-list::-webkit-scrollbar,
      .payment-list::-webkit-scrollbar,
      .full-cart-list::-webkit-scrollbar {
        width: 8px;
      }

      .results-grid::-webkit-scrollbar-track,
      .cart-list::-webkit-scrollbar-track,
      .payment-list::-webkit-scrollbar-track,
      .full-cart-list::-webkit-scrollbar-track {
        background: var(--color-bg-soft);
        border-radius: var(--radius-pill);
      }

      .results-grid::-webkit-scrollbar-thumb,
      .cart-list::-webkit-scrollbar-thumb,
      .payment-list::-webkit-scrollbar-thumb,
      .full-cart-list::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          var(--color-brand-highlight),
          var(--color-brand-accent)
        );
        border-radius: var(--radius-pill);
      }

      @media (max-height: 820px) and (min-width: 981px) {
        .pos-page {
          height: calc(100dvh - 7rem);
          max-height: calc(100dvh - 7rem);
          padding: var(--space-2);
        }

        .pos-hero {
          padding: var(--space-2) var(--space-3);
        }

        .pos-cash-badge {
          min-height: 2rem;
        }

        .pos-cash-strip {
          padding: 0.32rem 0.6rem;
        }

        .pos-hero .ui-page-description {
          display: none;
        }

        .scan-help,
        .result-hint,
        .quick-search > span {
          display: none;
        }

        .quick-search {
          grid-template-columns: 1fr;
        }

        .quick-search__button {
          min-height: 1.75rem;
          padding: 0.2rem 0.5rem;
          font-size: var(--font-size-xs);
        }

        .scan-input {
          min-height: 2.85rem;
        }

        .payment-list {
          max-height: 5.4rem;
        }
      }

      @media (max-width: 980px) {
        :host {
          height: auto;
        }

        .pos-page {
          height: auto;
          max-height: none;
          min-height: 0;
          overflow: visible;
        }

        .pos-shell {
          grid-template-columns: 1fr;
          overflow: visible;
        }

        .pos-workspace,
        .checkout-panel {
          overflow: visible;
          height: auto;
        }

        .checkout-panel {
          grid-template-rows: auto;
        }

        .results-grid,
        .cart-list,
        .payment-list {
          max-height: 18rem;
        }

        .receipt-type-list,
        .receipt-customer-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .pos-page {
          padding: var(--space-3);
        }

        .pos-hero,
        .panel-head,
        .panel-head--compact,
        .cart-item__footer {
          align-items: stretch;
          flex-direction: column;
        }

        .pos-hero__actions,
        .pos-command,
        .scan-card,
        .scan-actions,
        .manual-search__row,
        .quick-search,
        .cart-item__controls,
        .payment-line,
        .result-card,
        .total-board,
        .total-grid {
          grid-template-columns: 1fr;
        }

        .payment-panel,
        .cart-item {
          grid-template-columns: 1fr;
        }

        .full-cart-header,
        .full-cart-row {
          grid-template-columns: 1fr;
        }

        .full-cart-summary {
          text-align: left;
        }

        .cart-item__main,
        .cart-item__controls,
        .cart-item__footer {
          grid-column: 1;
          grid-row: auto;
        }

        .cart-item__footer {
          border-left: 0;
          border-top: 1px solid var(--color-border-default);
          padding-left: 0;
          padding-top: var(--space-2);
        }

        .pos-hero__actions,
        .panel-head {
          width: 100%;
        }

        .pos-cash-status {
          width: 100%;
          max-width: none;
        }

        .scan-card,
        .field--warehouse,
        .manual-search,
        .quick-search {
          grid-column: 1;
          grid-row: auto;
        }

        .pos-button,
        .checkout-button {
          width: 100%;
        }

        .result-price {
          text-align: left;
        }
      }
    `,
  ],
})
export class PosPageComponent implements OnInit, OnDestroy {
  readonly quickSearchTerms = [
    "Cartulina",
    "Papelógrafo",
    "Copia",
    "Impresión",
    "Goma eva",
    "Cinta",
    "Elástico",
    "Cordón",
  ];

  readonly saleForm = this.formBuilder.group({
    warehouseId: [null as number | null, Validators.required],
    code: [""],
    query: [""],
  });

  warehouses: WarehouseResponse[] = [];
  currentCashSession: CashRegisterResponse | null = null;
  currentUserId: string | null = null;
  searchResults: PosProductResponse[] = [];
  cart: PosCartItem[] = [];
  payments: PaymentLine[] = [
    { paymentMethod: "CASH", amount: 0, reference: "" },
  ];
  receiptType: PosReceiptType = "TICKET";
  receiptSeriesId = "";
  receiptCustomerDocument = "";
  receiptCustomerName = "";
  receiptCustomerAddress = "";
  showFiscalDetails = false;
  billingSeriesRows: BillingSeriesResponse[] = [];

  loadingLookup = false;
  loadingSearch = false;
  submitting = false;
  isFullCartOpen = false;

  errorMessage = "";
  warningMessage = "";
  successMessage = "";
  lastSaleId: number | null = null;
  showGoToBillingAction = false;

  private readonly subscriptions = new Subscription();
  private warehousesLoaded = false;
  private currentUserLoaded = false;
  private cashSessionLoaded = false;
  private draftInitialized = false;
  private isHydratingDraft = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly warehouseService: WarehouseService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly posService: PosService,
    private readonly posStateService: PosStateService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly salesService: SalesService,
    private readonly billingSeriesService: BillingSeriesService,
    private readonly electronicDocumentService: ElectronicDocumentService,
  ) {}

  ngOnInit(): void {
    this.bindDraftPersistence();
    this.loadCurrentUser();
    this.loadWarehouses();
    this.refreshCashSession();
    this.loadBillingSeries();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private bindDraftPersistence(): void {
    const codeControl = this.saleForm.controls.code;
    const warehouseControl = this.saleForm.controls.warehouseId;

    this.subscriptions.add(
      codeControl.valueChanges.subscribe((value) => {
        if (this.isHydratingDraft) {
          return;
        }

        const code = typeof value === "string" ? value : "";
        if (this.saleForm.controls.query.value !== code) {
          this.saleForm.patchValue({ query: code }, { emitEvent: false });
        }
        this.persistDraftState();
      }),
    );

    this.subscriptions.add(
      warehouseControl.valueChanges.subscribe(() => {
        if (!this.isHydratingDraft) {
          this.persistDraftState();
        }
      }),
    );
  }

  private loadCurrentUser(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.currentUserLoaded = true;
        this.maybeRestoreDraft();
      },
      error: () => {
        this.currentUserId = null;
        this.currentUserLoaded = true;
        this.maybeRestoreDraft();
      },
    });
  }

  private maybeRestoreDraft(): void {
    if (
      this.draftInitialized ||
      !this.warehousesLoaded ||
      !this.currentUserLoaded ||
      !this.cashSessionLoaded
    ) {
      return;
    }

    this.draftInitialized = true;

    const draft = this.posStateService.load();

    if (!this.currentCashSession) {
      this.posStateService.clearAll();
      this.initializeEmptyDraft(draft?.lastWarehouseId ?? null, false);
      return;
    }

    if (
      draft &&
      draft.userId &&
      this.currentUserId &&
      draft.userId !== this.currentUserId
    ) {
      this.posStateService.clearAll();
      this.initializeEmptyDraft(draft.lastWarehouseId, true);
      return;
    }

    if (
      draft &&
      draft.cashRegisterSessionId !== null &&
      draft.cashRegisterSessionId !== this.currentCashSession.id
    ) {
      this.posStateService.clearAll();
      this.initializeEmptyDraft(draft.lastWarehouseId, true);
      return;
    }

    if (draft) {
      this.restoreDraft(draft);
      return;
    }

    this.initializeEmptyDraft(null, true);
  }

  private restoreDraft(draft: PosDraftState): void {
    const warehouseId = this.resolveWarehouseId(
      draft.warehouseId ?? draft.lastWarehouseId,
    );

    this.isHydratingDraft = true;
    this.saleForm.patchValue(
      {
        warehouseId,
        code: draft.code,
        query: draft.query || draft.code,
      },
      { emitEvent: false },
    );
    this.searchResults = [...draft.searchResults];
    this.cart = draft.cart.map((item) => ({ ...item }));
    this.payments =
      draft.payments.length > 0
        ? draft.payments.map((payment) => ({ ...payment }))
        : [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.lastSaleId = draft.lastSaleId;
    this.receiptType = "TICKET";
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.isHydratingDraft = false;

    this.persistDraftState();
  }

  private initializeEmptyDraft(
    preferredWarehouseId: number | null,
    persistState: boolean,
  ): void {
    const warehouseId = this.resolveWarehouseId(preferredWarehouseId);

    this.isHydratingDraft = true;
    this.saleForm.patchValue(
      {
        warehouseId,
        code: "",
        query: "",
      },
      { emitEvent: false },
    );
    this.searchResults = [];
    this.cart = [];
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.lastSaleId = null;
    this.receiptType = "TICKET";
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.successMessage = "";
    this.isHydratingDraft = false;

    if (persistState) {
      this.persistDraftState();
    }
  }

  private resolveWarehouseId(preferredWarehouseId: number | null): number | null {
    if (
      preferredWarehouseId !== null &&
      this.warehouses.some((warehouse) => warehouse.id === preferredWarehouseId)
    ) {
      return preferredWarehouseId;
    }

    if (this.warehouses.length > 0) {
      return this.warehouses[0].id;
    }

    return null;
  }

  private persistDraftState(): void {
    if (this.isHydratingDraft || !this.currentUserId || !this.currentCashSession) {
      return;
    }

    const currentWarehouseId = this.saleForm.value.warehouseId ?? null;
    const existingDraft = this.posStateService.load();

    this.posStateService.save({
      userId: this.currentUserId,
      cashRegisterSessionId: this.currentCashSession.id,
      warehouseId: currentWarehouseId,
      lastWarehouseId: currentWarehouseId ?? existingDraft?.lastWarehouseId ?? null,
      code: this.saleForm.value.code ?? "",
      query: this.saleForm.value.query ?? this.saleForm.value.code ?? "",
      searchResults: this.searchResults.map((item) => ({ ...item })),
      cart: this.cart.map((item) => ({ ...item })),
      payments: this.payments.map((payment) => ({ ...payment })),
      lastSaleId: this.lastSaleId,
    });
  }

  private resetDraftAfterCheckout(preserveLastSaleId: boolean): void {
    const warehouseId = this.saleForm.value.warehouseId ?? null;

    this.isHydratingDraft = true;
    this.saleForm.patchValue(
      {
        warehouseId,
        code: "",
        query: "",
      },
      { emitEvent: false },
    );
    this.searchResults = [];
    this.cart = [];
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    if (!preserveLastSaleId) {
      this.lastSaleId = null;
    }
    this.receiptType = "TICKET";
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.errorMessage = "";
    this.warningMessage = "";
    if (!preserveLastSaleId) {
      this.successMessage = "";
      this.showGoToBillingAction = false;
    }
    this.isHydratingDraft = false;

    this.posStateService.clearDraft(preserveLastSaleId);

    if (this.currentCashSession && this.currentUserId) {
      this.persistDraftState();
    }
  }

  cancelSale(): void {
    this.resetDraftAfterCheckout(false);
  }

  get subtotal(): number {
    return calculatePosSubtotal(this.cart);
  }

  get discountTotal(): number {
    return calculatePosDiscountTotal(this.cart);
  }

  get total(): number {
    return calculatePosTotal(this.cart);
  }

  get paidTotal(): number {
    return calculatePosPaidTotal(this.payments);
  }

  get change(): number {
    return calculatePosChange(this.cart, this.payments);
  }

  get selectedWarehouseLabel(): string {
    const warehouseId = this.saleForm.value.warehouseId;
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse
      ? `${warehouse.code} - ${warehouse.name}`
      : "Selecciona almacen";
  }

  getWarehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona almacen";
  }

  get cartTitle(): string {
    if (this.cart.length === 0) {
      return "Carrito";
    }

    return `Carrito · ${this.cartCountLabel}`;
  }

  get cartCountLabel(): string {
    return this.cart.length === 1 ? "1 ítem" : `${this.cart.length} ítems`;
  }

  get cartLineTotals(): number[] {
    return this.cart.map((item) => this.lineTotal(item));
  }

  @HostListener("document:keydown.escape")
  closeFullCartOnEscape(): void {
    this.closeFullCart();
  }

  private buildFinalizeConfirmationMessage(): string {
    const customerLines =
      this.receiptType === "TICKET"
        ? []
        : [
            `Cliente: ${this.receiptCustomerName.trim() || "No especificado"}`,
            `Documento: ${this.receiptCustomerDocument.trim() || "No especificado"}`,
          ];

    return [
      "Estas a punto de registrar una venta real.",
      "",
      this.receiptType === "TICKET"
        ? "Se registrará una venta interna."
        : "Se registrará la venta y se generará el comprobante.",
      `Comprobante: ${this.receiptTypeLabel}`,
      ...customerLines,
      `Cantidad de items: ${this.cart.length}`,
      `Total: S/ ${this.total.toFixed(2)}`,
      `Monto pagado: S/ ${this.paidTotal.toFixed(2)}`,
      `Vuelto: S/ ${this.change.toFixed(2)}`,
      "",
      "Confirmas finalizar la venta?",
    ].join("\n");
  }

  lookupByCode(): void {
    const code = (this.saleForm.value.code ?? "").trim();
    if (!code) {
      this.errorMessage = "Ingresa un SKU o barcode para buscar.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;
    if (!warehouseId) {
      this.errorMessage = "Selecciona un almacen antes de buscar por codigo.";
      return;
    }

    this.loadingLookup = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.posService.lookup(code, warehouseId).subscribe({
      next: (product) => {
        this.loadingLookup = false;
        this.addToCart(product);
        this.saleForm.patchValue({ code: "" });
        this.persistDraftState();
      },
      error: (error: unknown) => {
        this.loadingLookup = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo consultar el producto por codigo.",
        );
      },
    });
  }

  submitUnifiedSearch(): void {
    this.searchUnifiedText();
  }

  addExactFromUnifiedSearch(): void {
    this.lookupByCode();
  }

  searchUnifiedText(
    rawQuery = this.saleForm.value.query ?? this.saleForm.value.code ?? "",
  ): void {
    const query = rawQuery.trim();
    if (query.length < 2) {
      this.errorMessage =
        "Ingresa al menos 2 caracteres para buscar por nombre o SKU.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;

    this.loadingSearch = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.posService.search(query, warehouseId).subscribe({
      next: (results) => {
        this.loadingSearch = false;
        this.searchResults = results;
        if (results.length === 0) {
          this.errorMessage = "No se encontraron productos para la busqueda.";
        }
        this.persistDraftState();
      },
      error: (error: unknown) => {
        this.loadingSearch = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo realizar la busqueda por nombre.",
        );
      },
    });
  }

  searchByName(): void {
    this.searchUnifiedText(this.saleForm.value.query ?? this.saleForm.value.code ?? "");
  }

  applyQuickSearch(term: string): void {
    this.saleForm.patchValue({ code: term, query: term });
    this.searchUnifiedText(term);
  }

  private lookupUnifiedSearch(fallbackToSearch: boolean): void {
    if (fallbackToSearch) {
      this.searchUnifiedText();
      return;
    }

    this.lookupByCode();
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status?: number }).status === 404
    );
  }

  openFullCart(): void {
    if (this.cart.length === 0) {
      return;
    }

    this.isFullCartOpen = true;
  }

  closeFullCart(): void {
    this.isFullCartOpen = false;
  }

  addToCart(product: PosProductResponse): void {
    this.errorMessage = "";
    this.successMessage = "";

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      this.errorMessage =
        "Selecciona un almacen antes de agregar productos al carrito.";
      return;
    }

    if (this.cart.length === 0 && this.lastSaleId !== null) {
      this.lastSaleId = null;
    }

    const existing = this.cart.find(
      (item) => item.productId === product.productId,
    );

    if (existing) {
      const nextQty = existing.quantity + 1;
      if (nextQty > this.availableIntegerStock(existing)) {
        this.errorMessage = `Stock insuficiente para ${product.sku}. Disponible: ${product.stockAvailable}.`;
        return;
      }
      existing.quantity = nextQty;
      this.persistDraftState();
      return;
    }

    const availableStock = Math.floor(
      normalizePosNumber(product.stockAvailable),
    );

    if (availableStock <= 0) {
      this.errorMessage = `El producto ${product.sku} no tiene stock disponible.`;
      return;
    }

    this.cart.push({
      productId: product.productId,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      salePrice: normalizePosNumber(product.salePrice),
      stockAvailable: normalizePosNumber(product.stockAvailable),
      quantity: 1,
      discountAmount: 0,
    });

    this.persistDraftState();
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
    this.persistDraftState();
  }

  clearCart(clearLastSaleReference = true): void {
    this.cart = [];
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    if (clearLastSaleReference) {
      this.lastSaleId = null;
    }
    this.persistDraftState();
  }

  selectQuantityInput(input: HTMLInputElement): void {
    input.select();
  }

  setQuantity(index: number, rawValue: string, input?: HTMLInputElement): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = normalizePosQuantity(rawValue);
    const maxStock = this.availableIntegerStock(item);

    if (parsed > maxStock) {
      this.errorMessage = `Cantidad excede stock disponible (${item.stockAvailable}) para ${item.sku}.`;
      item.quantity = Math.max(maxStock, 1);
      if (input) {
        input.value = String(item.quantity);
      }
      return;
    }

    item.quantity = parsed;
    if (input) {
      input.value = String(item.quantity);
    }

    this.persistDraftState();
  }

  increaseQuantity(index: number): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    this.setQuantity(index, String(item.quantity + 1));
  }

  decreaseQuantity(index: number): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    this.setQuantity(index, String(item.quantity - 1));
  }

  availableIntegerStock(item: Pick<PosCartItem, "stockAvailable">): number {
    return Math.floor(normalizePosNumber(item.stockAvailable));
  }

  setDiscount(index: number, rawValue: string): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = Math.max(normalizePosNumber(rawValue), 0);
    const maxDiscount = this.lineSubtotal(item);

    if (parsed > maxDiscount) {
      item.discountAmount = maxDiscount;
      this.persistDraftState();
      return;
    }

    item.discountAmount = parsed;
    this.persistDraftState();
  }

  lineSubtotal(item: PosCartItem): number {
    return calculatePosLineSubtotal(item);
  }

  lineTotal(item: PosCartItem): number {
    return calculatePosLineTotal(item);
  }

  addPaymentLine(): void {
    this.payments.push({ paymentMethod: "CASH", amount: 0, reference: "" });
    this.persistDraftState();
  }

  removePaymentLine(index: number): void {
    if (this.payments.length === 1) {
      return;
    }
    this.payments.splice(index, 1);
    this.persistDraftState();
  }

  setPaymentMethod(index: number, value: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      payment.paymentMethod = value;
      this.persistDraftState();
    }
  }

  setPaymentAmount(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.amount = Math.max(normalizePosNumber(rawValue), 0);
    this.persistDraftState();
  }

  setPaymentReference(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.reference = rawValue;
    this.persistDraftState();
  }

  setReceiptType(type: PosReceiptType): void {
    this.receiptType = type;
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;

    const firstSeries = this.filteredBillingSeries[0];
    if (firstSeries) {
      this.receiptSeriesId = String(firstSeries.id);
    }
  }

  setReceiptSeriesId(rawValue: string): void {
    this.receiptSeriesId = String(rawValue || "");
  }

  toggleFiscalDetails(): void {
    this.showFiscalDetails = !this.showFiscalDetails;
  }

  setReceiptCustomerDocument(rawValue: string): void {
    const maxLength = this.receiptType === "INVOICE" ? 11 : 8;
    this.receiptCustomerDocument = rawValue.replace(/\D/g, "").slice(0, maxLength);
  }

  setReceiptCustomerName(rawValue: string): void {
    this.receiptCustomerName = rawValue;
  }

  setReceiptCustomerAddress(rawValue: string): void {
    this.receiptCustomerAddress = rawValue;
  }

  blockInvalidNumericKeys(event: KeyboardEvent): void {
    if (["e", "E", "+", "-", ",", "."].includes(event.key)) {
      event.preventDefault();
    }
  }

  get receiptTypeLabel(): string {
    switch (this.receiptType) {
      case "RECEIPT":
        return "Boleta";
      case "INVOICE":
        return "Factura";
      default:
        return "Ticket interno";
    }
  }

  get checkoutButtonLabel(): string {
    return this.receiptType === "TICKET" ? "COBRAR" : "COBRAR Y EMITIR";
  }

  get filteredBillingSeries(): BillingSeriesResponse[] {
    if (this.receiptType === "TICKET") {
      return [];
    }
    const targetType: ElectronicDocumentType =
      this.receiptType === "INVOICE" ? "INVOICE" : "RECEIPT";
    return this.billingSeriesRows.filter(
      (row) => row.active && row.documentType === targetType,
    );
  }

  get receiptSeriesInvalid(): boolean {
    if (this.receiptType === "TICKET") {
      return false;
    }
    return !this.receiptSeriesId;
  }

  get showNoSeriesMessage(): boolean {
    return this.receiptType !== "TICKET" && this.filteredBillingSeries.length === 0;
  }

  get noSeriesMessage(): string {
    if (this.receiptType === "INVOICE") {
      return "No hay series activas para Factura. Configúralas en Facturación → Series y correlativos.";
    }
    if (this.receiptType === "RECEIPT") {
      return "No hay series activas para Boleta. Configúralas en Facturación → Series y correlativos.";
    }
    return "";
  }

  get boletaDniInvalid(): boolean {
    if (this.receiptType !== "RECEIPT") {
      return false;
    }
    const dni = this.receiptCustomerDocument.trim();
    return dni.length > 0 && dni.length !== 8;
  }

  get invoiceRucInvalid(): boolean {
    if (this.receiptType !== "INVOICE") {
      return false;
    }
    return this.receiptCustomerDocument.trim().length !== 11;
  }

  get invoiceBusinessNameInvalid(): boolean {
    if (this.receiptType !== "INVOICE") {
      return false;
    }
    return !this.receiptCustomerName.trim();
  }

  get receiptValidationError(): string {
    if (this.showNoSeriesMessage) {
      return this.noSeriesMessage;
    }
    if (this.receiptSeriesInvalid) {
      return "Selecciona una serie de comprobante para continuar.";
    }
    if (this.receiptType === "RECEIPT" && this.boletaDniInvalid) {
      return "El DNI de boleta debe tener 8 dígitos si se informa.";
    }
    if (this.receiptType === "INVOICE") {
      if (this.invoiceRucInvalid) {
        return "Para Factura, el RUC debe tener 11 dígitos.";
      }
      if (this.invoiceBusinessNameInvalid) {
        return "Para Factura, la razón social es obligatoria.";
      }
    }
    return "";
  }

  refreshCashSession(): void {
    this.cashRegisterService.current().subscribe({
      next: (session) => {
        this.currentCashSession = session;
        this.cashSessionLoaded = true;
        this.maybeRestoreDraft();
      },
      error: () => {
        this.currentCashSession = null;
        this.cashSessionLoaded = true;
        this.maybeRestoreDraft();
      },
    });
  }

  finalizeSale(): void {
    this.errorMessage = "";
    this.warningMessage = "";
    this.successMessage = "";
    this.lastSaleId = null;
    this.showGoToBillingAction = false;

    const validationError = this.validateSaleBeforeSubmit();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    void this.confirmDialog.confirm({
      title: "Confirmar venta",
      description: this.buildFinalizeConfirmationMessage(),
      highlightText: "Venta real",
      confirmText: "Cobrar",
      cancelText: "Cancelar",
      variant: "warning",
    }).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      const warehouseId = this.saleForm.value.warehouseId as number;

      const payload: CreateSaleRequest = {
        warehouseId,
        items: this.cart.map((item) => ({
          productId: item.productId,
          quantity: normalizePosQuantity(item.quantity),
          discountAmount: normalizePosNumber(item.discountAmount),
        })),
        payments: this.payments
          .map((payment) => ({
            paymentMethod: payment.paymentMethod,
            amount: normalizePosNumber(payment.amount),
            reference: payment.reference.trim() ? payment.reference.trim() : null,
          }))
          .filter((payment) => payment.amount > 0),
      };

      this.submitting = true;

      this.salesService.create(payload).subscribe({
        next: (sale) => {
          if (this.receiptType === "TICKET") {
            this.submitting = false;
            this.successMessage = `Venta ${sale.saleNumber} registrada correctamente.`;
            this.warningMessage = "";
            this.lastSaleId = sale.id;
            this.resetDraftAfterCheckout(true);
            return;
          }

          this.issueElectronicDocumentFromSale(sale);
        },
        error: (error: unknown) => {
          this.submitting = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo registrar la venta.",
          );
        },
      });
    });
  }

  private loadWarehouses(): void {
    this.warehouseService.list(true).subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses;
        this.warehousesLoaded = true;
        this.maybeRestoreDraft();
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar los almacenes.",
        );
        this.warehousesLoaded = true;
        this.maybeRestoreDraft();
      },
    });
  }

  private loadBillingSeries(): void {
    this.billingSeriesService.list().subscribe({
      next: (rows) => {
        this.billingSeriesRows = rows.filter((row) => row.active);
      },
      error: () => {
        this.billingSeriesRows = [];
      },
    });
  }

  private issueElectronicDocumentFromSale(sale: SaleResponse): void {
    const payload = this.buildElectronicDocumentPayload();
    if (!payload) {
      this.submitting = false;
      this.lastSaleId = sale.id;
      this.successMessage = "";
      this.warningMessage =
        "Venta registrada, pero el comprobante quedó pendiente de emisión. Puedes reintentarlo desde Comprobantes.";
      this.showGoToBillingAction = true;
      this.resetDraftAfterCheckout(true);
      return;
    }

    this.electronicDocumentService.createFromSale(sale.id, payload).subscribe({
      next: (document) => {
        this.submitting = false;
        this.warningMessage = "";
        this.showGoToBillingAction = false;
        this.successMessage = `Venta ${sale.saleNumber} registrada y comprobante ${document.fullNumber} generado.`;
        this.lastSaleId = sale.id;
        this.resetDraftAfterCheckout(true);
      },
      error: () => {
        this.submitting = false;
        this.successMessage = "";
        this.warningMessage =
          "Venta registrada, pero el comprobante quedó pendiente de emisión. Puedes reintentarlo desde Comprobantes.";
        this.showGoToBillingAction = true;
        this.lastSaleId = sale.id;
        this.resetDraftAfterCheckout(true);
      },
    });
  }

  private buildElectronicDocumentPayload(): CreateElectronicDocumentFromSaleRequest | null {
    if (this.receiptType === "TICKET") {
      return null;
    }

    const seriesId = Number(this.receiptSeriesId);
    if (!Number.isFinite(seriesId) || seriesId <= 0) {
      return null;
    }

    const documentType: ElectronicDocumentType =
      this.receiptType === "INVOICE" ? "INVOICE" : "RECEIPT";

    const customerName = this.receiptCustomerName.trim() || null;
    const customerDocument = this.receiptCustomerDocument.trim() || null;

    return {
      documentType,
      billingSeriesId: seriesId,
      customerName,
      customerDocument,
    };
  }

  private validateSaleBeforeSubmit(): string {
    if (!this.currentCashSession) {
      return "No puedes vender sin caja abierta.";
    }

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      return "Selecciona un almacén de salida antes de cobrar.";
    }

    if (this.cart.length === 0) {
      return "Debes agregar al menos un item al carrito.";
    }

    for (const item of this.cart) {
      if (normalizePosQuantity(item.quantity) <= 0) {
        return `La cantidad de ${item.sku} debe ser mayor que 0.`;
      }

      if (normalizePosNumber(item.discountAmount) < 0) {
        return `El descuento de ${item.sku} debe ser >= 0.`;
      }

      if (
        normalizePosQuantity(item.quantity) > this.availableIntegerStock(item)
      ) {
        return `Stock insuficiente para ${item.sku}.`;
      }
    }

    const validPayments = this.payments.filter(
      (payment) => normalizePosNumber(payment.amount) > 0,
    );

    if (validPayments.length === 0) {
      return "Debes registrar al menos un pago valido.";
    }

    if (this.paidTotal < this.total) {
      return "El total pagado debe ser mayor o igual al total de la venta.";
    }

    if (this.receiptValidationError) {
      return this.receiptValidationError;
    }

    return "";
  }

}
