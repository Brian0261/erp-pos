import { Injectable } from "@angular/core";

import { PosProductResponse, PaymentMethod, CreateSaleRequest } from "./sales.models";
import { PaymentLine, PosCartItem } from "./pos-ui.models";
import { posLineCents, posPaidCents, posTotalCents } from "../utils/pos-calculations";
import { decimalText, isQuantityPolicy, moneyCents, quantityHundredths, stockMillis } from "../utils/pos-decimal";

export interface PosCartItemState extends PosCartItem {}

export interface PosPaymentState extends PaymentLine {}

export interface PosDraftState {
  pendingSaleRequest?: CreateSaleRequest | null;
  formatVersion?: number;
  sourceFormatVersion?: number;
  requiresRevalidation?: boolean;
  validationIssues?: string[];
  preliminaryTotal?: string | null;
  userId: string | null;
  cashRegisterSessionId: number | null;
  warehouseId: number | null;
  lastWarehouseId: number | null;
  code: string;
  query: string;
  searchResults: PosProductResponse[];
  cart: PosCartItemState[];
  payments: PosPaymentState[];
  lastSaleId: number | null;
}

const STORAGE_KEY = "erp_pos_sales_draft_v1";
export const POS_DRAFT_FORMAT_VERSION = 2;

const EMPTY_STATE: PosDraftState = {
  userId: null,
  cashRegisterSessionId: null,
  warehouseId: null,
  lastWarehouseId: null,
  code: "",
  query: "",
  searchResults: [],
  cart: [],
  payments: [],
  lastSaleId: null,
};

@Injectable({ providedIn: "root" })
export class PosStateService {
  load(): PosDraftState | null {
    const rawState = this.readRawState();
    if (!rawState) {
      return null;
    }

    return this.normalizeState(rawState, true);
  }

