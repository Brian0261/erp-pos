import { PaymentMethod } from "./sales.models";

export interface PosCartItem {
  productId: number;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: number;
  stockAvailable: number;
  quantity: number;
  discountAmount: number;
}

export interface PaymentLine {
  paymentMethod: PaymentMethod;
  amount: number;
  reference: string;
}

export type PosReceiptType = "TICKET" | "RECEIPT" | "INVOICE";
