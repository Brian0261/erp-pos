import { HttpClient, HttpHeaders, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { BillingSeriesRequest, BillingSeriesResponse } from "./billing.models";

export interface BillingSeriesHttpResponse<T> {
  body: T | null;
  etag: string | null;
}

export function buildBillingSeriesEtag(id: number, version: number): string {
  return `"billing-series-${id}-v${version}"`;
}

@Injectable({ providedIn: "root" })
export class BillingSeriesService {
  private readonly endpoint = `${environment.apiUrl}/billing/series`;

  constructor(private readonly http: HttpClient) {}

  create(payload: BillingSeriesRequest): Observable<BillingSeriesResponse> {
    return this.http.post<BillingSeriesResponse>(this.endpoint, payload);
  }

  list(): Observable<BillingSeriesResponse[]> {
    return this.http.get<BillingSeriesResponse[]>(this.endpoint);
  }

  getById(id: number): Observable<BillingSeriesHttpResponse<BillingSeriesResponse>> {
    return this.http
      .get<BillingSeriesResponse>(`${this.endpoint}/${id}`, { observe: "response" })
      .pipe(map((response) => this.withEtag(response)));
  }

  concurrencyToken(series: BillingSeriesResponse): string {
    return buildBillingSeriesEtag(series.id, series.version);
  }

  update(
    id: number,
    payload: BillingSeriesRequest,
    ifMatch: string,
  ): Observable<BillingSeriesHttpResponse<BillingSeriesResponse>> {
    return this.http
      .put<BillingSeriesResponse>(`${this.endpoint}/${id}`, payload, {
        headers: this.ifMatchHeaders(ifMatch),
        observe: "response",
      })
      .pipe(map((response) => this.withEtag(response)));
  }

  deactivate(id: number, ifMatch: string): Observable<BillingSeriesHttpResponse<void>> {
    return this.http
      .delete<void>(`${this.endpoint}/${id}`, {
        headers: this.ifMatchHeaders(ifMatch),
        observe: "response",
      })
      .pipe(map((response) => this.withEtag(response)));
  }

  private ifMatchHeaders(ifMatch: string): HttpHeaders {
    return new HttpHeaders({ "If-Match": ifMatch });
  }

  private withEtag<T>(response: HttpResponse<T>): BillingSeriesHttpResponse<T> {
    return {
      body: response.body,
      etag: response.headers.get("ETag"),
    };
  }
}
