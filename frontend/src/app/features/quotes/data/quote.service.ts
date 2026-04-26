import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  CancelQuoteRequest,
  ConvertQuoteToSaleRequest,
  CreateQuoteRequest,
  QuoteHistoryResponse,
  QuoteListFilters,
  QuoteResponse,
  SendQuoteRequest,
  UpdateQuoteRequest,
} from "./quotes.models";

@Injectable({ providedIn: "root" })
export class QuoteService {
  private readonly endpoint = `${environment.apiUrl}/quotes`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateQuoteRequest): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(this.endpoint, payload);
  }

  list(filters?: QuoteListFilters): Observable<QuoteResponse[]> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    if (filters?.customerQuery) {
      params = params.set("customerQuery", filters.customerQuery);
    }

    if (filters?.from) {
      params = params.set("from", filters.from);
    }

    if (filters?.to) {
      params = params.set("to", filters.to);
    }

    return this.http.get<QuoteResponse[]>(this.endpoint, { params });
  }

  getById(id: number): Observable<QuoteResponse> {
    return this.http.get<QuoteResponse>(`${this.endpoint}/${id}`);
  }

  update(id: number, payload: UpdateQuoteRequest): Observable<QuoteResponse> {
    return this.http.put<QuoteResponse>(`${this.endpoint}/${id}`, payload);
  }

  send(id: number, payload?: SendQuoteRequest): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(
      `${this.endpoint}/${id}/send`,
      payload ?? {},
    );
  }

  cancel(id: number, payload?: CancelQuoteRequest): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(
      `${this.endpoint}/${id}/cancel`,
      payload ?? {},
    );
  }

  convertToSale(
    id: number,
    payload: ConvertQuoteToSaleRequest,
  ): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(
      `${this.endpoint}/${id}/convert-to-sale`,
      payload,
    );
  }

  history(id: number): Observable<QuoteHistoryResponse[]> {
    return this.http.get<QuoteHistoryResponse[]>(
      `${this.endpoint}/${id}/history`,
    );
  }
}
