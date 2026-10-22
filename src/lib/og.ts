/**
 * Shared pieces for the social cards in app/opengraph-image.tsx and
 * app/p/[id]/opengraph-image.tsx. Satori never sees globals.css, so the
 * colours it needs are written out here as literals.
 */

/** The dark ramp and brand blue, as in globals.css. */
export const OG = {
  page: "#08080a",
  raised: "#101014",
  stroke: "#1c1c22",
  ink: "#fafafa",
  ink2: "#898994",
  brand: "#0f3bff",
} as const;

/**
 * A static TrueType instance from Google Fonts, subset to `text`.
 *
 * Satori takes neither woff2 nor variable fonts, and the CSS API serves
 * TrueType to a client that does not ask for anything newer, so `family`
 * pins every axis (e.g. "Anek+Latin:wdth,wght@125,700") to get one static
 * face. The build already reaches Google Fonts for next/font; if this
 * fails, callers fall back to Satori's built-in face rather than failing.
 * force-cache keeps repeat renders of the same text off the network.
 */
export async function loadGoogleFont(
  family: string,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
      { cache: "force-cache" },
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url, { cache: "force-cache" });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export const ANEK_BOLD_EXPANDED = "Anek+Latin:wdth,wght@125,700";
export const GEIST_REGULAR = "Geist:wght@400";
export const GEIST_MEDIUM = "Geist:wght@500";
