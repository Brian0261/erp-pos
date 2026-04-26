import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

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
  ): Observable<ElectronicDocumentResponse> {
    return this.http.post<ElectronicDocumentResponse>(
      `${this.endpoint}/from-sale/${saleId}`,
      payload,
    );
  }

  list(
    filters?: ElectronicDocumentFilters,
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

    return this.http.get<ElectronicDocumentResponse[]>(this.endpoint, {
      params,
    });
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
}
