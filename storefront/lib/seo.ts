const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";

export function isStorefrontIndexingEnabled() {
  return process.env.STOREFRONT_INDEXING_ENABLED === "true";
}

export function getStorefrontPublicBaseUrl() {
  const rawBaseUrl = process.env.STOREFRONT_PUBLIC_BASE_URL?.trim() || DEFAULT_PUBLIC_BASE_URL;

  try {
    return new URL(rawBaseUrl).origin;
  } catch {
    return DEFAULT_PUBLIC_BASE_URL;
  }
}

export function buildStorefrontPublicUrl(path: string) {
  return new URL(path, `${getStorefrontPublicBaseUrl()}/`).toString();
}

export function getStorefrontRobotsMetadata() {
  const indexable = isStorefrontIndexingEnabled();

  return {
    index: indexable,
    follow: indexable,
  };
}
