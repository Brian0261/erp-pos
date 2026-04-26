import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { PosProductResponse } from "./sales.models";

@Injectable({ providedIn: "root" })
export class PosService {
  private readonly endpoint = `${environment.apiUrl}/pos/products`;

  constructor(private readonly http: HttpClient) {}

  lookup(code: string, warehouseId?: number): Observable<PosProductResponse> {
    let params = new HttpParams().set("code", code);

    if (warehouseId !== undefined) {
      params = params.set("warehouseId", String(warehouseId));
    }

    return this.http.get<PosProductResponse>(`${this.endpoint}/lookup`, {
      params,
    });
  }

  search(
    query: string,
    warehouseId?: number,
  ): Observable<PosProductResponse[]> {
    let params = new HttpParams().set("q", query);

    if (warehouseId !== undefined) {
      params = params.set("warehouseId", String(warehouseId));
    }

    return this.http.get<PosProductResponse[]>(`${this.endpoint}/search`, {
      params,
    });
  }
}
