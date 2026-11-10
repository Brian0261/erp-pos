import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  CreateSaleRequest,
  SaleResponse,
  SalesListItem,
  SalesFilters,
  SalesListPage,
  SalesListQuery,
  TodaySalesResponse,
  VoidSaleRequest,
} from "./sales.models";
import { decodeSalesPage } from "../sales-list-query";

@Injectable({ providedIn: "root" })
export class SalesService {
  private readonly endpoint = `${environment.apiUrl}/sales`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateSaleRequest, context?: HttpContext): Observable<SaleResponse> {
    return this.http.post<SaleResponse>(this.endpoint, payload, { context });
  }

  list(filters?: SalesFilters, context?: HttpContext): Observable<SaleResponse[]> {
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

    return this.http.get<SaleResponse[]>(this.endpoint, { params, context });
  }

  listItems(filters?: SalesFilters, context?: HttpContext): Observable<SalesListItem[]> {
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
      context,
    });
  }

  today(context?: HttpContext): Observable<TodaySalesResponse> {
    return this.http.get<TodaySalesResponse>(`${this.endpoint}/today`, { context });
  }

  listPage(query: SalesListQuery, context: HttpContext): Observable<SalesListPage> {
    let params = new HttpParams().set("page", query.page).set("size", query.size);
    for (const key of ["saleNumber", "saleNumberPrefix", "from", "to", "status", "cashRegisterSessionId",
      "createdBy", "hasElectronicDocument", "documentStatus"] as const) {
      const value = query[key];
      if (value !== undefined) params = params.set(key, value);
    }
    return this.http.get<unknown>("/api/v2/sales", { params, context }).pipe(
      map(value => decodeSalesPage(value, query)),
    );
  }

  getById(id: number, context?: HttpContext): Observable<SaleResponse> {
    return this.http.get<SaleResponse>(`${this.endpoint}/${id}`, { context });
  }

  voidSale(id: number, payload: VoidSaleRequest, context?: HttpContext): Observable<SaleResponse> {
    return this.http.post<SaleResponse>(`${this.endpoint}/${id}/void`, payload, { context });
  }
}