  save(state: PosDraftState): boolean {
    try {
      const normalized = this.normalizeState(state, false);
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...normalized,
          formatVersion: POS_DRAFT_FORMAT_VERSION,
          // Decimal text survives JSON without losing invalid inputs or precision.
          cart: normalized.cart.map(item => ({ ...item,
            salePrice: String(item.salePriceInput ?? item.salePrice),
            stockAvailable: String(item.stockInput ?? item.stockAvailable),
            quantity: String(item.quantityInput ?? item.quantity),
            discountAmount: String(item.discountInput ?? item.discountAmount),
          })),
          payments: normalized.payments.map(payment => ({ ...payment,
            amount: String(payment.amountInput ?? payment.amount),
          })),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  clearAll(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  clearDraft(preserveLastSaleId = false): void {
    const currentState = this.load();
    if (!currentState) {
      return;
    }

    this.save({
      ...EMPTY_STATE,
      lastWarehouseId: currentState.lastWarehouseId,
      lastSaleId: preserveLastSaleId ? currentState.lastSaleId : null,
    });
  }

  private readRawState(): unknown | null {
    try {
      const rawState = sessionStorage.getItem(STORAGE_KEY);
      return rawState ? JSON.parse(rawState) : null;
    } catch {
      return null;
    }
  }

  private normalizeState(rawState: unknown, restored: boolean): PosDraftState {
    const state = (rawState ?? {}) as Partial<PosDraftState>;
    const cart = this.normalizeCart(state.cart);
    const payments = this.normalizePayments(state.payments);
    const issues = Array.isArray(state.validationIssues)
      ? state.validationIssues.filter((issue): issue is string => typeof issue === "string") : [];
    const formatVersion = Number.isInteger(state.formatVersion) ? state.formatVersion : 0;
    const sourceFormatVersion = Number.isInteger(state.sourceFormatVersion) ? state.sourceFormatVersion : formatVersion;
    if ((formatVersion !== POS_DRAFT_FORMAT_VERSION || sourceFormatVersion !== POS_DRAFT_FORMAT_VERSION) && cart.length) {
      issues.push("Borrador antiguo o de formato no compatible: requiere revisión.");
    }
    for (const item of cart) {
      try {
        if (!Number.isSafeInteger(item.productId) || item.productId <= 0) throw new Error("Producto no válido en el borrador.");
        posLineCents(item);
        if (quantityHundredths(item.quantityInput ?? item.quantity, item.quantityPolicy) * 10n >
            stockMillis(item.stockInput ?? item.stockAvailable)) throw new Error("Cantidad superior al stock guardado; revisa el borrador.");
      } catch (error) { issues.push(error instanceof Error ? error.message : "Línea no válida en el borrador."); }
    }
    let computedTotal: string | null = null;
    try { computedTotal = decimalText(posTotalCents(cart)); posPaidCents(payments); }
    catch (error) { issues.push(error instanceof Error ? error.message : "Importes no válidos en el borrador."); }
    const preliminaryTotal = state.preliminaryTotal === undefined ? computedTotal : state.preliminaryTotal;
    try {
      if (preliminaryTotal !== null && (computedTotal === null || moneyCents(preliminaryTotal) !== moneyCents(computedTotal))) {
        issues.push("El total guardado no concilia con las líneas; revisa el borrador.");
      }
    } catch { issues.push("El total guardado no es un importe válido; revisa el borrador."); }
    return {
      pendingSaleRequest: state.pendingSaleRequest ? structuredClone(state.pendingSaleRequest) : null,
      formatVersion,
      sourceFormatVersion,
      requiresRevalidation: Boolean(state.requiresRevalidation) || (restored && cart.length > 0) || issues.length > 0,
      validationIssues: [...new Set(issues)],
      preliminaryTotal,
      userId: this.normalizeNullableString(state.userId),
      cashRegisterSessionId: this.normalizeNullableNumber(
        state.cashRegisterSessionId,
      ),
      warehouseId: this.normalizeNullableNumber(state.warehouseId),
      lastWarehouseId: this.normalizeNullableNumber(state.lastWarehouseId),
      code: this.normalizeString(state.code),
      query: this.normalizeString(state.query),
      searchResults: this.normalizeSearchResults(state.searchResults),
      cart,
      payments,
      lastSaleId: this.normalizeNullableNumber(state.lastSaleId),
    };
  }

  private normalizeSearchResults(
    value: PosProductResponse[] | undefined,
  ): PosProductResponse[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => ({
      productId: this.normalizeNumber(item?.productId),
      sku: this.normalizeString(item?.sku),
      barcode: this.normalizeNullableString(item?.barcode),
      name: this.normalizeString(item?.name),
      salePrice: this.normalizeNumber(item?.salePrice),
      stockAvailable: this.normalizeNumber(item?.stockAvailable),
      quantityPolicy: isQuantityPolicy(item?.quantityPolicy) ? item.quantityPolicy : undefined,
    }));
  }

  private normalizeCart(value: PosCartItemState[] | undefined): PosCartItemState[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => ({
      productId: this.normalizeNumber(item?.productId),
      sku: this.normalizeString(item?.sku),
      barcode: this.normalizeNullableString(item?.barcode),
      name: this.normalizeString(item?.name),
      salePrice: this.normalizeNumber(item?.salePrice),
      stockAvailable: this.normalizeNumber(item?.stockAvailable),
      quantity: this.normalizeNumber(item?.quantity),
      discountAmount: this.normalizeNumber(item?.discountAmount),
      quantityPolicy: isQuantityPolicy(item?.quantityPolicy) ? item.quantityPolicy : undefined,
      quantityInput: this.preserveInput(item?.quantityInput, item?.quantity),
      discountInput: this.preserveInput(item?.discountInput, item?.discountAmount),
      salePriceInput: this.preserveInput(item?.salePriceInput, item?.salePrice),
      stockInput: this.preserveInput(item?.stockInput, item?.stockAvailable),
      requiresRevalidation: item?.requiresRevalidation,
    }));
  }

  private normalizePayments(
    value: PosPaymentState[] | undefined,
  ): PosPaymentState[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => ({
      paymentMethod: this.normalizePaymentMethod(item?.paymentMethod),
      amount: this.normalizeNumber(item?.amount),
      reference: this.normalizeString(item?.reference),
      amountInput: this.preserveInput(item?.amountInput, item?.amount),
    }));
  }

  private normalizeString(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private normalizeNullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }

  private normalizeNumber(value: unknown): number {
    if (typeof value === "number") return value;
    return typeof value === "string" && value.trim() ? Number(value) : NaN;
  }

  private preserveInput(explicit: unknown, value: unknown): string | undefined {
    if (typeof explicit === "string") return explicit;
    return typeof value === "string" ? value : undefined;
  }

  private normalizeNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizePaymentMethod(value: unknown): PaymentMethod {
    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      return value;
    }

    // Preserve an unknown method as invalid rather than turning it into cash.
    return (typeof value === "string" ? value : "") as PaymentMethod;
  }
}
