import { CommonModule } from "@angular/common";
import { Component, DoCheck, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { catchError, defer, EMPTY, map, Observable, Subscription, switchMap, throwError, timeout } from "rxjs";
import { HttpContext, HttpErrorResponse } from "@angular/common/http";
import { reviewCartConditions } from "./utils/cart-revalidation";
import { immutableRequest } from "./utils/checkout-confirmation";

import { AuthService } from "../../core/auth/auth.service";
import { BOUND_AUTH_CREDENTIALS, BoundAuthSessionError, createBoundAuthContext } from "../../core/auth/bound-auth-context";
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
import { POS_DRAFT_FORMAT_VERSION, PosDraftState, PosReceiptRecovery, PosStateService,
  immutableReceiptRecovery } from "./data/pos-state.service";
import { PaymentLine, PosCartItem, PosReceiptType } from "./data/pos-ui.models";
import { SalesService } from "./data/sales.service";
import { isSalePreparationRejected, SaleOperation, SaleOperationsService } from "./data/sale-operations.service";
import { SaleOperationRecoveryComponent } from "./components/sale-operation-recovery.component";
import { PosDialogFocusDirective } from "./components/pos-dialog-focus.directive";
import { PosConfirmedDelivery, PosSaleNoteComponent } from "./internal-note/pos-sale-note.component";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  BillingSeriesResponse,
  CreateElectronicDocumentFromSaleRequest,
  ElectronicDocumentType,
  ElectronicDocumentResponse,
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
        ReactiveFormsModule,
        RouterLink,
        PosTotalsSummaryComponent,
        PosCartPanelComponent,
        PosCheckoutModalComponent,
        PosFullCartModalComponent,
        PosSearchPanelComponent,
        PosSearchResultsComponent,
        SaleOperationRecoveryComponent,
        PosDialogFocusDirective,
        PosSaleNoteComponent,
    ],
    template: `
    <section class="ui-card pos-page">
      <header class="pos-utility-header">
        <div class="pos-context" aria-live="polite">
          <span class="pos-verification-status" aria-atomic="true">{{ cartVerificationAnnouncement }}</span>
          <strong [attr.data-state]="cashPhase">{{ cashStatusLabel }}<span *ngIf="currentCashSession"> · Sesión #{{ currentCashSession.id }}</span></strong>
          <label class="pos-warehouse" [formGroup]="saleForm"><span>Almacén de salida:</span>
            <select formControlName="warehouseId" aria-label="Almacén de salida" [title]="selectedWarehouseLabel" [attr.disabled]="submitting || pendingSaleRequest || receiptRecovery ? '' : null">
              <option [ngValue]="null">Selecciona almacén</option>
              <option *ngFor="let warehouse of warehouses" [ngValue]="warehouse.id">{{ warehouse.name || warehouse.code }}</option>
            </select>
          </label>
          <details class="pos-cash-details" #cashDetails (keydown.escape)="cashDetails.open = false; cashSummary.focus(); $event.stopPropagation()">
            <summary #cashSummary>Ver caja</summary>
            <div class="pos-cash-card">
              <strong>{{ cashStatusLabel }}</strong>
              <ng-container *ngIf="currentCashSession as session">
                <span>Sesión #{{ session.id }}</span>
                <span *ngIf="session.openedAt">Apertura: {{ session.openedAt | date:'short' }}</span>
              </ng-container>
              <button *ngIf="cashPhase === 'error'" type="button" class="ui-button ui-button--secondary" (click)="refreshCashSession()">Reintentar caja</button>
              <a class="ui-button ui-button--secondary" [routerLink]="['/caja']">Abrir Caja</a>
            </div>
          </details>
        </div>
        <app-sale-operation-recovery origin="POS" [contextual]="true" (resume)="selectServerOperation($event, true)"
          (recover)="selectServerOperation($event, false)" (selectionChange)="cancelRecoverySelection()"
          (cancelled)="onServerOperationCancelled($event)"></app-sale-operation-recovery>
      </header>
      <nav class="compact-cart-jump" aria-label="Accesos a la compra actual">
        <button type="button" class="ui-button ui-button--secondary" (click)="focusNewSale()">Buscar productos</button>
        <button type="button" class="ui-button ui-button--secondary" (click)="focusCart()">Compra · {{ cart.length }} · S/ {{ total | number:'1.2-2' }}</button>
      </nav>
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
            *ngIf="activeErrorMessage || warningMessage || draftReviewMessage || showCartVerificationNotice || pendingSaleRequest || receiptRecovery || (discountAdjustmentMessage && !isFullCartOpen)"
          >
            <p class="ui-alert ui-alert--error" [attr.role]="priceReviewRequired ? null : 'alert'" *ngIf="activeErrorMessage && !isCheckoutModalOpen">
              {{ activeErrorMessage }}
            </p>
            <p class="ui-alert ui-alert--info" *ngIf="warningMessage && (!receiptRecovery || warningMessage !== receiptRecoveryMessage)">
              {{ warningMessage }}
            </p>
            <div class="ui-alert ui-alert--warning" *ngIf="priceReviewRequired && needsRevalidation && (pendingSaleRequest || receiptRecovery)" role="alert">
              <strong>Los precios de esta venta cambiaron</strong>
              <p id="price-review-instruction">Si mantienes el carrito, no podrás cobrar hasta revisar los precios actualizados</p>
            </div>
            <section class="cart-verification ui-alert ui-alert--info" *ngIf="showCartVerificationNotice && !isCheckoutModalOpen" aria-label="Condiciones de la compra">
              <p [attr.role]="cartCheckPhase === 'error' || cartCheckPhase === 'blocked' ? 'alert' : 'status'" style="white-space:pre-line">{{ cartVerificationMessage }}</p>
              <button #priceReviewButton class="ui-button ui-button--secondary" type="button" [disabled]="revalidating" (click)="revalidateCart()">{{ revalidating ? 'Verificando compra…' : cartCheckPhase === 'error' ? 'Reintentar verificación' : cartCheckPhase === 'changes' ? 'Revisar cambios' : 'Comprobar condiciones' }}</button>
            </section>
            <p class="ui-alert ui-alert--warning" role="alert" *ngIf="pendingSaleRequest && !preparationRejected">{{ pendingPreparedVerified ? "Compra preparada, aún no confirmada. Reanuda o cancela explícitamente con su caja original." : "No se pudo confirmar el resultado de esta compra. No repitas el cobro. Comprueba la misma operación antes de reanudar o cancelar la preparación." }}</p>
            <p class="ui-alert ui-alert--warning" role="alert" *ngIf="pendingSaleRequest && preparationRejected">El servidor rechazó la preparación antes de guardarla. No se registró una venta. Puedes descartarla explícitamente para corregir el carrito.</p>
            <button *ngIf="pendingSaleRequest && preparationRejected" type="button" class="ui-button ui-button--secondary"
              [disabled]="submitting" (click)="discardRejectedPreparation()">Descartar preparación rechazada y editar</button>
            <p class="ui-alert ui-alert--warning" role="status" *ngIf="receiptRecovery && !pendingSaleRequest">{{ receiptRecoveryMessage }}</p>

            <button *ngIf="pendingSaleRequest && preparationMissing" type="button" class="ui-button ui-button--secondary"
              [disabled]="submitting" (click)="retryMissingPreparation()">Preparar la misma operación</button>
            <button *ngIf="pendingSaleRequest && preparedOnServer && pendingPreparedVerified" type="button" class="ui-button ui-button--secondary"
              [disabled]="submitting" (click)="confirmPreparedResume()">Reanudar preparación conservada</button>
            <button *ngIf="pendingSaleRequest && preparedOnServer && pendingPreparedVerified" type="button" class="ui-button ui-button--secondary"
              [disabled]="submitting" (click)="cancelPendingPreparation()">Cancelar preparación para revisar el carrito</button>
            <button *ngIf="pendingSaleRequest || receiptRecovery" type="button" class="ui-button ui-button--secondary"
              [disabled]="submitting" (click)="leaveOperationInServer()">Dejar pendiente y empezar otra venta</button>
            <p
              class="ui-alert ui-alert--info"
              *ngIf="discountAdjustmentMessage && !isFullCartOpen"
              role="status"
              aria-live="polite"
            >
              {{ discountAdjustmentMessage }}
            </p>

          </div>

          <app-pos-search-results
            [searchResults]="searchResults"
            [loading]="loadingSearch || loadingLookup"
            [searched]="hasSearched"
            [failed]="searchFailed"
            (addProduct)="addToCart($event)"
          ></app-pos-search-results>
        </main>

        <aside #purchasePanel class="checkout-panel" aria-label="Carrito y cobro" tabindex="-1">
          <app-pos-cart-panel
            [editingBlocked]="submitting || !!pendingSaleRequest || !!receiptRecovery"
            [cart]="cart"
            [cartTitle]="cartTitle"
            [lineTotals]="cartLineTotals"
            (openFullCart)="openFullCart()"
            (cancelSale)="confirmDiscardCart()"
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
            [showSettlement]="paidTotal > 0"
          ></app-pos-totals-summary>

          <footer class="checkout-actions">
            <button
              #checkoutLauncher
              type="button"
              class="ui-button ui-button--primary checkout-button"
              (click)="pendingSaleRequest || receiptRecovery ? finalizeSale() : openCheckoutModal()"
              [disabled]="checkoutDisabled"
            >
              {{ submitting ? "Cobrando..." : checkoutButtonLabel }}
            </button>
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
        [paymentAmountErrors]="paymentAmountErrors"
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
        [submitting]="checkoutProcessing"
        [reviewBlockedReason]="checkoutReviewBlockedReason"
        [recoveryActive]="!!pendingSaleRequest || !!receiptRecovery"
        [receiptValidationError]="receiptValidationError"
        [verificationMessage]="cartVerificationMessage"
        [verificationPending]="revalidating"
        [errorMessage]="activeErrorMessage"
        [recoveryMessage]="!submitting && pendingSaleRequest
          ? preparationRejected ? 'Preparación rechazada sin venta registrada. Cierra esta ventana para descartar explícitamente la preparación y corregir el carrito.'
          : 'Este cobro no tiene un resultado confirmado en pantalla. Conserva la operación y usa COMPROBAR RESULTADO para consultar su estado; no inicies otra venta para el mismo cobro.'
          : receiptRecovery?.saleId ? receiptRecoveryMessage : ''"
        (close)="closeCheckoutModal()"
        (finalize)="finalizeSale(true)"
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
        [editingBlocked]="submitting || !!pendingSaleRequest || !!receiptRecovery"
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
      <app-pos-sale-note [delivery]="confirmedDelivery" (newSale)="focusNewSale()" (closed)="focusNewSale()"></app-pos-sale-note>
      <div *ngIf="recoveryAdoption" class="recovery-decision-backdrop" role="alertdialog" aria-modal="true"
        aria-labelledby="recovery-decision-title" aria-describedby="recovery-decision-description"
        appPosDialogFocus (posDialogClose)="cancelRecoverySelection()">
        <section class="ui-card recovery-decision">
          <h2 id="recovery-decision-title">Tienes otra compra en curso</h2>
          <p id="recovery-decision-description">{{ recoveryAdoption.operation.state === 'PREPARED' ? 'Para recuperar esta preparación necesitas resolver primero la compra actual. No se guardará automáticamente.' : 'Para continuar este documento necesitas resolver primero la compra actual. No se guardará automáticamente.' }}</p>
          <p role="alert" *ngIf="recoverySelectionError">{{ recoverySelectionError }}</p>
          <p role="status" *ngIf="!submitting && !canConfirmRecoveryAdoption">La compra o la sesión cambió. Vuelve a tu compra y consulta la preparación nuevamente.</p>
          <button type="button" class="ui-button ui-button--primary" (click)="cancelRecoverySelection()">Volver a mi compra</button>
          <button type="button" class="ui-button ui-button--danger" [disabled]="submitting || !canConfirmRecoveryAdoption" (click)="confirmRecoveryAdoption()">{{ recoveryAdoption.operation.state === 'PREPARED' ? 'Descartar mi borrador y recuperar esta preparación' : 'Descartar mi borrador y continuar este documento' }}</button>
        </section>
      </div>
    </section>
  `,
    styleUrl: "./pos-page.component.css",
})
export class PosPageComponent implements OnInit, OnDestroy, DoCheck {
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
  cashPhase: "loading" | "open" | "closed" | "error" = "loading";
  hasSearched = false;
  searchFailed = false;
  get cashStatusLabel(): string {
    return this.cashPhase === "loading" ? "Verificando caja" : this.cashPhase === "error" ? "No se pudo verificar la caja" : this.cashPhase === "open" ? "Caja abierta" : "Caja cerrada";
  }
  get checkoutDisabled(): boolean {
    if (this.submitting) return true;
    if (this.pendingSaleRequest || this.receiptRecovery) return false;
    if (this.revalidating) return true;
    if (this.needsRevalidation && this.cart.length && this.currentCashSession && this.cashPhase === "open") return false;
    if (!this.cart.length || !this.currentCashSession || this.cashPhase !== "open" || !this.saleForm.value.warehouseId) return true;
    try { for (const item of this.cart) posLineCents(item); } catch { return true; }
    return false;
  }
  async confirmDiscardCart(): Promise<void> {
    if (!this.cart.length || this.preventPendingEdit()) return;
    const fingerprint = this.checkoutFingerprint(), token = this.authService.getToken();
    const confirmed = await this.confirmDialog.confirm({ title: "Descartar carrito", description: "Se quitarán los productos y pagos de este borrador editable. ¿Deseas continuar?", confirmText: "Descartar carrito", cancelText: "Conservar carrito", variant: "warning" });
    if (confirmed && !this.destroyed && !this.submitting && !this.confirmingSale && token === this.authService.getToken() && fingerprint === this.checkoutFingerprint()) this.cancelSale();
  }
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
  cartCheckPhase: "idle" | "checking" | "changes" | "blocked" | "error" | "stale" = "idle";
  cartCheckMessage = "";
  private cartCheckGeneration = 0;
  private cartCheckRead = new Subscription();
  private cartCheckFingerprint: string | null = null;
  private cartCheckContext: string | null = null;
  private cartFocusTimer: ReturnType<typeof setTimeout> | undefined;
  private verifiedCartContext: string | null = null;
  private reviewDialogOpen = false;
  private checkoutAfterVerification = false;
  pendingSaleRequest: CreateSaleRequest | null = null;
  preparationMissing = false;
  preparedOnServer = false;
  pendingPreparedVerified = false;
  // In-memory certificate only: a reload must recover conservatively, never infer absence from local storage.
  preparationRejected = false;
  private rejectedPreparationToken: string | null = null;
  private durableReceiptChecked = false;
  receiptRecovery: PosReceiptRecovery | null = null;
  // Ephemeral ownership of the displayed draft; never changes the durable command or REST payload.
  private recoveryBinding: { operationId: string; owner: string; token: string; fingerprint: string; cashId: number | null; originalCashId: number | null } | null = null;
  recoveryAdoption: { operation: SaleOperation; resume: boolean; token: string; owner: string; fingerprint: string; generation: number } | null = null;
  recoverySelectionError = "";
  private selectionGeneration = 0;
  private selectionReads = new Subscription();
  private selectionBusy = false;
  private confirmingSale = false;
  private pendingOwnerBlocked = false;
  private foreignDraftPreserved = false;
  private destroyed = false;
  isFullCartOpen = false;
  isCheckoutModalOpen = false;

