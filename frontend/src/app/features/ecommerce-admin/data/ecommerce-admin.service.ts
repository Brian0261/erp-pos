import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
  AssetSource,
  EcommerceAdminBrandRequest,
  EcommerceAdminBrandResponse,
  EcommerceAdminBrandStatusRequest,
  EcommerceAdminOnlineCategoryResponse,
  EcommerceAdminOnlineCategoryRequest,
  EcommerceAdminOnlineCategoryStatusRequest,
  EcommerceAdminOnlineProfileDetailResponse,
  EcommerceAdminOnlineProfileStatusResponse,
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
  EcommerceOnlineProfileImportConfirmResponse,
  EcommerceOnlineProfileImportPreviewResponse,
  EcommercePrimaryImageBinaryImportConfirmResponse,
  EcommercePrimaryImageBinaryImportPreviewResponse,
  EcommercePrimaryImageUrlImportConfirmResponse,
  EcommercePrimaryImageUrlImportPreviewResponse,
  OnlinePublicationStatus,
  ReadinessStatus,
} from "./ecommerce-admin.models";

export interface EcommerceAdminUploadPrimaryAssetOptions {
  altText: string | null;
  source: AssetSource;
  rightsConfirmed: boolean;
  displayOrder: number;
}

export interface OnlineProfileListFilters {
  q?: string;
  status?: OnlinePublicationStatus;
  readinessStatus?: ReadinessStatus;
  brandId?: number;
  withoutBrand?: boolean;
  onlineCategoryId?: number;
  withoutOnlineCategory?: boolean;
}

@Injectable({ providedIn: "root" })
export class EcommerceAdminService {
  private readonly endpoint = `${environment.apiUrl}/ecommerce-admin`;
  private readonly onlineProfilesImportEndpoint = `${this.endpoint}/products/online-profiles/import`;
  private readonly primaryImageUrlImportTemplateEndpoint = `${this.endpoint}/products/online-profiles/primary-images/import/template`;
  private readonly primaryImageUrlImportPreviewEndpoint = `${this.endpoint}/products/online-profiles/primary-images/import/preview`;
  private readonly primaryImageUrlImportConfirmFileEndpoint = `${this.endpoint}/products/online-profiles/primary-images/import/confirm-file`;
  private readonly primaryImageBinaryImportTemplateEndpoint = `${this.endpoint}/products/online-profiles/primary-images/binary-import/template`;
  private readonly primaryImageBinaryImportPreviewEndpoint = `${this.endpoint}/products/online-profiles/primary-images/binary-import/preview`;
  private readonly primaryImageBinaryImportConfirmFileEndpoint = `${this.endpoint}/products/online-profiles/primary-images/binary-import/confirm-file`;

  constructor(private readonly http: HttpClient) {}

  listOnlineProfiles(
    page: number,
    size: number,
    filters: OnlineProfileListFilters = {},
    sort = "updatedAt,desc",
  ): Observable<EcommerceAdminPageResponse<EcommerceAdminOnlineProfileSummaryResponse>> {
    let params = new HttpParams()
      .set("page", String(page))
      .set("size", String(size))
      .set("sort", sort);

    const query = filters.q?.trim();
    if (query) {
      params = params.set("q", query);
    }
    if (filters.status) {
      params = params.set("status", filters.status);
    }
    if (filters.readinessStatus) {
      params = params.set("readinessStatus", filters.readinessStatus);
    }
    if (filters.brandId !== undefined) {
      params = params.set("brandId", String(filters.brandId));
    }
    if (filters.withoutBrand) {
      params = params.set("withoutBrand", "true");
    }
    if (filters.onlineCategoryId !== undefined) {
      params = params.set("onlineCategoryId", String(filters.onlineCategoryId));
    }
    if (filters.withoutOnlineCategory) {
      params = params.set("withoutOnlineCategory", "true");
    }

    return this.http.get<EcommerceAdminPageResponse<EcommerceAdminOnlineProfileSummaryResponse>>(
      `${this.endpoint}/products/online-profiles`,
      { params },
    );
  }

  listOnlineProfileStatuses(
    productIds: number[],
  ): Observable<EcommerceAdminOnlineProfileStatusResponse[]> {
    const params = new HttpParams().set("productIds", productIds.join(","));

    return this.http.get<EcommerceAdminOnlineProfileStatusResponse[]>(
      `${this.endpoint}/products/online-profile-status`,
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

  uploadPrimaryAsset(
    productId: number,
    file: File,
    options: EcommerceAdminUploadPrimaryAssetOptions,
  ): Observable<EcommerceAdminPrimaryAssetResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const altText = options.altText?.trim();
    if (altText) {
      formData.append("altText", altText);
    }
    formData.append("source", options.source);
    formData.append("rightsConfirmed", String(options.rightsConfirmed));
    formData.append("displayOrder", String(options.displayOrder));

    return this.http.post<EcommerceAdminPrimaryAssetResponse>(
      `${this.endpoint}/products/${productId}/primary-asset/upload`,
      formData,
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

  downloadOnlineProfilesImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.onlineProfilesImportEndpoint}/template`, {
      responseType: "blob",
    });
  }

  previewOnlineProfilesImport(file: File): Observable<EcommerceOnlineProfileImportPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<EcommerceOnlineProfileImportPreviewResponse>(
      `${this.onlineProfilesImportEndpoint}/preview`,
      formData,
    );
  }

  confirmOnlineProfilesImportFile(file: File): Observable<EcommerceOnlineProfileImportConfirmResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<EcommerceOnlineProfileImportConfirmResponse>(
      `${this.onlineProfilesImportEndpoint}/confirm-file`,
      formData,
    );
  }

  downloadPrimaryImageUrlImportTemplate(): Observable<Blob> {
    return this.http.get(this.primaryImageUrlImportTemplateEndpoint, {
      responseType: "blob",
    });
  }

  previewPrimaryImageUrlImport(file: File): Observable<EcommercePrimaryImageUrlImportPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<EcommercePrimaryImageUrlImportPreviewResponse>(
      this.primaryImageUrlImportPreviewEndpoint,
      formData,
    );
  }

  confirmPrimaryImageUrlImportFile(file: File): Observable<EcommercePrimaryImageUrlImportConfirmResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<EcommercePrimaryImageUrlImportConfirmResponse>(
      this.primaryImageUrlImportConfirmFileEndpoint,
      formData,
    );
  }

  downloadPrimaryImageBinaryImportTemplate(): Observable<Blob> {
    return this.http.get(this.primaryImageBinaryImportTemplateEndpoint, {
      responseType: "blob",
    });
  }

  previewPrimaryImageBinaryImport(
    workbook: File,
    archive: File,
  ): Observable<EcommercePrimaryImageBinaryImportPreviewResponse> {
    const formData = new FormData();
    formData.append("workbook", workbook);
    formData.append("archive", archive);
    return this.http.post<EcommercePrimaryImageBinaryImportPreviewResponse>(
      this.primaryImageBinaryImportPreviewEndpoint,
      formData,
    );
  }

  confirmPrimaryImageBinaryImportFile(
    workbook: File,
    archive: File,
  ): Observable<EcommercePrimaryImageBinaryImportConfirmResponse> {
    const formData = new FormData();
    formData.append("workbook", workbook);
    formData.append("archive", archive);
    return this.http.post<EcommercePrimaryImageBinaryImportConfirmResponse>(
      this.primaryImageBinaryImportConfirmFileEndpoint,
      formData,
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
