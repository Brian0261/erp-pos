import type { PublicResponsiveImageResponse, PublicResponsiveImageVariantResponse } from "@/types/storefront";

const IMAGE_ALLOWED_DOMAINS_ENV = "STOREFRONT_IMAGE_ALLOWED_DOMAINS";
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const BLOCKED_HOST_SUFFIXES = [".test", ".example", ".example.com", ".example.test"];

export type StorefrontImageRemotePattern = {
  protocol: "https";
  hostname: string;
  pathname: "/**";
};

export type SafeResponsiveImageVariant = {
  url: string;
  mimeType: "image/webp";
  width: number;
  height: number;
};

export function getStorefrontImageAllowedDomains() {
  const raw = process.env[IMAGE_ALLOWED_DOMAINS_ENV] ?? "";

  return Array.from(
    new Set(
      raw
        .split(",")
        .map(normalizeConfiguredDomain)
        .filter((domain): domain is string => !!domain && isAllowedConfiguredDomain(domain)),
    ),
  );
}

export function getStorefrontImageRemotePatterns(): StorefrontImageRemotePattern[] {
  return getStorefrontImageAllowedDomains().flatMap((domain) => [
    { protocol: "https", hostname: domain, pathname: "/**" },
    { protocol: "https", hostname: `**.${domain}`, pathname: "/**" },
  ]);
}

export function getSafeImageSrc(src?: string | null) {
  const value = trimToNull(src);
  if (!value || containsUnsafeCharacters(value)) {
    return null;
  }

  if (isSafePublicRelativePath(value)) {
    return value;
  }
  if (value.startsWith("/") || value.includes("\\")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }
  if (url.username || url.password) {
    return null;
  }
  if (!url.hostname || !url.pathname || !url.pathname.startsWith("/")) {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!isAllowedConfiguredDomain(host) || !isHostAllowedByStorefront(host)) {
    return null;
  }

  return value;
}

export function getSafeOpenGraphImage(src?: string | null) {
  return getSafeImageSrc(src) ?? undefined;
}

export function getSafeResponsiveImageVariants(
  fallbackSrc?: string | null,
  responsive?: PublicResponsiveImageResponse | null,
): SafeResponsiveImageVariant[] {
  if (!getSafeImageSrc(fallbackSrc) || !responsive?.variants?.length) {
    return [] as SafeResponsiveImageVariant[];
  }

  const uniqueWidths = new Set<number>();
  const uniqueUrls = new Set<string>();

  return responsive.variants
    .flatMap((variant) => toSafeResponsiveVariant(variant))
    .sort((left, right) => left.width - right.width)
    .filter((variant) => {
      if (uniqueWidths.has(variant.width) || uniqueUrls.has(variant.url)) {
        return false;
      }
      uniqueWidths.add(variant.width);
      uniqueUrls.add(variant.url);
      return true;
    });
}

export function pickResponsiveImageVariant(
  variants: SafeResponsiveImageVariant[],
  requestedWidth?: number,
) {
  if (!variants.length) {
    return null;
  }

  const width = typeof requestedWidth === "number" && requestedWidth > 0 ? requestedWidth : variants[0].width;
  return variants.find((variant) => variant.width >= width) ?? variants[variants.length - 1] ?? null;
}

export function getSafeImageAlt(altText: string | null | undefined, fallback: string) {
  return trimToNull(altText) ?? fallback;
}

function toSafeResponsiveVariant(variant: PublicResponsiveImageVariantResponse | null | undefined) {
  if (!variant || variant.mimeType !== "image/webp" || variant.width <= 0 || variant.height <= 0) {
    return [] as SafeResponsiveImageVariant[];
  }

  const safeUrl = getSafeImageSrc(variant.url);
  if (!safeUrl) {
    return [] as SafeResponsiveImageVariant[];
  }

  return [{
    url: safeUrl,
    mimeType: "image/webp" as const,
    width: variant.width,
    height: variant.height,
  }];
}

function isHostAllowedByStorefront(host: string) {
  return getStorefrontImageAllowedDomains().some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isSafePublicRelativePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

function normalizeConfiguredDomain(rawDomain: string) {
  const value = trimToNull(rawDomain);
  if (!value || containsUnsafeCharacters(value)) {
    return null;
  }

  let domain = value.replace(/^https:\/\//i, "").replace(/^http:\/\//i, "");
  const slashIndex = domain.indexOf("/");
  if (slashIndex >= 0) {
    domain = domain.substring(0, slashIndex);
  }
  const portIndex = domain.indexOf(":");
  if (portIndex >= 0) {
    domain = domain.substring(0, portIndex);
  }

  return trimToNull(domain)?.toLowerCase() ?? null;
}

function isAllowedConfiguredDomain(host: string) {
  return !BLOCKED_HOSTS.has(host) &&
    !BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)) &&
    !isPrivateIpAddress(host);
}

function isPrivateIpAddress(host: string) {
  if (isIpv4(host)) {
    const [first, second] = host.split(".").map(Number);
    return first === 10 ||
      first === 127 ||
      first === 0 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254);
  }

  return host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:");
}

function isIpv4(host: string) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return false;
  }

  return host.split(".").every((part) => Number(part) <= 255);
}

function containsUnsafeCharacters(value: string) {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127 || /\s/.test(char);
  });
}

function trimToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
