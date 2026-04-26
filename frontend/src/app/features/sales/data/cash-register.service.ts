import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  CashRegisterResponse,
  CloseCashRegisterRequest,
  OpenCashRegisterRequest,
} from "./sales.models";

@Injectable({ providedIn: "root" })
export class CashRegisterService {
  private readonly endpoint = `${environment.apiUrl}/cash-registers`;

  constructor(private readonly http: HttpClient) {}

  open(payload: OpenCashRegisterRequest): Observable<CashRegisterResponse> {
    return this.http.post<CashRegisterResponse>(
      `${this.endpoint}/open`,
      payload,
    );
  }

  current(): Observable<CashRegisterResponse> {
    return this.http.get<CashRegisterResponse>(`${this.endpoint}/current`);
  }

  getById(id: number): Observable<CashRegisterResponse> {
    return this.http.get<CashRegisterResponse>(`${this.endpoint}/${id}`);
  }

  close(
    id: number,
    payload: CloseCashRegisterRequest,
  ): Observable<CashRegisterResponse> {
    return this.http.post<CashRegisterResponse>(
      `${this.endpoint}/${id}/close`,
      payload,
    );
  }
}
