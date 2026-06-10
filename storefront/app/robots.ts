import type { MetadataRoute } from "next";
import { buildStorefrontPublicUrl, canStorefrontAllowIndexing } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!canStorefrontAllowIndexing()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/productos", "/categorias"],
    },
    sitemap: buildStorefrontPublicUrl("/sitemap.xml"),
  };
}
