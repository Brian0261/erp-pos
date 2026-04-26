export type CashRegisterStatus = "OPEN" | "CLOSED";

export interface CashRegisterResponse {
  id: number;
  openedByUserId: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  countedAmount: number | null;
  expectedCashAmount: number | null;
  differenceAmount: number | null;
  status: CashRegisterStatus;
  notes: string | null;
}

export interface OpenCashRegisterRequest {
  openingAmount: number;
  notes?: string | null;
}

export interface CloseCashRegisterRequest {
  countedAmount: number;
  notes?: string | null;
}

export interface PosProductResponse {
  productId: number;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: number;
  stockAvailable: number;
}

export type SaleStatus = "COMPLETED" | "VOIDED";

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export interface SaleItemResponse {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface SalePaymentResponse {
  id: number;
  paymentMethod: PaymentMethod;
  amount: number;
  reference: string | null;
  createdAt: string;
}

export interface SaleResponse {
  id: number;
  cashRegisterSessionId: number;
  warehouseId: number;
  saleNumber: string;
  status: SaleStatus;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  soldAt: string;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReason: string | null;
  createdBy: string;
  items: SaleItemResponse[];
  payments: SalePaymentResponse[];
}

export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
  discountAmount?: number;
}

export interface CreateSalePaymentRequest {
  paymentMethod: PaymentMethod;
  amount: number;
  reference?: string | null;
}

export interface CreateSaleRequest {
  warehouseId: number;
  items: CreateSaleItemRequest[];
  payments: CreateSalePaymentRequest[];
}

export interface VoidSaleRequest {
  reason: string;
}

export interface SalesFilters {
  from?: string;
  to?: string;
  cashRegisterSessionId?: number;
  status?: SaleStatus;
  createdBy?: string;
}
