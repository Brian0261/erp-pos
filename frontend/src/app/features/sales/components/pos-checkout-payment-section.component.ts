import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PaymentLine } from "../data/pos-ui.models";
import { calculatePosRemaining } from "../utils/pos-calculations";

@Component({
    selector: "app-pos-checkout-payment-section",
    imports: [CommonModule],
    template: `
    <section class="payment-panel" aria-label="Pagos de la venta">
      <header class="payment-panel__header">
        <div>
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

      <div class="payment-total"><span>Total de venta</span><strong>S/ {{ (total | number: "1.2-2") ?? '—' }}</strong></div>
      <div class="payment-list">
        <article
          class="payment-line"
          *ngFor="let payment of payments; let index = index"
        >
          <label class="mini-field">
            <span>Método *</span>
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
              aria-label="Monto *"
              [attr.aria-invalid]="amountErrors[index] ? 'true' : null"
              [attr.aria-describedby]="amountErrors[index] ? 'payment-amount-error-' + index : null"
              [value]="payment.amountInput ?? payment.amount"
              (input)="
                updatePaymentAmount.emit({
                  index,
                  value: $any($event.target).value,
                })
              "
            />
            <small class="payment-amount-error" *ngIf="amountErrors[index]" [id]="'payment-amount-error-' + index">Ingresa un monto válido.</small>
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
            class="ui-button ui-button--secondary payment-panel__remove-button"
            (click)="removePayment.emit(index)"
            [disabled]="payments.length === 1"
          >
            Quitar
          </button>
        </article>
      </div>

      <div class="payment-panel__metrics" aria-label="Resumen de pagos">
        <span>Pagos ingresados <strong>S/ {{ (paidTotal | number: "1.2-2") ?? '—' }}</strong></span>
        <span *ngIf="pendingAmount > 0">Pendiente <strong>S/ {{ (pendingAmount | number: "1.2-2") ?? '—' }}</strong></span>
        <span *ngIf="change > 0">Vuelto <strong>S/ {{ (change | number: "1.2-2") ?? '—' }}</strong></span>
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

      .payment-panel__quiet-button,
      .payment-panel__remove-button {
        min-height: 2.35rem;
      }

      .payment-panel__quiet-button {
        background: color-mix(in srgb, var(--color-text-primary) 10%, var(--color-bg-soft));
        color: var(--color-text-primary);
      }

      .payment-panel__remove-button {
        border-color: color-mix(in srgb, var(--color-danger) 22%, var(--color-border-default));
        color: color-mix(in srgb, var(--color-danger) 78%, var(--color-text-secondary));
        background: color-mix(in srgb, var(--color-danger) 6%, var(--color-bg-surface));
      }

      .payment-list {
        display: grid;
        gap: var(--space-2);
        max-height: 16rem;
        overflow: auto;
        padding-right: 0.2rem;
      }

      .payment-line {
        display: grid;
        grid-template-columns:
          minmax(136px, 0.95fr) minmax(98px, 0.58fr) minmax(140px, 1fr)
          minmax(76px, auto);
        gap: 0.65rem;
        align-items: start;
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
        font-size: 0.72rem;
        line-height: 1.5;
        font-weight: 700;
      }

      .payment-amount-error { color: var(--color-danger); font-size: .8rem; line-height: 1.35; }
      .payment-panel__remove-button { margin-top: calc(0.72rem * 1.5 + var(--space-1)); }

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
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.55rem;
      }

      .payment-panel__metrics span {
        display: grid;
        gap: 0.08rem;
        border: 1px solid color-mix(in srgb, var(--color-border-default) 86%, transparent);
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-bg-soft) 84%, var(--color-bg-surface));
        padding: 0.55rem 0.7rem;
        color: var(--color-text-secondary);
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .payment-panel__metrics strong {
        color: var(--color-text-primary);
        font-size: 1rem;
        text-transform: none;
      }

      .payment-total{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.7rem .75rem;background:var(--color-bg-soft);border-radius:var(--radius-md);font-variant-numeric:tabular-nums}
      .payment-total strong{font-size:1.5rem}.mini-field{min-width:0}.mini-field input,.mini-field select,.payment-panel__quiet-button,.payment-panel__remove-button{min-height:44px;min-width:0}
      @media(max-width:640px){.payment-line{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.5rem}.payment-list{max-height:none}.payment-panel__remove-button{justify-self:end}.payment-total{gap:.5rem;padding:.6rem}.payment-total strong{font-size:1.3rem}}
    `,
    ]
})
export class PosCheckoutPaymentSectionComponent {
  @Input({ required: true }) total = 0;
  get pendingAmount(): number { return calculatePosRemaining(this.total, this.paidTotal); }
  @Input({ required: true }) payments: PaymentLine[] = [];
  @Input() amountErrors: string[] = [];
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
