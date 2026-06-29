import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import {
  PosCartItemQuantityChange,
  PosCartItemValueChange,
} from "./pos-cart-item.component";
import { PosCartItem } from "../data/pos-ui.models";

@Component({
  selector: "app-pos-full-cart-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="full-cart-backdrop"
      *ngIf="isOpen"
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
            (click)="close.emit()"
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
                <p class="full-cart-sku">{{ item.sku }}</p>
                <span class="full-cart-meta-separator" aria-hidden="true">·</span>
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
                  (click)="decrease.emit(index)"
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
                  (focus)="quantityFocus.emit($any($event.target))"
                  (click)="quantityFocus.emit($any($event.target))"
                  (input)="
                    setQuantity.emit({
                      index: index,
                      value: $any($event.target).value,
                      input: $any($event.target),
                    })
                  "
                />
                <button
                  type="button"
                  class="ui-button quantity-stepper"
                  (click)="increase.emit(index)"
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
                (input)="
                  setDiscount.emit({
                    index: index,
                    value: $any($event.target).value,
                  })
                "
              />
            </label>

            <div class="full-cart-line">
              <span>Subtotal</span>
              <strong>S/ {{ (lineTotals[index] || 0) | number: "1.2-2" }}</strong>
            </div>

            <button
              type="button"
              class="ui-button ui-button--secondary pos-button pos-button--small full-cart-remove"
              (click)="remove.emit(index)"
            >
              Quitar
            </button>
          </article>
        </div>
      </article>
    </section>
  `,
  styles: [
    `
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
        margin: 0;
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

      .full-cart-sku {
        margin: 0;
        width: fit-content;
        border-radius: var(--radius-pill);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        padding: 0.03rem 0.3rem;
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        line-height: 1.15;
      }

      .full-cart-product h3 {
        margin: 0;
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

      .mini-field {
        display: grid;
        gap: var(--space-1);
      }

      .mini-field > span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 800;
      }

      .mini-field input {
        width: 100%;
        min-height: 2.35rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        font-weight: 800;
        padding: 0.58rem 0.72rem;
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

      .pos-button {
        min-height: 2.55rem;
        border-radius: var(--radius-md);
        padding: 0.58rem var(--space-4);
        font-size: var(--font-size-md);
      }

      .pos-button--quiet {
        background: #4b5563;
      }

      .pos-button--small {
        min-height: 2.35rem;
        padding-inline: var(--space-3);
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

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
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

      .full-cart-list::-webkit-scrollbar {
        width: 8px;
      }

      .full-cart-list::-webkit-scrollbar-track {
        background: var(--color-bg-soft);
        border-radius: var(--radius-pill);
      }

      .full-cart-list::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          var(--color-brand-highlight),
          var(--color-brand-accent)
        );
        border-radius: var(--radius-pill);
      }

      @media (max-width: 760px) {
        .full-cart-header,
        .full-cart-row {
          grid-template-columns: 1fr;
        }

        .full-cart-summary {
          text-align: left;
        }

        .pos-button {
          width: 100%;
        }
      }
    `,
  ],
})
export class PosFullCartModalComponent {
  @Input({ required: true }) isOpen = false;
  @Input({ required: true }) cart: PosCartItem[] = [];
  @Input({ required: true }) cartCountLabel = "0 ítems";
  @Input({ required: true }) total = 0;
  @Input({ required: true }) lineTotals: number[] = [];

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly decrease = new EventEmitter<number>();
  @Output() readonly increase = new EventEmitter<number>();
  @Output() readonly remove = new EventEmitter<number>();
  @Output() readonly quantityFocus = new EventEmitter<HTMLInputElement>();
  @Output() readonly setQuantity = new EventEmitter<PosCartItemQuantityChange>();
  @Output() readonly setDiscount = new EventEmitter<PosCartItemValueChange>();
}
