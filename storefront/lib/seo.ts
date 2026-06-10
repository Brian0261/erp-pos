const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";
const BLOCKED_PUBLIC_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const BLOCKED_PUBLIC_HOST_SUFFIXES = [".example", ".example.com", ".example.test", ".test"];

export function isStorefrontIndexingEnabled() {
  return process.env.STOREFRONT_INDEXING_ENABLED === "true";
}

function getConfiguredStorefrontPublicBaseUrl() {
  return process.env.STOREFRONT_PUBLIC_BASE_URL?.trim() ?? "";
}

export function getStorefrontPublicBaseUrl() {
  const rawBaseUrl = getConfiguredStorefrontPublicBaseUrl() || DEFAULT_PUBLIC_BASE_URL;

  try {
    return new URL(rawBaseUrl).origin;
  } catch {
    return DEFAULT_PUBLIC_BASE_URL;
  }
}

export function buildStorefrontPublicUrl(path: string) {
  return new URL(path, `${getStorefrontPublicBaseUrl()}/`).toString();
}

export function isStorefrontPublicBaseUrlIndexable() {
  const rawBaseUrl = getConfiguredStorefrontPublicBaseUrl();

  if (!rawBaseUrl) {
    return false;
  }

  try {
    const hostname = new URL(rawBaseUrl).hostname.toLowerCase();

    if (BLOCKED_PUBLIC_HOSTS.has(hostname)) {
      return false;
    }

    return !BLOCKED_PUBLIC_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function canStorefrontAllowIndexing() {
  return isStorefrontIndexingEnabled() && isStorefrontPublicBaseUrlIndexable();
}

export function getStorefrontRobotsMetadata() {
  const indexable = canStorefrontAllowIndexing();

  return {
    index: indexable,
    follow: indexable,
  };
}
