import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  CashRegisterReportResponse,
  DateRangeFilters,
  ElectronicDocumentsReportFilters,
  ElectronicDocumentsReportResponse,
  InventoryMovementReportItemResponse,
  InventoryMovementsFilters,
  LowStockItemResponse,
  PurchasesReportFilters,
  PurchasesReportResponse,
  QuotesReportResponse,
  SalesReportResponse,
  TopProductReportItemResponse,
  TopProductsFilters,
} from "./reports.models";

@Injectable({ providedIn: "root" })
export class ReportsService {
  private readonly endpoint = `${environment.apiUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  sales(filters?: DateRangeFilters): Observable<SalesReportResponse> {
    const params = this.withDateRange(filters);
    return this.http.get<SalesReportResponse>(`${this.endpoint}/sales`, {
      params,
    });
  }

  cashRegister(cashRegisterId: number): Observable<CashRegisterReportResponse> {
    return this.http.get<CashRegisterReportResponse>(
      `${this.endpoint}/cash-registers/${cashRegisterId}`,
    );
  }

  lowStock(threshold: number): Observable<LowStockItemResponse[]> {
    const params = new HttpParams().set("threshold", String(threshold));
    return this.http.get<LowStockItemResponse[]>(`${this.endpoint}/low-stock`, {
      params,
    });
  }

  inventoryMovements(
    filters?: InventoryMovementsFilters,
  ): Observable<InventoryMovementReportItemResponse[]> {
    let params = this.withDateRange(filters);

    if (filters?.productId !== undefined && filters.productId !== null) {
      params = params.set("productId", String(filters.productId));
    }

    if (filters?.warehouseId !== undefined && filters.warehouseId !== null) {
      params = params.set("warehouseId", String(filters.warehouseId));
    }

    return this.http.get<InventoryMovementReportItemResponse[]>(
      `${this.endpoint}/inventory-movements`,
      { params },
    );
  }

  purchases(
    filters?: PurchasesReportFilters,
  ): Observable<PurchasesReportResponse> {
    let params = this.withDateRange(filters);

    if (filters?.supplierId !== undefined && filters.supplierId !== null) {
      params = params.set("supplierId", String(filters.supplierId));
    }

    return this.http.get<PurchasesReportResponse>(
      `${this.endpoint}/purchases`,
      {
        params,
      },
    );
  }

  topProducts(
    filters?: TopProductsFilters,
  ): Observable<TopProductReportItemResponse[]> {
    let params = this.withDateRange(filters);

    if (filters?.limit !== undefined && filters.limit !== null) {
      params = params.set("limit", String(filters.limit));
    }

    return this.http.get<TopProductReportItemResponse[]>(
      `${this.endpoint}/top-products`,
      {
        params,
      },
    );
  }

  quotes(filters?: DateRangeFilters): Observable<QuotesReportResponse> {
    const params = this.withDateRange(filters);
    return this.http.get<QuotesReportResponse>(`${this.endpoint}/quotes`, {
      params,
    });
  }

  electronicDocuments(
    filters?: ElectronicDocumentsReportFilters,
  ): Observable<ElectronicDocumentsReportResponse> {
    let params = this.withDateRange(filters);

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    return this.http.get<ElectronicDocumentsReportResponse>(
      `${this.endpoint}/electronic-documents`,
      {
        params,
      },
    );
  }

  private withDateRange(filters?: DateRangeFilters): HttpParams {
    let params = new HttpParams();

    if (filters?.from) {
      params = params.set("from", filters.from);
    }

    if (filters?.to) {
      params = params.set("to", filters.to);
    }

    return params;
  }
}
