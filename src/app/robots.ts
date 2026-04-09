import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/platform/readiness.public";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/vendor/", "/admin/", "/account/", "/api/", "/checkout/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
