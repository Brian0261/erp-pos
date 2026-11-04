import { PosDialogFocusDirective } from "./pos-dialog-focus.directive";
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import {
  PosCartItemQuantityChange,
  PosCartItemValueChange,
} from "./pos-cart-item.component";
import { PosCartItem } from "../data/pos-ui.models";
import { quantityStep } from "../utils/pos-decimal";
import { canPosStep, posUnitPriceText } from "../utils/pos-calculations";

@Component({
    selector: "app-pos-full-cart-modal",
    imports: [CommonModule, PosDialogFocusDirective],
    template: `
    <section
      class="full-cart-backdrop"
      *ngIf="isOpen"
      role="dialog"
      aria-modal="true"
      appPosDialogFocus (posDialogClose)="close.emit()"
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
            <strong>S/ {{ (total | number: "1.2-2") ?? '—' }}</strong>
          </div>
          <button
            type="button"
            class="ui-button ui-button--secondary pos-button pos-button--quiet"
            (click)="close.emit()"
          >
            Cerrar
          </button>
          <p
            class="ui-alert ui-alert--info full-cart-adjustment"
            *ngIf="discountAdjustmentMessage"
            role="status"
            aria-live="polite"
          >
            {{ discountAdjustmentMessage }}
          </p>
        </header>
        <p class="ui-alert ui-alert--error" *ngIf="validationMessage" role="alert">{{ validationMessage }}</p>

        <div class="full-cart-empty" *ngIf="cart.length === 0">
          <strong>Carrito vacío</strong>
          <span>Agrega productos desde el POS para revisar la venta.</span>
        </div>

        <div class="full-cart-list" *ngIf="cart.length > 0">
          <article
            class="full-cart-row"
            *ngFor="let item of cart; let index = index; trackBy: trackProduct"
          >
            <div class="full-cart-product">
              <h3>{{ item.name }}</h3>
              <div class="full-cart-product-meta-row">
                <p *ngIf="(item.sku || '').trim()" class="full-cart-sku">SKU {{ item.sku }}</p>
                <span class="full-cart-product-price">
                  P.U. S/ {{ unitPriceText(item) }}
                </span>
                <span *ngIf="item.barcode?.trim() && item.barcode?.trim() !== (item.sku || '').trim()" class="full-cart-barcode-note">
                  Código de barras: {{ item.barcode }}
                </span>
              </div>
            </div>

            <fieldset class="full-cart-actions" [disabled]="editingBlocked">
              <label class="mini-field full-cart-quantity">
                <span>Cant.</span>
                <div class="quantity-tools">
                  <button
                    type="button"
                    class="ui-button quantity-stepper"
                    aria-label="Disminuir cantidad"
                    (click)="decrease.emit(index)"
                    [disabled]="!canStep(item, -1)"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    [min]="quantityStep(item.quantityPolicy)"
                    [step]="quantityStep(item.quantityPolicy)"
                    [attr.inputmode]="item.quantityPolicy === 'DECIMAL_2' ? 'decimal' : 'numeric'"
                    aria-label="Cantidad del producto"
                    [value]="item.quantityInput ?? item.quantity"
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
                    aria-label="Aumentar cantidad"
                    (click)="increase.emit(index)"
                    [disabled]="!canStep(item, 1)"
                  >
                    +
                  </button>
                </div>
              </label>

              <label class="mini-field full-cart-discount">
                <span title="Importe total descontado de esta línea">Descuento (S/)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Descuento del producto"
                  [value]="item.discountInput ?? item.discountAmount"
                  (input)="
                    setDiscount.emit({
                      index: index,
                      value: $any($event.target).value,
                    })
                  "
                />
              </label>

              <div class="full-cart-line">
                <span>Importe</span>
                <strong>S/ {{ (lineTotals[index] | number: "1.2-2") ?? '—' }}</strong>
              </div>

              <button
                type="button"
                class="ui-button ui-button--secondary pos-button pos-button--small full-cart-remove"
                (click)="remove.emit(index)"
              >
                Quitar
              </button>
            </fieldset>
          </article>
        </div>
      </article>
    </section>
  `,
    styles: [
        `
      .full-cart-modal{display:flex!important;flex-direction:column}.full-cart-list{flex:1;min-height:0}.full-cart-actions input,.quantity-stepper,.full-cart-remove{min-height:44px!important}
      .full-cart-backdrop {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: grid;
        place-items: center;
        padding: var(--space-4);
        background: rgba(16, 17, 20, 0.54);
        backdrop-filter: blur(4px);
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
        box-shadow: 0 20px 60px rgba(16, 17, 20, 0.24);
        padding: var(--space-4);
        overflow: hidden;
      }

      .full-cart-adjustment {
        grid-column: 1 / -1;
        margin: 0;
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
        font-weight: 600;
      }

      .full-cart-summary {
        display: grid;
        place-items: center;
        gap: 0.05rem;
        min-width: 10.75rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--color-bg-soft) 84%, var(--color-bg-surface));
        padding: 0.62rem var(--space-3);
        text-align: center;
      }

      .full-cart-summary span,
      .full-cart-line span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .full-cart-summary strong {
        color: var(--color-text-primary);
        font-size: clamp(1.38rem, 2vw, 1.65rem);
        font-variant-numeric: tabular-nums;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.05;
      }

      .full-cart-empty {
        display: grid;
        place-items: center;
        gap: var(--space-1);
        min-height: 16rem;
        border: 1px dashed var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        text-align: center;
      }

      .full-cart-list {
        display: grid;
        align-content: start;
        gap: 0.6rem;
        min-height: 0;
        overflow: auto;
        padding-right: 0.3rem;
      }

      .full-cart-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(440px, 1.2fr);
        gap: var(--space-3);
        align-items: start;
        border: 1px solid color-mix(in srgb, var(--color-border-default) 86%, transparent);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: 0.68rem 0.78rem;
      }

      .full-cart-product {
        display: grid;
        gap: 0.18rem;
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
        font-size: var(--font-size-xs);
        opacity: 1;
      }

      .full-cart-sku {
        margin: 0;
        width: fit-content;
        border-radius: 0;
        background: transparent;
        color: var(--color-text-secondary);
        padding: 0;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        line-height: 1.15;
      }

      .full-cart-product h3 {
        margin: 0;
        overflow-wrap: anywhere;
        display: block;
        white-space: normal;
        font-size: 0.98rem;
        font-weight: 700;
        line-height: 1.16;
      }

      .full-cart-actions {
        border:0;margin:0;padding:0;min-width:0;
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.9fr) auto auto;
        gap: 0.5rem 0.75rem;
        align-items: center;
      }

      .full-cart-product-price {
        font-weight: 600;
        color: var(--color-text-secondary);
        white-space: nowrap;
      }

      .full-cart-barcode-note {
        display: inline-flex;
        width: fit-content;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: var(--color-text-secondary);
        padding: 0;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .full-cart-meta-separator {
        color: var(--color-text-secondary);
        font-size: 0.62rem;
        font-weight: 600;
        line-height: 1;
      }

      .mini-field {
        display: grid;
        gap: var(--space-1);
        align-self: center;
      }

      .mini-field > span {
        color: var(--color-text-secondary);
        font-size: 0.68rem;
        font-weight: 700;
        line-height: 1.05;
      }

      .mini-field input {
        width: 100%;
        min-height: 2.18rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        font-weight: 700;
        padding: 0.58rem 0.72rem;
      }

      .quantity-tools {
        display: grid;
        grid-template-columns: 2.2rem minmax(3.4rem, 1fr) 2.2rem;
        gap: 0.35rem;
        align-items: center;
      }

      .quantity-tools input {
        text-align: center;
      }

      .quantity-stepper {
        min-height: 2.2rem;
        padding: 0;
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-weight: 700;
      }

      .full-cart-line {
        display: grid;
        gap: 0.08rem;
        align-self: center;
        align-content: center;
        min-width: 0;
        min-height: 2.1rem;
        justify-items: center;
      }

      .full-cart-line strong {
        color: var(--color-text-primary);
        font-size: 1rem;
        font-variant-numeric: tabular-nums;
        font-weight: 800;
        line-height: 1.08;
      }

      .pos-button {
        min-height: 2.55rem;
        border-radius: var(--radius-md);
        padding: 0.58rem var(--space-4);
        font-size: var(--font-size-md);
      }

      .pos-button--quiet {
        background: color-mix(in srgb, var(--color-text-primary) 16%, var(--color-bg-soft));
        color: var(--color-text-primary);
      }

      .pos-button--small {
        min-height: 2.35rem;
        padding-inline: var(--space-3);
      }

      .full-cart-remove {
        min-height: 2.1rem;
        border-color: color-mix(in srgb, var(--color-danger) 22%, var(--color-border-default));
        color: var(--color-danger);
        background: color-mix(
          in srgb,
          var(--color-danger) 6%,
          var(--color-bg-surface)
        );
        box-shadow: none;
        opacity: 1;
        align-self: center;
      }

      .full-cart-discount {
        width: min(7rem, 100%);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      :host-context(body[data-theme="dark"]) .full-cart-summary {
        border-color: rgba(96, 165, 250, 0.22);
        background: rgba(30, 41, 59, 0.72);
      }

      :host-context(body[data-theme="dark"]) .full-cart-remove {
        background: rgba(220, 38, 38, 0.08);
      }

      .full-cart-list::-webkit-scrollbar {
        width: 6px;
      }

      .full-cart-list::-webkit-scrollbar-track {
        background: var(--color-bg-soft);
        border-radius: var(--radius-pill);
      }

      .full-cart-list::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--color-brand-primary) 28%, transparent);
        border-radius: var(--radius-pill);
      }

      .full-cart-product-meta-row .full-cart-sku,.full-cart-barcode-note{font-size:var(--font-size-xs);line-height:1.4}
      .full-cart-summary{min-width:0;display:flex;gap:var(--space-3);padding:.5rem .75rem}
      .full-cart-actions input{min-width:0;padding:.5rem}.full-cart-line{justify-items:end}.full-cart-discount{width:100%}
      @media(max-width:960px){.full-cart-row{grid-template-columns:minmax(0,1fr)}}
      @media(max-width:600px){
        .full-cart-modal{padding:var(--space-3);width:calc(100vw - 1rem);max-height:calc(100dvh - 1rem)}.full-cart-backdrop{padding:.5rem}
        .full-cart-header{grid-template-columns:minmax(0,1fr) auto}.full-cart-header>button{grid-column:2;grid-row:1}.full-cart-summary{grid-column:1/-1;justify-content:space-between}
        .full-cart-actions{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:.5rem}.quantity-tools{grid-template-columns:2.2rem minmax(0,1fr) 2.2rem;gap:.25rem}
        .full-cart-line{justify-items:start}.full-cart-remove{justify-self:end}.full-cart-row{padding:.65rem}.full-cart-list{padding-right:.15rem}
      }
    `,
    ]
})
export class PosFullCartModalComponent {
  trackProduct(_index: number, item: PosCartItem): number { return item.productId; }
  @Input() editingBlocked = false;
  readonly quantityStep = quantityStep;
  readonly canStep = canPosStep;
  readonly unitPriceText = posUnitPriceText;
  @Input() validationMessage = "";
  @Input({ required: true }) isOpen = false;
  @Input({ required: true }) cart: PosCartItem[] = [];
  @Input({ required: true }) cartCountLabel = "0 ítems";
  @Input({ required: true }) total = 0;
  @Input({ required: true }) lineTotals: number[] = [];
  @Input() discountAdjustmentMessage = "";

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly decrease = new EventEmitter<number>();
  @Output() readonly increase = new EventEmitter<number>();
  @Output() readonly remove = new EventEmitter<number>();
  @Output() readonly quantityFocus = new EventEmitter<HTMLInputElement>();
  @Output() readonly setQuantity = new EventEmitter<PosCartItemQuantityChange>();
  @Output() readonly setDiscount = new EventEmitter<PosCartItemValueChange>();
}
