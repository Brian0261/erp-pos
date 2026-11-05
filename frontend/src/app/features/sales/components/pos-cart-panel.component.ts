import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import {
  PosCartItemComponent,
  PosCartItemQuantityChange,
  PosCartItemValueChange,
} from "./pos-cart-item.component";
import { PosCartItem } from "../data/pos-ui.models";

@Component({
    selector: "app-pos-cart-panel",
    imports: [CommonModule, PosCartItemComponent],
    template: `
    <section class="cart-panel">
      <header class="panel-head panel-head--compact">
        <div>
          <h2>{{ cartTitle }}</h2>
        </div>
        <div class="cart-head-actions">
          <button
            type="button"
            class="ui-button ui-button--secondary pos-button pos-button--quiet"
            (click)="openFullCart.emit()"
            [disabled]="cart.length === 0"
          >
            Ver carrito completo
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary pos-button pos-button--quiet pos-button--danger-quiet"
            (click)="cancelSale.emit()"
            [disabled]="cart.length === 0 || editingBlocked"
          >
            Descartar carrito
          </button>
        </div>
      </header>

      <div class="cart-list" *ngIf="cart.length > 0; else emptyCart"><fieldset class="cart-edit-group" [disabled]="editingBlocked">
        <app-pos-cart-item
          *ngFor="let item of cart; let index = index"
          [item]="item"
          [index]="index"
          [lineTotal]="lineTotals[index]"
          (decrease)="decrease.emit($event)"
          (increase)="increase.emit($event)"
          (remove)="remove.emit($event)"
          (quantityFocus)="quantityFocus.emit($event)"
          (setQuantity)="setQuantity.emit($event)"
          (setDiscount)="setDiscount.emit($event)"
        ></app-pos-cart-item></fieldset>
      </div>

      <ng-template #emptyCart>
        <div class="empty-cart">
          <strong>Carrito vacío</strong>
          <span>Escanea o busca un producto para empezar.</span>
        </div>
      </ng-template>
    </section>
  `,
    styles: [`
:host{display:block;min-width:0}.cart-panel{border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:.65rem;background:var(--color-bg-surface);display:grid;gap:.6rem;min-width:0}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap}.panel-head h2{font-size:1rem;margin:0}.cart-head-actions{display:flex;gap:.4rem;flex-wrap:wrap}.cart-head-actions .ui-button{min-height:44px;padding:.45rem .55rem;font-size:.75rem;box-shadow:none;background:transparent;color:var(--color-text-primary);border:1px solid var(--color-border-default)}.cart-list{max-height:50dvh;overflow:auto;scrollbar-gutter:stable;padding:.2rem;min-width:0}.cart-edit-group{border:0;margin:0;padding:0;min-width:0;display:grid;gap:.5rem}.empty-cart{display:grid;place-content:center;text-align:center;gap:.45rem;min-height:7rem;padding:1rem;background:var(--color-bg-soft);border-radius:var(--radius-md);color:var(--color-text-secondary)}.empty-cart strong{color:var(--color-text-primary)}
@media(max-width:520px){.cart-head-actions{width:100%}.cart-head-actions .ui-button{flex:1;white-space:normal}.cart-list{max-height:50dvh}}
    `],
})
export class PosCartPanelComponent {
  @Input() editingBlocked = false;
  @Input({ required: true }) cart: PosCartItem[] = [];
  @Input({ required: true }) cartTitle = "Carrito";
  @Input({ required: true }) lineTotals: number[] = [];

  @Output() readonly openFullCart = new EventEmitter<void>();
  @Output() readonly cancelSale = new EventEmitter<void>();
  @Output() readonly decrease = new EventEmitter<number>();
  @Output() readonly increase = new EventEmitter<number>();
  @Output() readonly remove = new EventEmitter<number>();
  @Output() readonly quantityFocus = new EventEmitter<HTMLInputElement>();
  @Output() readonly setQuantity = new EventEmitter<PosCartItemQuantityChange>();
  @Output() readonly setDiscount = new EventEmitter<PosCartItemValueChange>();
}