  errorMessage = "";
  searchErrorMessage = "";
  stockMessage = "";
  warningMessage = "";
  discountAdjustmentMessage = "";
  successMessage = "";
  lastSaleId: number | null = null;
  confirmedDelivery: PosConfirmedDelivery | null = null;
  private deliveryCandidate: { operationId: string; token: string } | null = null;
  @ViewChild(PosSearchPanelComponent) private noteSearchPanel?: PosSearchPanelComponent;
  focusNewSale(): void { this.noteSearchPanel?.focusSearch(); }
  showGoToBillingAction = false;
  draftReviewMessage = "";
  priceReviewRequired = false;
  @ViewChild("purchasePanel") private purchasePanel?: ElementRef<HTMLElement>;
  focusCart(): void {
    const panel = this.purchasePanel?.nativeElement;
    if (panel?.isConnected) { panel.focus({ preventScroll: true }); panel.scrollIntoView({ block: "start", behavior: "auto" }); }
  }
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
    private readonly saleOperations: SaleOperationsService,
  ) {}

  ngOnInit(): void {
    this.bindDraftPersistence();
    this.loadCurrentUser();
    this.loadWarehouses();
    this.refreshCashSession();
    this.loadBillingSeries();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.cartFocusTimer);
    this.cancelCartVerification();
    this.cancelRecoverySelection();
    this.subscriptions.unsubscribe();
  }

  ngDoCheck(): void {
    if (this.pendingSaleRequest || this.receiptRecovery || this.pendingOwnerBlocked) return;
    if ((this.cartCheckFingerprint && this.cartCheckFingerprint !== this.cartVerificationFingerprint())
        || (this.cart.length && this.verifiedCartContext && this.verifiedCartContext !== this.cartVerificationContext())) {
      const previous = JSON.parse(this.cartCheckContext ?? this.verifiedCartContext ?? "[]"), current = JSON.parse(this.cartVerificationContext());
      const reason = previous[4] !== current[4] ? "El almacén cambió" : previous[2] !== current[2] || previous[3] !== current[3] ? "La caja cambió"
        : previous[0] !== current[0] || previous[1] !== current[1] ? "La sesión o el usuario cambió" : "Los productos, descuentos o pagos cambiaron";
      this.cancelCartVerification();
      this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
      this.cartCheckPhase = "stale";
      this.cartCheckMessage = reason + ". Comprueba las condiciones actuales antes de cobrar.";
      this.verifiedCartContext = null; this.persistDraftState();
    }
    if (!this.cart.length && this.cartCheckPhase !== "idle") { this.cancelCartVerification(); this.cartCheckPhase = "idle"; this.cartCheckMessage = ""; }
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
          if (this.pendingSaleRequest || this.receiptRecovery || this.pendingOwnerBlocked) {
            warehouseControl.setValue(this.pendingSaleRequest?.warehouseId ?? this.posStateService.load()?.warehouseId ?? null, { emitEvent: false });
            this.preventPendingEdit();
            return;
          }
          this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
          if (this.cart.length) { this.cartCheckPhase = "stale"; this.cartCheckMessage = "El almacén cambió. Comprueba la disponibilidad antes de cobrar."; }
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

    if (draft?.pendingSaleRequest || draft?.receiptRecovery) {
      if (this.currentUserId && draft.userId && draft.userId !== this.currentUserId) {
        // Do not display or overwrite another actor's local fallback. This actor works through durable server operations.
        this.foreignDraftPreserved = true;
        this.initializeEmptyDraft(null, false);
        this.warningMessage = "La sesión actual puede consultar sus propias operaciones en el servidor.";
        return;
      }
      if (!this.currentUserId || draft.userId !== this.currentUserId
          || (draft.receiptRecovery && (draft.receiptRecovery.userId !== this.currentUserId
            || !draft.receiptRecovery.operationId
            || (draft.pendingSaleRequest && draft.receiptRecovery.operationId !== draft.pendingSaleRequest.operationId)))) {
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
    this.receiptRecovery = draft.receiptRecovery ? immutableReceiptRecovery(draft.receiptRecovery) : null;
    if (this.receiptRecovery?.saleId) this.pendingSaleRequest = null;
    this.discountAdjustmentMessage = "";
    this.restoredDraftTotal = draft.preliminaryTotal ?? null;
    this.draftSourceFormatVersion = draft.sourceFormatVersion ?? draft.formatVersion ?? 0;
    this.draftValidationIssues = draft.validationIssues ?? [];
    this.draftReviewMessage = "";

    if (this.receiptRecovery?.saleId) this.draftReviewMessage = "";
    this.payments =
      draft.payments.length > 0
        ? draft.payments.map((payment) => ({ ...payment }))
        : [{ paymentMethod: "CASH", amount: 0, reference: "" }];
    this.lastSaleId = this.receiptRecovery?.saleId ?? draft.lastSaleId;
    const intent = this.receiptRecovery;
    const displayIntent = intent?.payload ?? intent?.reviewPayload;
    this.receiptType = intent && intent.receiptType !== "UNKNOWN" ? intent.receiptType : "TICKET";
    this.receiptSeriesId = displayIntent?.billingSeriesId ? String(displayIntent.billingSeriesId) : "";
    this.receiptCustomerDocument = displayIntent?.customerDocument ?? "";
    this.receiptCustomerName = displayIntent?.customerName ?? "";
    this.receiptCustomerAddress = intent?.customerAddress ?? "";
    this.showGoToBillingAction = !!intent?.saleId;
    if (intent?.receiptType === "UNKNOWN" || intent?.creationState === "REVIEW_REQUIRED") {
      this.warningMessage = "La intención original del comprobante es desconocida o incompleta. Recupera la misma venta y revisa Comprobantes; no se emitirá automáticamente.";
    }
    this.showFiscalDetails = false;
    this.loadingLookup = false;
    this.loadingSearch = false;
    this.submitting = false;
    this.isFullCartOpen = false;
    this.isCheckoutModalOpen = false;
    this.searchErrorMessage = "";
    this.stockMessage = "";
    this.isHydratingDraft = false;

    if (this.receiptRecovery) this.bindRecovery(draft.cashRegisterSessionId);
    this.persistDraftState();
    if (!this.pendingSaleRequest && !this.receiptRecovery && this.cart.length) this.revalidateCart();
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
    if (this.foreignDraftPreserved || this.pendingOwnerBlocked || this.isHydratingDraft || !this.currentUserId
        || (this.receiptRecovery && !this.receiptRecoveryOwnerMatches())
        || (!this.currentCashSession && !this.pendingSaleRequest && !this.receiptRecovery)) {
      return false;
    }

    const currentWarehouseId = this.saleForm.value.warehouseId ?? null;
    const existingDraft = this.posStateService.load();

    return this.posStateService.save({
      pendingSaleRequest: this.pendingSaleRequest,
      receiptRecovery: this.receiptRecovery,
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
    if (this.receiptRecovery && !this.requireRecoveryBinding()) return;
    if (this.pendingSaleRequest || (this.receiptRecovery && this.receiptRecovery.creationState !== "CONFIRMED"
        && !(this.receiptRecovery.receiptType === "TICKET" && this.receiptRecovery.saleId
          && this.receiptRecovery.creationState === "NOT_STARTED"))) {
      this.warningMessage = this.receiptRecoveryMessage;
      return;
    }
    this.receiptRecovery = null;
    this.recoveryBinding = null;
    this.pendingPreparedVerified = false;
    this.durableReceiptChecked = false;
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

    if (!this.foreignDraftPreserved) this.posStateService.clearDraft(preserveLastSaleId);

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
      "Revisa el documento, los productos y los pagos antes de confirmar.",
      "",
      this.receiptType === "TICKET"
        ? "Se registrará una venta interna."
        : "Se registrará la venta y se creará un borrador del comprobante. Su procesamiento fiscal es independiente.",
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
        this.noteSearchPanel?.focusSearch();
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
    this.hasSearched = true;
    this.searchFailed = false;
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
        this.searchFailed = true;
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
    this.hasSearched = false;
    this.searchFailed = false;
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
    if (this.receiptRecovery?.saleId || this.receiptRecovery?.receiptType === "UNKNOWN" || this.pendingOwnerBlocked) {
      this.finalizeSale();
      return;
    }
    if (!this.pendingSaleRequest && !this.receiptRecovery && this.needsRevalidation) {
      this.revalidateCart(true);
      return;
    }
    this.isCheckoutModalOpen = true;
  }

  closeCheckoutModal(): void {
    this.checkoutAfterVerification = false;
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
    } catch {
      payment.amountInput = rawValue;
    }
    this.persistDraftState();
  }

  get paymentAmountErrors(): string[] {
    return this.payments.map(payment => {
      try { moneyCents(payment.amountInput ?? payment.amount, "El pago"); return ""; }
      catch (error) { return error instanceof Error ? error.message : "Pago no válido."; }
    });
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
    if (this.receiptRecovery?.receiptType === "UNKNOWN") return "Comprobante original desconocido";
    switch (this.receiptType) {
      case "RECEIPT":
        return "Boleta electrónica";
      case "INVOICE":
        return "Factura electrónica";
      default:
        return "Nota de venta";
    }
  }

  get checkoutButtonLabel(): string {
    if (this.receiptRecovery?.saleId) {
      if (this.receiptRecovery.receiptType === "TICKET" && this.receiptRecovery.creationState === "NOT_STARTED") return "FINALIZAR RECUPERACIÓN";
      if (this.receiptRecovery.payload) return this.receiptRecovery.creationState === "NOT_STARTED" ? "CREAR COMPROBANTE" : "CONSULTAR COMPROBANTE";
      return "REVISAR COMPROBANTE";
    }
    if (this.pendingSaleRequest) return this.pendingPreparedVerified ? "REVISAR PREPARACIÓN" : "COMPROBAR RESULTADO";
    if (this.revalidating) return "Verificando compra…";
    if (this.needsRevalidation) return this.cartCheckPhase === "changes" ? "Revisar cambios" : this.cartCheckPhase === "blocked" ? "Revisar carrito" : this.cartCheckPhase === "error" ? "Reintentar verificación" : "Verificar compra";
    return "COBRAR";
  }

  get checkoutReviewBlockedReason(): string {
    if (this.submitting || this.confirmingSale) return "Procesando la operación…";
    if (this.pendingOwnerBlocked) return "La operación pertenece a otra identidad. Conserva el contexto y verifica la sesión.";
    if (this.pendingSaleRequest || this.receiptRecovery) return "";
    if (this.revalidating) return "Verificando las condiciones de la compra…";
    if (this.needsRevalidation) return this.cartVerificationMessage || "Debes verificar las condiciones de la compra antes de confirmar.";
    const error = this.validateSaleBeforeSubmit();
    return error && this.paymentAmountErrors.includes(error) ? "Revisa los montos de pago indicados." : error;
  }
  get checkoutProcessing(): boolean { return this.submitting || this.confirmingSale; }

  get receiptRecoveryActionLabel(): string {
    const context = this.receiptRecovery;
    if (context?.receiptType === "TICKET" && context.creationState === "NOT_STARTED") return "Finalizar recuperación del cobro";
    if (context?.payload) return context.creationState === "NOT_STARTED"
      ? "Crear comprobante pendiente" : "Consultar comprobante de venta registrada";
    return "Revisar comprobante de venta registrada";
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
    const seriesId = Number(this.receiptSeriesId);
    return !Number.isSafeInteger(seriesId) || seriesId <= 0;
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
    this.cashPhase = "loading";
    this.currentCashSession = null;
    this.subscriptions.add(this.cashRegisterService.current().subscribe({
      next: (session) => {
        const open = session?.status === "OPEN" && Number.isSafeInteger(session.id) && session.id > 0;
        this.currentCashSession = open ? session : null;
        this.cashPhase = open ? "open" : "error";
        this.cashSessionLoaded = true;
        this.maybeRestoreDraft();
      },
      error: (error: unknown) => {
        this.currentCashSession = null;
        this.cashPhase = error instanceof HttpErrorResponse && error.status === 404 && error.error?.message === "No OPEN cash register session for current user" ? "closed" : "error";
        this.cashSessionLoaded = true;
        this.maybeRestoreDraft();
      },
    }));
  }

  finalizeSale(fromCheckoutReview = false): void {
    // Only the explicit action in the mounted checkout can supply the integrated review decision.
    if (fromCheckoutReview && !this.isCheckoutModalOpen) return;
    if (this.pendingOwnerBlocked) { this.preventPendingEdit(); return; }
    if (this.submitting || this.confirmingSale || this.revalidating) return;
    if ((this.pendingSaleRequest || this.receiptRecovery) && !this.requireRecoveryBinding()) return;
    if (this.receiptRecovery && !this.receiptRecoveryOwnerMatches()) {
      this.errorMessage = "El comprobante pendiente pertenece a otra identidad o contiene datos incompatibles. Conserva la operación para revisión.";
      return;
    }
    if (this.receiptRecovery?.saleId) {
      this.continueReceiptRecovery();
      return;
    }
    if (this.pendingSaleRequest) {
      this.queryPendingOperation();
      return;
    }
    if (this.needsRevalidation) { this.revalidateCart(true); return; }
    this.errorMessage = "";
    this.warningMessage = "";
    this.successMessage = "";
    this.lastSaleId = null;
    this.deliveryCandidate = null;
    this.confirmedDelivery = null;
    this.showGoToBillingAction = false;

    const validationError = this.validateSaleBeforeSubmit();
    if (validationError) {
      // Amount errors belong to their current fields, including a validation at confirmation time.
      if (!this.paymentAmountErrors.includes(validationError)) this.errorMessage = validationError;
      return;
    }

    const payload = immutableRequest(this.buildSaleRequest(crypto.randomUUID()));
    const receipt = immutableReceiptRecovery({ version: 1, operationId: payload.operationId, userId: this.currentUserId,
      receiptType: this.receiptType, payload: this.buildElectronicDocumentPayload(), customerAddress: this.receiptCustomerAddress,
      saleId: null, documentId: null, creationState: "NOT_STARTED" });
    const fingerprint = this.checkoutFingerprint();
    this.confirmingSale = true;
    const decision = fromCheckoutReview ? Promise.resolve(true) : this.confirmDialog.confirm({
      title: "Confirmar venta",
      description: this.buildFinalizeConfirmationMessage(),
      highlightText: "Confirmación del cobro",
      confirmText: "Cobrar",
      cancelText: "Cancelar",
      variant: "info",
    });
    void decision.then((confirmed) => {
      if (!confirmed) {
        return;
      }
      if (fromCheckoutReview && (this.destroyed || !this.isCheckoutModalOpen)) return;

      const currentValidationError = this.validateSaleBeforeSubmit();
      if (currentValidationError) {
        if (!this.paymentAmountErrors.includes(currentValidationError)) this.errorMessage = currentValidationError;
        return;
      }
      if (fingerprint !== this.checkoutFingerprint()) {
        this.errorMessage = "El carrito o los pagos cambiaron durante la confirmación. Revisa y confirma nuevamente.";
        return;
      }

      this.receiptRecovery = receipt;
      this.bindRecovery(this.currentCashSession?.id ?? null);
      this.deliveryCandidate = { operationId: payload.operationId, token: this.authService.getToken()! };
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

  private submitConfirmedSale(payload: CreateSaleRequest, prepared = false): void {
      if (this.destroyed) return;
      if (!this.receiptRecoveryOwnerMatches() || this.receiptRecovery?.operationId !== payload.operationId) {
        this.errorMessage = "No se pudo verificar la intención y el usuario del cobro pendiente.";
        return;
      }
      this.pendingSaleRequest = payload;
      this.persistDraftState();
      this.submitting = true;
      this.pendingPreparedVerified = false;
      this.preparationRejected = false;
      this.rejectedPreparationToken = null;
      let preparationConfirmed = prepared;
      this.subscriptions.add(this.withVerifiedIdentity(this.receiptRecovery!, context => {
        const prepare = prepared ? defer(() => {
          if (!this.preparedOnServer) throw new Error("Consulta y confirma la preparación antes de reanudar.");
          return this.salesService.create(payload, context);
        }) : this.saleOperations.prepare({ protocolVersion: 1, origin: "POS", operationId: payload.operationId,
          command: payload, quoteId: null, quoteCommand: null,
          receiptIntent: { receiptType: this.receiptRecovery!.receiptType as "TICKET" | "RECEIPT" | "INVOICE", payload: this.receiptRecovery!.payload } }, context).pipe(
            catchError(error => {
              // Only the prepare response, for the same actor/UUID and still-bound credential, may certify absence.
              this.preparationRejected = !this.destroyed && this.authService.getToken() === context.get(BOUND_AUTH_CREDENTIALS)?.token
                && this.pendingSaleRequest === payload && !!this.receiptRecovery?.userId
                && isSalePreparationRejected(error, payload.operationId, this.receiptRecovery.userId);
              this.rejectedPreparationToken = this.preparationRejected ? context.get(BOUND_AUTH_CREDENTIALS)!.token : null;
              return throwError(() => error);
            }),
            switchMap(operation => {
              if (operation.operationId !== payload.operationId || operation.origin !== "POS") throw new Error("La preparación recibida no corresponde a esta operación.");
              this.preparationMissing = false;
              if (operation.state !== "PREPARED") {
                this.submitting = false;
                this.applyServerOperation(operation);
                return EMPTY;
              }
              preparationConfirmed = true;
              this.preparedOnServer = true;
              this.recoveryBinding!.originalCashId = operation.cashRegisterSessionId;
              if (this.authService.getToken() !== context.get(BOUND_AUTH_CREDENTIALS)?.token) throw new BoundAuthSessionError();
              return this.salesService.create(payload, context);
            }));
        return prepare;
      }).subscribe({
        next: (sale) => {
          this.preparedOnServer = false;
          this.pendingSaleRequest = null;
          this.lastSaleId = sale.id;
          this.receiptRecovery = immutableReceiptRecovery({ ...this.receiptRecovery!, saleId: sale.id });
          this.bindRecovery(this.recoveryBinding?.originalCashId ?? null);
          if (this.deliveryCandidate?.operationId === payload.operationId && this.deliveryCandidate.token === this.authService.getToken()
              && sale.status === "COMPLETED" && Number.isSafeInteger(sale.id) && sale.id > 0 && Number.isFinite(sale.totalAmount)) {
            this.confirmedDelivery = Object.freeze({ operationId: payload.operationId, saleId: sale.id, totalAmount: sale.totalAmount,
              credential: this.deliveryCandidate.token, receiptType: this.receiptRecovery.receiptType });
            this.isCheckoutModalOpen = false; this.isFullCartOpen = false;
          }
          this.deliveryCandidate = null;
          this.persistDraftState();
          this.continueReceiptRecovery(sale.saleNumber);
        },
        error: (error: unknown) => {
          this.submitting = false;
          this.deliveryCandidate = null;
          if (!this.requireRecoveryBinding()) return;
          const response = error as HttpErrorResponse;
          const priceConflict = response.status === 409 && response.error?.code === "PRICE_CONFIRMATION_REQUIRED";
          // A confirmed preparation survives checkout rejection; only a separate NOT_STORED certificate proves absence.
          this.preparedOnServer = preparationConfirmed;
          if (this.preparationRejected) {
            // Reveal the explicit discard action without abandoning the certified rejected identity.
            this.isCheckoutModalOpen = false;
            this.isFullCartOpen = false;
          }
          if (priceConflict) {
            this.pendingPreparedVerified = true;
            this.isCheckoutModalOpen = false;
            this.isFullCartOpen = false;
            this.priceReviewRequired = true;
            this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
            this.draftReviewMessage = `Total confirmado S/ ${decimalText(moneyCents(response.error.confirmedTotal))}; total vigente ${response.error.proposedTotal === null ? 'requiere revisar descuentos' : 'S/ ' + decimalText(moneyCents(response.error.proposedTotal))}. ` +
              response.error.changes.map((c: { productId: number; confirmedUnitPrice: number; currentUnitPrice: number }) =>
                `Producto #${c.productId}: S/ ${decimalText(moneyCents(c.confirmedUnitPrice))} → S/ ${decimalText(moneyCents(c.currentUnitPrice))}.`).join(" ");
            this.bindRecovery(this.recoveryBinding?.originalCashId ?? null);
          }
          this.errorMessage = this.preparationRejected
            ? "La preparación fue rechazada antes de guardarse. No se registró una venta. Descártala para corregir el carrito."
            : !preparationConfirmed && !this.isAuthenticationRecoveryError(error)
            ? "No se confirmó la respuesta de preparación. No se envió el checkout. Consulta la misma operación en el servidor."
            : this.isAuthenticationRecoveryError(error) ? new BoundAuthSessionError().message : toHttpErrorMessage(
            error,
            "No se pudo registrar la venta.",
          );
          this.persistDraftState();
        },
      }));
  }

  private queryPendingOperation(): void {
    const recovery = this.receiptRecovery;
    const request = this.pendingSaleRequest;
    if (!recovery || !request) return;
    this.submitting = true;
    this.preparationRejected = false;
    this.subscriptions.add(this.withVerifiedIdentity(recovery, context => this.saleOperations.get(request.operationId, context)).subscribe({
      next: operation => { this.submitting = false; this.applyServerOperation(operation); },
      error: error => { this.submitting = false; this.preparationMissing = error instanceof HttpErrorResponse && error.status === 404;
        this.errorMessage = this.isAuthenticationRecoveryError(error) ? new BoundAuthSessionError().message
          : this.preparationMissing ? "No se encontró una preparación propia. Puedes preparar explícitamente la misma identidad; no se ejecutó ningún cobro."
          : toHttpErrorMessage(error, "No se pudo consultar el resultado. Conserva la misma operación."); },
    }));
  }

  retryMissingPreparation(): void {
    if (!this.preparationMissing || !this.pendingSaleRequest || this.submitting || this.confirmingSale) return;
    const payload = this.pendingSaleRequest;
    this.confirmingSale = true;
    void this.confirmDialog.confirm({ title: "Preparar la misma operación", description: "Se conservarán identidad, importes y comprobante. Solo después de confirmar la preparación se enviará el checkout.",
      confirmText: "Preparar y cobrar", cancelText: "Conservar", variant: "warning" }).then(ok => { if (ok) this.submitConfirmedSale(payload); }).finally(() => this.confirmingSale = false);
  }

  discardRejectedPreparation(): void {
    const payload = this.pendingSaleRequest, recovery = this.receiptRecovery;
    const token = this.authService.getToken();
    if (!this.preparationRejected || token !== this.rejectedPreparationToken || !payload || !recovery || !this.receiptRecoveryOwnerMatches()
        || this.submitting || this.confirmingSale) return;
    this.confirmingSale = true;
    void this.confirmDialog.confirm({ title: "Descartar preparación rechazada",
      description: "El servidor confirmó que no la guardó. Se conservarán productos, importes y comprobante para corregirlos. No se ejecutará ningún cobro.",
      confirmText: "Descartar y editar", cancelText: "Conservar", variant: "warning" }).then(ok => {
      if (!ok || this.destroyed || !this.requireRecoveryBinding() || !this.preparationRejected || this.pendingSaleRequest !== payload
          || this.receiptRecovery !== recovery || this.authService.getToken() !== token || !this.receiptRecoveryOwnerMatches()) return;
      this.pendingSaleRequest = null; this.receiptRecovery = null; this.preparationRejected = false;
      this.recoveryBinding = null;
      this.rejectedPreparationToken = null;
      this.preparedOnServer = false; this.preparationMissing = false;
      this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
      this.errorMessage = "";
      this.warningMessage = "Preparación rechazada descartada. Corrige y revalida el carrito antes de confirmar una nueva operación.";
      this.persistDraftState();
    }).finally(() => this.confirmingSale = false);
  }

  selectServerOperation(operation: SaleOperation, resume: boolean): void {
    if (this.submitting || this.confirmingSale || operation.origin !== "POS" || this.historicalOperation(operation)) return;
    if (!this.compatibleRecoverySelection(operation)) return;
    const token = this.authService.getToken(), owner = this.currentUserId;
    if (!token || !owner) { this.errorMessage = "Verifica tu sesión antes de recuperar."; return; }
    this.cancelRecoverySelection();
    const selection = { operation: structuredClone(operation), resume, token, owner,
      fingerprint: this.draftContextFingerprint(), generation: this.selectionGeneration };
    this.readRecoverySelection(selection, result => {
      if (!this.recoverableOperation(result)) return;
      selection.operation = result;
      if (this.hasEditablePurchase()) this.recoveryAdoption = selection;
      else this.adoptVerifiedOperation(selection, result);
    });
  }

  cancelRecoverySelection(): void {
    this.selectionGeneration++; this.selectionReads.unsubscribe(); this.selectionReads = new Subscription();
    if (this.selectionBusy) this.submitting = false;
    this.selectionBusy = false; this.recoveryAdoption = null; this.recoverySelectionError = "";
  }

  confirmRecoveryAdoption(): void {
    const selection = this.recoveryAdoption;
    if (!selection || this.submitting || !this.validRecoverySelection(selection) || !this.canDiscardForRecovery()) {
      this.recoverySelectionError = "La compra o la sesión cambió. Vuelve a tu compra y consulta la preparación nuevamente."; return;
    }
    this.readRecoverySelection(selection, result => {
      // No local discard occurs until the original decision and a fresh owner-bound server read both remain valid.
      if (!this.canDiscardForRecovery() || !this.recoverableOperation(result)) return;
      if (JSON.stringify(result) !== JSON.stringify(selection.operation)) {
        this.recoverySelectionError = "La preparación cambió. No se descartó tu compra. Vuelve y consulta su estado actualizado."; return;
      }
      this.adoptVerifiedOperation(selection, result);
    });
  }

  get canConfirmRecoveryAdoption(): boolean {
    return !!this.recoveryAdoption && this.validRecoverySelection(this.recoveryAdoption) && this.canDiscardForRecovery();
  }

  private compatibleRecoverySelection(operation: SaleOperation): boolean {
    const activeId = this.receiptRecovery?.operationId ?? this.pendingSaleRequest?.operationId;
    if (this.pendingOwnerBlocked || (activeId && activeId !== operation.operationId)) {
      this.warningMessage = "Conserva primero la operación actual en el servidor antes de seleccionar otra."; return false;
    }
    return !activeId || this.requireRecoveryBinding();
  }

  private historicalOperation(operation: SaleOperation): boolean {
    return operation.state === "COMPLETED" && !!operation.saleId && ["NOT_REQUIRED", "LOCATED"].includes(operation.receiptState);
  }

  private recoverableOperation(operation: SaleOperation): boolean {
    if (this.historicalOperation(operation)) {
      this.warningMessage = "La venta ya está registrada. Usa Ver venta para consultar su detalle sin cambiar tu compra."; return false;
    }
    return this.validOperation(operation);
  }

  private validOperation(operation: SaleOperation): boolean {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(operation.operationId)) {
      this.errorMessage = "La operación no contiene una identidad válida. No se modificó la compra."; return false;
    }
    if (operation.origin !== "POS" || operation.protocolVersion !== 1) {
      this.warningMessage = "Operación histórica o de cotización: consulta su venta o abre su conversión original."; return false;
    }
    if (operation.state === "RESULT_UNAVAILABLE" || operation.state === "CANCELLED") {
      this.errorMessage = operation.state === "CANCELLED" ? "Esta operación está cancelada y no puede reactivarse." : "El resultado fue retirado. Conserva la referencia para revisión; no repitas el cobro.";
      return false;
    }
    if ((operation.state === "PREPARED" && (!operation.command || operation.command.operationId !== operation.operationId
        || !operation.receiptIntent || !operation.cashRegisterSessionId || !Number.isSafeInteger(operation.command.warehouseId)
        || operation.command.warehouseId <= 0 || !Array.isArray(operation.command.items) || !operation.command.items.length
        || !Array.isArray(operation.command.payments) || !operation.command.payments.length)) || (operation.state === "COMPLETED" && !operation.saleId)) {
      this.errorMessage = "La operación no contiene una identidad o intención recuperable completa. Conserva la referencia para revisión.";
      return false;
    }
    return ["PREPARED", "COMPLETED"].includes(operation.state);
  }

  private draftContextFingerprint(): string {
    return JSON.stringify([this.checkoutFingerprint(), this.currentUserId, this.currentCashSession?.id ?? null,
      this.lastSaleId, this.pendingSaleRequest, this.receiptRecovery, this.pendingOwnerBlocked]);
  }

  private hasEditablePurchase(): boolean {
    if (this.pendingSaleRequest || this.receiptRecovery) return false;
    return !!this.cart.length || this.payments.length !== 1 || this.payments.some(payment =>
      payment.paymentMethod !== "CASH" || String(payment.amountInput ?? payment.amount) !== "0" || !!payment.reference.trim())
      || this.receiptType !== "TICKET" || !!this.receiptSeriesId || !!this.receiptCustomerDocument
      || !!this.receiptCustomerName || !!this.receiptCustomerAddress;
  }

  private canDiscardForRecovery(): boolean {
    return !this.destroyed && !this.pendingOwnerBlocked && !this.pendingSaleRequest && !this.receiptRecovery && !this.confirmingSale && !this.revalidating;
  }

  private validRecoverySelection(selection: NonNullable<PosPageComponent["recoveryAdoption"]>): boolean {
    return !this.destroyed && selection.generation === this.selectionGeneration && selection.token === this.authService.getToken()
      && selection.owner === this.currentUserId && selection.fingerprint === this.draftContextFingerprint();
  }

  private readRecoverySelection(selection: NonNullable<PosPageComponent["recoveryAdoption"]>, accept: (operation: SaleOperation) => void): void {
    if (!this.validRecoverySelection(selection)) return;
    this.submitting = true; this.selectionBusy = true;
    this.selectionReads.add(defer(() => {
      const context = createBoundAuthContext(selection.token);
      return this.authService.me(context).pipe(switchMap(actor => {
        if (actor.id !== selection.owner || !this.validRecoverySelection(selection)) throw new BoundAuthSessionError();
        return this.saleOperations.get(selection.operation.operationId, context);
      }), map(result => {
        if (!this.validRecoverySelection(selection)) throw new BoundAuthSessionError();
        if (result.operationId !== selection.operation.operationId) throw new Error("La respuesta no corresponde a la operación seleccionada.");
        return result;
      }));
    }).subscribe({ next: result => {
      this.selectionBusy = false; this.submitting = false;
      if (this.validRecoverySelection(selection)) accept(result);
    }, error: error => {
      this.selectionBusy = false; this.submitting = false;
      const message = toHttpErrorMessage(error, "No se pudo verificar esta preparación. Tu compra no se modificó.");
      if (this.recoveryAdoption) this.recoverySelectionError = message; else this.errorMessage = message;
    } }));
  }

  private adoptVerifiedOperation(selection: NonNullable<PosPageComponent["recoveryAdoption"]>, operation: SaleOperation): void {
    if (!this.validRecoverySelection(selection) || !this.compatibleRecoverySelection(operation)) return;
    this.recoveryAdoption = null;
    this.deliveryCandidate = null;
    if (!this.applyServerOperation(operation, true)) return;
    if (selection.resume && operation.state === "PREPARED") this.confirmPreparedResume();
  }

  private applyServerOperation(operation: SaleOperation, adopting = false): boolean {
    if (!this.validOperation(operation)) return false;
    const activeId = this.receiptRecovery?.operationId ?? this.pendingSaleRequest?.operationId;
    if (activeId ? activeId !== operation.operationId || !this.requireRecoveryBinding() : !adopting) return false;
    if (activeId && !this.operationMatchesBinding(operation)) return false;
    this.preparationRejected = false;
    this.rejectedPreparationToken = null;
    this.pendingOwnerBlocked = false;
    this.durableReceiptChecked = false;
    this.preparationMissing = false;
    this.preparedOnServer = operation.state === "PREPARED";
    this.pendingPreparedVerified = operation.state === "PREPARED";
    this.pendingSaleRequest = operation.state === "PREPARED" && operation.command ? immutableRequest(operation.command) : null;
    this.receiptRecovery = immutableReceiptRecovery({ version: 1, userId: this.currentUserId, operationId: operation.operationId,
      receiptType: operation.receiptIntent?.receiptType ?? "UNKNOWN", payload: operation.receiptIntent?.payload ?? null,
      customerAddress: "", saleId: operation.saleId, documentId: operation.documentId,
      creationState: operation.receiptState === "LOCATED" ? "CONFIRMED" : operation.receiptState === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "NOT_STARTED" });
    this.receiptType = operation.receiptIntent?.receiptType ?? "TICKET";
    this.receiptSeriesId = operation.receiptIntent?.payload?.billingSeriesId ? String(operation.receiptIntent.payload.billingSeriesId) : "";
    this.receiptCustomerName = operation.receiptIntent?.payload?.customerName ?? "";
    this.receiptCustomerDocument = operation.receiptIntent?.payload?.customerDocument ?? "";
    const request = this.pendingSaleRequest;
    if (adopting && !activeId) { this.cart = []; this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }]; this.lastSaleId = null; }
    if (request) {
      this.saleForm.patchValue({ warehouseId: request.warehouseId }, { emitEvent: false });
      this.cart = request.items.map(item => ({ productId: item.productId, sku: `#${item.productId}`, name: `Producto #${item.productId}`,
        barcode: null, quantity: item.quantity, discountAmount: item.discountAmount ?? 0, salePrice: item.confirmedUnitPrice,
        stockAvailable: 0, requiresRevalidation: true }));
      this.payments = request.payments.map(payment => ({ ...payment, reference: payment.reference ?? "" }));
      this.warningMessage = `Preparación recuperada en caja #${operation.cashRegisterSessionId}. Importe confirmado: S/ ${decimalText(moneyCents(request.confirmedTotal))}. Reanuda explícitamente esta preparación o cancélala para revisar precios.`;
    } else {
      this.lastSaleId = operation.saleId;
      this.successMessage = `Venta #${operation.saleId} confirmada. Comprobante: ${operation.receiptState}${operation.documentStatus ? ' (' + operation.documentStatus + ')' : ''}.`;
      this.warningMessage = operation.receiptState === "LOCATED" ? "Comprobante localizado. Su estado fiscal se muestra por separado; no se creó otro documento." : this.receiptRecoveryMessage;
    }
    this.bindRecovery(operation.cashRegisterSessionId);
    this.persistDraftState();
    return true;
  }

  private bindRecovery(originalCashId: number | null): void {
    const recovery = this.receiptRecovery, token = this.authService.getToken();
    this.recoveryBinding = recovery?.operationId && recovery.userId && token ? {
      operationId: recovery.operationId, owner: recovery.userId, token, fingerprint: this.recoveryDraftFingerprint(),
      cashId: this.currentCashSession?.id ?? null, originalCashId,
    } : null;
  }

  private recoveryBindingMatches(): boolean {
    const binding = this.recoveryBinding;
    return !!binding && !this.destroyed && this.receiptRecoveryOwnerMatches() && this.receiptRecovery?.operationId === binding.operationId
      && binding.owner === this.currentUserId
      && binding.cashId === (this.currentCashSession?.id ?? null) && binding.fingerprint === this.recoveryDraftFingerprint();
  }

  private recoveryDraftFingerprint(): string {
    // Fiscal fields are frozen in receiptRecovery; unconfirmed live fields never replace that intent.
    return JSON.stringify([this.saleForm.value.warehouseId, this.cart, this.payments]);
  }

  private requireRecoveryBinding(): boolean {
    if (this.recoveryBindingMatches()) return true;
    this.errorMessage = "La compra o la sesión ya no corresponde a esta recuperación. No se modificó el carrito. Vuelve a consultar la operación con su usuario original.";
    return false;
  }

  private operationMatchesBinding(operation: SaleOperation): boolean {
    const binding = this.recoveryBinding, recovery = this.receiptRecovery;
    const matches = !!binding && operation.operationId === binding.operationId && operation.origin === "POS" && operation.protocolVersion === 1
      && (binding.originalCashId === null || operation.cashRegisterSessionId === binding.originalCashId)
      && (!recovery?.saleId || operation.saleId === recovery.saleId);
    if (!matches) this.errorMessage = "La respuesta no corresponde al contexto original. Conserva la compra y consulta nuevamente.";
    return matches;
  }

  confirmPreparedResume(): void {
    const payload = this.pendingSaleRequest;
    if (!payload || !this.preparedOnServer || this.confirmingSale || this.submitting) return;
    this.confirmingSale = true;
    void this.confirmDialog.confirm({ title: "Reanudar preparación", description: `Se ejecutará esta preparación con su caja e importes originales. Total S/ ${decimalText(moneyCents(payload.confirmedTotal))}.`,
      confirmText: "Reanudar mismo cobro", cancelText: "Conservar", variant: "warning" }).then(ok => { if (ok && this.pendingSaleRequest === payload) this.submitConfirmedSale(payload, true); }).finally(() => this.confirmingSale = false);
  }

  cancelPendingPreparation(): void {
    const recovery = this.receiptRecovery;
    if (!recovery?.operationId || !this.preparedOnServer || this.submitting || this.confirmingSale) return;
    this.confirmingSale = true;
    void this.confirmDialog.confirm({ title: "Cancelar preparación", description: "La identidad quedará cancelada. Podrás revisar el carrito y confirmar una compra nueva de forma explícita.",
      confirmText: "Cancelar preparación", cancelText: "Conservar", variant: "warning" }).then(ok => {
        if (!ok) return; this.submitting = true;
        this.subscriptions.add(this.withVerifiedIdentity(recovery, context => this.saleOperations.cancel(recovery.operationId!, context)).subscribe({
          next: operation => { this.submitting = false; this.onServerOperationCancelled(operation); },
          error: error => { this.submitting = false; this.errorMessage = toHttpErrorMessage(error, "No se pudo cancelar. Consulta el resultado antes de continuar."); },
        }));
      }).finally(() => this.confirmingSale = false);
  }

  onServerOperationCancelled(operation: SaleOperation): void {
    if (operation.state !== "CANCELLED" || this.receiptRecovery?.operationId !== operation.operationId) return;
    if (!this.requireRecoveryBinding() || !this.operationMatchesBinding(operation)) return;
    this.pendingSaleRequest = null; this.receiptRecovery = null; this.preparedOnServer = false; this.preparationMissing = false;
    this.recoveryBinding = null;
    this.pendingPreparedVerified = false;
    this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
    this.warningMessage = "Preparación cancelada. Revisa precios antes de confirmar otra compra."; this.persistDraftState();
  }

  leaveOperationInServer(): void {
    if (this.submitting || !this.receiptRecovery?.operationId) return;
    if (!this.requireRecoveryBinding()) return;
    const recovery = this.receiptRecovery;
    this.submitting = true;
    this.subscriptions.add(this.withVerifiedIdentity(recovery, context => this.saleOperations.get(recovery.operationId!, context)).subscribe({
      next: operation => {
        this.submitting = false;
        if (!this.requireRecoveryBinding() || !this.operationMatchesBinding(operation)) return;
        if (!["PREPARED", "COMPLETED", "CANCELLED", "RESULT_UNAVAILABLE"].includes(operation.state)) return;
        this.pendingSaleRequest = null; this.receiptRecovery = null; this.preparedOnServer = false; this.preparationMissing = false;
        this.cart = []; this.payments = [{ paymentMethod: "CASH", amount: 0, reference: "" }]; this.lastSaleId = null;
        this.recoveryBinding = null;
        this.pendingPreparedVerified = false;
        if (!this.foreignDraftPreserved) this.posStateService.clearAll(); this.warningMessage = "Operación conservada en Operaciones pendientes. Puedes preparar otra compra."; this.errorMessage = "";
      }, error: error => { this.submitting = false; this.errorMessage = toHttpErrorMessage(error, "Verifica primero que la operación está conservada en el servidor."); },
    }));
  }

  private withVerifiedIdentity<T>(recovery: PosReceiptRecovery, request: (context: HttpContext) => Observable<T>): Observable<T> {
    return defer(() => {
      let context: HttpContext;
      const token = this.authService.getToken();
      try {
        context = createBoundAuthContext(token);
      } catch {
        return throwError(() => new BoundAuthSessionError());
      }
      return this.authService.me(context).pipe(
        catchError(() => throwError(() => new BoundAuthSessionError())),
        switchMap(user => {
          if (this.destroyed || this.receiptRecovery !== recovery || !recovery.userId || user.id !== recovery.userId || !this.requireRecoveryBinding()) {
            return throwError(() => new BoundAuthSessionError());
          }
          if (!token || this.authService.getToken() !== token) return throwError(() => new BoundAuthSessionError());
          // A renewed credential may resume only after the original actor was verified again.
          const binding = this.recoveryBinding = { ...this.recoveryBinding!, token };
          return request(context).pipe(map(value => {
            if (this.destroyed || this.authService.getToken() !== token || this.recoveryBinding !== binding || !this.requireRecoveryBinding()) throw new BoundAuthSessionError();
            return value;
          }));
        }),
      );
    });
  }

  private isAuthenticationRecoveryError(error: unknown): boolean {
    return error instanceof BoundAuthSessionError || (error instanceof HttpErrorResponse && [401, 403].includes(error.status));
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
    if (!this.pendingSaleRequest && !this.receiptRecovery) return false;
    this.errorMessage = "Hay un cobro con resultado pendiente. Recupera su resultado antes de modificar o cancelar la venta.";
    return true;
  }

  get showCartVerificationNotice(): boolean {
    return this.cartCheckPhase !== "checking" && !!this.cartVerificationMessage;
  }

  get cartVerificationAnnouncement(): string {
    if (!this.cart.length || this.pendingSaleRequest || this.receiptRecovery || this.pendingOwnerBlocked) return "";
    if (this.cartCheckPhase === "checking") return "Verificando condiciones de la compra…";
    if (this.cartCheckPhase === "idle" && !this.needsRevalidation && !this.checkoutDisabled) return "Puedes revisar el cobro. La venta aún no está confirmada.";
    // Errors and proposals already have their own alert or commercial dialog.
    return "";
  }

  get cartVerificationMessage(): string {
    if (this.pendingSaleRequest || this.receiptRecovery || !this.cart.length || !this.needsRevalidation) return "";
    return this.cartCheckMessage || "Comprueba las condiciones de la compra antes de cobrar. Conservamos tus productos y pagos.";
  }

  private cartVerificationContext(): string {
    return JSON.stringify([this.authService.getToken(), this.currentUserId, this.currentCashSession?.id, this.cashPhase, this.saleForm.value.warehouseId]);
  }
  private cartVerificationFingerprint(): string { return JSON.stringify([this.checkoutFingerprint(), this.cartVerificationContext()]); }
  private cancelCartVerification(): void {
    this.cartCheckGeneration++; this.cartCheckRead.unsubscribe(); this.cartCheckRead = new Subscription();
    this.revalidating = false; this.cartCheckFingerprint = null; this.checkoutAfterVerification = false;
    this.cartCheckContext = null;
    if (this.reviewDialogOpen && this.confirmDialog.currentState?.title === "Se actualizaron condiciones de tu compra") this.confirmDialog.cancel();
    this.reviewDialogOpen = false;
  }

  revalidateCart(continueToCheckout = false): void {
    if (this.preventPendingEdit() || !this.cart.length || this.confirmingSale) return;
    if (this.revalidating && this.cartCheckFingerprint === this.cartVerificationFingerprint()) {
      this.checkoutAfterVerification ||= continueToCheckout; return;
    }
    this.cancelCartVerification();
    const warehouseId = this.saleForm.value.warehouseId, token = this.authService.getToken(), owner = this.currentUserId;
    if (!warehouseId || !token || !owner || !this.currentCashSession || this.cashPhase !== "open") {
      this.cartCheckPhase = "blocked"; this.cartCheckMessage = "Verifica la sesión, la caja abierta y el almacén antes de comprobar la compra."; return;
    }
    this.cart = this.cart.map(item => ({ ...item, requiresRevalidation: true }));
    const original = structuredClone(this.cart), fingerprint = this.cartVerificationFingerprint(), generation = this.cartCheckGeneration;
    this.cartCheckFingerprint = fingerprint; this.checkoutAfterVerification = continueToCheckout;
    this.cartCheckContext = this.cartVerificationContext();
    this.cartCheckPhase = "checking"; this.cartCheckMessage = "Verificando condiciones de la compra…"; this.revalidating = true;
    this.draftReviewMessage = "";
    const valid = () => !this.destroyed && generation === this.cartCheckGeneration && fingerprint === this.cartVerificationFingerprint()
      && !this.pendingSaleRequest && !this.receiptRecovery && !this.pendingOwnerBlocked;
    const stale = () => {
      if (generation !== this.cartCheckGeneration || this.destroyed) return;
      this.cancelCartVerification(); this.cartCheckPhase = "stale";
      this.cartCheckMessage = "La compra o la sesión cambió. La propuesta anterior no se aplicó; comprueba nuevamente.";
    };
    const context = createBoundAuthContext(token);
    this.cartCheckRead.add(this.authService.me(context).pipe(switchMap(actor => {
      if (!valid() || actor.id !== owner) throw new BoundAuthSessionError();
      return this.posService.snapshot(original.map(item => item.productId), warehouseId, context);
    }), timeout(15000)).subscribe({
      next: products => {
        if (!valid()) { stale(); return; }
        this.revalidating = false;
        try {
          const review = reviewCartConditions(original, products);
          if (review.issues.length) {
            this.cartCheckPhase = "blocked"; this.cartCheckMessage = review.issues.join("\n");
            this.cartCheckFingerprint = null; this.checkoutAfterVerification = false; return;
          }
          const apply = () => {
            if (!valid()) { stale(); return; }
            const open = this.checkoutAfterVerification;
            this.cart = review.proposed; this.priceReviewRequired = false; this.draftReviewMessage = "";
            this.restoredDraftTotal = null; this.draftValidationIssues = []; this.errorMessage = "";
            this.cartCheckPhase = "idle"; this.cartCheckMessage = ""; this.cartCheckFingerprint = null;
            this.verifiedCartContext = this.cartVerificationContext(); this.checkoutAfterVerification = false;
            this.persistDraftState();
            if (open) this.isCheckoutModalOpen = true;
            else if (this.reviewDialogOpen) {
              clearTimeout(this.cartFocusTimer);
              this.cartFocusTimer = setTimeout(() => { if (!this.destroyed && !this.isCheckoutModalOpen) this.checkoutLauncher?.nativeElement.focus(); }, 0);
            }
          };
          if (!review.differences.length) { apply(); return; }
          this.cartCheckPhase = "changes"; this.cartCheckMessage = "Hay cambios pendientes. Revisa las condiciones antes de cobrar.";
          let oldTotal = "no verificable"; try { oldTotal = "S/ " + decimalText(posTotalCents(original)); } catch {}
          const total = review.total!, paid = posPaidCents(this.payments), electronic = posPaidCents(this.payments, true);
          const paymentMessage = electronic > total ? "Los pagos electrónicos superan el nuevo total. Corrígelos antes de cobrar."
            : paid < total ? "Saldo pendiente: S/ " + decimalText(total - paid) : "Vuelto previsto: S/ " + decimalText(paid - total);
          this.reviewDialogOpen = true;
          void this.confirmDialog.confirm({ title: "Se actualizaron condiciones de tu compra",
            description: review.differences.join("\n") + "\nTotal anterior: " + oldTotal + ". Total propuesto: S/ " + decimalText(total)
              + ".\nCantidades, descuentos y pagos se conservan. " + paymentMessage + "\nSin aplicar los cambios, el cobro seguirá pendiente de verificación.",
            confirmText: "Actualizar carrito con condiciones vigentes", cancelText: "Volver al carrito sin aplicar cambios", variant: "info"
          }).then(accepted => {
            if (!valid()) { stale(); return; }
            if (accepted) apply();
            else {
              this.cartCheckFingerprint = null; this.checkoutAfterVerification = false;
              clearTimeout(this.cartFocusTimer);
              this.cartFocusTimer = setTimeout(() => { if (!this.destroyed && !this.isCheckoutModalOpen) this.priceReviewButtonRef?.nativeElement.focus(); }, 0);
            }
          })
            .finally(() => { if (generation === this.cartCheckGeneration) this.reviewDialogOpen = false; });
        } catch { this.cartCheckPhase = "error"; this.cartCheckMessage = "No pudimos verificar tu compra. Conservamos tus productos y pagos. Vuelve a comprobar las condiciones antes de cobrar"; this.cartCheckFingerprint = null; this.checkoutAfterVerification = false; }
      },
      error: () => {
        if (!valid()) { stale(); return; }
        this.revalidating = false; this.cartCheckPhase = "error"; this.cartCheckFingerprint = null; this.checkoutAfterVerification = false;
        this.cartCheckMessage = "No pudimos verificar tu compra. Conservamos tus productos y pagos. Vuelve a comprobar las condiciones antes de cobrar";
      }
    }));
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

  get receiptRecoveryMessage(): string {
    const context = this.receiptRecovery;
    if (!context) return "Hay un cobro pendiente. Recupera la misma operación antes de continuar.";
    if (context.receiptType === "UNKNOWN") return context.saleId
      ? "Venta registrada. La intención original del comprobante es desconocida. Revisa Comprobantes; no se emitirá automáticamente."
      : "La intención original del comprobante es desconocida. Recupera la misma venta y revisa Comprobantes; no se emitirá automáticamente.";
    if (context.creationState === "CONFIRMED") return "Venta registrada. Comprobante localizado; esto no confirma su aceptación fiscal. Conserva su referencia y finaliza la recuperación.";
    if (context.creationState === "POSSIBLY_SENT") return "Venta registrada; la creación del comprobante tiene resultado incierto. Consulta su estado. No se reenviará automáticamente.";
    if (context.creationState === "REVIEW_REQUIRED") return "Los datos del comprobante requieren revisión. La venta se conserva; revisa Comprobantes antes de continuar.";
    return context.receiptType === "TICKET" ? "Venta registrada. Finaliza la recuperación del ticket interno."
      : "Venta registrada. Comprobante pendiente de creación: continúa para crear su borrador con los datos confirmados originalmente.";
  }

  private receiptRecoveryOwnerMatches(): boolean {
    const context = this.receiptRecovery;
    return !!context && !!this.currentUserId && context.userId === this.currentUserId
      && !!context.operationId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(context.operationId)
      && (!this.pendingSaleRequest || this.pendingSaleRequest.operationId === context.operationId);
  }

  private continueReceiptRecovery(saleNumber?: string): void {
    const context = this.receiptRecovery;
    if (!context?.saleId || !this.receiptRecoveryOwnerMatches() || !this.requireRecoveryBinding()) { this.submitting = false; return; }
    this.lastSaleId = context.saleId;
    if (context.receiptType === "TICKET" && context.creationState === "NOT_STARTED") {
      if (saleNumber) this.completeReceiptRecovery(`Venta ${saleNumber} registrada correctamente.`);
      else {
        this.submitting = true;
        this.subscriptions.add(this.withVerifiedIdentity(context, authContext => this.saleOperations.get(context.operationId!, authContext)).subscribe({
          next: operation => {
            this.submitting = false;
            if (!this.operationMatchesBinding(operation) || operation.state !== "COMPLETED" || operation.receiptState !== "NOT_REQUIRED"
                || operation.receiptIntent?.receiptType !== "TICKET") { this.errorMessage = "No se pudo verificar la finalización de esta operación. Consulta su estado."; return; }
            this.completeReceiptRecovery(`Venta #${context.saleId} registrada correctamente.`);
          },
          error: error => { this.submitting = false; this.errorMessage = toHttpErrorMessage(error, "No se pudo comprobar la operación. La compra se conserva."); },
        }));
      }
    } else if (context.creationState === "CONFIRMED") {
      this.queryReceiptResult();
    } else if (context.creationState === "NOT_STARTED" && context.payload) {
      if (saleNumber || this.durableReceiptChecked) this.issueElectronicDocumentFromSale();
      else this.queryReceiptResult();
    } else if (context.receiptType !== "UNKNOWN" && context.payload) {
      this.queryReceiptResult();
    } else {
      this.submitting = false;
      this.successMessage = "";
      this.warningMessage = this.receiptRecoveryMessage;
      this.showGoToBillingAction = true;
    }
  }

  private completeReceiptRecovery(message: string): void {
    this.submitting = false;
    if (!this.requireRecoveryBinding()) return;
    this.persistDraftState();
    this.warningMessage = "";
    this.successMessage = message;
    this.showGoToBillingAction = false;
    this.resetDraftAfterCheckout(true);
  }

  private issueElectronicDocumentFromSale(): void {
    const context = this.receiptRecovery;
    if (!context?.saleId || !context.payload || context.creationState !== "NOT_STARTED"
        || !this.receiptRecoveryOwnerMatches()) { this.submitting = false; return; }
    this.submitting = true;
    this.subscriptions.add(this.withVerifiedIdentity(context, authContext => {
      this.receiptRecovery = immutableReceiptRecovery({ ...context, creationState: "POSSIBLY_SENT" });
      this.persistDraftState();
      return this.electronicDocumentService.createFromSale(context.saleId!, context.payload!, authContext);
    }).subscribe({
      next: document => this.acceptRecoveredDocument(document, context),
      error: error => {
        this.submitting = false;
        this.successMessage = "";
        this.warningMessage = this.isAuthenticationRecoveryError(error) ? new BoundAuthSessionError().message : this.receiptRecoveryMessage;
        this.showGoToBillingAction = true;
        // The durable marker is intentionally kept: a failed response is not proof of absence.
        if (!this.isAuthenticationRecoveryError(error)) this.queryReceiptResult();
      },
    }));
  }

  private queryReceiptResult(): void {
    const context = this.receiptRecovery;
    if (!context?.saleId || !context.operationId || !this.receiptRecoveryOwnerMatches()) return;
    this.submitting = true;
    this.subscriptions.add(this.withVerifiedIdentity(context, authContext =>
      this.saleOperations.get(context.operationId!, authContext)).subscribe({
      next: operation => {
        if (!this.operationMatchesBinding(operation)) { this.submitting = false; return; }
        const sameOperation = operation.operationId === context.operationId && operation.saleId === context.saleId && operation.state === "COMPLETED";
        const serverIntent = operation.receiptIntent;
        const normalized = (value: string | null | undefined) => value?.trim() || null;
        const samePendingIntent = sameOperation && operation.receiptState === "PENDING" && operation.documentId === null
          && serverIntent?.receiptType === context.receiptType && serverIntent.payload !== null
          && serverIntent.payload.documentType === context.payload?.documentType
          && serverIntent.payload.billingSeriesId === context.payload?.billingSeriesId
          && normalized(serverIntent.payload.customerName) === normalized(context.payload?.customerName)
          && normalized(serverIntent.payload.customerDocument) === normalized(context.payload?.customerDocument);
        this.durableReceiptChecked = samePendingIntent;
        if (operation.operationId === context.operationId && operation.saleId === context.saleId && operation.state === "COMPLETED"
            && operation.receiptState === "LOCATED" && operation.documentId && operation.documentStatus
            && (context.documentId === null || context.documentId === operation.documentId)
            && operation.receiptIntent?.receiptType === context.receiptType
            && ["DRAFT", "GENERATED", "SIGNED", "SENT", "ACCEPTED", "REJECTED", "ERROR"].includes(operation.documentStatus)) {
          this.receiptRecovery = immutableReceiptRecovery({ ...context, documentId: operation.documentId, creationState: "CONFIRMED" });
          this.completeReceiptRecovery(`Venta #${context.saleId} registrada; comprobante #${operation.documentId} localizado (estado: ${operation.documentStatus}).${operation.documentStatus === 'DRAFT' ? ' Borrador pendiente de procesamiento fiscal.' : ' Localizarlo no confirma aceptación fiscal.'}`);
        } else {
          this.submitting = false;
          this.successMessage = "";
          if (sameOperation && !samePendingIntent && context.creationState === "NOT_STARTED") {
            this.receiptRecovery = immutableReceiptRecovery({ ...context, creationState: "REVIEW_REQUIRED" });
            this.persistDraftState();
          }
          this.warningMessage = samePendingIntent && context.creationState === "NOT_STARTED"
            ? "Venta confirmada. El servidor conserva la intención del comprobante, aún sin documento vinculado. Crear su borrador requiere otra acción explícita; conserva esta referencia si existe incertidumbre."
            : "No se encontró un comprobante compatible de forma inequívoca. El resultado sigue pendiente; revisa Comprobantes. No se repetirá su creación.";
          this.showGoToBillingAction = true;
        }
      },
      error: error => {
        this.submitting = false;
        this.successMessage = "";
        this.durableReceiptChecked = false;
        this.warningMessage = this.isAuthenticationRecoveryError(error) ? new BoundAuthSessionError().message
          : "No se pudo consultar el comprobante. La operación sigue conservada; revisa Comprobantes antes de continuar.";
        this.showGoToBillingAction = true;
      },
    }));
  }

  private receiptDocumentMatches(document: ElectronicDocumentResponse, context: PosReceiptRecovery): boolean {
    const payload = context.payload;
    const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
    return !!document && !!payload && Number.isSafeInteger(document.id) && document.id > 0
      && (context.documentId === null || document.id === context.documentId)
      && document.saleId === context.saleId && document.documentType === payload.documentType
      && document.billingSeriesId === payload.billingSeriesId
      && typeof document.fullNumber === "string" && !!document.fullNumber.trim()
      && ["DRAFT", "GENERATED", "SIGNED", "SENT", "ACCEPTED", "REJECTED", "ERROR"].includes(document.status)
      && typeof document.customerName === "string" && !!document.customerName.trim()
      && (document.customerDocument === null || typeof document.customerDocument === "string")
      && text(document.customerName) === (text(payload.customerName) ?? "CONSUMIDOR FINAL")
      && text(document.customerDocument) === text(payload.customerDocument);
  }

  private acceptRecoveredDocument(document: ElectronicDocumentResponse, context: PosReceiptRecovery): void {
    if (!this.receiptRecoveryOwnerMatches() || this.receiptRecovery?.operationId !== context.operationId
        || !this.receiptDocumentMatches(document, context)) {
      this.submitting = false;
      this.warningMessage = "La respuesta del comprobante contiene datos incompatibles. Conserva la operación y revisa Comprobantes.";
      this.showGoToBillingAction = true;
      return;
    }
    this.receiptRecovery = immutableReceiptRecovery({ ...context, creationState: "CONFIRMED", documentId: document.id });
    const result = document.status === "DRAFT"
      ? `comprobante ${document.fullNumber} ${context.creationState === "NOT_STARTED" ? "creado como borrador" : "recuperado como borrador"}. Pendiente de procesamiento fiscal`
      : `comprobante ${document.fullNumber} localizado (estado: ${document.status}). Localizarlo no confirma su aceptación fiscal`;
    this.completeReceiptRecovery(`Venta #${context.saleId} registrada: ${result}.`);
  }

  private buildElectronicDocumentPayload(): CreateElectronicDocumentFromSaleRequest | null {
    if (this.receiptType === "TICKET") {
      return null;
    }

    const seriesId = Number(this.receiptSeriesId);
    if (!Number.isSafeInteger(seriesId) || seriesId <= 0) {
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
