import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import { immutableRequest } from "./utils/checkout-confirmation";

import { AuthService } from "../../core/auth/auth.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { WarehouseResponse } from "../inventory/data/inventory.models";
import { PosCartPanelComponent } from "./components/pos-cart-panel.component";
import { PosCheckoutModalComponent } from "./components/pos-checkout-modal.component";
import { PosFullCartModalComponent } from "./components/pos-full-cart-modal.component";
import { PosSearchPanelComponent } from "./components/pos-search-panel.component";
import { PosSearchResultsComponent } from "./components/pos-search-results.component";
import { PosTotalsSummaryComponent } from "./components/pos-totals-summary.component";
import { CashRegisterService } from "./data/cash-register.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { PosService } from "./data/pos.service";
import { POS_DRAFT_FORMAT_VERSION, PosDraftState, PosStateService } from "./data/pos-state.service";
import { PaymentLine, PosCartItem, PosReceiptType } from "./data/pos-ui.models";
import { SalesService } from "./data/sales.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  BillingSeriesResponse,
  CreateElectronicDocumentFromSaleRequest,
  ElectronicDocumentType,
} from "../billing/data/billing.models";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import {
  CashRegisterResponse,
  CreateSaleRequest,
  SaleResponse,
  PosProductResponse,
} from "./data/sales.models";
import {
  calculatePosChange,
  calculatePosDiscountTotal,
  calculatePosElectronicPaidTotal,
  calculatePosLineSubtotal,
  calculatePosLineTotal,
  calculatePosPaidTotal,
  calculatePosSubtotal,
  calculatePosTotal,
  normalizePosNumber,
  normalizePosQuantity,
  posLineCents,
  posTotalCents,
  posPaidCents,
} from "./utils/pos-calculations";
import { availableQuantity, decimalText, isQuantityPolicy, moneyCents, quantityHundredths,
  quantityStep, scaledNumber, stockMillis } from "./utils/pos-decimal";

