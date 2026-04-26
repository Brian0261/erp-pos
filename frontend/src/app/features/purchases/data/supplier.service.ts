import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  SupplierCreateRequest,
  SupplierResponse,
  SupplierUpdateRequest,
} from "./purchases.models";

@Injectable({ providedIn: "root" })
export class SupplierService {
  private readonly endpoint = `${environment.apiUrl}/suppliers`;

  constructor(private readonly http: HttpClient) {}

  list(query?: string): Observable<SupplierResponse[]> {
    let params = new HttpParams();
    if (query && query.trim().length > 0) {
      params = params.set("q", query.trim());
    }

    return this.http.get<SupplierResponse[]>(this.endpoint, { params });
  }

  getById(id: number): Observable<SupplierResponse> {
    return this.http.get<SupplierResponse>(`${this.endpoint}/${id}`);
  }

  create(payload: SupplierCreateRequest): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>(this.endpoint, payload);
  }

  update(
    id: number,
    payload: SupplierUpdateRequest,
  ): Observable<SupplierResponse> {
    return this.http.put<SupplierResponse>(`${this.endpoint}/${id}`, payload);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
