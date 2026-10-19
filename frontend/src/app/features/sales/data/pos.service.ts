import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, forkJoin, map, of } from "rxjs";

import { environment } from "../../../../environments/environment";
import { PosProductResponse } from "./sales.models";

@Injectable({ providedIn: "root" })
export class PosService {
  private readonly endpoint = `${environment.apiUrl}/pos/products`;

  constructor(private readonly http: HttpClient) {}

  snapshot(productIds: number[], warehouseId: number): Observable<PosProductResponse[]> {
    const ids = [...new Set(productIds)];
    if (!ids.length) return of([]);
    const batches: Observable<PosProductResponse[]>[] = [];
    for (let offset = 0; offset < ids.length; offset += 200) {
      const params = new HttpParams().set("productIds", ids.slice(offset, offset + 200).join(",")).set("warehouseId", warehouseId);
      batches.push(this.http.get<PosProductResponse[]>(`${this.endpoint}/snapshot`, { params }));
    }
    return forkJoin(batches).pipe(map(results => results.flat()));
  }

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
