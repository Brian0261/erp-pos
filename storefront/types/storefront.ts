/**
 * Tipos publicos del contrato Storefront API.
 * Reflejan los records Java en `adapter.dto.storefront`.
 */

export interface PublicPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface PublicImageResponse {
  url: string;
  altText: string | null;
  type: string | null;
  displayOrder: number | null;
  responsive?: PublicResponsiveImageResponse | null;
}

export interface PublicResponsiveImageResponse {
  variants: PublicResponsiveImageVariantResponse[];
}

export interface PublicResponsiveImageVariantResponse {
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface PublicPriceResponse {
  amount: number;
  currency: string;
  formatted: string;
}

export interface PublicAvailabilityResponse {
  status: string;
  label: string;
  purchasable: boolean;
}

export interface PublicCategorySummaryResponse {
  slug: string;
  name: string;
}

export interface PublicBrandSummaryResponse {
  slug: string;
  name: string;
}

export interface PublicSeoResponse {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  indexable: boolean;
}

export interface PublicProductListItemResponse {
  slug: string;
  name: string;
  shortDescription: string | null;
  primaryImage: PublicImageResponse | null;
  price: PublicPriceResponse;
  availability: PublicAvailabilityResponse;
  category: PublicCategorySummaryResponse | null;
  brand: PublicBrandSummaryResponse | null;
}

export interface PublicProductDetailResponse {
  slug: string;
  name: string;
  description: string | null;
  primaryImage: PublicImageResponse | null;
  gallery: PublicImageResponse[];
  price: PublicPriceResponse;
  availability: PublicAvailabilityResponse;
  category: PublicCategorySummaryResponse | null;
  brand: PublicBrandSummaryResponse | null;
  seo: PublicSeoResponse | null;
  canonicalUrl: string;
  indexable: boolean;
}

export interface PublicCategoryListItemResponse {
  slug: string;
  name: string;
  description: string | null;
}

export interface PublicCategoryDetailResponse {
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
  seo: PublicSeoResponse | null;
  canonicalUrl: string;
  indexable: boolean;
}

export interface PublicSitemapEntryResponse {
  loc: string;
  type: string;
  lastModified: string;
}

export interface PublicSitemapResponse {
  generatedAt: string;
  entries: PublicSitemapEntryResponse[];
  totalEntries: number;
}

export interface PublicErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  traceId: string | null;
}
