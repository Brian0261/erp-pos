import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  ProductImportConfirmRequest,
  ProductImportConfirmResponse,
  ProductImportPreviewResponse,
} from "./catalog.models";

@Injectable({ providedIn: "root" })
export class ProductImportService {
  private readonly endpoint = `${environment.apiUrl}/products/import`;

  constructor(private readonly http: HttpClient) {}

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.endpoint}/template`, {
      responseType: "blob",
    });
  }

  preview(file: File): Observable<ProductImportPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<ProductImportPreviewResponse>(
      `${this.endpoint}/preview`,
      formData,
    );
  }

  confirm(
    payload: ProductImportConfirmRequest,
  ): Observable<ProductImportConfirmResponse> {
    return this.http.post<ProductImportConfirmResponse>(
      `${this.endpoint}/confirm`,
      payload,
    );
  }
}
