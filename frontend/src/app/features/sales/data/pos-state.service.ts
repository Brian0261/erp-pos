import { Injectable } from "@angular/core";

import { PosProductResponse, PaymentMethod } from "./sales.models";

export interface PosCartItemState {
  productId: number;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: number;
  stockAvailable: number;
  quantity: number;
  discountAmount: number;
}

export interface PosPaymentState {
  paymentMethod: PaymentMethod;
  amount: number;
  reference: string;
}

export interface PosDraftState {
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

    return this.normalizeState(rawState);
  }

  save(state: PosDraftState): void {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.normalizeState(state)),
      );
    } catch {
      // Ignore storage failures and keep the POS functional.
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

  private normalizeState(rawState: unknown): PosDraftState {
    const state = (rawState ?? {}) as Partial<PosDraftState>;

    return {
      userId: this.normalizeNullableString(state.userId),
      cashRegisterSessionId: this.normalizeNullableNumber(
        state.cashRegisterSessionId,
      ),
      warehouseId: this.normalizeNullableNumber(state.warehouseId),
      lastWarehouseId: this.normalizeNullableNumber(state.lastWarehouseId),
      code: this.normalizeString(state.code),
      query: this.normalizeString(state.query),
      searchResults: this.normalizeSearchResults(state.searchResults),
      cart: this.normalizeCart(state.cart),
      payments: this.normalizePayments(state.payments),
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
      quantity: Math.max(Math.floor(this.normalizeNumber(item?.quantity)), 1),
      discountAmount: Math.max(this.normalizeNumber(item?.discountAmount), 0),
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
      amount: Math.max(this.normalizeNumber(item?.amount), 0),
      reference: this.normalizeString(item?.reference),
    }));
  }

  private normalizeString(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private normalizeNullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }

  private normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizePaymentMethod(value: unknown): PaymentMethod {
    if (value === "CASH" || value === "CARD" || value === "TRANSFER") {
      return value;
    }

    return "CASH";
  }
}
