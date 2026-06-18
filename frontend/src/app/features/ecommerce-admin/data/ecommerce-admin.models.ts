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

export type EcommerceOnlineProfileImportAction =
  | "CREATE"
  | "UPDATE"
  | "NO_CHANGE"
  | "REJECT";

export type EcommercePrimaryImageUrlImportAction =
  | "CREATE"
  | "UPDATE"
  | "NO_CHANGE"
  | "REJECT";

export type EcommercePrimaryImageBinaryImportAction = EcommercePrimaryImageUrlImportAction;

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
  storageProvider: string | null;
  storageBucket: string | null;
  storageKey: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  originalFilename: string | null;
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
  missingRequirements: MissingRequirement[];
}

export interface EcommerceAdminOnlineProfileDetailResponse {
  profileId: number;
  productId: number;
  productSku: string | null;
  productName: string | null;
  productActive: boolean;
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

export interface EcommerceOnlineProfileImportPreviewRow {
  rowNumber: number;
  sku: string | null;
  productName: string | null;
  publicationStatus: OnlinePublicationStatus | null;
  onlineName: string | null;
  slug: string | null;
  onlineDescription: string | null;
  onlineCategorySlug: string | null;
  brandSlug: string | null;
  brandAbsencePolicy: string | null;
  action: EcommerceOnlineProfileImportAction;
  valid: boolean;
  errors: string[];
  generatedFields: string[];
}

export interface EcommerceOnlineProfileImportPreviewResponse {
  totalRows: number;
  createRows: number;
  updateRows: number;
  unchangedRows: number;
  rejectedRows: number;
  rows: EcommerceOnlineProfileImportPreviewRow[];
}

export interface EcommerceOnlineProfileImportConfirmRowResponse {
  rowNumber: number;
  sku: string | null;
  action: EcommerceOnlineProfileImportAction;
  applied: boolean;
  profileId: number | null;
  errors: string[];
}

export interface EcommerceOnlineProfileImportConfirmResponse {
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  rejectedRows: number;
  rows: EcommerceOnlineProfileImportConfirmRowResponse[];
}

export interface EcommercePrimaryImageUrlImportPreviewRow {
  rowNumber: number;
  sku: string | null;
  productId: number | null;
  profileId: number | null;
  productName: string | null;
  publicationStatus: OnlinePublicationStatus | null;
  currentAssetUrl: string | null;
  imageUrl: string | null;
  altText: string | null;
  source: AssetSource | null;
  rightsConfirmed: boolean | null;
  assetType: AssetType | null;
  displayOrder: number | null;
  action: EcommercePrimaryImageUrlImportAction;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EcommercePrimaryImageUrlImportPreviewResponse {
  totalRows: number;
  createRows: number;
  updateRows: number;
  unchangedRows: number;
  rejectedRows: number;
  warningRows: number;
  rows: EcommercePrimaryImageUrlImportPreviewRow[];
}

export interface EcommercePrimaryImageUrlImportConfirmRowResponse {
  rowNumber: number;
  sku: string | null;
  productId: number | null;
  profileId: number | null;
  action: EcommercePrimaryImageUrlImportAction;
  applied: boolean;
  errors: string[];
  warnings: string[];
}

export interface EcommercePrimaryImageUrlImportConfirmResponse {
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  rejectedRows: number;
  warningRows: number;
  rows: EcommercePrimaryImageUrlImportConfirmRowResponse[];
}

export interface EcommercePrimaryImageBinaryImportPreviewRow {
  rowNumber: number;
  sku: string | null;
  productId: number | null;
  profileId: number | null;
  productName: string | null;
  publicationStatus: OnlinePublicationStatus | null;
  currentAssetUrl: string | null;
  imageFile: string | null;
  altText: string | null;
  source: AssetSource | null;
  rightsConfirmed: boolean | null;
  assetType: AssetType | null;
  displayOrder: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  action: EcommercePrimaryImageBinaryImportAction;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EcommercePrimaryImageBinaryImportPreviewResponse {
  totalRows: number;
  createRows: number;
  updateRows: number;
  unchangedRows: number;
  rejectedRows: number;
  warningRows: number;
  rows: EcommercePrimaryImageBinaryImportPreviewRow[];
}

export interface EcommercePrimaryImageBinaryImportConfirmRowResponse {
  rowNumber: number;
  sku: string | null;
  productId: number | null;
  profileId: number | null;
  action: EcommercePrimaryImageBinaryImportAction;
  applied: boolean;
  assetUrl: string | null;
  storageKey: string | null;
  errors: string[];
  warnings: string[];
}

export interface EcommercePrimaryImageBinaryImportConfirmResponse {
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  rejectedRows: number;
  warningRows: number;
  rows: EcommercePrimaryImageBinaryImportConfirmRowResponse[];
}
