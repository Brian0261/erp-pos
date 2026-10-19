import { PaymentMethod } from "./sales.models";
import { QuantityPolicy } from "../../catalog/data/catalog.models";

export interface PosCartItem {
  productId: number;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: number;
  stockAvailable: number;
  quantity: number;
  discountAmount: number;
  quantityPolicy?: QuantityPolicy;
  quantityInput?: string;
  discountInput?: string;
  salePriceInput?: string;
  stockInput?: string;
  requiresRevalidation?: boolean;
}

export interface PaymentLine {
  paymentMethod: PaymentMethod;
  amount: number;
  reference: string;
  amountInput?: string;
}

export type PosReceiptType = "TICKET" | "RECEIPT" | "INVOICE";
