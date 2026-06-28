import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PosCartItem } from "../data/pos-ui.models";

export interface PosCartItemValueChange {
  index: number;
  value: string;
}

export interface PosCartItemQuantityChange extends PosCartItemValueChange {
  input?: HTMLInputElement;
}

@Component({
  selector: "app-pos-cart-item",
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="cart-item">
      <div class="cart-item__main">
        <div class="cart-item__meta-row">
          <p class="cart-item__sku">{{ item.sku }}</p>
          <span class="cart-item__meta-separator" aria-hidden="true">·</span>
          <p class="cart-item__stock">P.U. S/ {{ item.salePrice | number: "1.2-2" }}</p>
        </div>
        <h3>{{ item.name }}</h3>
      </div>

      <div class="cart-item__controls">
        <label class="mini-field">
          <span>Cantidad *</span>
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
        <label class="mini-field">
          <span>Descuento</span>
          <input
            type="number"
            min="0"
            step="0.01"
            [value]="item.discountAmount"
            (input)="setDiscount.emit({ index: index, value: $any($event.target).value })"
          />
        </label>
      </div>

      <div class="cart-item__footer">
        <div>
          <span>Subtotal</span>
          <strong>S/ {{ lineTotal | number: "1.2-2" }}</strong>
        </div>
        <button
          type="button"
          class="ui-button ui-button--danger pos-button pos-button--small cart-item__remove"
          (click)="remove.emit(index)"
        >
          Quitar
        </button>
      </div>
    </article>
  `,
  styles: [
    `
      .cart-item {
        border: 1px solid color-mix(in srgb, var(--color-border-default) 78%, transparent);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: 0.62rem;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(96px, auto);
        gap: 0.38rem var(--space-2);
        align-items: start;
      }

      .cart-item__main {
        grid-column: 1;
        display: grid;
        gap: 0.18rem;
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
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

      .cart-item__meta-separator {
        color: var(--color-text-secondary);
        font-size: 0.58rem;
        font-weight: 700;
        line-height: 1;
      }

      .cart-item__main h3 {
        margin: 0;
        font-size: 1rem;
        line-height: 1.18;
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
        padding-left: 0.5rem;
        padding-top: 0;
      }

      .cart-item__footer div {
        display: grid;
        align-content: start;
        gap: 0.06rem;
      }

      .cart-item__footer span {
        color: var(--color-text-secondary);
        font-size: 0.56rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        line-height: 1.05;
      }

      .cart-item__footer strong {
        font-size: 0.95rem;
        line-height: 1.1;
      }

      .cart-item__remove {
        min-height: 2.05rem;
        box-shadow: none;
        opacity: 0.88;
      }

      .mini-field {
        display: grid;
        gap: var(--space-1);
      }

      .mini-field > span {
        font-size: 0.68rem;
        font-weight: 800;
        color: var(--color-text-secondary);
      }

      .mini-field input {
        width: 100%;
        min-height: 2.35rem;
        padding: 0.58rem 0.72rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
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

      @media (max-width: 760px) {
        .cart-item,
        .cart-item__controls {
          grid-template-columns: 1fr;
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
      }
    `,
  ],
})
export class PosCartItemComponent {
  @Input({ required: true }) item!: PosCartItem;
  @Input({ required: true }) index = 0;
  @Input({ required: true }) lineTotal = 0;

  @Output() readonly decrease = new EventEmitter<number>();
  @Output() readonly increase = new EventEmitter<number>();
  @Output() readonly remove = new EventEmitter<number>();
  @Output() readonly quantityFocus = new EventEmitter<HTMLInputElement>();
  @Output() readonly setQuantity = new EventEmitter<PosCartItemQuantityChange>();
  @Output() readonly setDiscount = new EventEmitter<PosCartItemValueChange>();
}
