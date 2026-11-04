import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PosCartItem } from "../data/pos-ui.models";
import { quantityStep } from "../utils/pos-decimal";
import { canPosStep, posUnitPriceText } from "../utils/pos-calculations";

export interface PosCartItemValueChange {
  index: number;
  value: string;
}

export interface PosCartItemQuantityChange extends PosCartItemValueChange {
  input?: HTMLInputElement;
}

@Component({
    selector: "app-pos-cart-item",
    imports: [CommonModule],
    template: `
    <article class="cart-item">
      <div class="cart-item__main">
        <h3>{{ item.name }}</h3>
        <div class="cart-item__meta-row">
          <p class="cart-item__sku">{{ item.sku }}</p>
          <span class="cart-item__meta-separator" aria-hidden="true">·</span>
          <p class="cart-item__stock">P.U. S/ {{ unitPriceText(item) }}</p>
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
        <label class="mini-field mini-field--discount">
          <span title="Importe total descontado de esta línea">Descuento (S/)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label="Descuento del producto"
            [value]="item.discountInput ?? item.discountAmount"
            (input)="setDiscount.emit({ index: index, value: $any($event.target).value })"
          />
        </label>

        <div class="cart-item__subtotal">
          <span>Importe</span>
          <strong>S/ {{ (lineTotal | number: "1.2-2") ?? '—' }}</strong>
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
    styles: [`
:host{display:block;min-width:0;container-type:inline-size}.cart-item{border:1px solid var(--color-border-default);border-radius:var(--radius-md);padding:.6rem;display:grid;gap:.5rem;min-width:0}.cart-item h3{font-size:.95rem;line-height:1.25;margin:0;overflow-wrap:anywhere}.cart-item__main{min-width:0}.cart-item__meta-row{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.2rem;color:var(--color-text-secondary);font-size:.75rem}.cart-item__meta-row p{margin:0}.cart-item__footer{display:grid;grid-template-columns:minmax(140px,1.35fr) minmax(84px,.9fr) minmax(60px,.7fr) auto;gap:.45rem;align-items:end;min-width:0}.mini-field{display:grid;gap:.2rem;min-width:0}.mini-field>span,.cart-item__subtotal>span{font-size:.75rem;color:var(--color-text-secondary)}.mini-field input{width:100%;min-width:0;min-height:44px;padding:.45rem .3rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-bg-canvas);color:var(--color-text-primary);box-sizing:border-box;font-size:.95rem;font-variant-numeric:tabular-nums}.quantity-tools{display:grid;grid-template-columns:36px minmax(48px,1fr) 36px;gap:.2rem}.quantity-tools input{text-align:center}.quantity-stepper{min-height:44px;min-width:36px;padding:0;background:var(--color-bg-soft);color:var(--color-text-primary);border:1px solid var(--color-border-default);border-radius:var(--radius-sm);font-size:1rem}.cart-item__subtotal{display:grid;gap:.2rem;text-align:right;align-self:end;min-height:60px;align-content:end}.cart-item__subtotal strong{font-size:.98rem;white-space:nowrap;font-variant-numeric:tabular-nums;padding-block:.7rem}.cart-item__remove{min-height:44px;padding:.4rem .5rem;font-size:.8rem;background:transparent;border:1px solid var(--color-border-default);color:var(--color-text-primary)}
@container(max-width:380px){.cart-item__footer{grid-template-columns:minmax(140px,1fr) minmax(84px,1fr)}.cart-item__subtotal{text-align:left;min-height:0;display:flex;gap:.5rem;align-items:center}.cart-item__subtotal strong{padding:0}.cart-item__remove{justify-self:end;min-width:72px}}

@container(max-width:260px){.cart-item__footer{grid-template-columns:minmax(114px,1.3fr) minmax(80px,1fr)}.quantity-tools{grid-template-columns:32px minmax(0,1fr) 32px}.quantity-tools input{appearance:textfield}.quantity-tools input::-webkit-inner-spin-button,.quantity-tools input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}}
    `],
})
export class PosCartItemComponent {
  readonly quantityStep = quantityStep;
  readonly canStep = canPosStep;
  readonly unitPriceText = posUnitPriceText;
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
