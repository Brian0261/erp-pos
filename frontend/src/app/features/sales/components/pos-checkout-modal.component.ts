import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PosTotalsSummaryComponent } from "./pos-totals-summary.component";

@Component({
  selector: "app-pos-checkout-modal",
  standalone: true,
  imports: [CommonModule, PosTotalsSummaryComponent],
  template: `
    <section
      class="checkout-modal-backdrop"
      *ngIf="isOpen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      (click)="close.emit()"
    >
      <article class="checkout-modal" (click)="$event.stopPropagation()">
        <header class="checkout-modal__header">
          <div>
            <p class="checkout-modal__kicker">POS</p>
            <h2 id="checkout-modal-title">Cobrar venta</h2>
          </div>
          <button
            type="button"
            class="ui-button ui-button--secondary checkout-modal__close"
            (click)="close.emit()"
          >
            Cerrar
          </button>
        </header>

        <div class="checkout-modal__body">
          <section class="checkout-modal__intro" aria-label="Estado del checkout">
            <span>Shell de checkout</span>
            <strong>{{ cartItemsCount }} item(s) en la venta</strong>
            <p>
              Pagos y comprobante siguen disponibles en la pantalla principal en
              esta fase.
            </p>
          </section>

          <app-pos-totals-summary
            [total]="total"
            [subtotal]="subtotal"
            [discountTotal]="discountTotal"
            [paidTotal]="paidTotal"
            [change]="change"
          ></app-pos-totals-summary>

          <small class="checkout-modal__warning" *ngIf="receiptValidationError">
            {{ receiptValidationError }}
          </small>
        </div>

        <footer class="checkout-modal__actions">
          <button
            type="button"
            class="ui-button ui-button--secondary checkout-modal__action"
            (click)="close.emit()"
          >
            Seguir editando
          </button>
          <button
            type="button"
            class="ui-button ui-button--primary checkout-modal__action checkout-modal__action--primary"
            [disabled]="submitting || !!receiptValidationError"
            (click)="finalize.emit()"
          >
            {{ submitting ? "Cobrando..." : checkoutButtonLabel }}
          </button>
        </footer>
      </article>
    </section>
  `,
  styles: [
    `
      .checkout-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: var(--space-3);
        background: rgba(15, 23, 42, 0.62);
        backdrop-filter: blur(10px);
      }

      .checkout-modal {
        width: min(100%, 42rem);
        max-height: min(92vh, 44rem);
        overflow: auto;
        display: grid;
        gap: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: calc(var(--radius-lg) + 0.35rem);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-lg);
        padding: var(--space-3);
      }

      .checkout-modal__header,
      .checkout-modal__actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        justify-content: space-between;
      }

      .checkout-modal__header h2 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: clamp(1.45rem, 3vw, 2rem);
        line-height: 1.1;
      }

      .checkout-modal__kicker {
        margin: 0 0 0.2rem;
        color: var(--color-brand-primary);
        font-size: var(--font-size-xs);
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .checkout-modal__close,
      .checkout-modal__action {
        min-height: 2.75rem;
      }

      .checkout-modal__body {
        display: grid;
        gap: var(--space-3);
      }

      .checkout-modal__intro {
        display: grid;
        gap: var(--space-1);
        border: 1px solid rgba(18, 23, 184, 0.18);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .checkout-modal__intro span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .checkout-modal__intro strong {
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
      }

      .checkout-modal__intro p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .checkout-modal__warning {
        color: var(--color-danger);
        font-weight: 800;
      }

      .checkout-modal__actions {
        flex-wrap: wrap;
      }

      .checkout-modal__action {
        flex: 1 1 12rem;
      }

      .checkout-modal__action--primary {
        font-size: var(--font-size-lg);
        font-weight: 900;
      }

      @media (max-width: 640px) {
        .checkout-modal-backdrop {
          align-items: end;
          padding: var(--space-2);
        }

        .checkout-modal {
          width: 100%;
          max-height: 94vh;
          padding: var(--space-2);
        }

        .checkout-modal__header {
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class PosCheckoutModalComponent {
  @Input({ required: true }) isOpen = false;
  @Input({ required: true }) total = 0;
  @Input({ required: true }) subtotal = 0;
  @Input({ required: true }) discountTotal = 0;
  @Input({ required: true }) paidTotal = 0;
  @Input({ required: true }) change = 0;
  @Input({ required: true }) cartItemsCount = 0;
  @Input({ required: true }) checkoutButtonLabel = "COBRAR";
  @Input({ required: true }) submitting = false;
  @Input({ required: true }) receiptValidationError = "";

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly finalize = new EventEmitter<void>();
}
