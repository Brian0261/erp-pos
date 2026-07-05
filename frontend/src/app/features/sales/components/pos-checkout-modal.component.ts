import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";

import { BillingSeriesResponse } from "../../billing/data/billing.models";
import { PaymentLine, PosReceiptType } from "../data/pos-ui.models";
import { PosCheckoutPaymentSectionComponent } from "./pos-checkout-payment-section.component";
import { PosCheckoutReceiptSectionComponent } from "./pos-checkout-receipt-section.component";
import { PosTotalsSummaryComponent } from "./pos-totals-summary.component";

@Component({
  selector: "app-pos-checkout-modal",
  standalone: true,
  imports: [
    CommonModule,
    PosCheckoutPaymentSectionComponent,
    PosCheckoutReceiptSectionComponent,
    PosTotalsSummaryComponent,
  ],
  template: `
    <section
      class="checkout-modal-backdrop"
      *ngIf="isOpen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      (click)="handleClose()"
    >
      <article class="checkout-modal" (click)="$event.stopPropagation()">
        <header class="checkout-modal__header">
          <div class="checkout-modal__header-copy">
            <h2 id="checkout-modal-title">Cobrar venta</h2>
            <p class="checkout-modal__summary">
              {{ cartItemsCountLabel }} · Total S/ {{ total | number: "1.2-2" }}
            </p>
          </div>
          <button
            type="button"
            class="ui-button ui-button--secondary checkout-modal__close"
            (click)="handleClose()"
          >
            Cerrar
          </button>
        </header>

        <div class="checkout-modal__body">
          <div class="checkout-modal__content-grid">
            <div class="checkout-modal__receipt-column">
              <app-pos-checkout-receipt-section
                [receiptType]="receiptType"
                [receiptSeriesId]="receiptSeriesId"
                [receiptCustomerDocument]="receiptCustomerDocument"
                [receiptCustomerName]="receiptCustomerName"
                [receiptCustomerAddress]="receiptCustomerAddress"
                [showFiscalDetails]="showFiscalDetails"
                [filteredBillingSeries]="filteredBillingSeries"
                [receiptSeriesInvalid]="receiptSeriesInvalid"
                [showNoSeriesMessage]="showNoSeriesMessage"
                [noSeriesMessage]="noSeriesMessage"
                [boletaDniInvalid]="boletaDniInvalid"
                [invoiceRucInvalid]="invoiceRucInvalid"
                [invoiceBusinessNameInvalid]="invoiceBusinessNameInvalid"
                [receiptValidationError]="receiptValidationError"
                [submitAttempted]="submitAttempted"
                (updateReceiptType)="handleReceiptTypeChange($event)"
                (updateReceiptSeriesId)="updateReceiptSeriesId.emit($event)"
                (updateReceiptCustomerDocument)="updateReceiptCustomerDocument.emit($event)"
                (updateReceiptCustomerName)="updateReceiptCustomerName.emit($event)"
                (updateReceiptCustomerAddress)="updateReceiptCustomerAddress.emit($event)"
                (toggleFiscalDetails)="toggleFiscalDetails.emit()"
                (receiptNumericKeydown)="receiptNumericKeydown.emit($event)"
              ></app-pos-checkout-receipt-section>
            </div>

            <div class="checkout-modal__payment-column">
              <app-pos-checkout-payment-section
                [payments]="payments"
                [paidTotal]="paidTotal"
                [change]="change"
                (addPayment)="addPayment.emit()"
                (removePayment)="removePayment.emit($event)"
                (updatePaymentMethod)="updatePaymentMethod.emit($event)"
                (updatePaymentAmount)="updatePaymentAmount.emit($event)"
                (updatePaymentReference)="updatePaymentReference.emit($event)"
              ></app-pos-checkout-payment-section>

              <app-pos-totals-summary
                [total]="total"
                [subtotal]="subtotal"
                [discountTotal]="discountTotal"
                [paidTotal]="paidTotal"
                [change]="change"
              ></app-pos-totals-summary>
            </div>
          </div>
        </div>

        <footer class="checkout-modal__actions">
          <small class="checkout-modal__warning" *ngIf="submitAttempted && receiptValidationSummary">
            {{ receiptValidationSummary }}
          </small>
          <button
            type="button"
            class="ui-button ui-button--secondary checkout-modal__action"
            (click)="handleClose()"
          >
            Seguir editando
          </button>
          <button
            type="button"
            class="ui-button ui-button--primary checkout-modal__action checkout-modal__action--primary"
            [disabled]="submitting"
            (click)="handleFinalize()"
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
        background: rgba(15, 23, 42, 0.56);
        backdrop-filter: blur(10px);
      }

      .checkout-modal {
        width: min(100%, 72rem);
        max-height: min(92vh, 50rem);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: calc(var(--radius-lg) + 0.35rem);
        background: var(--color-bg-surface);
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
        padding: var(--space-3);
        overflow: hidden;
      }

      .checkout-modal__header,
      .checkout-modal__actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        justify-content: space-between;
      }

      .checkout-modal__header-copy {
        display: grid;
        gap: 0.2rem;
        min-width: 0;
      }

      .checkout-modal__header h2 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: clamp(1.35rem, 2.3vw, 1.85rem);
        line-height: 1.1;
      }

      .checkout-modal__summary {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .checkout-modal__close,
      .checkout-modal__action {
        min-height: 2.75rem;
      }

      .checkout-modal__close {
        min-height: 2.4rem;
        padding: 0.45rem 0.8rem;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        background: transparent;
        border-color: var(--color-border-soft);
      }

      .checkout-modal__close:hover,
      .checkout-modal__close:focus-visible {
        color: var(--color-text-primary);
        background: var(--color-bg-soft);
      }

      .checkout-modal__body {
        display: grid;
        gap: var(--space-2);
        min-height: 0;
        overflow: auto;
        padding-right: 0.2rem;
      }

      .checkout-modal__content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(19rem, 0.95fr);
        gap: var(--space-2);
        align-items: start;
      }

      .checkout-modal__receipt-column,
      .checkout-modal__payment-column {
        display: grid;
        gap: var(--space-2);
        min-width: 0;
      }

      .checkout-modal__warning {
        color: var(--color-danger);
        font-weight: 700;
        flex: 1 1 100%;
      }

      .checkout-modal__actions {
        flex-wrap: wrap;
        padding-top: var(--space-2);
        border-top: 1px solid color-mix(in srgb, var(--color-border-default) 86%, transparent);
      }

      .checkout-modal__action {
        flex: 1 1 12rem;
      }

      .checkout-modal__action--primary {
        font-size: var(--font-size-lg);
        font-weight: 800;
      }

      .checkout-modal__body::-webkit-scrollbar {
        width: 6px;
      }

      .checkout-modal__body::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--color-brand-primary) 22%, transparent);
        border-radius: var(--radius-pill);
      }

      @media (max-width: 960px) {
        .checkout-modal {
          width: min(100%, 60rem);
        }

        .checkout-modal__content-grid {
          grid-template-columns: 1fr;
        }
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

        .checkout-modal__header,
        .checkout-modal__actions {
          align-items: flex-start;
          display: grid;
        }

        .checkout-modal__action {
          width: 100%;
        }
      }
    `,
  ],
})
export class PosCheckoutModalComponent implements OnChanges {
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

  submitAttempted = false;

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"] && !this.isOpen) {
      this.submitAttempted = false;
    }
  }

  get cartItemsCountLabel(): string {
    return this.cartItemsCount === 1 ? "1 ítem" : `${this.cartItemsCount} ítems`;
  }

  get receiptValidationSummary(): string {
    if (!this.receiptValidationError) {
      return "";
    }

    if (this.receiptType === "INVOICE") {
      if (
        this.invoiceRucInvalid ||
        this.invoiceBusinessNameInvalid ||
        this.receiptSeriesInvalid
      ) {
        return "Completa los datos requeridos para emitir factura.";
      }
    }

    if (this.receiptType === "RECEIPT") {
      if (this.boletaDniInvalid || this.receiptSeriesInvalid) {
        return "Revisa los datos del comprobante antes de emitir.";
      }
    }

    return this.receiptValidationError;
  }

  handleClose(): void {
    this.submitAttempted = false;
    this.close.emit();
  }

  handleFinalize(): void {
    this.submitAttempted = true;
    this.finalize.emit();
  }

  handleReceiptTypeChange(type: PosReceiptType): void {
    this.submitAttempted = false;
    this.updateReceiptType.emit(type);
  }
}
