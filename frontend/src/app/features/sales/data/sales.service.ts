import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  CreateSaleRequest,
  SaleResponse,
  SalesListItem,
  SalesFilters,
  VoidSaleRequest,
} from "./sales.models";

@Injectable({ providedIn: "root" })
export class SalesService {
  private readonly endpoint = `${environment.apiUrl}/sales`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateSaleRequest): Observable<SaleResponse> {
    return this.http.post<SaleResponse>(this.endpoint, payload);
  }

  list(filters?: SalesFilters): Observable<SaleResponse[]> {
    let params = new HttpParams();

    if (filters?.from) {
      params = params.set("from", filters.from);
    }

    if (filters?.to) {
      params = params.set("to", filters.to);
    }

    if (filters?.cashRegisterSessionId !== undefined) {
      params = params.set(
        "cashRegisterSessionId",
        String(filters.cashRegisterSessionId),
      );
    }

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    if (filters?.createdBy) {
      params = params.set("createdBy", filters.createdBy);
    }

    return this.http.get<SaleResponse[]>(this.endpoint, { params });
  }

  listItems(filters?: SalesFilters): Observable<SalesListItem[]> {
    let params = new HttpParams();

    if (filters?.from) {
      params = params.set("from", filters.from);
    }

    if (filters?.to) {
      params = params.set("to", filters.to);
    }

    if (filters?.cashRegisterSessionId !== undefined) {
      params = params.set(
        "cashRegisterSessionId",
        String(filters.cashRegisterSessionId),
      );
    }

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    if (filters?.createdBy) {
      params = params.set("createdBy", filters.createdBy);
    }

    return this.http.get<SalesListItem[]>(`${this.endpoint}/list-items`, {
      params,
    });
  }

  getById(id: number): Observable<SaleResponse> {
    return this.http.get<SaleResponse>(`${this.endpoint}/${id}`);
  }

  voidSale(id: number, payload: VoidSaleRequest): Observable<SaleResponse> {
    return this.http.post<SaleResponse>(`${this.endpoint}/${id}/void`, payload);
  }
}
