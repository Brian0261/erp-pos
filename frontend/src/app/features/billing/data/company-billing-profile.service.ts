import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  BillingEnvironment,
  CompanyBillingProfileRequest,
  CompanyBillingProfileResponse,
} from "./billing.models";

@Injectable({ providedIn: "root" })
export class CompanyBillingProfileService {
  private readonly endpoint = `${environment.apiUrl}/billing/company-profile`;

  constructor(private readonly http: HttpClient) {}

  create(
    payload: CompanyBillingProfileRequest,
  ): Observable<CompanyBillingProfileResponse> {
    return this.http.post<CompanyBillingProfileResponse>(
      this.endpoint,
      payload,
    );
  }

  get(
    environmentValue: BillingEnvironment,
  ): Observable<CompanyBillingProfileResponse> {
    const params = new HttpParams().set("environment", environmentValue);
    return this.http.get<CompanyBillingProfileResponse>(this.endpoint, {
      params,
    });
  }

  update(
    payload: CompanyBillingProfileRequest,
  ): Observable<CompanyBillingProfileResponse> {
    return this.http.put<CompanyBillingProfileResponse>(this.endpoint, payload);
  }
}
