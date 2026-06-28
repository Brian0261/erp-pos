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
  standalone: true,
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
            class="ui-button ui-button--secondary pos-button pos-button--quiet"
            (click)="cancelSale.emit()"
            [disabled]="cart.length === 0"
          >
            Cancelar venta
          </button>
        </div>
      </header>

      <div class="cart-list" *ngIf="cart.length > 0; else emptyCart">
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
        ></app-pos-cart-item>
      </div>

      <ng-template #emptyCart>
        <div class="empty-cart">
          <strong>Carrito vacio</strong>
          <span>Escanea o busca un producto para empezar.</span>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }

      h2 {
        margin: 0;
      }

      .cart-panel {
        height: 100%;
        box-sizing: border-box;
        border: 1px solid color-mix(in srgb, var(--color-brand-primary) 20%, var(--color-border-default));
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
        padding: 0.65rem;
        display: grid;
        gap: var(--space-2);
        min-height: 0;
        overflow: hidden;
        grid-template-rows: auto minmax(0, 1fr);
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

      .panel-head h2 {
        font-size: 1.1rem;
        line-height: 1.1;
        font-weight: 900;
      }

      .cart-head-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-1);
        flex-wrap: wrap;
      }

      .cart-panel .pos-button--quiet {
        min-height: 2rem;
        padding: 0.36rem var(--space-2);
        font-size: var(--font-size-sm);
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

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .cart-list {
        display: grid;
        align-content: start;
        gap: 0.42rem;
        min-height: 0;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .empty-cart {
        display: grid;
        gap: var(--space-1);
        place-items: center;
        min-height: 8rem;
        border: 2px dashed var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        text-align: center;
        padding: var(--space-3);
      }

      .empty-cart span {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .cart-list::-webkit-scrollbar {
        width: 8px;
      }

      .cart-list::-webkit-scrollbar-track {
        background: var(--color-bg-soft);
        border-radius: var(--radius-pill);
      }

      .cart-list::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          var(--color-brand-highlight),
          var(--color-brand-accent)
        );
        border-radius: var(--radius-pill);
      }

      @media (max-width: 980px) {
        .cart-list {
          max-height: 22rem;
        }
      }

      @media (max-width: 760px) {
        .panel-head,
        .panel-head--compact {
          align-items: stretch;
          flex-direction: column;
        }

        .panel-head,
        .cart-head-actions {
          width: 100%;
        }

        .pos-button {
          width: 100%;
        }
      }
    `,
  ],
})
export class PosCartPanelComponent {
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
