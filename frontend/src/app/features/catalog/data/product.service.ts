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

@Injectable({ providedIn: "root" })
export class ProductService {
  private readonly endpoint = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  list(page: number, size: number): Observable<PageResponse<Product>> {
    const params = new HttpParams()
      .set("page", page)
      .set("size", size)
      .set("sort", "updatedAt,desc");
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
