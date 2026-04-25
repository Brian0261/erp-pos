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

export interface UnitCreateRequest {
  code: string;
  name: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
