import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PaymentLine } from "../data/pos-ui.models";
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
            <span>Checkout de cobro</span>
            <strong>{{ cartItemsCount }} item(s) en la venta</strong>
            <p>
              Registra los pagos en este modal. El comprobante sigue en la
              pantalla principal en esta fase.
            </p>
          </section>

          <section class="payment-panel" aria-label="Pagos de la venta">
            <header class="payment-panel__header">
              <div>
                <p class="checkout-modal__kicker">Cobro</p>
                <h3>Pagos</h3>
              </div>
              <button
                type="button"
                class="ui-button ui-button--secondary payment-panel__quiet-button"
                (click)="addPayment.emit()"
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
                      updatePaymentMethod.emit({
                        index,
                        value: $any($event.target).value,
                      })
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
                    (input)="
                      updatePaymentAmount.emit({
                        index,
                        value: $any($event.target).value,
                      })
                    "
                  />
                </label>
                <label class="mini-field mini-field--wide">
                  <span>Referencia</span>
                  <input
                    type="text"
                    [value]="payment.reference"
                    (input)="
                      updatePaymentReference.emit({
                        index,
                        value: $any($event.target).value,
                      })
                    "
                    maxlength="120"
                    placeholder="Opcional"
                  />
                </label>
                <button
                  type="button"
                  class="ui-button ui-button--danger payment-panel__remove-button"
                  (click)="removePayment.emit(index)"
                  [disabled]="payments.length === 1"
                >
                  Quitar
                </button>
              </article>
            </div>

            <div class="payment-panel__metrics" aria-label="Resumen de pagos">
              <span>Pagado: <strong>S/ {{ paidTotal | number: "1.2-2" }}</strong></span>
              <span>Vuelto: <strong>S/ {{ change | number: "1.2-2" }}</strong></span>
            </div>
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
        width: min(100%, 52rem);
        max-height: min(92vh, 48rem);
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

      .payment-panel {
        display: grid;
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
        padding: var(--space-2);
      }

      .payment-panel__header {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        justify-content: space-between;
      }

      .payment-panel__header h3 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
      }

      .payment-panel__quiet-button,
      .payment-panel__remove-button {
        min-height: 2.35rem;
      }

      .payment-panel__quiet-button {
        background: #4b5563;
      }

      .payment-list {
        display: grid;
        gap: var(--space-2);
        max-height: 15rem;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .payment-line {
        display: grid;
        grid-template-columns:
          minmax(136px, 0.95fr) minmax(98px, 0.58fr) minmax(140px, 1fr)
          minmax(76px, auto);
        gap: var(--space-2);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        padding: var(--space-2);
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

      .mini-field input,
      .mini-field select {
        width: 100%;
        min-height: 2.35rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        font-weight: 800;
        padding: 0.48rem 0.62rem;
      }

      .payment-panel__metrics {
        display: flex;
        gap: var(--space-2);
        justify-content: flex-end;
        flex-wrap: wrap;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 800;
      }

      .payment-panel__metrics strong {
        color: var(--color-text-primary);
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

        .payment-panel__header,
        .payment-line {
          grid-template-columns: 1fr;
        }

        .payment-panel__header {
          align-items: stretch;
          display: grid;
        }
      }
    `,
  ],
})
export class PosCheckoutModalComponent {
  @Input({ required: true }) isOpen = false;
  @Input({ required: true }) payments: PaymentLine[] = [];
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
  @Output() readonly addPayment = new EventEmitter<void>();
  @Output() readonly removePayment = new EventEmitter<number>();
  @Output() readonly updatePaymentMethod = new EventEmitter<{
    index: number;
    value: string;
  }>();
  @Output() readonly updatePaymentAmount = new EventEmitter<{
    index: number;
    value: string;
  }>();
  @Output() readonly updatePaymentReference = new EventEmitter<{
    index: number;
    value: string;
  }>();
}