@Component({
    selector: "app-pos-page",
    imports: [
        CommonModule,
        RouterLink,
        PosTotalsSummaryComponent,
        PosCartPanelComponent,
        PosCheckoutModalComponent,
        PosFullCartModalComponent,
        PosSearchPanelComponent,
        PosSearchResultsComponent,
    ],
    template: `
    <section class="ui-card pos-page">
      <div class="pos-utility-header">
        <div class="pos-hero__actions">
          <div
            class="pos-cash-status"
            [class.pos-cash-status--open]="currentCashSession"
            [class.pos-cash-status--closed]="!currentCashSession"
          >
            <span class="pos-cash-dot" aria-hidden="true"></span>
            <span class="pos-cash-status__copy">
              <strong class="pos-cash-status__state">{{
                currentCashSession ? "Caja abierta" : "Caja cerrada"
              }}</strong>
              <span class="pos-cash-status__detail" *ngIf="currentCashSession">
                · Sesión #{{ currentCashSession.id }} · desde
                {{ currentCashSession.openedAt | date: "HH:mm" }}
              </span>
              <span class="pos-cash-status__detail" *ngIf="!currentCashSession"
                >· Abre caja antes de vender</span
              >
            </span>
          </div>
          <a
            class="ui-button ui-button--secondary pos-button pos-button--quiet pos-button--compact"
            [routerLink]="['/caja']"
            >Ir a Caja</a
          >
        </div>
      </div>

      <div class="pos-shell">
        <main class="pos-workspace">
          <app-pos-search-panel
            [saleForm]="saleForm"
            [warehouses]="warehouses"
            [selectedWarehouseLabel]="selectedWarehouseLabel"
            [quickSearchTerms]="quickSearchTerms"
            [loadingLookup]="loadingLookup"
            [loadingSearch]="loadingSearch"
            [showClearSearch]="showClearSearch"
            (search)="submitUnifiedSearch()"
            (exactLookup)="addExactFromUnifiedSearch()"
            (quickSearch)="applyQuickSearch($event)"
            (clearSearch)="clearSearch($event)"
          ></app-pos-search-panel>

          <div
            class="message-stack"
            *ngIf="activeErrorMessage || warningMessage || successMessage || draftReviewMessage || pendingSaleRequest || (discountAdjustmentMessage && !isFullCartOpen)"
          >
            <p class="ui-alert ui-alert--error" *ngIf="activeErrorMessage">
              {{ activeErrorMessage }}
            </p>
            <p class="ui-alert ui-alert--info" *ngIf="warningMessage">
              {{ warningMessage }}
            </p>
            <div class="ui-alert ui-alert--warning" *ngIf="priceReviewRequired && needsRevalidation" role="alert">
              <strong>Los precios de esta venta cambiaron</strong>
              <p id="price-review-instruction">Si mantienes el carrito, no podrás cobrar hasta revisar los precios actualizados</p>
            </div>
            <p class="ui-alert ui-alert--info" *ngIf="draftReviewMessage">{{ draftReviewMessage }}</p>
            <button #priceReviewButton class="ui-button ui-button--secondary" type="button" *ngIf="needsRevalidation && !pendingSaleRequest"
              [attr.aria-describedby]="priceReviewRequired ? 'price-review-instruction' : null"
              [disabled]="revalidating" (click)="revalidateCart()">{{ revalidating ? 'Revalidando…' : priceReviewRequired ? 'Revisar precios' : 'Revalidar borrador y revisar precios' }}</button>
            <p class="ui-alert ui-alert--warning" *ngIf="pendingSaleRequest">Resultado de cobro pendiente. No inicies otra venta: reintenta la misma operación para recuperar su resultado.</p>
            <button class="ui-button ui-button--secondary" type="button" *ngIf="pendingSaleRequest"
              [disabled]="submitting" (click)="finalizeSale()">Recuperar resultado del cobro</button>
            <p
              class="ui-alert ui-alert--info"
              *ngIf="discountAdjustmentMessage && !isFullCartOpen"
              role="status"
              aria-live="polite"
            >
              {{ discountAdjustmentMessage }}
            </p>
            <p class="ui-alert ui-alert--success" *ngIf="successMessage">
              {{ successMessage }}
            </p>
          </div>

          <app-pos-search-results
            [searchResults]="searchResults"
            (addProduct)="addToCart($event)"
          ></app-pos-search-results>
        </main>

        <aside class="checkout-panel" aria-label="Carrito y cobro">
          <app-pos-cart-panel
            [cart]="cart"
            [cartTitle]="cartTitle"
            [lineTotals]="cartLineTotals"
            (openFullCart)="openFullCart()"
            (cancelSale)="cancelSale()"
            (decrease)="decreaseQuantity($event)"
            (increase)="increaseQuantity($event)"
            (remove)="removeFromCart($event)"
            (quantityFocus)="selectQuantityInput($event)"
            (setQuantity)="setQuantity($event.index, $event.value, $event.input)"
            (setDiscount)="setDiscount($event.index, $event.value)"
          ></app-pos-cart-panel>

          <app-pos-totals-summary
            [total]="total"
            [subtotal]="subtotal"
            [discountTotal]="discountTotal"
            [paidTotal]="paidTotal"
            [change]="change"
          ></app-pos-totals-summary>

          <footer class="checkout-actions">
            <button
              #checkoutLauncher
              type="button"
              class="ui-button ui-button--primary checkout-button"
              (click)="openCheckoutModal()"
              [disabled]="submitting"
            >
              {{ submitting ? "Cobrando..." : checkoutButtonLabel }}
            </button>
            <a
              *ngIf="lastSaleId"
              class="ui-button ui-button--secondary pos-button sale-link"
              [routerLink]="['/ventas', lastSaleId]"
            >
              Ver venta #{{ lastSaleId }}
            </a>
            <a
              *ngIf="showGoToBillingAction"
              class="ui-button ui-button--secondary pos-button sale-link"
              [routerLink]="['/facturacion/comprobantes']"
            >
              Ir a Comprobantes
            </a>
          </footer>
        </aside>
      </div>

      <app-pos-checkout-modal
        [isOpen]="isCheckoutModalOpen"
        [payments]="payments"
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
        [total]="total"
        [subtotal]="subtotal"
        [discountTotal]="discountTotal"
        [paidTotal]="paidTotal"
        [change]="change"
        [cartItemsCount]="cart.length"
        [checkoutButtonLabel]="checkoutButtonLabel"
        [submitting]="submitting"
        [receiptValidationError]="receiptValidationError"
        (close)="closeCheckoutModal()"
        (finalize)="finalizeSale()"
        (addPayment)="addPaymentLine()"
        (removePayment)="removePaymentLine($event)"
        (updatePaymentMethod)="setPaymentMethod($event.index, $event.value)"
        (updatePaymentAmount)="setPaymentAmount($event.index, $event.value)"
        (updatePaymentReference)="setPaymentReference($event.index, $event.value)"
        (updateReceiptType)="setReceiptType($event)"
        (updateReceiptSeriesId)="setReceiptSeriesId($event)"
        (updateReceiptCustomerDocument)="setReceiptCustomerDocument($event)"
        (updateReceiptCustomerName)="setReceiptCustomerName($event)"
        (updateReceiptCustomerAddress)="setReceiptCustomerAddress($event)"
        (toggleFiscalDetails)="toggleFiscalDetails()"
        (receiptNumericKeydown)="blockInvalidNumericKeys($event)"
      ></app-pos-checkout-modal>

      <app-pos-full-cart-modal
        [isOpen]="isFullCartOpen"
        [cart]="cart"
        [cartCountLabel]="cartCountLabel"
        [total]="total"
        [lineTotals]="cartLineTotals"
        [discountAdjustmentMessage]="discountAdjustmentMessage"
        [validationMessage]="activeErrorMessage || draftReviewMessage"
        (close)="closeFullCart()"
        (decrease)="decreaseQuantity($event)"
        (increase)="increaseQuantity($event)"
        (remove)="removeFromCart($event)"
        (quantityFocus)="selectQuantityInput($event)"
        (setQuantity)="setQuantity($event.index, $event.value, $event.input)"
        (setDiscount)="setDiscount($event.index, $event.value)"
      ></app-pos-full-cart-modal>
    </section>
  `,
    styles: [
        `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }

      .pos-page {
        --pos-gap: 0.625rem;
        height: calc(100dvh - 7.5rem);
        max-height: calc(100dvh - 7.5rem);
        min-height: 0;
        padding: var(--space-3);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: var(--pos-gap);
        overflow: hidden;
      }

      h1 {
        margin: 0;
      }

      .pos-utility-header {
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
        min-height: 0;
        margin-bottom: 0.4rem;
      }

      .pos-hero__actions {
        display: inline-flex;
        align-items: flex-start;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
        margin-left: auto;
      }

      .pos-hero__actions .pos-button {
        min-height: 2rem;
        padding: 0.34rem 0.68rem;
        font-size: var(--font-size-sm);
      }

      .pos-cash-status {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        min-height: 2rem;
        max-width: min(36rem, 100%);
        border: 1px solid var(--color-border-soft);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        padding: 0.45rem 0.7rem;
        font-size: var(--font-size-sm);
        line-height: 1.15;
        overflow: hidden;
        white-space: nowrap;
        box-shadow: var(--shadow-xs, 0 1px 2px rgba(16, 17, 20, 0.06));
      }

      .pos-cash-status__copy {
        display: inline-flex;
        align-items: center;
        gap: 0.18rem;
        min-width: 0;
        overflow: hidden;
      }

      .pos-cash-status__state,
      .pos-cash-status__detail {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pos-cash-status__state {
        flex: 0 0 auto;
        font-weight: 700;
      }

      .pos-cash-status__detail {
        min-width: 0;
        color: var(--color-text-secondary);
        white-space: nowrap;
      }

      .pos-cash-dot {
        width: 0.58rem;
        height: 0.58rem;
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-success);
        box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.16);
        margin-top: 0.28rem;
      }

      .pos-cash-status--closed .pos-cash-dot {
        background: var(--color-danger);
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.16);
      }

      .pos-button--compact {
        min-width: auto;
      }

      .pos-button--quiet {
        border-color: var(--color-border-soft);
        background: transparent;
        color: var(--color-text-secondary);
      }

      .pos-button--quiet:hover,
      .pos-button--quiet:focus-visible {
        background: var(--color-bg-soft);
        color: var(--color-text-primary);
      }

      .pos-shell {
        display: grid;
        grid-template-columns: minmax(0, 0.94fr) minmax(420px, 0.74fr);
        gap: var(--pos-gap);
        align-items: stretch;
        min-height: 0;
        overflow: hidden;
      }

      .pos-workspace,
      .checkout-panel {
        display: grid;
        gap: var(--pos-gap);
        min-height: 0;
        overflow: hidden;
      }

      .pos-workspace {
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .checkout-panel {
        position: static;
        height: 100%;
        grid-template-rows: minmax(16rem, 1.35fr) minmax(4.8rem, auto) auto;
      }

      .pos-button,
      .checkout-button {
        min-height: 2.55rem;
        border-radius: var(--radius-md);
        padding: 0.58rem var(--space-4);
        font-size: var(--font-size-md);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .message-stack {
        display: grid;
        gap: var(--space-2);
      }

      .checkout-actions {
        display: grid;
        gap: var(--space-2);
      }

      .checkout-button {
        min-height: 2.65rem;
        border-radius: var(--radius-lg);
        background: var(--color-brand-accent);
        font-size: clamp(1.05rem, 1.7vw, 1.35rem);
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .sale-link {
        width: 100%;
      }

      @media (max-height: 820px) and (min-width: 981px) {
        .pos-page {
          height: calc(100dvh - 7rem);
          max-height: calc(100dvh - 7rem);
          padding: var(--space-2);
        }

        .pos-utility-header {
          margin-bottom: 0.32rem;
        }

      }

      @media (max-width: 980px) {
        :host {
          height: auto;
        }

        .pos-page {
          height: auto;
          max-height: none;
          min-height: 0;
          overflow: visible;
        }

        .pos-shell {
          grid-template-columns: 1fr;
          overflow: visible;
        }

        .pos-workspace,
        .checkout-panel {
          overflow: visible;
          height: auto;
        }

        .checkout-panel {
          grid-template-rows: auto;
        }
      }

      @media (max-width: 760px) {
        .pos-page {
          padding: var(--space-3);
        }

        .pos-utility-header {
          margin-bottom: 0.4rem;
        }

        .pos-hero__actions {
          width: 100%;
          margin-left: 0;
        }

        .pos-cash-status {
          width: 100%;
          max-width: none;
          align-items: flex-start;
          white-space: normal;
        }

        .pos-cash-status__copy {
          display: grid;
          gap: 0.1rem;
        }

        .pos-cash-status__detail {
          white-space: normal;
        }

        .pos-button,
        .checkout-button {
          width: 100%;
        }
      }
    `,
    ]
})
export class PosPageComponent implements OnInit, OnDestroy {
  readonly quickSearchTerms = [
    "Cartulina",
    "Papelógrafo",
    "Copia",
    "Impresión",
    "Goma eva",
    "Cinta",
    "Elástico",
    "Cordón",
  ];

