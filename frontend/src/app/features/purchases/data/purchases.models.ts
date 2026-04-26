export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface SupplierResponse {
  id: number;
  documentNumber: string | null;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierCreateRequest {
  documentNumber: string | null;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface SupplierUpdateRequest extends SupplierCreateRequest {
  active?: boolean | null;
}

export interface PurchaseOrderItemRequest {
  productId: number;
  quantityOrdered: number;
  unitCost: number;
}

export interface PurchaseOrderCreateRequest {
  supplierId: number;
  warehouseId: number;
  orderDate?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemRequest[];
}

export interface PurchaseOrderUpdateRequest {
  supplierId: number;
  warehouseId: number;
  expectedDate?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemRequest[];
}

export interface ReceivePurchaseItemRequest {
  purchaseOrderItemId: number;
  quantityReceived: number;
}

export interface ReceivePurchaseOrderRequest {
  receiptDate?: string | null;
  notes?: string | null;
  items: ReceivePurchaseItemRequest[];
}

export interface PurchaseOrderItemResponse {
  id: number;
  productId: number;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrderResponse {
  id: number;
  supplierId: number;
  warehouseId: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemResponse[];
}

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  supplierId?: number;
  from?: string;
  to?: string;
}
