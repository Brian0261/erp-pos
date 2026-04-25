import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  AdjustmentRequest,
  InventoryMovementResponse,
  InitialStockRequest,
  KardexFilters,
  PageResponse,
  StockFilters,
  StockResponse,
  StockTransferResponse,
  TransferRequest,
} from "./inventory.models";

@Injectable({ providedIn: "root" })
export class InventoryService {
  private readonly endpoint = `${environment.apiUrl}/inventory`;

  constructor(private readonly http: HttpClient) {}

  listStocks(filters: StockFilters): Observable<PageResponse<StockResponse>> {
    let params = new HttpParams()
      .set("page", String(filters.page ?? 0))
      .set("size", String(filters.size ?? 20));

    if (filters.productId !== undefined) {
      params = params.set("productId", String(filters.productId));
    }

    if (filters.warehouseId !== undefined) {
      params = params.set("warehouseId", String(filters.warehouseId));
    }

    return this.http.get<PageResponse<StockResponse>>(
      `${this.endpoint}/stocks`,
      {
        params,
      },
    );
  }

  registerInitialStock(
    payload: InitialStockRequest,
  ): Observable<InventoryMovementResponse> {
    return this.http.post<InventoryMovementResponse>(
      `${this.endpoint}/initial-stock`,
      payload,
    );
  }

  registerAdjustment(
    payload: AdjustmentRequest,
  ): Observable<InventoryMovementResponse> {
    return this.http.post<InventoryMovementResponse>(
      `${this.endpoint}/adjustments`,
      payload,
    );
  }

  transfer(payload: TransferRequest): Observable<StockTransferResponse> {
    return this.http.post<StockTransferResponse>(
      `${this.endpoint}/transfers`,
      payload,
    );
  }

  kardex(filters: KardexFilters): Observable<InventoryMovementResponse[]> {
    let params = new HttpParams();

    if (filters.productId !== undefined) {
      params = params.set("productId", String(filters.productId));
    }

    if (filters.warehouseId !== undefined) {
      params = params.set("warehouseId", String(filters.warehouseId));
    }

    if (filters.from) {
      params = params.set("from", filters.from);
    }

    if (filters.to) {
      params = params.set("to", filters.to);
    }

    return this.http.get<InventoryMovementResponse[]>(
      `${this.endpoint}/kardex`,
      {
        params,
      },
    );
  }
}
