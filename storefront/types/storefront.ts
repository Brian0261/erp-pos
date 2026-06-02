/**
 * Tipos publicos del contrato Storefront API.
 * Estos tipos reflejan los DTOs publicos del backend.
 */

export interface StorefrontProduct {
  slug: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

export interface StorefrontCategory {
  slug: string;
  name: string;
}

export interface StorefrontSitemapEntry {
  url: string;
  lastModified?: string;
  priority?: number;
}
