import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from "@angular/core";

import { BillingSeriesResponse } from "../../billing/data/billing.models";
import { PaymentLine, PosReceiptType } from "../data/pos-ui.models";
import { PosCheckoutPaymentSectionComponent } from "./pos-checkout-payment-section.component";
import { PosCheckoutReceiptSectionComponent } from "./pos-checkout-receipt-section.component";
import { PosTotalsSummaryComponent } from "./pos-totals-summary.component";
import { ConfirmDialogService } from "../../../shared/dialogs/confirm-dialog.service";

@Component({
    selector: "app-pos-checkout-modal",
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
      <article #checkoutPanel class="checkout-modal" (click)="$event.stopPropagation()">
        <header class="checkout-modal__header">
          <div class="checkout-modal__header-copy">
            <h2 id="checkout-modal-title">Cobrar venta</h2>
            <p class="checkout-modal__summary">
              {{ cartItemsCountLabel }} · Total S/ {{ (total | number: "1.2-2") ?? '—' }}
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
          <div #operationNotice class="checkout-modal__notice" tabindex="-1" *ngIf="errorMessage || recoveryMessage">
            <p class="ui-alert ui-alert--error" role="alert" *ngIf="errorMessage">{{ errorMessage }}</p>
            <p class="ui-alert ui-alert--warning" role="status" *ngIf="recoveryMessage">{{ recoveryMessage }}</p>
          </div>
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
                [total]="total"
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
        max-height: min(92dvh, 50rem);
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
        overscroll-behavior: contain;
        padding-right: 0.2rem;
      }

      .checkout-modal__notice { outline-offset: 2px; overflow-wrap: anywhere; }
      .checkout-modal__notice p { margin: 0 0 var(--space-2); }

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
          max-height: 94dvh;
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
    ]
})
export class PosCheckoutModalComponent implements OnChanges, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly confirmations = inject(ConfirmDialogService);
  private panel?: HTMLElement;
  private notice?: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private pendingFocusTarget: HTMLElement | null = null;
  private readonly background = new Map<HTMLElement, boolean>();
  private shell: HTMLElement | null = null;
  private shellWasElevated = false;
  private previousBodyOverflow: string | null = null;
  private dialogGeneration = 0;

  @ViewChild("checkoutPanel")
  set checkoutPanel(ref: ElementRef<HTMLElement> | undefined) {
    if (!ref) { this.releaseDialog(); return; }
    if (this.panel === ref.nativeElement) return;
    // A view query may run again without replacing the DOM node. Capture originals only once.
    const previousFocus = this.panel ? this.previousFocus
      : this.pendingFocusTarget ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    this.releaseDialog();
    this.panel = ref.nativeElement;
    const generation = ++this.dialogGeneration;
    this.pendingFocusTarget = null;
    this.previousFocus = previousFocus;
    this.shell = this.host.nativeElement.closest<HTMLElement>(".layout-shell");
    this.shellWasElevated = this.shell?.classList.contains("has-checkout-modal") ?? false;
    this.shell?.classList.add("has-checkout-modal");
    // Isolate only the modal's ancestor siblings. The shared confirmation overlay remains above it.
    let branch = this.host.nativeElement;
    while (branch.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling instanceof HTMLElement && sibling !== branch && !sibling.matches("app-confirm-dialog,script,style")) {
          this.background.set(sibling, sibling.inert); sibling.inert = true;
        }
      }
      if (parent === this.shell || !this.shell) break;
      branch = parent;
    }
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    queueMicrotask(() => { if (this.dialogGeneration === generation) this.focusNoticeOrClose(); });
  }

  @ViewChild("operationNotice")
  set operationNotice(ref: ElementRef<HTMLElement> | undefined) { this.notice = ref?.nativeElement; }
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
  @Input() errorMessage = "";
  @Input() recoveryMessage = "";

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
    if (this.isOpen && (changes["errorMessage"] || changes["recoveryMessage"])) {
      const generation = this.dialogGeneration;
      queueMicrotask(() => { if (this.dialogGeneration === generation && this.notice) this.focusNoticeOrClose(); });
    }
  }

  ngOnDestroy(): void { this.releaseDialog(); }

  @HostListener("document:keydown", ["$event"])
  onDialogKeydown(event: KeyboardEvent): void {
    if (!this.panel || this.confirmations.currentState) return;
    if (event.key === "Escape" && !this.submitting) { event.preventDefault(); this.handleClose(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(this.panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
    )).filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
    const first = controls[0], last = controls[controls.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    const active = document.activeElement as HTMLElement;
    if (!controls.includes(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  }

  @HostListener("document:focusin", ["$event"])
  onDialogFocus(event: FocusEvent): void {
    if (this.panel && !this.confirmations.currentState && event.target instanceof Node && !this.panel.contains(event.target)) this.focusNoticeOrClose();
  }

  private focusNoticeOrClose(): void {
    if (!this.isOpen || !this.panel?.isConnected || this.confirmations.currentState) return;
    if (this.notice) { this.panel.querySelector(".checkout-modal__body")?.scrollTo({top: 0}); this.notice.focus({preventScroll: true}); }
    else this.panel.querySelector<HTMLButtonElement>(".checkout-modal__close")?.focus({preventScroll: true});
  }

  private releaseDialog(): void {
    if (!this.panel) return;
    const generation = ++this.dialogGeneration;
    this.panel = undefined; this.notice = undefined;
    for (const [element, wasInert] of this.background) element.inert = wasInert;
    this.background.clear();
    if (!this.shellWasElevated) this.shell?.classList.remove("has-checkout-modal");
    this.shell = null;
    this.shellWasElevated = false;
    if (this.previousBodyOverflow !== null) document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
    const target = this.previousFocus; this.previousFocus = null;
    this.pendingFocusTarget = target;
    queueMicrotask(() => {
      if (this.dialogGeneration !== generation) return;
      this.pendingFocusTarget = null;
      if (!this.panel && !this.confirmations.currentState
        && target?.isConnected && !target.closest("[inert]") && !target.matches(":disabled")) target.focus({preventScroll: true});
    });
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
