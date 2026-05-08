import { CommonModule } from "@angular/common";
import { Component, HostListener, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { WarehouseService } from "../inventory/data/warehouse.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { CashRegisterService } from "./data/cash-register.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { PosService } from "./data/pos.service";
import { SalesService } from "./data/sales.service";
import {
  CashRegisterResponse,
  CreateSaleRequest,
  PaymentMethod,
  PosProductResponse,
} from "./data/sales.models";

interface PosCartItem {
  productId: number;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: number;
  stockAvailable: number;
  quantity: number;
  discountAmount: number;
}

interface PaymentLine {
  paymentMethod: PaymentMethod;
  amount: number;
  reference: string;
}

@Component({
  selector: "app-pos-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card pos-page">
      <header class="pos-hero">
        <div class="pos-hero__copy">
          <p class="ui-page-kicker">Operacion Comercial InkToy</p>
          <h1 class="ui-page-title">Punto de venta</h1>
          <p class="ui-page-description">
            Venta guiada para caja fisica: escanea, selecciona, cobra y conserva
            el control de caja en tiempo real.
          </p>
        </div>

        <div class="pos-hero__actions">
          <span
            class="ui-badge pos-cash-badge"
            [class.ui-badge--success]="currentCashSession"
            [class.ui-badge--danger]="!currentCashSession"
          >
            {{ currentCashSession ? "Caja abierta" : "Caja cerrada" }}
          </span>
          <a
            class="ui-button ui-button--secondary pos-button"
            [routerLink]="['/caja']"
            >Ir a Caja</a
          >
        </div>
      </header>

      <p
        class="ui-alert ui-alert--info pos-cash-strip"
        *ngIf="!currentCashSession"
      >
        No hay caja abierta para el usuario actual. Abre caja en
        <a class="inline-link" [routerLink]="['/caja']">/caja</a> antes de
        vender.
      </p>
      <p
        class="ui-alert ui-alert--success pos-cash-strip"
        *ngIf="currentCashSession"
      >
        Caja abierta #{{ currentCashSession.id }} desde
        {{ currentCashSession.openedAt | date: "yyyy-MM-dd HH:mm" }}.
      </p>

      <div class="pos-shell">
        <main class="pos-workspace">
          <form
            [formGroup]="saleForm"
            class="pos-command"
            (ngSubmit)="lookupByCode()"
          >
            <label class="field field--warehouse">
              <span>Almacen de salida *</span>
              <select formControlName="warehouseId">
                <option [ngValue]="null">Selecciona almacen</option>
                <option
                  *ngFor="let warehouse of warehouses"
                  [ngValue]="warehouse.id"
                >
                  {{ warehouse.code }} - {{ warehouse.name }}
                </option>
              </select>
            </label>

            <section class="scan-card" aria-label="Busqueda principal POS">
              <label class="scan-field">
                <span class="scan-label">Agregar por SKU o barcode</span>
                <input
                  class="scan-input"
                  type="text"
                  formControlName="code"
                  placeholder="Escanea o escribe SKU/barcode exacto..."
                  autocomplete="off"
                />
              </label>

              <div class="scan-actions">
                <button
                  type="submit"
                  class="ui-button ui-button--primary pos-button pos-button--scan"
                  [disabled]="loadingLookup"
                >
                  {{ loadingLookup ? "Buscando..." : "Agregar por codigo" }}
                </button>
                <button
                  type="button"
                  class="ui-button ui-button--secondary pos-button pos-button--quiet"
                  (click)="refreshCashSession()"
                >
                  Refrescar caja
                </button>
              </div>

              <p class="scan-help">
                Productos sin barcode: busca por nombre o usa los botones
                rapidos.
              </p>
            </section>

            <label class="field manual-search">
              <span>Busqueda por nombre, SKU o producto sin barcode</span>
              <div class="manual-search__row">
                <input
                  type="text"
                  formControlName="query"
                  placeholder="Ej: lapiz, cartulina roja, papelografo, cinta"
                  autocomplete="off"
                />
                <button
                  type="button"
                  class="ui-button ui-button--secondary pos-button"
                  (click)="searchByName()"
                  [disabled]="loadingSearch"
                >
                  {{ loadingSearch ? "Buscando..." : "Buscar productos" }}
                </button>
              </div>
            </label>

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

          <div class="message-stack" *ngIf="errorMessage || successMessage">
            <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
              {{ errorMessage }}
            </p>
            <p class="ui-alert ui-alert--success" *ngIf="successMessage">
              {{ successMessage }}
            </p>
          </div>

          <section class="results-panel">
            <header class="panel-head">
              <div>
                <p class="panel-kicker">Seleccion explicita</p>
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
                  <p class="result-card__sku">{{ result.sku }}</p>
                  <h3>{{ result.name }}</h3>
                  <dl class="result-meta">
                    <div>
                      <dt>Barcode</dt>
                      <dd>
                        <span
                          class="barcode-badge"
                          [class.barcode-badge--missing]="!result.barcode"
                        >
                          {{ result.barcode || "Sin barcode" }}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Stock</dt>
                      <dd>{{ result.stockAvailable | number: "1.0-3" }}</dd>
                    </div>
                  </dl>
                </div>
                <div class="result-card__action">
                  <p class="result-price">
                    S/ {{ result.salePrice | number: "1.2-2" }}
                  </p>
                  <button
                    type="button"
                    class="ui-button ui-button--primary pos-button pos-button--add"
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
          <section class="cart-panel">
            <header class="panel-head panel-head--compact">
              <div>
                <p class="panel-kicker">Venta actual</p>
                <h2>{{ cartTitle }}</h2>
              </div>
              <div class="cart-head-actions">
                <button
                  type="button"
                  class="ui-button ui-button--secondary pos-button pos-button--quiet"
                  (click)="openFullCart()"
                  [disabled]="cart.length === 0"
                >
                  Ver carrito completo
                </button>
                <button
                  type="button"
                  class="ui-button ui-button--secondary pos-button pos-button--quiet"
                  (click)="clearCart()"
                  [disabled]="cart.length === 0"
                >
                  Cancelar venta
                </button>
              </div>
            </header>

            <div class="cart-list" *ngIf="cart.length > 0; else emptyCart">
              <article
                class="cart-item"
                *ngFor="let item of cart; let index = index"
              >
                <div class="cart-item__main">
                  <p class="cart-item__sku">{{ item.sku }}</p>
                  <h3>{{ item.name }}</h3>
                  <p class="cart-item__stock">
                    Stock {{ item.stockAvailable | number: "1.0-3" }} | P.U. S/
                    {{ item.salePrice | number: "1.2-2" }}
                    <span
                      class="barcode-badge barcode-badge--missing cart-barcode-badge"
                      *ngIf="!item.barcode"
                    >
                      Sin barcode
                    </span>
                  </p>
                </div>

                <div class="cart-item__controls">
                  <label class="mini-field">
                    <span>Cantidad *</span>
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
                  <label class="mini-field">
                    <span>Descuento</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      [value]="item.discountAmount"
                      (input)="setDiscount(index, $any($event.target).value)"
                    />
                  </label>
                </div>

                <div class="cart-item__footer">
                  <div>
                    <span>Linea</span>
                    <strong>S/ {{ lineTotal(item) | number: "1.2-2" }}</strong>
                  </div>
                  <button
                    type="button"
                    class="ui-button ui-button--danger pos-button pos-button--small"
                    (click)="removeFromCart(index)"
                  >
                    Quitar
                  </button>
                </div>
              </article>
            </div>

            <ng-template #emptyCart>
              <div class="empty-cart">
                <strong>Carrito vacio</strong>
                <span>Escanea o busca un producto para empezar.</span>
              </div>
            </ng-template>
          </section>

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

          <section class="total-board" aria-label="Totales de venta">
            <article class="total-main">
              <span>Total a cobrar</span>
              <strong>S/ {{ total | number: "1.2-2" }}</strong>
            </article>

            <div class="total-grid">
              <article>
                <span>Subtotal</span>
                <strong>S/ {{ subtotal | number: "1.2-2" }}</strong>
              </article>
              <article>
                <span>Descuento</span>
                <strong>S/ {{ discountTotal | number: "1.2-2" }}</strong>
              </article>
              <article>
                <span>Pagado</span>
                <strong>S/ {{ paidTotal | number: "1.2-2" }}</strong>
              </article>
              <article class="total-change">
                <span>Vuelto</span>
                <strong>S/ {{ change | number: "1.2-2" }}</strong>
              </article>
            </div>
          </section>

          <footer class="checkout-actions">
            <button
              type="button"
              class="ui-button ui-button--primary checkout-button"
              (click)="finalizeSale()"
              [disabled]="submitting"
            >
              {{ submitting ? "Cobrando..." : "COBRAR" }}
            </button>
            <a
              *ngIf="lastSaleId"
              class="ui-button ui-button--secondary pos-button sale-link"
              [routerLink]="['/ventas', lastSaleId]"
            >
              Ver venta #{{ lastSaleId }}
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
              <p class="panel-kicker">Revision de venta</p>
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
                <p class="cart-item__sku">{{ item.sku }}</p>
                <h3>{{ item.name }}</h3>
                <span>
                  P.U. S/ {{ item.salePrice | number: "1.2-2" }}
                  <span
                    class="barcode-badge barcode-badge--missing"
                    *ngIf="!item.barcode"
                  >
                    Sin barcode
                  </span>
                </span>
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
                <span>Linea</span>
                <strong>S/ {{ lineTotal(item) | number: "1.2-2" }}</strong>
              </div>

              <button
                type="button"
                class="ui-button ui-button--danger pos-button pos-button--small"
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
        grid-template-rows: auto auto minmax(0, 1fr);
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
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.94),
            rgba(16, 17, 20, 0.94)
          ),
          var(--color-brand-primary);
        color: var(--color-text-on-dark);
        padding: var(--space-3) var(--space-4);
        box-shadow: var(--shadow-md);
      }

      .pos-hero .ui-page-title {
        font-size: clamp(1.2rem, 1.6vw, 1.45rem);
        line-height: 1.1;
      }

      .pos-hero .ui-page-kicker,
      .pos-hero .ui-page-description {
        color: rgba(255, 255, 255, 0.82);
      }

      .pos-hero .ui-page-description {
        margin-top: var(--space-1);
        max-width: 58ch;
        font-size: var(--font-size-sm);
        line-height: 1.3;
      }

      .pos-hero__copy {
        max-width: 760px;
      }

      .pos-hero__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .pos-cash-badge {
        min-height: 2.35rem;
        padding-inline: var(--space-3);
      }

      .pos-cash-strip {
        padding: 0.42rem 0.7rem;
        font-size: var(--font-size-sm);
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pos-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(350px, 0.58fr);
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
          minmax(12.75rem, 1fr) minmax(5rem, auto) minmax(5rem, auto)
          auto;
      }

      .pos-command,
      .results-panel,
      .cart-panel,
      .payment-panel,
      .total-board {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
      }

      .pos-command {
        display: grid;
        grid-template-columns: minmax(220px, 0.34fr) minmax(0, 1fr);
        gap: var(--space-2);
        padding: var(--space-3);
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
        padding: var(--space-3);
      }

      .scan-label {
        color: var(--color-text-primary);
        font-size: var(--font-size-md);
      }

      .scan-input {
        min-height: 3.15rem;
        border-width: 2px;
        border-color: rgba(18, 23, 184, 0.38);
        border-radius: var(--radius-lg);
        font-size: clamp(1.05rem, 1.55vw, 1.35rem);
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
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        gap: var(--space-2);
        align-items: center;
      }

      .quick-search > span {
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
        min-height: 2rem;
        flex: 0 0 auto;
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-soft);
        color: var(--color-text-primary);
        padding: 0.32rem 0.62rem;
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
        min-height: 3.15rem;
        background: var(--color-brand-accent);
        font-size: var(--font-size-md);
        letter-spacing: 0.01em;
      }

      .pos-button--add {
        width: 100%;
        min-height: 2.8rem;
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
      .total-board {
        padding: var(--space-3);
        display: grid;
        gap: var(--space-2);
        min-height: 0;
        overflow: hidden;
      }

      .results-panel {
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .cart-panel {
        grid-template-rows: auto minmax(0, 1fr);
      }

      .payment-panel {
        grid-template-columns: max-content minmax(0, 1fr);
        align-items: stretch;
        min-height: 5rem;
        padding: 0.4rem;
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
        font-size: 1.15rem;
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
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
      }

      .results-grid {
        grid-row: 3;
        display: grid;
        grid-template-columns: 1fr;
        align-content: start;
        gap: var(--space-2);
        min-height: 0;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .empty-results {
        grid-row: 3;
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
        grid-template-columns: minmax(0, 1fr) minmax(130px, auto);
        gap: var(--space-2);
        align-items: stretch;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(
            180deg,
            rgba(18, 23, 184, 0.04),
            rgba(18, 23, 184, 0)
          ),
          var(--color-bg-surface);
        padding: var(--space-2);
      }

      .result-card__body,
      .result-card__action,
      .cart-item__main {
        display: grid;
        gap: var(--space-1);
      }

      .result-card__action {
        align-content: space-between;
      }

      .result-card__sku,
      .cart-item__sku {
        margin: 0;
        width: fit-content;
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        padding: 0.15rem var(--space-2);
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .result-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-1);
        margin: 0;
      }

      .result-meta div,
      .total-grid article {
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: 0.45rem var(--space-2);
      }

      .result-meta dt,
      .total-grid span,
      .cart-item__footer span,
      .total-main span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .result-meta dd {
        margin: var(--space-1) 0 0;
        font-weight: 800;
      }

      .barcode-badge {
        display: inline-flex;
        width: fit-content;
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        padding: 0.12rem var(--space-2);
        font-size: var(--font-size-xs);
        font-weight: 900;
      }

      .barcode-badge--missing {
        border: 1px solid rgba(244, 194, 13, 0.42);
        background: rgba(244, 194, 13, 0.14);
        color: var(--color-warning);
      }

      .result-price {
        margin: 0;
        color: var(--color-brand-primary);
        font-size: clamp(1.25rem, 1.8vw, 1.55rem);
        font-weight: 900;
        text-align: right;
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
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 0.22rem 0.45rem;
        align-content: start;
        min-width: 0;
      }

      .cart-item__main h3 {
        font-size: 0.92rem;
        line-height: 1.12;
      }

      .cart-item__stock {
        grid-column: 1 / -1;
        font-size: var(--font-size-xs);
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
        gap: 0.05rem;
        min-width: 9rem;
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        padding: 0.48rem var(--space-3);
        text-align: right;
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
        color: var(--color-brand-primary);
        font-size: 1.2rem;
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
          minmax(190px, 1.4fr) minmax(150px, 0.72fr)
          minmax(104px, 0.45fr) minmax(82px, 0.34fr) auto;
        gap: var(--space-2);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: var(--space-2);
      }

      .full-cart-product {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.18rem 0.45rem;
        align-items: center;
        min-width: 0;
      }

      .full-cart-product h3 {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--font-size-sm);
      }

      .full-cart-product > span {
        grid-column: 1 / -1;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
      }

      .full-cart-line {
        display: grid;
        gap: 0.06rem;
        align-self: center;
      }

      .full-cart-line strong {
        font-size: var(--font-size-sm);
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

      .results-grid::-webkit-scrollbar,
      .cart-list::-webkit-scrollbar,
      .payment-list::-webkit-scrollbar {
        width: 8px;
      }

      .results-grid::-webkit-scrollbar-track,
      .cart-list::-webkit-scrollbar-track,
      .payment-list::-webkit-scrollbar-track {
        background: var(--color-bg-soft);
        border-radius: var(--radius-pill);
      }

      .results-grid::-webkit-scrollbar-thumb,
      .cart-list::-webkit-scrollbar-thumb,
      .payment-list::-webkit-scrollbar-thumb {
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
export class PosPageComponent implements OnInit {
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
  searchResults: PosProductResponse[] = [];
  cart: PosCartItem[] = [];
  payments: PaymentLine[] = [
    { paymentMethod: "CASH", amount: 0, reference: "" },
  ];

  loadingLookup = false;
  loadingSearch = false;
  submitting = false;
  isFullCartOpen = false;

  errorMessage = "";
  successMessage = "";
  lastSaleId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly warehouseService: WarehouseService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly posService: PosService,
    private readonly salesService: SalesService,
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.refreshCashSession();
  }

  get subtotal(): number {
    return this.cart.reduce((acc, item) => acc + this.lineSubtotal(item), 0);
  }

  get discountTotal(): number {
    return this.cart.reduce(
      (acc, item) => acc + this.normalizeNumber(item.discountAmount),
      0,
    );
  }

  get total(): number {
    return Math.max(this.subtotal - this.discountTotal, 0);
  }

  get paidTotal(): number {
    return this.payments.reduce(
      (acc, payment) => acc + this.normalizeNumber(payment.amount),
      0,
    );
  }

  get change(): number {
    return this.paidTotal > this.total ? this.paidTotal - this.total : 0;
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

  @HostListener("document:keydown.escape")
  closeFullCartOnEscape(): void {
    this.closeFullCart();
  }

  private buildFinalizeConfirmationMessage(): string {
    return [
      "Estas a punto de registrar una venta real.",
      "",
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

  searchByName(): void {
    const query = (this.saleForm.value.query ?? "").trim();
    if (query.length < 2) {
      this.errorMessage =
        "Ingresa al menos 2 caracteres para buscar por nombre.";
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

  applyQuickSearch(term: string): void {
    this.saleForm.patchValue({ query: term, code: "" });
    this.searchByName();
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
      return;
    }

    const availableStock = Math.floor(
      this.normalizeNumber(product.stockAvailable),
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
      salePrice: this.normalizeNumber(product.salePrice),
      stockAvailable: this.normalizeNumber(product.stockAvailable),
      quantity: 1,
      discountAmount: 0,
    });
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
  }

  clearCart(clearLastSaleReference = true): void {
    this.cart = [];
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    if (clearLastSaleReference) {
      this.lastSaleId = null;
    }
  }

  selectQuantityInput(input: HTMLInputElement): void {
    input.select();
  }

  setQuantity(index: number, rawValue: string, input?: HTMLInputElement): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = this.normalizeQuantity(rawValue);
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
    return Math.floor(this.normalizeNumber(item.stockAvailable));
  }

  setDiscount(index: number, rawValue: string): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = Math.max(this.normalizeNumber(rawValue), 0);
    const maxDiscount = this.lineSubtotal(item);

    if (parsed > maxDiscount) {
      item.discountAmount = maxDiscount;
      return;
    }

    item.discountAmount = parsed;
  }

  lineSubtotal(item: PosCartItem): number {
    return (
      this.normalizeNumber(item.salePrice) * this.normalizeNumber(item.quantity)
    );
  }

  lineTotal(item: PosCartItem): number {
    return Math.max(
      this.lineSubtotal(item) - this.normalizeNumber(item.discountAmount),
      0,
    );
  }

  addPaymentLine(): void {
    this.payments.push({ paymentMethod: "CASH", amount: 0, reference: "" });
  }

  removePaymentLine(index: number): void {
    if (this.payments.length === 1) {
      return;
    }
    this.payments.splice(index, 1);
  }

  setPaymentMethod(index: number, value: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      payment.paymentMethod = value;
    }
  }

  setPaymentAmount(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.amount = Math.max(this.normalizeNumber(rawValue), 0);
  }

  setPaymentReference(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.reference = rawValue;
  }

  refreshCashSession(): void {
    this.cashRegisterService.current().subscribe({
      next: (session) => {
        this.currentCashSession = session;
      },
      error: () => {
        this.currentCashSession = null;
      },
    });
  }

  finalizeSale(): void {
    this.errorMessage = "";
    this.successMessage = "";
    this.lastSaleId = null;

    const validationError = this.validateSaleBeforeSubmit();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    const confirmed = window.confirm(this.buildFinalizeConfirmationMessage());
    if (!confirmed) {
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId as number;

    const payload: CreateSaleRequest = {
      warehouseId,
      items: this.cart.map((item) => ({
        productId: item.productId,
        quantity: this.normalizeQuantity(item.quantity),
        discountAmount: this.normalizeNumber(item.discountAmount),
      })),
      payments: this.payments
        .map((payment) => ({
          paymentMethod: payment.paymentMethod,
          amount: this.normalizeNumber(payment.amount),
          reference: payment.reference.trim() ? payment.reference.trim() : null,
        }))
        .filter((payment) => payment.amount > 0),
    };

    this.submitting = true;

    this.salesService.create(payload).subscribe({
      next: (sale) => {
        this.submitting = false;
        this.successMessage = `Venta ${sale.saleNumber} registrada correctamente.`;
        this.lastSaleId = sale.id;
        this.clearCart(false);
        this.searchResults = [];
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo registrar la venta.",
        );
      },
    });
  }

  private loadWarehouses(): void {
    this.warehouseService.list(true).subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses;
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar los almacenes.",
        );
      },
    });
  }

  private validateSaleBeforeSubmit(): string {
    if (!this.currentCashSession) {
      return "No puedes vender sin caja abierta.";
    }

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      return "warehouseId es requerido.";
    }

    if (this.cart.length === 0) {
      return "Debes agregar al menos un item al carrito.";
    }

    for (const item of this.cart) {
      if (this.normalizeQuantity(item.quantity) <= 0) {
        return `La cantidad de ${item.sku} debe ser mayor que 0.`;
      }

      if (this.normalizeNumber(item.discountAmount) < 0) {
        return `El descuento de ${item.sku} debe ser >= 0.`;
      }

      if (
        this.normalizeQuantity(item.quantity) > this.availableIntegerStock(item)
      ) {
        return `Stock insuficiente para ${item.sku}.`;
      }
    }

    const validPayments = this.payments.filter(
      (payment) => this.normalizeNumber(payment.amount) > 0,
    );

    if (validPayments.length === 0) {
      return "Debes registrar al menos un pago valido.";
    }

    if (this.paidTotal < this.total) {
      return "El total pagado debe ser mayor o igual al total de la venta.";
    }

    return "";
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }

  private normalizeQuantity(value: unknown): number {
    const parsed = Math.floor(this.normalizeNumber(value));
    return parsed > 0 ? parsed : 1;
  }
}
