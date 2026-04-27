import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { OutboxEventResponse, OutboxFilters } from "./outbox.models";

@Injectable({ providedIn: "root" })
export class OutboxService {
  private readonly endpoint = `${environment.apiUrl}/integrations/outbox-events`;

  constructor(private readonly http: HttpClient) {}

  list(filters?: OutboxFilters): Observable<OutboxEventResponse[]> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    if (filters?.eventType) {
      params = params.set("eventType", filters.eventType);
    }

    return this.http.get<OutboxEventResponse[]>(this.endpoint, { params });
  }

  getById(id: number): Observable<OutboxEventResponse> {
    return this.http.get<OutboxEventResponse>(`${this.endpoint}/${id}`);
  }

  markPublished(id: number): Observable<OutboxEventResponse> {
    return this.http.post<OutboxEventResponse>(
      `${this.endpoint}/${id}/mark-published`,
      {},
    );
  }

  retry(id: number): Observable<OutboxEventResponse> {
    return this.http.post<OutboxEventResponse>(
      `${this.endpoint}/${id}/retry`,
      {},
    );
  }
}
