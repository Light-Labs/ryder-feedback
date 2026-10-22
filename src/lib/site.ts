/**
 * Site identity, shared by the root metadata, the social card, robots.txt
 * and the sitemap so they can never disagree about the name or origin.
 */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Ryder Feedback";

/**
 * Where the site is served. Social crawlers need the og:image URL to be
 * absolute, and without this Next.js would build it against localhost.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://feedback.ryder.id";
