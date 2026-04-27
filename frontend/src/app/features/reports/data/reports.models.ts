export interface DateRangeFilters {
  from?: string | null;
  to?: string | null;
}

export interface PaymentMethodAmountResponse {
  paymentMethod: string;
  amount: number;
}

export interface SalesByDayResponse {
  day: string;
  totalAmount: number;
  salesCount: number;
}

export interface SalesReportResponse {
  totalSalesAmount: number;
  totalSalesCount: number;
  averageTicket: number;
  voidedSalesCount: number;
  salesByPaymentMethod: PaymentMethodAmountResponse[];
  salesByDay: SalesByDayResponse[];
}

export type CashRegisterStatus = "OPEN" | "CLOSED";

export interface CashRegisterReportResponse {
  openingAmount: number;
  countedAmount: number;
  expectedCashAmount: number;
  differenceAmount: number;
  totalSales: number;
  salesByPaymentMethod: PaymentMethodAmountResponse[];
  openedAt: string;
  closedAt: string | null;
  status: CashRegisterStatus;
}

export interface LowStockItemResponse {
  productId: number;
  sku: string;
  barcode: string | null;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  currentStock: number;
  threshold: number;
}

export interface InventoryMovementReportItemResponse {
  movementType: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
  createdBy: string | null;
}

export interface InventoryMovementsFilters extends DateRangeFilters {
  productId?: number | null;
  warehouseId?: number | null;
}

export interface SupplierPurchaseAmountResponse {
  supplierId: number;
  supplierName: string;
  amount: number;
}

export interface PurchasesReportResponse {
  totalPurchaseAmount: number;
  purchaseOrderCount: number;
  receivedOrdersCount: number;
  purchasesBySupplier: SupplierPurchaseAmountResponse[];
}

export interface PurchasesReportFilters extends DateRangeFilters {
  supplierId?: number | null;
}

export interface TopProductReportItemResponse {
  productId: number;
  sku: string;
  barcode: string | null;
  productName: string;
  quantitySold: number;
  totalAmount: number;
}

export interface TopProductsFilters extends DateRangeFilters {
  limit?: number | null;
}

export interface QuotesReportResponse {
  totalQuotes: number;
  convertedQuotes: number;
  cancelledQuotes: number;
  conversionRate: number;
  totalConvertedAmount: number;
}

export type ReportsElectronicDocumentStatus =
  | "DRAFT"
  | "GENERATED"
  | "SIGNED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "ERROR"
  | "CANCELLED";

export interface DocumentTypeCountResponse {
  documentType: string;
  count: number;
}

export interface ElectronicDocumentsReportResponse {
  totalDocuments: number;
  acceptedCount: number;
  rejectedCount: number;
  errorCount: number;
  totalAmount: number;
  documentsByType: DocumentTypeCountResponse[];
}

export interface ElectronicDocumentsReportFilters extends DateRangeFilters {
  status?: ReportsElectronicDocumentStatus | null;
}

export const REPORT_ELECTRONIC_DOCUMENT_STATUSES: ReportsElectronicDocumentStatus[] =
  [
    "DRAFT",
    "GENERATED",
    "SIGNED",
    "SENT",
    "ACCEPTED",
    "REJECTED",
    "ERROR",
    "CANCELLED",
  ];
