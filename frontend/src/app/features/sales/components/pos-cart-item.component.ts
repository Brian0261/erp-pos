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
        <h3>{{ item.name }}</h3>
        <div class="cart-item__meta-row">
          <p class="cart-item__sku">{{ item.sku }}</p>
          <span class="cart-item__meta-separator" aria-hidden="true">·</span>
          <p class="cart-item__stock">P.U. S/ {{ item.salePrice | number: "1.2-2" }}</p>
        </div>
      </div>

      <div class="cart-item__footer">
        <label class="mini-field mini-field--quantity">
          <span>Cant.</span>
          <div class="quantity-tools">
            <button
              type="button"
              class="ui-button quantity-stepper"
              aria-label="Disminuir cantidad"
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
              aria-label="Cantidad del producto"
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
              aria-label="Aumentar cantidad"
              (click)="increase.emit(index)"
            >
              +
            </button>
          </div>
        </label>
        <label class="mini-field mini-field--discount">
          <span>Dscto.</span>
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label="Descuento del producto"
            [value]="item.discountAmount"
            (input)="setDiscount.emit({ index: index, value: $any($event.target).value })"
          />
        </label>

        <div class="cart-item__subtotal">
          <span>Subtotal</span>
          <strong>S/ {{ lineTotal | number: "1.2-2" }}</strong>
        </div>
        <button
          type="button"
          class="ui-button ui-button--secondary pos-button pos-button--small cart-item__remove"
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
        padding: 0.58rem 0.62rem;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.48rem;
        align-items: start;
      }

      .cart-item__main {
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
        border-radius: 0;
        background: transparent;
        color: var(--color-text-secondary);
        padding: 0;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .cart-item__meta-separator {
        color: var(--color-text-secondary);
        font-size: 0.62rem;
        font-weight: 600;
        line-height: 1;
      }

      .cart-item__main h3 {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.15;
        font-weight: 700;
      }

      .cart-item__stock {
        margin: 0;
        font-size: 0.68rem;
        color: var(--color-text-secondary);
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .cart-item__footer {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.9fr) auto auto;
        gap: 0.5rem 0.75rem;
        align-items: center;
      }

      .cart-item__subtotal {
        display: grid;
        justify-items: center;
        align-self: center;
        align-content: center;
        gap: 0.08rem;
        min-height: 2.1rem;
        min-width: 0;
      }

      .cart-item__subtotal span {
        color: var(--color-text-secondary);
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        line-height: 1.05;
      }

      .cart-item__subtotal strong {
        font-size: 1rem;
        font-weight: 800;
        line-height: 1.08;
        font-variant-numeric: tabular-nums;
      }

      .cart-item__remove {
        min-height: 2.1rem;
        padding-inline: 0.8rem;
        border-color: color-mix(in srgb, var(--color-danger) 22%, var(--color-border-default));
        color: var(--color-danger);
        background: color-mix(in srgb, var(--color-danger) 6%, var(--color-bg-surface));
        box-shadow: none;
        opacity: 0.88;
        line-height: 1.1;
        align-self: center;
      }

      .mini-field {
        display: grid;
        gap: 0.32rem;
        min-width: 0;
        align-self: center;
      }

      .mini-field > span {
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--color-text-secondary);
        line-height: 1.05;
      }

      .mini-field input {
        width: 100%;
        min-height: 2.2rem;
        padding: 0.58rem 0.72rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-default);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        font-weight: 700;
      }

      .cart-item .mini-field input {
        min-height: 2.1rem;
        padding: 0.34rem 0.5rem;
      }

      .mini-field--quantity {
        min-width: 0;
      }

      .mini-field--discount {
        width: min(7rem, 100%);
      }

      .quantity-tools {
        display: grid;
        grid-template-columns: 2.2rem minmax(3.2rem, 1fr) 2.2rem;
        gap: 0.35rem;
        align-items: center;
      }

      .quantity-tools input {
        text-align: center;
      }

      .quantity-stepper {
        min-height: 2.1rem;
        padding: 0;
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-weight: 700;
      }

      @media (max-width: 760px) {
        .cart-item__footer {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
        }

        .mini-field--discount,
        .cart-item__remove {
          width: 100%;
        }

        .cart-item__subtotal {
          justify-items: start;
          align-self: end;
        }
      }

      @media (max-width: 520px) {
        .cart-item__footer {
          grid-template-columns: 1fr;
          gap: 0.45rem;
        }

        .mini-field--discount {
          width: 100%;
        }

        .cart-item__subtotal,
        .cart-item__remove {
          justify-items: start;
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
