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

export type BillingDocumentType = "INVOICE" | "RECEIPT";

export type BillingDocumentStatus =
  | "DRAFT"
  | "GENERATED"
  | "SIGNED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "ERROR"
  | "CANCELLED";

export type BillingEnvironment = "LOCAL" | "BETA" | "PROD";

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export interface SaleItemResponse {
  id: number;
  productId: number;
  productName: string | null;
  sku: string | null;
  barcode: string | null;
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

export interface BillingSummary {
  hasElectronicDocument: boolean;
  documentId: number | null;
  documentType: BillingDocumentType | null;
  fullNumber: string | null;
  status: BillingDocumentStatus | null;
  environment: BillingEnvironment | null;
}

export interface SalesListItem {
  id: number;
  saleNumber: string;
  soldAt: string;
  status: SaleStatus;
  totalAmount: number;
  createdBy: string;
  cashRegisterSessionId: number;
  billingSummary: BillingSummary;
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
