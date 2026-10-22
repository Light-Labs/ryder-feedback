import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Served as /sitemap.xml, which robots.txt points at. Only the two fixed
 * public pages: individual posts are reached by crawling the board.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/roadmap`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
