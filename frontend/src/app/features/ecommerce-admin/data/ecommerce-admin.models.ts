export type OnlinePublicationStatus =
  | "DRAFT"
  | "INCOMPLETE"
  | "READY_FOR_REVIEW"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "BLOCKED";

export type ReadinessStatus =
  | "READY"
  | "INCOMPLETE"
  | "NEEDS_ATTENTION"
  | "PUBLISHED"
  | "UNPUBLISHED";

export type MissingRequirement =
  | "PRODUCT_INACTIVE"
  | "SKU_MISSING"
  | "ONLINE_NAME_MISSING"
  | "ONLINE_DESCRIPTION_MISSING"
  | "SLUG_MISSING"
  | "SLUG_DUPLICATE"
  | "CATEGORY_MISSING"
  | "CATEGORY_INACTIVE"
  | "BRAND_MISSING"
  | "BRAND_INACTIVE"
  | "ASSET_MISSING"
  | "ASSET_INVALID"
  | "SEO_MISSING"
  | "SEO_INCOMPLETE"
  | "PRICE_INVALID";

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
  productSku: string | null;
  productName: string | null;
  productActive: boolean;
  publicationStatus: OnlinePublicationStatus;
  slug: string | null;
  onlineName: string | null;
  onlineCategoryId: number | null;
  onlineCategoryName: string | null;
  brandId: number | null;
  brandName: string | null;
  brandAbsencePolicy: BrandAbsencePolicy | null;
  publishedAt: string | null;
  updatedAt: string;
  readinessStatus: ReadinessStatus;
  readinessCompleted: number;
  readinessTotal: number;
  missingRequirements: MissingRequirement[];
}

export interface EcommerceAdminOnlineProfileStatusResponse {
  productId: number;
  hasOnlineProfile: boolean;
  publicationStatus: OnlinePublicationStatus | null;
  slug: string | null;
  profileName: string | null;
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

export interface EcommerceAdminBrandRequest {
  name: string;
  slug: string | null;
  description: string | null;
}

export interface EcommerceAdminBrandStatusRequest {
  active: boolean;
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

export interface EcommerceAdminOnlineCategoryRequest {
  parentId: number | null;
  name: string;
  slug: string | null;
  description: string | null;
}

export interface EcommerceAdminOnlineCategoryStatusRequest {
  active: boolean;
}
