export interface Category {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: number;
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: number;
  unitId: number;
  salePrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLookupResponse {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  active: boolean;
}

export interface ProductCreateRequest {
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: number;
  unitId: number;
  salePrice: number;
}

export interface ProductUpdateRequest extends ProductCreateRequest {
  active: boolean;
}

export interface CategoryCreateRequest {
  name: string;
  description: string | null;
}

export interface CategoryUpdateRequest {
  name: string;
  description: string | null;
}

export interface CategoryStatusRequest {
  active: boolean;
}

export interface UnitCreateRequest {
  code: string;
  name: string;
}

export interface UnitUpdateRequest {
  code: string;
  name: string;
}

export interface UnitStatusRequest {
  active: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ProductImportPreviewRow {
  rowNumber: number;
  sku: string | null;
  barcode: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  unit: string | null;
  salePrice: string | null;
  active: string | null;
  valid: boolean;
  errors: string[];
}

export interface ProductImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ProductImportPreviewRow[];
}

export interface ProductImportConfirmRowRequest {
  rowNumber: number;
  sku: string | null;
  barcode: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  unit: string | null;
  salePrice: string | null;
  active: string | null;
}

export interface ProductImportConfirmRequest {
  rows: ProductImportConfirmRowRequest[];
}

export interface ProductImportConfirmRowResponse {
  rowNumber: number;
  sku: string | null;
  created: boolean;
  productId: number | null;
  errors: string[];
}

export interface ProductImportConfirmResponse {
  totalRows: number;
  createdRows: number;
  rejectedRows: number;
  rows: ProductImportConfirmRowResponse[];
}
