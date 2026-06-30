import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";

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
import { PosDraftState, PosStateService } from "./data/pos-state.service";
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
  calculatePosLineSubtotal,
  calculatePosLineTotal,
  calculatePosPaidTotal,
  calculatePosSubtotal,
  calculatePosTotal,
  normalizePosNumber,
  normalizePosQuantity,
} from "./utils/pos-calculations";

@Component({
  selector: "app-pos-page",
  standalone: true,
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
      <header class="pos-hero">
        <div class="pos-hero__copy">
          <p class="ui-page-kicker">InkToy POS</p>
          <h1 class="ui-page-title">Punto de venta</h1>
          <p class="ui-page-description">
            Venta guiada para caja fisica: escanea, selecciona, cobra y conserva
            el control de caja en tiempo real.
          </p>
        </div>

        <div class="pos-hero__actions">
          <div
            class="pos-cash-status"
            [class.pos-cash-status--open]="currentCashSession"
            [class.pos-cash-status--closed]="!currentCashSession"
          >
            <span class="pos-cash-dot" aria-hidden="true"></span>
            <strong>{{
              currentCashSession ? "Caja abierta" : "Caja cerrada"
            }}</strong>
            <span *ngIf="currentCashSession">
              #{{ currentCashSession.id }} · desde
              {{ currentCashSession.openedAt | date: "HH:mm" }}
            </span>
            <span *ngIf="!currentCashSession">Abre caja antes de vender</span>
          </div>
          <a
            class="ui-button ui-button--secondary pos-button"
            [routerLink]="['/caja']"
            >Ir a Caja</a
          >
        </div>
      </header>

      <div class="pos-shell">
        <main class="pos-workspace">
          <app-pos-search-panel
            [saleForm]="saleForm"
            [warehouses]="warehouses"
            [selectedWarehouseLabel]="selectedWarehouseLabel"
            [quickSearchTerms]="quickSearchTerms"
            [loadingLookup]="loadingLookup"
            [loadingSearch]="loadingSearch"
            (search)="submitUnifiedSearch()"
            (exactLookup)="addExactFromUnifiedSearch()"
            (quickSearch)="applyQuickSearch($event)"
          ></app-pos-search-panel>

          <div class="message-stack" *ngIf="errorMessage || warningMessage || successMessage">
            <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
              {{ errorMessage }}
            </p>
            <p class="ui-alert ui-alert--info" *ngIf="warningMessage">
              {{ warningMessage }}
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

      .pos-hero {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--space-2);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: var(--radius-lg);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.74),
            rgba(16, 17, 20, 0.86)
          ),
          var(--color-brand-primary);
        color: var(--color-text-on-dark);
        padding: 0.36rem 0.55rem;
        box-shadow: var(--shadow-sm);
      }

      .pos-hero .ui-page-title {
        display: none;
      }

      .pos-hero .ui-page-kicker {
        display: none;
      }

      .pos-hero .ui-page-description {
        display: none;
      }

      .pos-hero__copy {
        display: none;
      }

      .pos-hero__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .pos-hero__actions .pos-button {
        min-height: 2.12rem;
        padding: 0.38rem 0.75rem;
        font-size: var(--font-size-sm);
      }

      .pos-cash-status {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        min-height: 2.12rem;
        max-width: min(42vw, 22rem);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-pill);
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
        padding: 0.34rem 0.65rem;
        font-size: var(--font-size-sm);
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pos-cash-status strong,
      .pos-cash-status span:not(.pos-cash-dot) {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pos-cash-status strong {
        flex: 0 0 auto;
        font-weight: 900;
      }

      .pos-cash-status span:not(.pos-cash-dot) {
        color: rgba(255, 255, 255, 0.78);
      }

      .pos-cash-dot {
        width: 0.58rem;
        height: 0.58rem;
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-success);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
      }

      .pos-cash-status--closed .pos-cash-dot {
        background: var(--color-danger);
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
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
        gap: var(--space-1);
      }

      .checkout-button {
        min-height: 2.65rem;
        border-radius: var(--radius-lg);
        background: var(--color-brand-accent);
        font-size: clamp(1.05rem, 1.7vw, 1.35rem);
        font-weight: 900;
        letter-spacing: 0.06em;
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

        .pos-hero {
          padding: var(--space-2) var(--space-3);
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

        .pos-hero {
          align-items: stretch;
          flex-direction: column;
        }

        .pos-hero__actions {
          width: 100%;
        }

        .pos-cash-status {
          width: 100%;
          max-width: none;
        }

        .pos-button,
        .checkout-button {
          width: 100%;
        }
      }
    `,
  ],
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
  isFullCartOpen = false;
  isCheckoutModalOpen = false;

  errorMessage = "";
  warningMessage = "";
  successMessage = "";
  lastSaleId: number | null = null;
  showGoToBillingAction = false;

  private readonly subscriptions = new Subscription();
  private warehousesLoaded = false;
  private currentUserLoaded = false;
  private cashSessionLoaded = false;
  private draftInitialized = false;
  private isHydratingDraft = false;

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
        this.persistDraftState();
      }),
    );

    this.subscriptions.add(
      warehouseControl.valueChanges.subscribe(() => {
        if (!this.isHydratingDraft) {
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
    this.cart = draft.cart.map((item) => ({ ...item }));
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

  private persistDraftState(): void {
    if (this.isHydratingDraft || !this.currentUserId || !this.currentCashSession) {
      return;
    }

    const currentWarehouseId = this.saleForm.value.warehouseId ?? null;
    const existingDraft = this.posStateService.load();

    this.posStateService.save({
      userId: this.currentUserId,
      cashRegisterSessionId: this.currentCashSession.id,
      warehouseId: currentWarehouseId,
      lastWarehouseId: currentWarehouseId ?? existingDraft?.lastWarehouseId ?? null,
      code: this.saleForm.value.code ?? "",
      query: this.saleForm.value.query ?? this.saleForm.value.code ?? "",
      searchResults: this.searchResults.map((item) => ({ ...item })),
      cart: this.cart.map((item) => ({ ...item })),
      payments: this.payments.map((payment) => ({ ...payment })),
      lastSaleId: this.lastSaleId,
    });
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
    this.warningMessage = "";
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
    this.resetDraftAfterCheckout(false);
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
      : "Selecciona almacen";
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
      this.errorMessage = "Ingresa un SKU o barcode para buscar.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;
    if (!warehouseId) {
      this.errorMessage = "Selecciona un almacen antes de buscar por codigo.";
      return;
    }

    this.loadingLookup = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.posService.lookup(code, warehouseId).subscribe({
      next: (product) => {
        this.loadingLookup = false;
        this.addToCart(product);
        this.saleForm.patchValue({ code: "" });
        this.persistDraftState();
      },
      error: (error: unknown) => {
        this.loadingLookup = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo consultar el producto por codigo.",
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
    if (query.length < 2) {
      this.errorMessage =
        "Ingresa al menos 2 caracteres para buscar por nombre o SKU.";
      return;
    }

    const warehouseId = this.saleForm.value.warehouseId ?? undefined;

    this.loadingSearch = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.posService.search(query, warehouseId).subscribe({
      next: (results) => {
        this.loadingSearch = false;
        this.searchResults = results;
        if (results.length === 0) {
          this.errorMessage = "No se encontraron productos para la busqueda.";
        }
        this.persistDraftState();
      },
      error: (error: unknown) => {
        this.loadingSearch = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo realizar la busqueda por nombre.",
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
    this.isCheckoutModalOpen = true;
  }

  closeCheckoutModal(): void {
    this.isCheckoutModalOpen = false;
  }

  addToCart(product: PosProductResponse): void {
    this.errorMessage = "";
    this.successMessage = "";

    const warehouseId = this.saleForm.value.warehouseId;
    if (!warehouseId) {
      this.errorMessage =
        "Selecciona un almacen antes de agregar productos al carrito.";
      return;
    }

    if (this.cart.length === 0 && this.lastSaleId !== null) {
      this.lastSaleId = null;
    }

    const existing = this.cart.find(
      (item) => item.productId === product.productId,
    );

    if (existing) {
      const nextQty = existing.quantity + 1;
      if (nextQty > this.availableIntegerStock(existing)) {
        this.errorMessage = `Stock insuficiente para ${product.sku}. Disponible: ${product.stockAvailable}.`;
        return;
      }
      existing.quantity = nextQty;
      this.persistDraftState();
      return;
    }

    const availableStock = Math.floor(
      normalizePosNumber(product.stockAvailable),
    );

    if (availableStock <= 0) {
      this.errorMessage = `El producto ${product.sku} no tiene stock disponible.`;
      return;
    }

    this.cart.push({
      productId: product.productId,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      salePrice: normalizePosNumber(product.salePrice),
      stockAvailable: normalizePosNumber(product.stockAvailable),
      quantity: 1,
      discountAmount: 0,
    });

    this.persistDraftState();
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
    this.persistDraftState();
  }

  clearCart(clearLastSaleReference = true): void {
    this.cart = [];
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
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = normalizePosQuantity(rawValue);
    const maxStock = this.availableIntegerStock(item);

    if (parsed > maxStock) {
      this.errorMessage = `Cantidad excede stock disponible (${item.stockAvailable}) para ${item.sku}.`;
      item.quantity = Math.max(maxStock, 1);
      if (input) {
        input.value = String(item.quantity);
      }
      return;
    }

    item.quantity = parsed;
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

    this.setQuantity(index, String(item.quantity + 1));
  }

  decreaseQuantity(index: number): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    this.setQuantity(index, String(item.quantity - 1));
  }

  availableIntegerStock(item: Pick<PosCartItem, "stockAvailable">): number {
    return Math.floor(normalizePosNumber(item.stockAvailable));
  }

  setDiscount(index: number, rawValue: string): void {
    const item = this.cart[index];
    if (!item) {
      return;
    }

    const parsed = Math.max(normalizePosNumber(rawValue), 0);
    const maxDiscount = this.lineSubtotal(item);

    if (parsed > maxDiscount) {
      item.discountAmount = maxDiscount;
      this.persistDraftState();
      return;
    }

    item.discountAmount = parsed;
    this.persistDraftState();
  }

  lineSubtotal(item: PosCartItem): number {
    return calculatePosLineSubtotal(item);
  }

  lineTotal(item: PosCartItem): number {
    return calculatePosLineTotal(item);
  }

  addPaymentLine(): void {
    this.payments.push({ paymentMethod: "CASH", amount: 0, reference: "" });
    this.persistDraftState();
  }

  removePaymentLine(index: number): void {
    if (this.payments.length === 1) {
      return;
    }
    this.payments.splice(index, 1);
    this.persistDraftState();
  }

  setPaymentMethod(index: number, value: string): void {
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
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.amount = Math.max(normalizePosNumber(rawValue), 0);
    this.persistDraftState();
  }

  setPaymentReference(index: number, rawValue: string): void {
    const payment = this.payments[index];
    if (!payment) {
      return;
    }

    payment.reference = rawValue;
    this.persistDraftState();
  }

  setReceiptType(type: PosReceiptType): void {
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
    this.receiptSeriesId = String(rawValue || "");
  }

  toggleFiscalDetails(): void {
    this.showFiscalDetails = !this.showFiscalDetails;
  }

  setReceiptCustomerDocument(rawValue: string): void {
    const maxLength = this.receiptType === "INVOICE" ? 11 : 8;
    this.receiptCustomerDocument = rawValue.replace(/\D/g, "").slice(0, maxLength);
  }

  setReceiptCustomerName(rawValue: string): void {
    this.receiptCustomerName = rawValue;
  }

  setReceiptCustomerAddress(rawValue: string): void {
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

      const warehouseId = this.saleForm.value.warehouseId as number;

      const payload: CreateSaleRequest = {
        warehouseId,
        items: this.cart.map((item) => ({
          productId: item.productId,
          quantity: normalizePosQuantity(item.quantity),
          discountAmount: normalizePosNumber(item.discountAmount),
        })),
        payments: this.payments
          .map((payment) => ({
            paymentMethod: payment.paymentMethod,
            amount: normalizePosNumber(payment.amount),
            reference: payment.reference.trim() ? payment.reference.trim() : null,
          }))
          .filter((payment) => payment.amount > 0),
      };

      this.submitting = true;

      this.salesService.create(payload).subscribe({
        next: (sale) => {
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
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo registrar la venta.",
          );
        },
      });
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

    for (const item of this.cart) {
      if (normalizePosQuantity(item.quantity) <= 0) {
        return `La cantidad de ${item.sku} debe ser mayor que 0.`;
      }

      if (normalizePosNumber(item.discountAmount) < 0) {
        return `El descuento de ${item.sku} debe ser >= 0.`;
      }

      if (
        normalizePosQuantity(item.quantity) > this.availableIntegerStock(item)
      ) {
        return `Stock insuficiente para ${item.sku}.`;
      }
    }

    const validPayments = this.payments.filter(
      (payment) => normalizePosNumber(payment.amount) > 0,
    );

    if (validPayments.length === 0) {
      return "Debes registrar al menos un pago valido.";
    }

    if (this.paidTotal < this.total) {
      return "El total pagado debe ser mayor o igual al total de la venta.";
    }

    if (this.receiptValidationError) {
      return this.receiptValidationError;
    }

    return "";
  }

}
