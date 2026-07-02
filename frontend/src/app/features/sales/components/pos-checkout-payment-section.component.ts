import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PaymentLine } from "../data/pos-ui.models";

@Component({
  selector: "app-pos-checkout-payment-section",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="payment-panel" aria-label="Pagos de la venta">
      <header class="payment-panel__header">
        <div>
          <p class="checkout-section__kicker">Cobro</p>
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
  `,
  styles: [
    `
      .payment-panel {
        display: grid;
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
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

      .checkout-section__kicker {
        margin: 0 0 0.2rem;
        color: var(--color-brand-primary);
        font-size: var(--font-size-xs);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .payment-panel__quiet-button,
      .payment-panel__remove-button {
        min-height: 2.35rem;
      }

      .payment-panel__quiet-button {
        background: color-mix(in srgb, var(--color-text-primary) 16%, var(--color-bg-soft));
        color: var(--color-text-primary);
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
        border: 1px solid color-mix(in srgb, var(--color-border-default) 86%, transparent);
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--color-bg-soft) 84%, var(--color-bg-surface));
        padding: var(--space-2);
      }

      .mini-field {
        display: grid;
        gap: var(--space-1);
      }

      .mini-field > span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .mini-field input,
      .mini-field select {
        width: 100%;
        min-height: 2.35rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        font-weight: 700;
        padding: 0.48rem 0.62rem;
      }

      .payment-panel__metrics {
        display: flex;
        gap: var(--space-2);
        justify-content: flex-end;
        flex-wrap: wrap;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .payment-panel__metrics strong {
        color: var(--color-text-primary);
      }

      @media (max-width: 640px) {
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
export class PosCheckoutPaymentSectionComponent {
  @Input({ required: true }) payments: PaymentLine[] = [];
  @Input({ required: true }) paidTotal = 0;
  @Input({ required: true }) change = 0;

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
