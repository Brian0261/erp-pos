import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  ProductCleanupExecuteRequest,
  ProductCleanupExecuteResponse,
  ProductCleanupPreviewRequest,
  ProductCleanupPreviewResponse,
} from "./product-cleanup.models";

@Injectable({ providedIn: "root" })
export class ProductCleanupService {
  private readonly endpoint = `${environment.apiUrl}/admin/test-data-cleanup/products`;

  constructor(private readonly http: HttpClient) {}

  preview(
    payload: ProductCleanupPreviewRequest,
  ): Observable<ProductCleanupPreviewResponse> {
    return this.http.post<ProductCleanupPreviewResponse>(
      `${this.endpoint}/preview`,
      payload,
    );
  }

  execute(
    payload: ProductCleanupExecuteRequest,
  ): Observable<ProductCleanupExecuteResponse> {
    return this.http.post<ProductCleanupExecuteResponse>(
      `${this.endpoint}/execute`,
      payload,
    );
  }
}
