import type { MetadataRoute } from "next";
import { getStorefrontSitemap } from "@/lib/api";
import { buildStorefrontPublicUrl } from "@/lib/seo";

function toAbsolutePublicUrl(loc: string) {
  try {
    const url = new URL(loc);
    return buildStorefrontPublicUrl(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return buildStorefrontPublicUrl(loc);
  }
}

function getFallbackSitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ["/", "/productos", "/categorias"].map((path) => ({
    url: buildStorefrontPublicUrl(path),
    lastModified,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const sitemapResponse = await getStorefrontSitemap();

    return sitemapResponse.entries.map((entry) => ({
      url: toAbsolutePublicUrl(entry.loc),
      lastModified: entry.lastModified ? new Date(entry.lastModified) : undefined,
    }));
  } catch {
    return getFallbackSitemap();
  }
}
