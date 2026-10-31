import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  BillingXmlResponse,
  CreateElectronicDocumentFromSaleRequest,
  ElectronicDocumentFilters,
  ElectronicDocumentHistoryResponse,
  ElectronicDocumentResponse,
} from "./billing.models";

@Injectable({ providedIn: "root" })
export class ElectronicDocumentService {
  private readonly endpoint = `${environment.apiUrl}/billing/documents`;

  constructor(private readonly http: HttpClient) {}

  createFromSale(
    saleId: number,
    payload: CreateElectronicDocumentFromSaleRequest,
    context?: HttpContext,
  ): Observable<ElectronicDocumentResponse> {
    return this.http.post<ElectronicDocumentResponse>(
      `${this.endpoint}/from-sale/${saleId}`,
      payload,
      { context },
    );
  }

  list(
    filters?: ElectronicDocumentFilters,
    context?: HttpContext,
  ): Observable<ElectronicDocumentResponse[]> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set("status", filters.status);
    }

    if (filters?.type) {
      params = params.set("type", filters.type);
    }

    if (filters?.saleId !== undefined && filters.saleId !== null) {
      params = params.set("saleId", String(filters.saleId));
    }

    if (filters?.from) {
      params = params.set("from", filters.from);
    }

    if (filters?.to) {
      params = params.set("to", filters.to);
    }

    return this.http
      .get<unknown>(this.endpoint, {
        params,
        context,
      })
      .pipe(map((payload) => this.normalizeListResponse(payload)));
  }

  listBySaleId(saleId: number, context?: HttpContext): Observable<ElectronicDocumentResponse[]> {
    const params = new HttpParams().set("saleId", String(saleId));
    return this.http.get<unknown>(this.endpoint, { params, context }).pipe(
      map(payload => this.normalizeListResponse(payload, true)),
      map(rows => {
        if (rows.some(row => !row || !Number.isSafeInteger(row.id) || row.id <= 0
          || !Number.isSafeInteger(row.saleId) || row.saleId <= 0)) throw new Error("Invalid document response");
        const matched = this.filterBySaleId(rows, saleId);
        if (rows.length && !matched.length) throw new Error("Document response does not match sale");
        return matched;
      }),
    );
  }

  getById(id: number): Observable<ElectronicDocumentResponse> {
    return this.http.get<ElectronicDocumentResponse>(`${this.endpoint}/${id}`);
  }

  generateXml(id: number): Observable<ElectronicDocumentResponse> {
    return this.http.post<ElectronicDocumentResponse>(
      `${this.endpoint}/${id}/generate-xml`,
      {},
    );
  }

  sign(id: number): Observable<ElectronicDocumentResponse> {
    return this.http.post<ElectronicDocumentResponse>(
      `${this.endpoint}/${id}/sign`,
      {},
    );
  }

  send(id: number): Observable<ElectronicDocumentResponse> {
    return this.http.post<ElectronicDocumentResponse>(
      `${this.endpoint}/${id}/send`,
      {},
    );
  }

  getXml(id: number): Observable<BillingXmlResponse> {
    return this.http.get<BillingXmlResponse>(`${this.endpoint}/${id}/xml`);
  }

  history(id: number): Observable<ElectronicDocumentHistoryResponse[]> {
    return this.http.get<ElectronicDocumentHistoryResponse[]>(
      `${this.endpoint}/${id}/history`,
    );
  }

  private normalizeListResponse(payload: unknown, strict = false): ElectronicDocumentResponse[] {
    if (Array.isArray(payload)) {
      return payload as ElectronicDocumentResponse[];
    }

    if (!payload || typeof payload !== "object") {
      if (strict) throw new Error("Invalid document list");
      return [];
    }

    const wrapper = payload as {
      content?: unknown;
      items?: unknown;
      data?: unknown;
    };

    if (strict) {
      const keys = (["content", "items", "data"] as const).filter(key => Object.hasOwn(wrapper, key));
      if (keys.length !== 1 || !Array.isArray(wrapper[keys[0]])) throw new Error("Ambiguous document list");
    }

    if (Array.isArray(wrapper.content)) {
      return wrapper.content as ElectronicDocumentResponse[];
    }

    if (Array.isArray(wrapper.items)) {
      return wrapper.items as ElectronicDocumentResponse[];
    }

    if (Array.isArray(wrapper.data)) {
      return wrapper.data as ElectronicDocumentResponse[];
    }

    if (strict) throw new Error("Invalid document list");
    return [];
  }

  private filterBySaleId(
    rows: ElectronicDocumentResponse[],
    saleId: number,
  ): ElectronicDocumentResponse[] {
    return rows.filter((row) => Number(row.saleId) === saleId);
  }
}
