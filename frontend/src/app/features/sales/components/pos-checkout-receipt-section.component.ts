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
import { PosReceiptType } from "../data/pos-ui.models";

@Component({
  selector: "app-pos-checkout-receipt-section",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="receipt-panel" aria-label="Comprobante de la venta">
      <header class="receipt-panel__header">
        <div>
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
            (blur)="markTouched('series')"
          >
            <option value="">Selecciona serie</option>
            <option *ngFor="let row of filteredBillingSeries" [value]="row.id">
              {{ row.series }}
            </option>
          </select>
          <small class="field-inline-error" *ngIf="shouldShowSeriesError">
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
            (blur)="markTouched('boletaDocument')"
            (keydown)="receiptNumericKeydown.emit($event)"
            placeholder="Opcional"
          />
          <small class="field-inline-error" *ngIf="shouldShowBoletaDniError">
            El DNI debe tener exactamente 8 dígitos.
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
            (blur)="markTouched('invoiceDocument')"
            (keydown)="receiptNumericKeydown.emit($event)"
            placeholder="11 dígitos"
          />
          <small class="field-inline-helper" *ngIf="!shouldShowInvoiceRucError">
            11 dígitos
          </small>
          <small class="field-inline-error" *ngIf="shouldShowInvoiceRucError">
            El RUC debe tener exactamente 11 dígitos.
          </small>
        </label>
        <label class="mini-field mini-field--wide">
          <span>Razón social *</span>
          <input
            type="text"
            [value]="receiptCustomerName"
            maxlength="180"
            (input)="updateReceiptCustomerName.emit($any($event.target).value)"
            (blur)="markTouched('invoiceBusinessName')"
            placeholder="Requerido para factura"
          />
          <small class="field-inline-helper" *ngIf="!shouldShowInvoiceBusinessNameError">
            Requerido para factura
          </small>
          <small class="field-inline-error" *ngIf="shouldShowInvoiceBusinessNameError">
            La razón social es obligatoria.
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
          <span>Dirección fiscal</span>
          <input
            type="text"
            [value]="receiptCustomerAddress"
            maxlength="240"
            (input)="updateReceiptCustomerAddress.emit($any($event.target).value)"
            placeholder="Opcional en esta fase"
          />
        </label>
      </div>
    </section>
  `,
  styles: [
    `
      .receipt-panel {
        display: grid;
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: var(--space-2);
      }

      .receipt-panel__header {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        justify-content: space-between;
      }

      .receipt-panel__header h3 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
      }

      .receipt-extra-toggle {
        min-height: 2.35rem;
      }

      .mini-field {
        display: grid;
        gap: var(--space-1);
      }

      .mini-field > span {
        color: var(--color-text-secondary);
        font-size: 0.72rem;
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

      .receipt-type-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: var(--space-1);
      }

      .receipt-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 2.6rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-bg-soft) 84%, var(--color-bg-surface));
        color: var(--color-text-primary);
        cursor: pointer;
        font-weight: 700;
        padding: 0.55rem 0.62rem;
      }

      .receipt-segment.is-active {
        border-color: var(--color-brand-primary);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-brand-primary) 22%, transparent);
        background: color-mix(in srgb, var(--color-brand-primary) 10%, var(--color-bg-surface));
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
        font-weight: 600;
      }

      .field-inline-helper {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 600;
      }

      @media (max-width: 640px) {
        .receipt-panel__header,
        .receipt-type-list,
        .receipt-customer-grid {
          grid-template-columns: 1fr;
        }

        .receipt-panel__header {
          align-items: stretch;
          display: grid;
        }
      }
    `,
  ],
})
export class PosCheckoutReceiptSectionComponent implements OnChanges {
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
  @Input({ required: true }) receiptValidationError = "";
  @Input({ required: true }) submitAttempted = false;

  @Output() readonly updateReceiptType = new EventEmitter<PosReceiptType>();
  @Output() readonly updateReceiptSeriesId = new EventEmitter<string>();
  @Output() readonly updateReceiptCustomerDocument = new EventEmitter<string>();
  @Output() readonly updateReceiptCustomerName = new EventEmitter<string>();
  @Output() readonly updateReceiptCustomerAddress = new EventEmitter<string>();
  @Output() readonly toggleFiscalDetails = new EventEmitter<void>();
  @Output() readonly receiptNumericKeydown = new EventEmitter<KeyboardEvent>();

  private touched = {
    series: false,
    boletaDocument: false,
    invoiceDocument: false,
    invoiceBusinessName: false,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["receiptType"]) {
      this.resetTouched();
    }
  }

  get shouldShowSeriesError(): boolean {
    return this.receiptSeriesInvalid && (this.submitAttempted || this.touched.series);
  }

  get shouldShowBoletaDniError(): boolean {
    return this.boletaDniInvalid && (this.submitAttempted || this.touched.boletaDocument);
  }

  get shouldShowInvoiceRucError(): boolean {
    return this.invoiceRucInvalid && (this.submitAttempted || this.touched.invoiceDocument);
  }

  get shouldShowInvoiceBusinessNameError(): boolean {
    return (
      this.invoiceBusinessNameInvalid &&
      (this.submitAttempted || this.touched.invoiceBusinessName)
    );
  }

  markTouched(field: keyof PosCheckoutReceiptSectionComponent["touched"]): void {
    this.touched[field] = true;
  }

  private resetTouched(): void {
    this.touched = {
      series: false,
      boletaDocument: false,
      invoiceDocument: false,
      invoiceBusinessName: false,
    };
  }
}
