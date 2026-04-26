import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { BillingSeriesRequest, BillingSeriesResponse } from "./billing.models";

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

  getById(id: number): Observable<BillingSeriesResponse> {
    return this.http.get<BillingSeriesResponse>(`${this.endpoint}/${id}`);
  }

  update(
    id: number,
    payload: BillingSeriesRequest,
  ): Observable<BillingSeriesResponse> {
    return this.http.put<BillingSeriesResponse>(
      `${this.endpoint}/${id}`,
      payload,
    );
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
