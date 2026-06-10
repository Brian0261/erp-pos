import type { MetadataRoute } from "next";
import { buildStorefrontPublicUrl, isStorefrontIndexingEnabled } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!isStorefrontIndexingEnabled()) {
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
