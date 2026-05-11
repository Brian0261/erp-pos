import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  PageResponse,
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
} from "./catalog.models";

export interface ProductListFilters {
  q?: string;
  categoryId?: number;
  active?: boolean;
  barcodeStatus?: "WITH_BARCODE" | "WITHOUT_BARCODE";
}

@Injectable({ providedIn: "root" })
export class ProductService {
  private readonly endpoint = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  list(
    page: number,
    size: number,
    filters?: ProductListFilters,
  ): Observable<PageResponse<Product>> {
    let params = new HttpParams()
      .set("page", page)
      .set("size", size)
      .set("sort", "updatedAt,desc");

    const query = filters?.q?.trim();
    if (query) {
      params = params.set("q", query);
    }
    if (filters?.categoryId !== undefined) {
      params = params.set("categoryId", filters.categoryId);
    }
    if (filters?.active !== undefined) {
      params = params.set("active", filters.active);
    }
    if (filters?.barcodeStatus) {
      params = params.set("barcodeStatus", filters.barcodeStatus);
    }

    return this.http.get<PageResponse<Product>>(this.endpoint, { params });
  }

  search(query: string): Observable<Product[]> {
    const params = new HttpParams().set("q", query);
    return this.http.get<Product[]>(`${this.endpoint}/search`, { params });
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.endpoint}/${id}`);
  }

  create(payload: ProductCreateRequest): Observable<Product> {
    return this.http.post<Product>(this.endpoint, payload);
  }

  update(id: number, payload: ProductUpdateRequest): Observable<Product> {
    return this.http.put<Product>(`${this.endpoint}/${id}`, payload);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
