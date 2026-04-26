export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELLED";

export type QuotePaymentMethod = "CASH" | "CARD" | "TRANSFER";

export interface QuoteItemRequest {
  productId: number;
  quantity: number;
  discountAmount?: number | null;
}

export interface QuoteItemResponse {
  id: number | null;
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface QuoteResponse {
  id: number;
  quoteNumber: string;
  customerName: string;
  customerDocument: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  status: QuoteStatus;
  issueDate: string;
  expiresAt: string;
  sentAt: string | null;
  convertedSaleId: number | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  createdBy: string;
  items: QuoteItemResponse[];
}

export interface QuoteHistoryResponse {
  id: number;
  previousStatus: QuoteStatus | null;
  newStatus: QuoteStatus;
  comment: string | null;
  changedAt: string;
  changedBy: string;
}

export interface CreateQuoteRequest {
  customerName: string;
  customerDocument?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  issueDate?: string | null;
  expiresAt: string;
  notes?: string | null;
  items: QuoteItemRequest[];
}

export interface UpdateQuoteRequest {
  customerName: string;
  customerDocument?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  expiresAt: string;
  notes?: string | null;
  items: QuoteItemRequest[];
}

export interface SendQuoteRequest {
  comment?: string | null;
}

export interface CancelQuoteRequest {
  comment?: string | null;
}

export interface QuotePaymentRequest {
  paymentMethod: QuotePaymentMethod;
  amount: number;
  reference?: string | null;
}

export interface ConvertQuoteToSaleRequest {
  warehouseId: number;
  comment?: string | null;
  payments: QuotePaymentRequest[];
}

export interface QuoteListFilters {
  status?: QuoteStatus | null;
  customerQuery?: string | null;
  from?: string | null;
  to?: string | null;
}
