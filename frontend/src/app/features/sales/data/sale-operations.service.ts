import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";
import { CreateElectronicDocumentFromSaleRequest } from "../../billing/data/billing.models";
import { ConvertQuoteToSaleRequest } from "../../quotes/data/quotes.models";
import { CreateSaleRequest } from "./sales.models";

export interface SaleOperationIntent {
  receiptType: "TICKET" | "RECEIPT" | "INVOICE";
  payload: CreateElectronicDocumentFromSaleRequest | null;
}
export interface PrepareSaleOperationRequest {
  protocolVersion: 1;
  origin: "POS" | "QUOTE";
  operationId: string;
  command: CreateSaleRequest | null;
  quoteId: number | null;
  quoteCommand: ConvertQuoteToSaleRequest | null;
  receiptIntent: SaleOperationIntent | null;
}
export interface SaleOperation {
  operationId: string;
  protocolVersion: number;
  origin: "POS" | "QUOTE" | "LEGACY";
  state: "PREPARED" | "COMPLETED" | "CANCELLED" | "RESULT_UNAVAILABLE";
  cashRegisterSessionId: number | null;
  saleId: number | null;
  quoteId: number | null;
  command: CreateSaleRequest | null;
  quoteCommand: ConvertQuoteToSaleRequest | null;
  receiptIntent: SaleOperationIntent | null;
  documentId: number | null;
  documentStatus: string | null;
  receiptState: "NOT_REQUIRED" | "PENDING" | "LOCATED" | "REVIEW_REQUIRED";
  createdAt: string;
  updatedAt: string;
}
export interface SaleOperationPage {
  items: SaleOperation[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface SalePreparationRejected {
  protocolVersion: 1;
  operationId: string;
  actorUserId: string;
  origin: "POS";
  code: "OPERATION_PREPARATION_REJECTED";
  outcome: "NOT_STORED";
  reasonCode: "RESOURCE_UNAVAILABLE" | "COMMAND_INVALID";
}

export function isSalePreparationRejected(error: unknown, operationId: string, actorUserId: string): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 422) return false;
  const proof = error.error as Partial<SalePreparationRejected> | null;
  return !!proof && proof.protocolVersion === 1 && proof.operationId === operationId
    && proof.actorUserId === actorUserId && proof.origin === "POS" && proof.code === "OPERATION_PREPARATION_REJECTED"
    && proof.outcome === "NOT_STORED" && ["RESOURCE_UNAVAILABLE", "COMMAND_INVALID"].includes(proof.reasonCode ?? "");
}

@Injectable({ providedIn: "root" })
export class SaleOperationsService {
  private readonly endpoint = `${environment.apiUrl}/sales/operations`;
  constructor(private readonly http: HttpClient) {}
  prepare(body: PrepareSaleOperationRequest, context: HttpContext): Observable<SaleOperation> {
    return this.http.post<SaleOperation>(this.endpoint, body, { context });
  }
  list(page: number, context: HttpContext, state?: string): Observable<SaleOperationPage> {
    let params = new HttpParams().set("page", page).set("size", 10);
    if (state) params = params.set("state", state);
    return this.http.get<SaleOperationPage>(this.endpoint, { context, params });
  }
  get(operationId: string, context: HttpContext): Observable<SaleOperation> {
    return this.http.get<SaleOperation>(`${this.endpoint}/${encodeURIComponent(operationId)}`, { context });
  }
  cancel(operationId: string, context: HttpContext): Observable<SaleOperation> {
    return this.http.post<SaleOperation>(`${this.endpoint}/${encodeURIComponent(operationId)}/cancel`, {}, { context });
  }
}
