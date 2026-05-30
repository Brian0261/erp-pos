export type OnlinePublicationStatus =
  | "DRAFT"
  | "INCOMPLETE"
  | "READY_FOR_REVIEW"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "BLOCKED";

export type BrandAbsencePolicy = "GENERIC" | "UNBRANDED";

export type RobotsPolicy =
  | "INDEX_FOLLOW"
  | "NOINDEX_FOLLOW"
  | "NOINDEX_NOFOLLOW";

export type AssetType =
  | "PRODUCT_IMAGE"
  | "BRAND_LOGO"
  | "CATEGORY_IMAGE"
  | "OPEN_GRAPH_IMAGE";

export type AssetSource = "SUPPLIER" | "OWN" | "GENERATED" | "OTHER";

export interface EcommerceAdminPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface EcommerceAdminOnlineProfileSummaryResponse {
  profileId: number;
  productId: number;
  publicationStatus: OnlinePublicationStatus;
  slug: string | null;
  onlineName: string | null;
  onlineCategoryId: number | null;
  brandId: number | null;
  brandAbsencePolicy: BrandAbsencePolicy | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface EcommerceAdminEffectivePriceResponse {
  amount: number;
  currency: string;
  overrideApplied: boolean;
}

export interface EcommerceAdminSeoMetadataResponse {
  id: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  robotsPolicy: RobotsPolicy;
  indexable: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  updatedAt: string;
}

export interface EcommerceAdminPrimaryAssetResponse {
  id: number;
  assetType: AssetType;
  assetUrl: string;
  altText: string | null;
  source: AssetSource;
  rightsConfirmed: boolean;
  displayOrder: number;
  active: boolean;
  updatedAt: string;
}

export interface EcommerceAdminPriceOverrideResponse {
  id: number;
  amount: number;
  currency: string;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
  reason: string | null;
  updatedAt: string;
}

export interface EcommerceAdminPublicationValidationResponse {
  publishable: boolean;
  errors: string[];
  effectivePrice: number | null;
  currency: string;
}

export interface EcommerceAdminOnlineProfileDetailResponse {
  profileId: number;
  productId: number;
  publicationStatus: OnlinePublicationStatus;
  slug: string | null;
  onlineName: string | null;
  onlineDescription: string | null;
  onlineCategoryId: number | null;
  brandId: number | null;
  brandAbsencePolicy: BrandAbsencePolicy | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seo: EcommerceAdminSeoMetadataResponse | null;
  primaryAsset: EcommerceAdminPrimaryAssetResponse | null;
  activePriceOverride: EcommerceAdminPriceOverrideResponse | null;
  effectivePrice: EcommerceAdminEffectivePriceResponse | null;
  publicationValidation: EcommerceAdminPublicationValidationResponse;
}

export interface EcommerceAdminUpdateOnlineProfileRequest {
  slug: string | null;
  onlineName: string | null;
  onlineDescription: string | null;
  onlineCategoryId: number | null;
  brandId: number | null;
  brandAbsencePolicy: BrandAbsencePolicy | null;
}

export interface EcommerceAdminUpsertSeoRequest {
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  robotsPolicy: RobotsPolicy | null;
  indexable: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
}

export interface EcommerceAdminUpsertPrimaryAssetRequest {
  assetType: AssetType;
  assetUrl: string;
  altText: string | null;
  source: AssetSource;
  rightsConfirmed: boolean;
  displayOrder: number;
}

export interface EcommerceAdminUpsertPriceOverrideRequest {
  amount: number;
  currency: string | null;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
  reason: string | null;
}

export interface EcommerceAdminBrandResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EcommerceAdminOnlineCategoryResponse {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