  readonly saleForm = this.formBuilder.group({
    warehouseId: [null as number | null, Validators.required],
    code: [""],
    query: [""],
  });

  warehouses: WarehouseResponse[] = [];
  currentCashSession: CashRegisterResponse | null = null;
  currentUserId: string | null = null;
  searchResults: PosProductResponse[] = [];
  cart: PosCartItem[] = [];
  payments: PaymentLine[] = [
    { paymentMethod: "CASH", amount: 0, reference: "" },
  ];
  receiptType: PosReceiptType = "TICKET";
  receiptSeriesId = "";
  receiptCustomerDocument = "";
  receiptCustomerName = "";
  receiptCustomerAddress = "";
  showFiscalDetails = false;
  billingSeriesRows: BillingSeriesResponse[] = [];

  loadingLookup = false;
  loadingSearch = false;
  submitting = false;
  revalidating = false;
  pendingSaleRequest: CreateSaleRequest | null = null;
  private confirmingSale = false;
  private pendingOwnerBlocked = false;
  isFullCartOpen = false;
  isCheckoutModalOpen = false;

  errorMessage = "";
  searchErrorMessage = "";
  stockMessage = "";
  warningMessage = "";
  discountAdjustmentMessage = "";
  successMessage = "";
  lastSaleId: number | null = null;
  showGoToBillingAction = false;
  draftReviewMessage = "";
  priceReviewRequired = false;
  @ViewChild("checkoutLauncher") private checkoutLauncher?: ElementRef<HTMLButtonElement>;
  private priceReviewButtonRef?: ElementRef<HTMLButtonElement>;
  @ViewChild("priceReviewButton")
  set priceReviewButton(button: ElementRef<HTMLButtonElement> | undefined) {
    this.priceReviewButtonRef = button;
    if (button && this.priceReviewRequired) {
      queueMicrotask(() => {
        if (button.nativeElement.isConnected && !this.isCheckoutModalOpen && !this.revalidating) {
          button.nativeElement.focus();
        }
      });
    }
  }
  private restoredDraftTotal: string | null = null;
  private draftSourceFormatVersion = POS_DRAFT_FORMAT_VERSION;
  private draftValidationIssues: string[] = [];

