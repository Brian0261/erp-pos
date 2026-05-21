import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  WarehouseCreateRequest,
  WarehouseResponse,
  WarehouseUpdateRequest,
  WarehouseStatusRequest,
} from "./inventory.models";

@Injectable({ providedIn: "root" })
export class WarehouseService {
  private readonly endpoint = `${environment.apiUrl}/warehouses`;

  constructor(private readonly http: HttpClient) {}

  list(active?: boolean): Observable<WarehouseResponse[]> {
    let params = new HttpParams();
    if (active !== undefined) {
      params = params.set("active", String(active));
    }

    return this.http.get<WarehouseResponse[]>(this.endpoint, { params });
  }

  getById(id: number): Observable<WarehouseResponse> {
    return this.http.get<WarehouseResponse>(`${this.endpoint}/${id}`);
  }

  create(payload: WarehouseCreateRequest): Observable<WarehouseResponse> {
    return this.http.post<WarehouseResponse>(this.endpoint, payload);
  }

  update(id: number, payload: WarehouseUpdateRequest): Observable<WarehouseResponse> {
    return this.http.put<WarehouseResponse>(`${this.endpoint}/${id}`, payload);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  changeStatus(id: number, payload: WarehouseStatusRequest): Observable<WarehouseResponse> {
    return this.http.patch<WarehouseResponse>(`${this.endpoint}/${id}/status`, payload);
  }
}
