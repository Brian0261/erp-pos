export type WarehouseType = "STORE" | "MAIN_WAREHOUSE" | "VIRTUAL";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface WarehouseResponse {
  id: number;
  code: string;
  name: string;
  type: WarehouseType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseCreateRequest {
  code: string;
  name: string;
  type: WarehouseType;
}

export interface StockResponse {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  version: number;
  updatedAt: string;
}

export interface InventoryMovementResponse {
  id: number;
  productId: number;
  warehouseId: number;
  movementType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface InitialStockRequest {
  productId: number;
  warehouseId: number;
  quantity: number;
  reason: string;
}

export type AdjustmentType = "IN" | "OUT";

export interface AdjustmentRequest {
  productId: number;
  warehouseId: number;
  quantity: number;
  type: AdjustmentType;
  reason: string;
}

export interface TransferItemRequest {
  productId: number;
  quantity: number;
}

export interface TransferRequest {
  sourceWarehouseId: number;
  targetWarehouseId: number;
  reason: string;
  items: TransferItemRequest[];
}

export interface StockTransferResponse {
  id: number;
  sourceWarehouseId: number;
  targetWarehouseId: number;
  status: string;
  reason: string;
  createdAt: string;
  createdBy: string | null;
}

export interface StockFilters {
  productId?: number;
  warehouseId?: number;
  page?: number;
  size?: number;
}

export interface KardexFilters {
  productId?: number;
  warehouseId?: number;
  from?: string;
  to?: string;
}
