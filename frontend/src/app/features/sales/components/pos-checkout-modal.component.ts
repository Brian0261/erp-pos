import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { BillingSeriesResponse } from "../../billing/data/billing.models";
import { PaymentLine, PosReceiptType } from "../data/pos-ui.models";
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
              Registra los pagos y datos del comprobante antes de confirmar la
              venta.
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

          <section class="receipt-panel" aria-label="Comprobante de la venta">
            <header class="receipt-panel__header">
              <div>
                <p class="checkout-modal__kicker">Comprobante</p>
                <h3>Tipo de documento</h3>
              </div>
            </header>

            <div class="receipt-type-list">
              <button
                type="button"
                class="receipt-segment"
                [class.is-active]="receiptType === 'TICKET'"
                (click)="updateReceiptType.emit('TICKET')"
              >
                Ticket interno
              </button>
              <button
                type="button"
                class="receipt-segment"
                [class.is-active]="receiptType === 'RECEIPT'"
                (click)="updateReceiptType.emit('RECEIPT')"
              >
                Boleta
              </button>
              <button
                type="button"
                class="receipt-segment"
                [class.is-active]="receiptType === 'INVOICE'"
                (click)="updateReceiptType.emit('INVOICE')"
              >
                Factura
              </button>
            </div>

            <div class="receipt-customer-grid" *ngIf="receiptType !== 'TICKET'">
              <label class="mini-field mini-field--wide">
                <span>Serie de comprobante *</span>
                <select
                  [value]="receiptSeriesId"
                  (change)="updateReceiptSeriesId.emit($any($event.target).value)"
                >
                  <option value="">Selecciona serie</option>
                  <option *ngFor="let row of filteredBillingSeries" [value]="row.id">
                    {{ row.series }}
                  </option>
                </select>
                <small class="field-inline-error" *ngIf="receiptSeriesInvalid">
                  Debes seleccionar una serie para emitir el comprobante.
                </small>
              </label>
            </div>

            <div class="receipt-no-series" *ngIf="showNoSeriesMessage">
              <p class="field-inline-error">
                {{ noSeriesMessage }}
              </p>
            </div>

            <div class="receipt-customer-grid" *ngIf="receiptType === 'RECEIPT'">
              <label class="mini-field">
                <span>Documento (DNI)</span>
                <input
                  type="text"
                  inputmode="numeric"
                  [value]="receiptCustomerDocument"
                  maxlength="8"
                  (input)="updateReceiptCustomerDocument.emit($any($event.target).value)"
                  (keydown)="receiptNumericKeydown.emit($event)"
                  placeholder="Opcional"
                />
                <small class="field-inline-error" *ngIf="boletaDniInvalid">
                  El DNI debe tener exactamente 8 digitos.
                </small>
              </label>
              <label class="mini-field mini-field--wide">
                <span>Nombre del cliente</span>
                <input
                  type="text"
                  [value]="receiptCustomerName"
                  maxlength="180"
                  (input)="updateReceiptCustomerName.emit($any($event.target).value)"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div class="receipt-customer-grid" *ngIf="receiptType === 'INVOICE'">
              <label class="mini-field">
                <span>RUC *</span>
                <input
                  type="text"
                  inputmode="numeric"
                  [value]="receiptCustomerDocument"
                  maxlength="11"
                  (input)="updateReceiptCustomerDocument.emit($any($event.target).value)"
                  (keydown)="receiptNumericKeydown.emit($event)"
                  placeholder="11 digitos"
                />
                <small class="field-inline-error" *ngIf="invoiceRucInvalid">
                  El RUC debe tener exactamente 11 digitos.
                </small>
              </label>
              <label class="mini-field mini-field--wide">
                <span>Razon social *</span>
                <input
                  type="text"
                  [value]="receiptCustomerName"
                  maxlength="180"
                  (input)="updateReceiptCustomerName.emit($any($event.target).value)"
                  placeholder="Requerido para factura"
                />
                <small class="field-inline-error" *ngIf="invoiceBusinessNameInvalid">
                  La razon social es obligatoria.
                </small>
              </label>
            </div>

            <div class="receipt-extra" *ngIf="receiptType === 'INVOICE'">
              <button
                type="button"
                class="ui-button ui-button--secondary receipt-extra-toggle"
                (click)="toggleFiscalDetails.emit()"
              >
                {{ showFiscalDetails ? "Ocultar" : "Mostrar" }} datos fiscales adicionales
              </button>

              <label class="mini-field" *ngIf="showFiscalDetails">
                <span>Direccion fiscal</span>
                <input
                  type="text"
                  [value]="receiptCustomerAddress"
                  maxlength="240"
                  (input)="updateReceiptCustomerAddress.emit($any($event.target).value)"
                  placeholder="Opcional en esta fase"
                />
              </label>
            </div>

            <small class="field-inline-error" *ngIf="receiptValidationError">
              {{ receiptValidationError }}
            </small>
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

      .receipt-panel {
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

      .receipt-panel__header {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        justify-content: space-between;
      }

      .payment-panel__header h3,
      .receipt-panel__header h3 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
      }

      .payment-panel__quiet-button,
      .payment-panel__remove-button,
      .receipt-extra-toggle {
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

      .receipt-type-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: var(--space-2);
      }

      .receipt-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 2.35rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-bg-soft);
        color: var(--color-text-primary);
        cursor: pointer;
        font-weight: 800;
        padding: 0.48rem 0.58rem;
      }

      .receipt-segment.is-active {
        border-color: var(--color-brand-primary);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-brand-primary) 35%, transparent);
        background: color-mix(in srgb, var(--color-brand-primary) 8%, var(--color-bg-soft));
      }

      .receipt-customer-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: var(--space-2);
      }

      .receipt-extra {
        display: grid;
        gap: var(--space-2);
      }

      .receipt-no-series {
        display: grid;
        gap: var(--space-1);
      }

      .field-inline-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
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
        .receipt-panel__header,
        .payment-line,
        .receipt-type-list,
        .receipt-customer-grid {
          grid-template-columns: 1fr;
        }

        .payment-panel__header,
        .receipt-panel__header {
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
  @Input({ required: true }) receiptType: PosReceiptType = "TICKET";
  @Input({ required: true }) receiptSeriesId = "";
  @Input({ required: true }) receiptCustomerDocument = "";
  @Input({ required: true }) receiptCustomerName = "";
  @Input({ required: true }) receiptCustomerAddress = "";
  @Input({ required: true }) showFiscalDetails = false;
  @Input({ required: true }) filteredBillingSeries: BillingSeriesResponse[] = [];
  @Input({ required: true }) receiptSeriesInvalid = false;
  @Input({ required: true }) showNoSeriesMessage = false;
  @Input({ required: true }) noSeriesMessage = "";
  @Input({ required: true }) boletaDniInvalid = false;
  @Input({ required: true }) invoiceRucInvalid = false;
  @Input({ required: true }) invoiceBusinessNameInvalid = false;
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
  @Output() readonly updateReceiptType = new EventEmitter<PosReceiptType>();
  @Output() readonly updateReceiptSeriesId = new EventEmitter<string>();
  @Output() readonly updateReceiptCustomerDocument = new EventEmitter<string>();
  @Output() readonly updateReceiptCustomerName = new EventEmitter<string>();
  @Output() readonly updateReceiptCustomerAddress = new EventEmitter<string>();
  @Output() readonly toggleFiscalDetails = new EventEmitter<void>();
  @Output() readonly receiptNumericKeydown = new EventEmitter<KeyboardEvent>();
}
