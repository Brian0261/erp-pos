import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  PurchaseOrderCreateRequest,
  PurchaseOrderFilters,
  PurchaseOrderResponse,
  PurchaseOrderUpdateRequest,
  ReceivePurchaseOrderRequest,
} from "./purchases.models";

@Injectable({ providedIn: "root" })
export class PurchaseOrderService {
  private readonly endpoint = `${environment.apiUrl}/purchase-orders`;

  constructor(private readonly http: HttpClient) {}

  list(filters?: PurchaseOrderFilters): Observable<PurchaseOrderResponse[]> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    if (filters?.supplierId !== undefined) {
      params = params.set("supplierId", String(filters.supplierId));
    }

    if (filters?.from) {
      params = params.set("from", filters.from);
    }

    if (filters?.to) {
      params = params.set("to", filters.to);
    }

    return this.http.get<PurchaseOrderResponse[]>(this.endpoint, { params });
  }

  getById(id: number): Observable<PurchaseOrderResponse> {
    return this.http.get<PurchaseOrderResponse>(`${this.endpoint}/${id}`);
  }

  create(
    payload: PurchaseOrderCreateRequest,
  ): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(this.endpoint, payload);
  }

  update(
    id: number,
    payload: PurchaseOrderUpdateRequest,
  ): Observable<PurchaseOrderResponse> {
    return this.http.put<PurchaseOrderResponse>(
      `${this.endpoint}/${id}`,
      payload,
    );
  }

  approve(id: number): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(
      `${this.endpoint}/${id}/approve`,
      {},
    );
  }

  receive(
    id: number,
    payload: ReceivePurchaseOrderRequest,
  ): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(
      `${this.endpoint}/${id}/receive`,
      payload,
    );
  }

  cancel(id: number): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(
      `${this.endpoint}/${id}/cancel`,
      {},
    );
  }
}
