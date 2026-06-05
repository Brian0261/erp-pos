import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  EcommerceAdminBrandRequest,
  EcommerceAdminBrandResponse,
  EcommerceAdminBrandStatusRequest,
  EcommerceAdminOnlineCategoryResponse,
  EcommerceAdminOnlineCategoryRequest,
  EcommerceAdminOnlineCategoryStatusRequest,
  EcommerceAdminOnlineProfileDetailResponse,
  EcommerceAdminOnlineProfileSummaryResponse,
  EcommerceAdminPageResponse,
  EcommerceAdminPriceOverrideResponse,
  EcommerceAdminPrimaryAssetResponse,
  EcommerceAdminPublicationValidationResponse,
  EcommerceAdminSeoMetadataResponse,
  EcommerceAdminUpdateOnlineProfileRequest,
  EcommerceAdminUpsertPriceOverrideRequest,
  EcommerceAdminUpsertPrimaryAssetRequest,
  EcommerceAdminUpsertSeoRequest,
} from "./ecommerce-admin.models";

@Injectable({ providedIn: "root" })
export class EcommerceAdminService {
  private readonly endpoint = `${environment.apiUrl}/ecommerce-admin`;

  constructor(private readonly http: HttpClient) {}

  listOnlineProfiles(
    page: number,
    size: number,
    sort = "updatedAt,desc",
  ): Observable<EcommerceAdminPageResponse<EcommerceAdminOnlineProfileSummaryResponse>> {
    const params = new HttpParams()
      .set("page", String(page))
      .set("size", String(size))
      .set("sort", sort);

    return this.http.get<EcommerceAdminPageResponse<EcommerceAdminOnlineProfileSummaryResponse>>(
      `${this.endpoint}/products/online-profiles`,
      { params },
    );
  }

  getOnlineProfile(productId: number): Observable<EcommerceAdminOnlineProfileDetailResponse> {
    return this.http.get<EcommerceAdminOnlineProfileDetailResponse>(
      `${this.endpoint}/products/${productId}/online-profile`,
    );
  }

  createOnlineProfile(productId: number): Observable<EcommerceAdminOnlineProfileDetailResponse> {
    return this.http.post<EcommerceAdminOnlineProfileDetailResponse>(
      `${this.endpoint}/products/${productId}/online-profile`,
      {},
    );
  }

  updateOnlineProfile(
    productId: number,
    payload: EcommerceAdminUpdateOnlineProfileRequest,
  ): Observable<EcommerceAdminOnlineProfileDetailResponse> {
    return this.http.put<EcommerceAdminOnlineProfileDetailResponse>(
      `${this.endpoint}/products/${productId}/online-profile`,
      payload,
    );
  }

  upsertSeo(
    productId: number,
    payload: EcommerceAdminUpsertSeoRequest,
  ): Observable<EcommerceAdminSeoMetadataResponse> {
    return this.http.put<EcommerceAdminSeoMetadataResponse>(
      `${this.endpoint}/products/${productId}/seo`,
      payload,
    );
  }

  upsertPrimaryAsset(
    productId: number,
    payload: EcommerceAdminUpsertPrimaryAssetRequest,
  ): Observable<EcommerceAdminPrimaryAssetResponse> {
    return this.http.put<EcommerceAdminPrimaryAssetResponse>(
      `${this.endpoint}/products/${productId}/primary-asset`,
      payload,
    );
  }

  upsertPriceOverride(
    productId: number,
    payload: EcommerceAdminUpsertPriceOverrideRequest,
  ): Observable<EcommerceAdminPriceOverrideResponse> {
    return this.http.put<EcommerceAdminPriceOverrideResponse>(
      `${this.endpoint}/products/${productId}/price-override`,
      payload,
    );
  }

  validatePublication(productId: number): Observable<EcommerceAdminPublicationValidationResponse> {
    return this.http.get<EcommerceAdminPublicationValidationResponse>(
      `${this.endpoint}/products/${productId}/publication-validation`,
    );
  }

  publish(productId: number): Observable<EcommerceAdminOnlineProfileDetailResponse> {
    return this.http.post<EcommerceAdminOnlineProfileDetailResponse>(
      `${this.endpoint}/products/${productId}/publish`,
      {},
    );
  }

  unpublish(productId: number): Observable<EcommerceAdminOnlineProfileDetailResponse> {
    return this.http.post<EcommerceAdminOnlineProfileDetailResponse>(
      `${this.endpoint}/products/${productId}/unpublish`,
      {},
    );
  }

  listBrands(): Observable<EcommerceAdminBrandResponse[]> {
    return this.http.get<EcommerceAdminBrandResponse[]>(`${this.endpoint}/brands`);
  }

  getBrand(id: number): Observable<EcommerceAdminBrandResponse> {
    return this.http.get<EcommerceAdminBrandResponse>(`${this.endpoint}/brands/${id}`);
  }

  createBrand(payload: EcommerceAdminBrandRequest): Observable<EcommerceAdminBrandResponse> {
    return this.http.post<EcommerceAdminBrandResponse>(`${this.endpoint}/brands`, payload);
  }

  updateBrand(id: number, payload: EcommerceAdminBrandRequest): Observable<EcommerceAdminBrandResponse> {
    return this.http.put<EcommerceAdminBrandResponse>(`${this.endpoint}/brands/${id}`, payload);
  }

  changeBrandStatus(
    id: number,
    payload: EcommerceAdminBrandStatusRequest,
  ): Observable<EcommerceAdminBrandResponse> {
    return this.http.patch<EcommerceAdminBrandResponse>(
      `${this.endpoint}/brands/${id}/status`,
      payload,
    );
  }

  listOnlineCategories(): Observable<EcommerceAdminOnlineCategoryResponse[]> {
    return this.http.get<EcommerceAdminOnlineCategoryResponse[]>(
      `${this.endpoint}/online-categories`,
    );
  }

  getOnlineCategory(id: number): Observable<EcommerceAdminOnlineCategoryResponse> {
    return this.http.get<EcommerceAdminOnlineCategoryResponse>(
      `${this.endpoint}/online-categories/${id}`,
    );
  }

  createOnlineCategory(
    payload: EcommerceAdminOnlineCategoryRequest,
  ): Observable<EcommerceAdminOnlineCategoryResponse> {
    return this.http.post<EcommerceAdminOnlineCategoryResponse>(
      `${this.endpoint}/online-categories`,
      payload,
    );
  }

  updateOnlineCategory(
    id: number,
    payload: EcommerceAdminOnlineCategoryRequest,
  ): Observable<EcommerceAdminOnlineCategoryResponse> {
    return this.http.put<EcommerceAdminOnlineCategoryResponse>(
      `${this.endpoint}/online-categories/${id}`,
      payload,
    );
  }

  changeOnlineCategoryStatus(
    id: number,
    payload: EcommerceAdminOnlineCategoryStatusRequest,
  ): Observable<EcommerceAdminOnlineCategoryResponse> {
    return this.http.patch<EcommerceAdminOnlineCategoryResponse>(
      `${this.endpoint}/online-categories/${id}/status`,
      payload,
    );
  }
}
