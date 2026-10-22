import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Served as /robots.txt. The board, roadmap and post pages are public and
 * meant to be found; the moderation area, the API and the per-user page
 * are not worth crawling and only render for a signed-in viewer anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/me"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