  private readonly subscriptions = new Subscription();
  private warehousesLoaded = false;
  private currentUserLoaded = false;
  private cashSessionLoaded = false;
  private draftInitialized = false;
  private isHydratingDraft = false;
  private searchRequestVersion = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly warehouseService: WarehouseService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly posService: PosService,
    private readonly posStateService: PosStateService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly salesService: SalesService,
    private readonly billingSeriesService: BillingSeriesService,
    private readonly electronicDocumentService: ElectronicDocumentService,
  ) {}

  ngOnInit(): void {
    this.bindDraftPersistence();
    this.loadCurrentUser();
    this.loadWarehouses();
    this.refreshCashSession();
    this.loadBillingSeries();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private bindDraftPersistence(): void {
    const codeControl = this.saleForm.controls.code;
    const warehouseControl = this.saleForm.controls.warehouseId;

    this.subscriptions.add(
      codeControl.valueChanges.subscribe((value) => {
        if (this.isHydratingDraft) {
          return;
        }

        const code = typeof value === "string" ? value : "";
        if (this.saleForm.controls.query.value !== code) {
          this.saleForm.patchValue({ query: code }, { emitEvent: false });
        }

        this.clearStockMessage();

        if (code.trim().length < 2) {
          this.clearSearchState({ clearInput: false });
        }

        this.persistDraftState();
      }),
    );

    this.subscriptions.add(
      warehouseControl.valueChanges.subscribe(() => {
        if (!this.isHydratingDraft) {
          if (this.pendingSaleRequest) {
            warehouseControl.setValue(this.pendingSaleRequest.warehouseId, { emitEvent: false });
            this.preventPendingEdit();
            return;
          }
          this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
          if (this.cart.length) this.draftReviewMessage = "El almacén cambió: revalida disponibilidad antes de cobrar.";
          this.clearStockMessage();
          this.persistDraftState();
        }
      }),
    );
  }

  private loadCurrentUser(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.currentUserLoaded = true;
        this.maybeRestoreDraft();
      },
      error: () => {
        this.currentUserId = null;
        this.currentUserLoaded = true;
        this.maybeRestoreDraft();
      },
    });
  }

  private maybeRestoreDraft(): void {
    if (
      this.draftInitialized ||
      !this.warehousesLoaded ||
      !this.currentUserLoaded ||
      !this.cashSessionLoaded
    ) {
      return;
    }

    this.draftInitialized = true;

    const draft = this.posStateService.load();

    if (draft?.pendingSaleRequest) {
      if (!this.currentUserId || draft.userId !== this.currentUserId) {
        this.pendingOwnerBlocked = true;
        this.errorMessage = "Existe un cobro pendiente cuyo usuario no pudo verificarse. Recarga con el usuario original para recuperar el resultado; no se borró la operación.";
        return;
      }
      this.restoreDraft(draft);
      return;
    }

    if (!this.currentCashSession) {
      this.posStateService.clearAll();
      this.initializeEmptyDraft(draft?.lastWarehouseId ?? null, false);
      return;
    }

    if (
      draft &&
      draft.userId &&
      this.currentUserId &&
      draft.userId !== this.currentUserId
    ) {
      this.posStateService.clearAll();
      this.initializeEmptyDraft(draft.lastWarehouseId, true);
      return;
    }

    if (
      draft &&
      draft.cashRegisterSessionId !== null &&
      draft.cashRegisterSessionId !== this.currentCashSession.id
    ) {
      this.posStateService.clearAll();
      this.initializeEmptyDraft(draft.lastWarehouseId, true);
      return;
    }

    if (draft) {
      this.restoreDraft(draft);
      return;
    }

    this.initializeEmptyDraft(null, true);
  }

  private restoreDraft(draft: PosDraftState): void {
    const warehouseId = this.resolveWarehouseId(
      draft.warehouseId ?? draft.lastWarehouseId,
    );

    this.isHydratingDraft = true;
    this.saleForm.patchValue(
      {
        warehouseId,
        code: draft.code,
        query: draft.query || draft.code,
      },
      { emitEvent: false },
    );
    this.searchResults = [...draft.searchResults];
    this.cart = draft.cart.map((item) => ({ ...item, requiresRevalidation: true }));
    this.pendingSaleRequest = draft.pendingSaleRequest ? immutableRequest(draft.pendingSaleRequest) : null;
    this.discountAdjustmentMessage = "";
    this.restoredDraftTotal = draft.preliminaryTotal ?? null;
    this.draftSourceFormatVersion = draft.sourceFormatVersion ?? draft.formatVersion ?? 0;
    this.draftValidationIssues = draft.validationIssues ?? [];
    this.draftReviewMessage = this.cart.length
      ? "Borrador restaurado: precios, políticas y stock pendientes de revalidación. Los importes originales se conservarán hasta tu aceptación."
      : "";
    if (draft.validationIssues?.length) this.draftReviewMessage += ` ${draft.validationIssues.join(" ")}`;
    this.payments =
      draft.payments.length > 0
        ? draft.payments.map((payment) => ({ ...payment }))
        : [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.lastSaleId = draft.lastSaleId;
    this.receiptType = "TICKET";
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.isCheckoutModalOpen = false;
    this.searchErrorMessage = "";
    this.stockMessage = "";
    this.isHydratingDraft = false;

    this.persistDraftState();
  }

  private initializeEmptyDraft(
    preferredWarehouseId: number | null,
    persistState: boolean,
  ): void {
    const warehouseId = this.resolveWarehouseId(preferredWarehouseId);

    this.isHydratingDraft = true;
    this.saleForm.patchValue(
      {
        warehouseId,
        code: "",
        query: "",
      },
      { emitEvent: false },
    );
    this.searchResults = [];
    this.cart = [];
    this.draftReviewMessage = "";
    this.priceReviewRequired = false;
    this.restoredDraftTotal = null;
    this.discountAdjustmentMessage = "";
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.lastSaleId = null;
    this.receiptType = "TICKET";
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.isCheckoutModalOpen = false;
    this.searchErrorMessage = "";
    this.stockMessage = "";
    this.successMessage = "";
    this.isHydratingDraft = false;

    if (persistState) {
      this.persistDraftState();
    }
  }

  private resolveWarehouseId(preferredWarehouseId: number | null): number | null {
    if (
      preferredWarehouseId !== null &&
      this.warehouses.some((warehouse) => warehouse.id === preferredWarehouseId)
    ) {
      return preferredWarehouseId;
    }

    if (this.warehouses.length > 0) {
      return this.warehouses[0].id;
    }

    return null;
  }

  private persistDraftState(): boolean {
    if (this.pendingOwnerBlocked || this.isHydratingDraft || !this.currentUserId || (!this.currentCashSession && !this.pendingSaleRequest)) {
      return false;
    }

    const currentWarehouseId = this.saleForm.value.warehouseId ?? null;
    const existingDraft = this.posStateService.load();

    return this.posStateService.save({
      pendingSaleRequest: this.pendingSaleRequest,
      formatVersion: POS_DRAFT_FORMAT_VERSION,
      sourceFormatVersion: this.cart.some(item => item.requiresRevalidation)
        ? this.draftSourceFormatVersion : POS_DRAFT_FORMAT_VERSION,
      validationIssues: this.cart.some(item => item.requiresRevalidation) ? this.draftValidationIssues : [],
      requiresRevalidation: this.cart.some(item => item.requiresRevalidation),
      preliminaryTotal: this.cart.some(item => item.requiresRevalidation)
        ? this.restoredDraftTotal : (Number.isFinite(this.total) ? decimalText(moneyCents(this.total)) : null),
      userId: this.currentUserId,
      cashRegisterSessionId: this.currentCashSession?.id ?? existingDraft?.cashRegisterSessionId ?? null,
      warehouseId: currentWarehouseId,
      lastWarehouseId: currentWarehouseId ?? existingDraft?.lastWarehouseId ?? null,
      code: this.saleForm.value.code ?? "",
      query: this.saleForm.value.query ?? this.saleForm.value.code ?? "",
      searchResults: this.searchResults.map((item) => ({ ...item })),
      cart: this.cart.map((item) => ({ ...item })),
      payments: this.payments.map((payment) => ({ ...payment })),
      lastSaleId: this.lastSaleId,
    }) !== false;
  }

  private resetDraftAfterCheckout(preserveLastSaleId: boolean): void {
    const warehouseId = this.saleForm.value.warehouseId ?? null;

    this.isHydratingDraft = true;
    this.saleForm.patchValue(
      {
        warehouseId,
        code: "",
        query: "",
      },
      { emitEvent: false },
    );
    this.searchResults = [];
    this.cart = [];
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.priceReviewRequired = false;
    if (!preserveLastSaleId) {
      this.lastSaleId = null;
    }
    this.receiptType = "TICKET";
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.isCheckoutModalOpen = false;
    this.errorMessage = "";
    this.searchErrorMessage = "";
    this.stockMessage = "";
    this.warningMessage = "";
    this.discountAdjustmentMessage = "";
    if (!preserveLastSaleId) {
      this.successMessage = "";
      this.showGoToBillingAction = false;
    }
    this.isHydratingDraft = false;

    this.posStateService.clearDraft(preserveLastSaleId);

    if (this.currentCashSession && this.currentUserId) {
      this.persistDraftState();
    }
  }

  cancelSale(): void {
    if (this.preventPendingEdit()) return;
    this.resetDraftAfterCheckout(false);
  }

  clearSearch(input?: HTMLInputElement): void {
    this.clearSearchState({ clearInput: true });

    if (input) {
      setTimeout(() => input.focus(), 0);
    }
  }

  get subtotal(): number {
    return calculatePosSubtotal(this.cart);
  }

  get discountTotal(): number {
    return calculatePosDiscountTotal(this.cart);
  }

  get total(): number {
    return calculatePosTotal(this.cart);
  }

  get paidTotal(): number {
    return calculatePosPaidTotal(this.payments);
  }

  get change(): number {
    return calculatePosChange(this.cart, this.payments);
  }

  get selectedWarehouseLabel(): string {
    const warehouseId = this.saleForm.value.warehouseId;
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    return warehouse
      ? `${warehouse.code} - ${warehouse.name}`
      : "Selecciona almacén";
  }

  get cartTitle(): string {
    if (this.cart.length === 0) {
      return "Carrito";
    }

    return `Carrito · ${this.cartCountLabel}`;
  }

  get cartCountLabel(): string {
    return this.cart.length === 1 ? "1 ítem" : `${this.cart.length} ítems`;
  }

  get cartLineTotals(): number[] {
    return this.cart.map((item) => this.lineTotal(item));
  }

  get activeErrorMessage(): string {
    return this.searchErrorMessage || this.stockMessage || this.errorMessage;
  }

  get showClearSearch(): boolean {
    const code = (this.saleForm.value.code ?? "").trim();
    return (
      code.length > 0 ||
      this.searchResults.length > 0 ||
      this.searchErrorMessage.length > 0 ||
      this.stockMessage.length > 0
    );
  }

  @HostListener("document:keydown.escape")
  closeFullCartOnEscape(): void {
    this.closeFullCart();
  }

  private buildFinalizeConfirmationMessage(): string {
    const customerLines =
      this.receiptType === "TICKET"
        ? []
        : [
            `Cliente: ${this.receiptCustomerName.trim() || "No especificado"}`,
            `Documento: ${this.receiptCustomerDocument.trim() || "No especificado"}`,
          ];

    return [
      "Estas a punto de registrar una venta real.",
      "",
      this.receiptType === "TICKET"
        ? "Se registrará una venta interna."
        : "Se registrará la venta y se generará el comprobante.",
      `Comprobante: ${this.receiptTypeLabel}`,
      ...customerLines,
      `Cantidad de items: ${this.cart.length}`,
      `Total: S/ ${this.total.toFixed(2)}`,
      `Monto pagado: S/ ${this.paidTotal.toFixed(2)}`,
      `Vuelto: S/ ${this.change.toFixed(2)}`,
      "",
      "Confirmas finalizar la venta?",
    ].join("\n");
  }

  lookupByCode(): void {
    const code = (this.saleForm.value.code ?? "").trim();
    if (!code) {
      this.searchErrorMessage = "Ingresa un SKU o barcode para buscar.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;
    if (!warehouseId) {
      this.searchErrorMessage = "Selecciona un almacén antes de buscar por código.";
      return;
    }

    const requestVersion = this.bumpSearchRequestVersion();
    this.loadingLookup = true;
    this.searchErrorMessage = "";
    this.clearStockMessage();
    this.successMessage = "";

    this.posService.lookup(code, warehouseId).subscribe({
      next: (product) => {
        if (!this.isCurrentSearchRequest(requestVersion)) {
          return;
        }

        this.loadingLookup = false;
        this.addToCart(product);
        this.saleForm.patchValue({ code: "" });
        this.clearSearchState({ clearInput: false });
        this.persistDraftState();
      },
      error: (error: unknown) => {
        if (!this.isCurrentSearchRequest(requestVersion)) {
          return;
        }

        this.loadingLookup = false;
        this.searchErrorMessage = toHttpErrorMessage(
          error,
          "No se pudo consultar el producto por código.",
        );
      },
    });
  }

  submitUnifiedSearch(): void {
    this.searchUnifiedText();
  }

  addExactFromUnifiedSearch(): void {
    this.lookupByCode();
  }

  searchUnifiedText(
    rawQuery = this.saleForm.value.query ?? this.saleForm.value.code ?? "",
  ): void {
    const query = rawQuery.trim();
    if (!query) {
      this.clearSearchState({ clearInput: false });
      return;
    }

    if (query.length < 2) {
      this.clearSearchState({ clearInput: false });
      this.searchErrorMessage =
        "Ingresa al menos 2 caracteres para buscar por nombre o SKU.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;

    const requestVersion = this.bumpSearchRequestVersion();
    this.loadingSearch = true;
    this.searchErrorMessage = "";
    this.clearStockMessage();
    this.successMessage = "";

    this.posService.search(query, warehouseId).subscribe({
      next: (results) => {
        if (!this.isCurrentSearchRequest(requestVersion)) {
          return;
        }

        this.loadingSearch = false;
        this.searchResults = results;
        if (results.length === 0) {
          this.searchErrorMessage = "No se encontraron productos para la búsqueda.";
        }
        this.persistDraftState();
      },
      error: (error: unknown) => {
        if (!this.isCurrentSearchRequest(requestVersion)) {
          return;
        }

        this.loadingSearch = false;
        this.searchErrorMessage = toHttpErrorMessage(
          error,
          "No se pudo realizar la búsqueda por nombre.",
        );
      },
    });
  }

  searchByName(): void {
    this.searchUnifiedText(this.saleForm.value.query ?? this.saleForm.value.code ?? "");
  }

  applyQuickSearch(term: string): void {
    this.saleForm.patchValue({ code: term, query: term });
    this.searchUnifiedText(term);
  }

  private lookupUnifiedSearch(fallbackToSearch: boolean): void {
    if (fallbackToSearch) {
      this.searchUnifiedText();
      return;
    }

    this.lookupByCode();
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status?: number }).status === 404
    );
  }

  private clearSearchState(options?: { clearInput?: boolean }): void {
    const clearInput = options?.clearInput ?? false;

    this.bumpSearchRequestVersion();
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.searchResults = [];
    this.searchErrorMessage = "";
    this.stockMessage = "";

    if (clearInput) {
      this.saleForm.patchValue(
        { code: "", query: "" },
        { emitEvent: false },
      );
    }

    this.persistDraftState();
  }

  private clearStockMessage(): void {
    this.stockMessage = "";
  }

  private buildStockUnavailableMessage(product: PosProductResponse): string {
    const productName = product.name?.trim();
    const secondaryCode = this.getProductSecondaryCode(product);

    if (productName) {
      return secondaryCode
        ? `${productName} no tiene stock disponible. SKU: ${secondaryCode}.`
        : `${productName} no tiene stock disponible.`;
    }

    const fallbackCode = secondaryCode || String(product.productId);
    return `El producto ${fallbackCode} no tiene stock disponible.`;
  }

  private getProductSecondaryCode(product: PosProductResponse): string {
    return product.sku?.trim() || product.barcode?.trim() || "";
  }

  private bumpSearchRequestVersion(): number {
    this.searchRequestVersion += 1;
    return this.searchRequestVersion;
  }

  private isCurrentSearchRequest(version: number): boolean {
    return version === this.searchRequestVersion;
  }

  openFullCart(): void {
    if (this.cart.length === 0) {
      return;
    }

    this.isFullCartOpen = true;
  }

  closeFullCart(): void {
    this.isFullCartOpen = false;
  }

  openCheckoutModal(): void {
    if (this.priceReviewRequired && this.needsRevalidation) {
      this.revalidateCart();
      return;
    }
    this.isCheckoutModalOpen = true;
  }

  closeCheckoutModal(): void {
    this.isCheckoutModalOpen = false;
  }

  addToCart(product: PosProductResponse): void {
    if (this.preventPendingEdit()) return;
    this.errorMessage = "";
    this.stockMessage = "";
    this.successMessage = "";

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      this.errorMessage =
        "Selecciona un almacén antes de agregar productos al carrito.";
      return;
    }

    if (this.cart.length === 0 && this.lastSaleId !== null) {
      this.lastSaleId = null;
    }

    const existing = this.cart.find(
      (item) => item.productId === product.productId,
    );

    let price: number;
    let initialQuantity: number;
    try {
      if (!isQuantityPolicy(product.quantityPolicy)) throw new Error("No se recibió la política de cantidad. Vuelve a buscar el producto.");
      price = scaledNumber(moneyCents(product.salePrice, "Precio del producto"));
      const available = availableQuantity(product.stockAvailable, product.quantityPolicy);
      if (available <= 0) {
        this.stockMessage = this.buildStockUnavailableMessage(product);
        return;
      }
      initialQuantity = available >= 1 ? 1 : quantityStep(product.quantityPolicy);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : "Producto no válido.";
      return;
    }
    if (existing) {
      // A new read must not silently replace a restored price or policy.
      if (existing.requiresRevalidation || existing.salePrice !== price || existing.quantityPolicy !== product.quantityPolicy) {
        this.errorMessage = "El producto guardado requiere revisión. Retíralo y agrégalo desde la búsqueda actual.";
        return;
      }
      this.increaseQuantity(this.cart.indexOf(existing));
      return;
    }
    if (initialQuantity <= 0) {
      this.stockMessage = this.buildStockUnavailableMessage(product);
      return;
    }

    this.cart.push({
      productId: product.productId,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      salePrice: price,
      stockAvailable: normalizePosNumber(product.stockAvailable),
      quantity: initialQuantity,
      discountAmount: 0,
      quantityPolicy: product.quantityPolicy,
    });

    this.clearStockMessage();
    this.persistDraftState();
  }

  removeFromCart(index: number): void {
    if (this.preventPendingEdit()) return;
    this.cart.splice(index, 1);
    if (!this.cart.some(item => item.requiresRevalidation)) this.draftReviewMessage = "";
    this.discountAdjustmentMessage = "";
    this.persistDraftState();
  }

  clearCart(clearLastSaleReference = true): void {
    if (this.preventPendingEdit()) return;
    this.cart = [];
    this.draftReviewMessage = "";
    this.restoredDraftTotal = null;
    this.discountAdjustmentMessage = "";
    this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    if (clearLastSaleReference) {
      this.lastSaleId = null;
    }
    this.persistDraftState();
  }

  selectQuantityInput(input: HTMLInputElement): void {
    input.select();
  }

  setQuantity(index: number, rawValue: string, input?: HTMLInputElement): void {
    if (this.preventPendingEdit()) return;
    const item = this.cart[index];
    if (!item) {
      return;
    }

    try {
      const quantity = quantityHundredths(rawValue, item.quantityPolicy);
      if (quantity * 10n > stockMillis(item.stockInput ?? item.stockAvailable)) {
        throw new Error(`Cantidad excede stock disponible (${item.stockAvailable}) para ${item.sku}. Corrige la cantidad; no se ha ajustado automáticamente.`);
      }
      item.quantity = scaledNumber(quantity);
      delete item.quantityInput;
    } catch (error) {
      item.quantityInput = rawValue;
      this.errorMessage = error instanceof Error ? error.message : "Cantidad no válida.";
      this.persistDraftState();
      return;
    }
    this.discountAdjustmentMessage =
      this.clampLineDiscount(item, "el cambio de cantidad") ?? "";
    if (input) {
      input.value = String(item.quantity);
    }

    this.persistDraftState();
  }

  increaseQuantity(index: number): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    this.stepQuantity(index, 1);
  }

  decreaseQuantity(index: number): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    this.stepQuantity(index, -1);
  }

  private stepQuantity(index: number, direction: 1 | -1): void {
    const item = this.cart[index];
    try {
      const quantity = quantityHundredths(item.quantityInput ?? item.quantity, item.quantityPolicy);
      const step = item.quantityPolicy === "DECIMAL_2" ? 1n : 100n;
      this.setQuantity(index, decimalText(quantity + BigInt(direction) * step));
    } catch (error) { this.errorMessage = error instanceof Error ? error.message : "Cantidad no válida."; }
  }

  availableIntegerStock(item: PosCartItem): number {
    try { return availableQuantity(item.stockInput ?? item.stockAvailable, item.quantityPolicy); }
    catch { return NaN; }
  }

  setDiscount(index: number, rawValue: string): void {
    if (this.preventPendingEdit()) return;
    const item = this.cart[index];
    if (!item) {
      return;
    }

    this.discountAdjustmentMessage = "";
    try {
      const cents = moneyCents(rawValue, "El descuento");
      const maxDiscount = moneyCents(this.lineSubtotal(item), "Subtotal");
      if (cents > maxDiscount) throw new Error("El descuento no puede superar el subtotal del producto.");
      item.discountAmount = scaledNumber(cents);
      delete item.discountInput;
    } catch (error) {
      item.discountInput = rawValue;
      this.errorMessage = error instanceof Error ? error.message : "Descuento no válido.";
    }
    this.persistDraftState();
  }

  private clampLineDiscount(item: PosCartItem, reason: string): string | null {
    const previous = item.discountAmount;
    let adjusted: number;
    try {
      const cents = moneyCents(item.discountInput ?? previous, "El descuento");
      const gross = moneyCents(this.lineSubtotal(item), "Subtotal");
      adjusted = scaledNumber(cents > gross ? gross : cents);
    } catch { return null; }
    if (adjusted === previous) {
      return null;
    }

    item.discountAmount = adjusted;
    delete item.discountInput;
    const previousLabel = Number.isFinite(previous)
      ? `S/ ${previous.toFixed(2)}`
      : "un importe no válido";
    return `Se ajustó el descuento de ${item.name} de ${previousLabel} a S/ ${adjusted.toFixed(2)} por ${reason}.`;
  }

  lineSubtotal(item: PosCartItem): number {
    return calculatePosLineSubtotal(item);
  }

  lineTotal(item: PosCartItem): number {
    return calculatePosLineTotal(item);
  }

  addPaymentLine(): void {
    if (this.preventPendingEdit()) return;
    this.payments.push({ paymentMethod: "CASH", amount: 0, reference: "" });
    this.persistDraftState();
  }

  removePaymentLine(index: number): void {
    if (this.preventPendingEdit()) return;
    if (this.payments.length === 1) {
      return;
    }
    this.payments.splice(index, 1);
    this.persistDraftState();
  }

  setPaymentMethod(index: number, value: string): void {
    if (this.preventPendingEdit()) return;
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      payment.paymentMethod = value;
      this.persistDraftState();
    }
  }

  setPaymentAmount(index: number, rawValue: string): void {
    if (this.preventPendingEdit()) return;
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    try {
      payment.amount = scaledNumber(moneyCents(rawValue, "El pago"));
      delete payment.amountInput;
    } catch (error) {
      payment.amountInput = rawValue;
      this.errorMessage = error instanceof Error ? error.message : "Pago no válido.";
    }
    this.persistDraftState();
  }

  setPaymentReference(index: number, rawValue: string): void {
    if (this.preventPendingEdit()) return;
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.reference = rawValue;
    this.persistDraftState();
  }

  setReceiptType(type: PosReceiptType): void {
    if (this.preventPendingEdit()) return;
    this.receiptType = type;
    this.receiptSeriesId = "";
    this.receiptCustomerDocument = "";
    this.receiptCustomerName = "";
    this.receiptCustomerAddress = "";
    this.showFiscalDetails = false;

    const firstSeries = this.filteredBillingSeries[0];
    if (firstSeries) {
      this.receiptSeriesId = String(firstSeries.id);
    }
  }

  setReceiptSeriesId(rawValue: string): void {
    if (this.preventPendingEdit()) return;
    this.receiptSeriesId = String(rawValue || "");
  }

  toggleFiscalDetails(): void {
    this.showFiscalDetails = !this.showFiscalDetails;
  }

  setReceiptCustomerDocument(rawValue: string): void {
    if (this.preventPendingEdit()) return;
    const maxLength = this.receiptType === "INVOICE" ? 11 : 8;
    this.receiptCustomerDocument = rawValue.replace(/\D/g, "").slice(0, maxLength);
  }

  setReceiptCustomerName(rawValue: string): void {
    if (this.preventPendingEdit()) return;
    this.receiptCustomerName = rawValue;
  }

  setReceiptCustomerAddress(rawValue: string): void {
    if (this.preventPendingEdit()) return;
    this.receiptCustomerAddress = rawValue;
  }

  blockInvalidNumericKeys(event: KeyboardEvent): void {
    if (["e", "E", "+", "-", ",", "."].includes(event.key)) {
      event.preventDefault();
    }
  }

  get receiptTypeLabel(): string {
    switch (this.receiptType) {
      case "RECEIPT":
        return "Boleta";
      case "INVOICE":
        return "Factura";
      default:
        return "Ticket interno";
    }
  }

  get checkoutButtonLabel(): string {
    return this.receiptType === "TICKET" ? "COBRAR" : "COBRAR Y EMITIR";
  }

  get filteredBillingSeries(): BillingSeriesResponse[] {
    if (this.receiptType === "TICKET") {
      return [];
    }
    const targetType: ElectronicDocumentType =
      this.receiptType === "INVOICE" ? "INVOICE" : "RECEIPT";
    return this.billingSeriesRows.filter(
      (row) => row.active && row.documentType === targetType,
    );
  }

  get receiptSeriesInvalid(): boolean {
    if (this.receiptType === "TICKET") {
      return false;
    }
    return !this.receiptSeriesId;
  }

  get showNoSeriesMessage(): boolean {
    return this.receiptType !== "TICKET" && this.filteredBillingSeries.length === 0;
  }

  get noSeriesMessage(): string {
    if (this.receiptType === "INVOICE") {
      return "No hay series activas para Factura. Configúralas en Facturación → Series y correlativos.";
    }
    if (this.receiptType === "RECEIPT") {
      return "No hay series activas para Boleta. Configúralas en Facturación → Series y correlativos.";
    }
    return "";
  }

  get boletaDniInvalid(): boolean {
    if (this.receiptType !== "RECEIPT") {
      return false;
    }
    const dni = this.receiptCustomerDocument.trim();
    return dni.length > 0 && dni.length !== 8;
  }

  get invoiceRucInvalid(): boolean {
    if (this.receiptType !== "INVOICE") {
      return false;
    }
    return this.receiptCustomerDocument.trim().length !== 11;
  }

  get invoiceBusinessNameInvalid(): boolean {
    if (this.receiptType !== "INVOICE") {
      return false;
    }
    return !this.receiptCustomerName.trim();
  }

  get receiptValidationError(): string {
    if (this.showNoSeriesMessage) {
      return this.noSeriesMessage;
    }
    if (this.receiptSeriesInvalid) {
      return "Selecciona una serie de comprobante para continuar.";
    }
    if (this.receiptType === "RECEIPT" && this.boletaDniInvalid) {
      return "El DNI de boleta debe tener 8 dígitos si se informa.";
    }
    if (this.receiptType === "INVOICE") {
      if (this.invoiceRucInvalid) {
        return "Para Factura, el RUC debe tener 11 dígitos.";
      }
      if (this.invoiceBusinessNameInvalid) {
        return "Para Factura, la razón social es obligatoria.";
      }
    }
    return "";
  }

  refreshCashSession(): void {
    this.cashRegisterService.current().subscribe({
      next: (session) => {
        this.currentCashSession = session;
        this.cashSessionLoaded = true;
        this.maybeRestoreDraft();
      },
      error: () => {
        this.currentCashSession = null;
        this.cashSessionLoaded = true;
        this.maybeRestoreDraft();
      },
    });
  }

  finalizeSale(): void {
    if (this.pendingOwnerBlocked) { this.preventPendingEdit(); return; }
    if (this.submitting || this.confirmingSale || this.revalidating) return;
    if (this.pendingSaleRequest) {
      const pending = this.pendingSaleRequest;
      this.confirmingSale = true;
      void this.confirmDialog.confirm({ title: "Recuperar cobro pendiente",
        description: `Se consultará la misma operación ${pending.operationId}, sin crear otra identidad de venta. Total confirmado: S/ ${decimalText(moneyCents(pending.confirmedTotal))}.`,
        confirmText: "Reintentar misma operación", cancelText: "Cancelar", variant: "warning" })
        .then(ok => { if (ok) this.submitConfirmedSale(pending); }).finally(() => this.confirmingSale = false);
      return;
    }
    this.errorMessage = "";
    this.warningMessage = "";
    this.successMessage = "";
    this.lastSaleId = null;
    this.showGoToBillingAction = false;

    const validationError = this.validateSaleBeforeSubmit();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    const payload = immutableRequest(this.buildSaleRequest(crypto.randomUUID()));
    const fingerprint = this.checkoutFingerprint();
    this.confirmingSale = true;
    void this.confirmDialog.confirm({
      title: "Confirmar venta",
      description: this.buildFinalizeConfirmationMessage(),
      highlightText: "Venta real",
      confirmText: "Cobrar",
      cancelText: "Cancelar",
      variant: "warning",
    }).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      const currentValidationError = this.validateSaleBeforeSubmit();
      if (currentValidationError) {
        this.errorMessage = currentValidationError;
        return;
      }
      if (fingerprint !== this.checkoutFingerprint()) {
        this.errorMessage = "El carrito o los pagos cambiaron durante la confirmación. Revisa y confirma nuevamente.";
        return;
      }

      this.submitConfirmedSale(payload);
    }).finally(() => this.confirmingSale = false);
  }

  private buildSaleRequest(operationId: string): CreateSaleRequest {
    return { operationId, warehouseId: this.saleForm.value.warehouseId as number,
      confirmedTotal: scaledNumber(posTotalCents(this.cart)),
      items: this.cart.map(item => ({ productId: item.productId,
        quantity: normalizePosQuantity(item.quantityInput ?? item.quantity, item.quantityPolicy),
        discountAmount: scaledNumber(moneyCents(item.discountInput ?? item.discountAmount)),
        confirmedUnitPrice: scaledNumber(moneyCents(item.salePriceInput ?? item.salePrice)) })),
      payments: this.payments.map(p => ({ paymentMethod: p.paymentMethod,
        amount: scaledNumber(moneyCents(p.amountInput ?? p.amount)), reference: p.reference.trim() || null }))
        .filter(p => p.amount > 0) };
  }

  private checkoutFingerprint(): string {
    return JSON.stringify([this.saleForm.value.warehouseId, this.cart, this.payments, this.receiptType,
      this.receiptSeriesId, this.receiptCustomerDocument, this.receiptCustomerName, this.receiptCustomerAddress]);
  }

  private submitConfirmedSale(payload: CreateSaleRequest): void {
      this.pendingSaleRequest = payload;
      if (!this.persistDraftState()) {
        this.pendingSaleRequest = null;
        this.errorMessage = "No se pudo conservar la identidad del cobro. No se envió la venta.";
        return;
      }
      this.submitting = true;
      this.salesService.create(payload).subscribe({
        next: (sale) => {
          this.pendingSaleRequest = null;
          if (this.receiptType === "TICKET") {
            this.submitting = false;
            this.successMessage = `Venta ${sale.saleNumber} registrada correctamente.`;
            this.warningMessage = "";
            this.lastSaleId = sale.id;
            this.resetDraftAfterCheckout(true);
            return;
          }

          this.issueElectronicDocumentFromSale(sale);
        },
        error: (error: unknown) => {
          this.submitting = false;
          const response = error as HttpErrorResponse;
          if (response.status >= 400 && response.status < 500 && response.status !== 408
              && !["OPERATION_CONTENT_MISMATCH", "OPERATION_RESULT_UNAVAILABLE"].includes(response.error?.code)) {
            this.pendingSaleRequest = null;
          }
          if (response.status === 409 && response.error?.code === "PRICE_CONFIRMATION_REQUIRED") {
            this.isCheckoutModalOpen = false;
            this.isFullCartOpen = false;
            this.priceReviewRequired = true;
            this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
            this.draftReviewMessage = `Total confirmado S/ ${decimalText(moneyCents(response.error.confirmedTotal))}; total vigente ${response.error.proposedTotal === null ? 'requiere revisar descuentos' : 'S/ ' + decimalText(moneyCents(response.error.proposedTotal))}. ` +
              response.error.changes.map((c: { productId: number; confirmedUnitPrice: number; currentUnitPrice: number }) =>
                `Producto #${c.productId}: S/ ${decimalText(moneyCents(c.confirmedUnitPrice))} → S/ ${decimalText(moneyCents(c.currentUnitPrice))}.`).join(" ");
          }
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo registrar la venta.",
          );
          this.persistDraftState();
        },
      });
  }

  private loadWarehouses(): void {
    this.warehouseService.list(true).subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses;
        this.warehousesLoaded = true;
        this.maybeRestoreDraft();
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar los almacenes.",
        );
        this.warehousesLoaded = true;
        this.maybeRestoreDraft();
      },
    });
  }

  get needsRevalidation(): boolean { return this.cart.some(item => item.requiresRevalidation); }

  private preventPendingEdit(): boolean {
    if (this.pendingOwnerBlocked) {
      this.errorMessage = "Recupera el cobro pendiente con el usuario original antes de iniciar otra venta.";
      return true;
    }
    if (!this.pendingSaleRequest) return false;
    this.errorMessage = "Hay un cobro con resultado pendiente. Recupera su resultado antes de modificar o cancelar la venta.";
    return true;
  }

  revalidateCart(): void {
    if (this.revalidating || this.preventPendingEdit() || !this.cart.length) return;
    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) { this.errorMessage = "Selecciona un almacén para revalidar."; return; }
    const fingerprint = this.checkoutFingerprint();
    const original = structuredClone(this.cart);
    this.revalidating = true;
    this.posService.snapshot(original.map(item => item.productId), warehouseId).subscribe({
      next: products => {
        if (fingerprint !== this.checkoutFingerprint()) { this.errorMessage = "El borrador cambió. Revalídalo nuevamente."; this.revalidating = false; return; }
        try {
          const proposed = original.map(item => {
            const product = products.find(p => p.productId === item.productId);
            if (!product || !isQuantityPolicy(product.quantityPolicy)) throw new Error(`${item.name}: no está disponible o no tiene política válida.`);
            const updated: PosCartItem = { ...item, salePrice: product.salePrice, salePriceInput: undefined,
              quantityPolicy: product.quantityPolicy, stockAvailable: product.stockAvailable, stockInput: undefined, requiresRevalidation: false };
            posLineCents(updated);
            if (quantityHundredths(updated.quantityInput ?? updated.quantity, updated.quantityPolicy) * 10n > stockMillis(product.stockAvailable))
              throw new Error(`${item.name}: stock insuficiente. Conservamos tu cantidad y descuento; revísalos antes de continuar.`);
            return updated;
          });
          const proposedTotal = decimalText(posTotalCents(proposed));
          const differences = proposed.map((item, i) => `${item.name}: precio ${original[i].salePriceInput ?? original[i].salePrice} → ${item.salePrice}; política ${original[i].quantityPolicy ?? 'sin clasificar'} → ${item.quantityPolicy}; stock ${original[i].stockInput ?? original[i].stockAvailable} → ${item.stockAvailable}`).join("\n");
          const priceReview = this.priceReviewRequired;
          void this.confirmDialog.confirm({ title: priceReview ? "Los precios de esta venta cambiaron" : "Revisar borrador y precios vigentes",
            description: `${differences}\nTotal guardado: ${this.restoredDraftTotal ?? this.total}. Total propuesto: S/ ${proposedTotal}.\nCantidades, descuentos y pagos no se modificarán.${priceReview ? '\nSi mantienes el carrito, no podrás cobrar hasta revisar los precios actualizados' : ''}`,
            confirmText: priceReview ? "Aceptar nuevos precios" : "Aceptar propuesta", cancelText: priceReview ? "Mantener carrito" : "Conservar original", variant: "warning" }).then(accepted => {
              if (!accepted) return;
              if (fingerprint !== this.checkoutFingerprint()) { this.errorMessage = "El borrador cambió. Revalídalo nuevamente."; return; }
              this.cart = proposed;
              this.priceReviewRequired = false;
              this.draftReviewMessage = "";
              this.restoredDraftTotal = null;
              this.draftValidationIssues = [];
              this.errorMessage = "";
              this.persistDraftState();
              if (priceReview) queueMicrotask(() => this.checkoutLauncher?.nativeElement.focus());
            }).finally(() => {
              this.revalidating = false;
              if (priceReview && this.needsRevalidation) {
                // The review launcher is disabled until Angular renders this state change.
                setTimeout(() => {
                  const button = this.priceReviewButtonRef?.nativeElement;
                  if (button?.isConnected && !this.revalidating && !this.isCheckoutModalOpen) button.focus();
                });
              }
            });
        } catch (error) {
          this.errorMessage = error instanceof Error ? error.message : "No se pudo validar el borrador.";
          this.revalidating = false;
        }
      },
      error: error => { this.errorMessage = toHttpErrorMessage(error, "No se pudo revalidar el borrador."); this.revalidating = false; },
    });
  }

  private loadBillingSeries(): void {
    this.billingSeriesService.list().subscribe({
      next: (rows) => {
        this.billingSeriesRows = rows.filter((row) => row.active);
      },
      error: () => {
        this.billingSeriesRows = [];
      },
    });
  }

  private issueElectronicDocumentFromSale(sale: SaleResponse): void {
    const payload = this.buildElectronicDocumentPayload();
    if (!payload) {
      this.submitting = false;
      this.lastSaleId = sale.id;
      this.successMessage = "";
      this.warningMessage =
        "Venta registrada, pero el comprobante quedó pendiente de emisión. Puedes reintentarlo desde Comprobantes.";
      this.showGoToBillingAction = true;
      this.resetDraftAfterCheckout(true);
      return;
    }

    this.electronicDocumentService.createFromSale(sale.id, payload).subscribe({
      next: (document) => {
        this.submitting = false;
        this.warningMessage = "";
        this.showGoToBillingAction = false;
        this.successMessage = `Venta ${sale.saleNumber} registrada y comprobante ${document.fullNumber} generado.`;
        this.lastSaleId = sale.id;
        this.resetDraftAfterCheckout(true);
      },
      error: () => {
        this.submitting = false;
        this.successMessage = "";
        this.warningMessage =
          "Venta registrada, pero el comprobante quedó pendiente de emisión. Puedes reintentarlo desde Comprobantes.";
        this.showGoToBillingAction = true;
        this.lastSaleId = sale.id;
        this.resetDraftAfterCheckout(true);
      },
    });
  }

  private buildElectronicDocumentPayload(): CreateElectronicDocumentFromSaleRequest | null {
    if (this.receiptType === "TICKET") {
      return null;
    }

    const seriesId = Number(this.receiptSeriesId);
    if (!Number.isFinite(seriesId) || seriesId <= 0) {
      return null;
    }

    const documentType: ElectronicDocumentType =
      this.receiptType === "INVOICE" ? "INVOICE" : "RECEIPT";

    const customerName = this.receiptCustomerName.trim() || null;
    const customerDocument = this.receiptCustomerDocument.trim() || null;

    return {
      documentType,
      billingSeriesId: seriesId,
      customerName,
      customerDocument,
    };
  }

  private validateSaleBeforeSubmit(): string {
    if (!this.currentCashSession) {
      return "No puedes vender sin caja abierta.";
    }

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      return "Selecciona un almacén de salida antes de cobrar.";
    }

    if (this.cart.length === 0) {
      return "Debes agregar al menos un item al carrito.";
    }

    try {
      for (const item of this.cart) {
        posLineCents(item);
        const quantity = quantityHundredths(item.quantityInput ?? item.quantity, item.quantityPolicy);
        if (quantity * 10n > stockMillis(item.stockInput ?? item.stockAvailable)) return `Stock insuficiente para ${item.sku}.`;
      }
      const total = posTotalCents(this.cart);
      const paid = posPaidCents(this.payments);
      const electronic = posPaidCents(this.payments, true);
      if (!this.payments.some(payment => moneyCents(payment.amountInput ?? payment.amount) > 0n)) return "Debes registrar al menos un pago válido.";
      if (electronic > total) return "Los pagos electrónicos no pueden superar el total de la venta. Reduce tarjeta o transferencia; el vuelto solo corresponde al efectivo.";
      if (paid < total) return "El total pagado debe ser mayor o igual al total de la venta.";
    } catch (error) { return error instanceof Error ? error.message : "Los importes no son válidos."; }
    if (this.cart.some(item => item.requiresRevalidation)) return this.draftReviewMessage || "El borrador requiere revalidación de precios y stock.";

    if (this.receiptValidationError) {
      return this.receiptValidationError;
    }

    return "";
  }

}
