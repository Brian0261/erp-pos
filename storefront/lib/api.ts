import type {
  PublicCategoryDetailResponse,
  PublicCategoryListItemResponse,
  PublicErrorResponse,
  PublicPageResponse,
  PublicProductDetailResponse,
  PublicProductListItemResponse,
  PublicSitemapResponse,
} from "@/types/storefront";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT_MS = 8_000;
const STOREFRONT_BASE_PATH = "/api/v1/storefront";

export interface StorefrontPageParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface StorefrontProductPageParams extends StorefrontPageParams {
  categorySlug?: string;
}

export type StorefrontFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export class StorefrontApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly traceId?: string | null;
  readonly publicMessage: string;

  constructor(params: {
    code?: string;
    message: string;
    publicMessage: string;
    status: number;
    traceId?: string | null;
  }) {
    super(params.message);
    this.name = "StorefrontApiError";
    this.code = params.code;
    this.status = params.status;
    this.traceId = params.traceId;
    this.publicMessage = params.publicMessage;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

function getStorefrontBaseUrl() {
  return (process.env.STOREFRONT_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function normalizeStorefrontPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath.includes("/api/v1/ecommerce-admin")) {
    throw new StorefrontApiError({
      code: "FORBIDDEN_ADMIN_ENDPOINT",
      message: "Storefront client cannot call administrative endpoints.",
      publicMessage: "No se pudo consultar el catalogo publico.",
      status: 500,
    });
  }

  if (!normalizedPath.startsWith(STOREFRONT_BASE_PATH)) {
    return `${STOREFRONT_BASE_PATH}${normalizedPath}`;
  }

  return normalizedPath;
}

function buildStorefrontUrl(path: string) {
  return new URL(normalizeStorefrontPath(path), `${getStorefrontBaseUrl()}/`);
}

function appendPageParams(url: URL, params?: StorefrontPageParams) {
  if (params?.page !== undefined) {
    url.searchParams.set("page", String(params.page));
  }
  if (params?.size !== undefined) {
    url.searchParams.set("size", String(params.size));
  }
  if (params?.sort) {
    url.searchParams.set("sort", params.sort);
  }
  return url;
}

function appendProductParams(url: URL, params?: StorefrontProductPageParams) {
  appendPageParams(url, params);
  if (params?.categorySlug?.trim()) {
    url.searchParams.set("categorySlug", params.categorySlug.trim());
  }
  return url;
}

async function parsePublicError(response: Response): Promise<PublicErrorResponse | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as PublicErrorResponse;
  } catch {
    return null;
  }
}

function toStorefrontApiError(response: Response, payload: PublicErrorResponse | null) {
  if (response.status === 404) {
    return new StorefrontApiError({
      code: payload?.code ?? "PUBLIC_RESOURCE_NOT_FOUND",
      message: "Storefront public resource was not found.",
      publicMessage: "El recurso publico no existe o no esta disponible.",
      status: 404,
      traceId: payload?.traceId,
    });
  }

  return new StorefrontApiError({
    code: payload?.code,
    message: `Storefront API request failed with status ${response.status}.`,
    publicMessage: "No se pudo consultar el catalogo publico.",
    status: response.status,
    traceId: payload?.traceId,
  });
}

function toTimeoutError() {
  return new StorefrontApiError({
    code: "STOREFRONT_TIMEOUT",
    message: "Storefront API request timed out.",
    publicMessage: "El catalogo publico tardo demasiado en responder.",
    status: 504,
  });
}

export async function fetchStorefront<T>(path: string, options: StorefrontFetchOptions = {}): Promise<T> {
  const { headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  try {
    const response = await fetch(buildStorefrontUrl(path), {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw toStorefrontApiError(response, await parsePublicError(response));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof StorefrontApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw toTimeoutError();
    }

    throw new StorefrontApiError({
      code: "STOREFRONT_NETWORK_ERROR",
      message: "Storefront API request failed before receiving a response.",
      publicMessage: "No se pudo consultar el catalogo publico.",
      status: 502,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function getStorefrontProducts(params?: StorefrontProductPageParams) {
  const url = appendProductParams(new URL("/catalog/products", "http://storefront.local"), params);
  return fetchStorefront<PublicPageResponse<PublicProductListItemResponse>>(
    `${url.pathname}${url.search}`,
  );
}

export function getStorefrontProductBySlug(slug: string) {
  return fetchStorefront<PublicProductDetailResponse>(
    `/catalog/products/${encodeURIComponent(slug)}`,
  );
}

export function getStorefrontCategories(params?: StorefrontPageParams) {
  const url = appendPageParams(new URL("/catalog/categories", "http://storefront.local"), params);
  return fetchStorefront<PublicPageResponse<PublicCategoryListItemResponse>>(
    `${url.pathname}${url.search}`,
  );
}

export function getStorefrontCategoryBySlug(slug: string) {
  return fetchStorefront<PublicCategoryDetailResponse>(
    `/catalog/categories/${encodeURIComponent(slug)}`,
  );
}

export function getStorefrontSitemap() {
  return fetchStorefront<PublicSitemapResponse>("/seo/sitemap");
}
