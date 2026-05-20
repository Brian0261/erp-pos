export interface ProductCleanupPreviewRequest {
  productIds?: number[];
  skus?: string[];
}

export interface ProductCleanupExecuteRequest extends ProductCleanupPreviewRequest {
  confirmationText: string;
}

export interface ProductCleanupPreviewResponse {
  requestedProductIds: number[];
  requestedSkus: string[];
  notFoundProductIds: number[];
  notFoundSkus: string[];
  foundProducts: ProductCleanupProductPreview[];
  relatedSales: ProductCleanupSalePreview[];
  relatedSaleItems: ProductCleanupSaleItemPreview[];
  relatedSalePayments: ProductCleanupSalePaymentPreview[];
  stockBalances: ProductCleanupStockBalancePreview[];
  inventoryMovements: ProductCleanupInventoryMovementPreview[];
  stockTransferItems: ProductCleanupStockTransferItemPreview[];
  quoteItems: ProductCleanupQuoteItemPreview[];
  purchaseOrderItems: ProductCleanupPurchaseOrderItemPreview[];
  purchaseReceiptItems: ProductCleanupPurchaseReceiptItemPreview[];
  electronicDocumentItems: ProductCleanupElectronicDocumentItemPreview[];
  purgeable: boolean;
  warnings: string[];
  blockers: string[];
  summary: ProductCleanupSummary;
}

export interface ProductCleanupProductPreview {
  productId: number;
  sku: string | null;
  barcode: string | null;
  name: string;
  active: boolean;
  purgeCandidate: boolean;
  blocked: boolean;
  warnings: string[];
  blockers: string[];
}

export interface ProductCleanupSalePreview {
  saleId: number;
  saleNumber: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  itemCount: number;
  selectedItemCount: number;
  nonSelectedItemCount: number;
  paymentCount: number;
  pureSale: boolean;
  mixedSale: boolean;
}

export interface ProductCleanupSaleItemPreview {
  saleItemId: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  selectedProduct: boolean;
}

export interface ProductCleanupSalePaymentPreview {
  salePaymentId: number;
  saleId: number;
  paymentMethod: string;
  amount: number;
  reference: string | null;
}

export interface ProductCleanupStockBalancePreview {
  stockBalanceId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export interface ProductCleanupInventoryMovementPreview {
  inventoryMovementId: number;
  productId: number;
  warehouseId: number;
  movementType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
}

export interface ProductCleanupStockTransferItemPreview {
  stockTransferItemId: number;
  transferId: number;
  productId: number;
  quantity: number;
}

export interface ProductCleanupQuoteItemPreview {
  quoteItemId: number;
  quoteId: number;
  quoteNumber: string;
  status: string;
  convertedSaleId: number | null;
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface ProductCleanupPurchaseOrderItemPreview {
  purchaseOrderItemId: number;
  purchaseOrderId: number;
  status: string;
  productId: number;
  quantityOrdered: number;
  quantityReceived: number;
  lineTotal: number;
}

export interface ProductCleanupPurchaseReceiptItemPreview {
  purchaseReceiptItemId: number;
  purchaseReceiptId: number;
  purchaseOrderId: number;
  purchaseOrderItemId: number;
  productId: number;
  quantityReceived: number;
}

export interface ProductCleanupElectronicDocumentItemPreview {
  electronicDocumentItemId: number;
  electronicDocumentId: number;
  saleId: number;
  fullNumber: string;
  status: string;
  productId: number;
  description: string;
  lineTotal: number;
}

export interface ProductCleanupSummary {
  totalProducts: number;
  foundProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  relatedSales: number;
  mixedSales: number;
  pureSales: number;
  relatedInventoryMovements: number;
  relatedDocuments: number;
  purgeable: boolean;
  warnings: string[];
  blockers: string[];
}

export interface ProductCleanupExecuteResponse {
  deletedProductIds: number[];
  deletedSaleIds: number[];
  deletedProducts: number;
  deletedSales: number;
  deletedSaleItems: number;
  deletedSalePayments: number;
  deletedQuoteItems: number;
  deletedPurchaseOrderItems: number;
  deletedPurchaseReceiptItems: number;
  deletedStockTransferItems: number;
  deletedStockBalances: number;
  deletedInventoryMovements: number;
}
