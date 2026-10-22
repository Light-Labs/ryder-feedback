import { ImageResponse } from "next/og";

import { RyderLogo } from "@/components/RyderLogo";
import { RyderIcon } from "@/components/RyderIcon";

/**
 * The social card every page shares unless it brings its own. It has no
 * params and reads nothing at request time, so Next.js renders it once at
 * build and serves a static PNG.
 *
 * Colours are the dark ramp and brand blue from globals.css, written out as
 * literals because Satori never sees the stylesheet. The lockup and mark are
 * the same components the header uses: they fill with currentColor, which
 * Satori resolves from the `color` set on their wrapper.
 */
export const alt = "Ryder — vote on what we build next";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADLINE = "Tell us what to build next.";
const SUBLINE = "Feature requests, votes and the public roadmap.";

/**
 * The site's two faces: Anek Latin Expanded Bold for the headline, Geist for
 * the line under it. Satori takes neither woff2 nor variable fonts, so this
 * asks Google Fonts for a static TrueType instance subset to just the glyphs
 * the card uses. The build already reaches Google Fonts for next/font; if
 * that fails here too, the card falls back to Satori's built-in face rather
 * than failing the build.
 */
async function loadGoogleFont(
  family: string,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [anek, geist] = await Promise.all([
    loadGoogleFont("Anek+Latin:wdth,wght@125,700", HEADLINE),
    loadGoogleFont("Geist:wght@400", SUBLINE),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#08080a",
          color: "#fafafa",
          padding: "80px 88px",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* The R, oversized and cropped off the right edge. */}
        <div
          style={{
            position: "absolute",
            right: -150,
            top: 110,
            display: "flex",
            color: "#0f3bff",
          }}
        >
          <RyderIcon style={{ width: 560, height: 560 }} />
        </div>

        <div style={{ display: "flex", width: 280, height: 71 }}>
          <RyderLogo />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontFamily: anek ? "Anek Latin" : undefined,
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              maxWidth: 680,
            }}
          >
            {HEADLINE}
          </div>
          <div
            style={{
              fontFamily: geist ? "Geist" : undefined,
              fontSize: 30,
              color: "#898994",
              maxWidth: 620,
            }}
          >
            {SUBLINE}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(anek
          ? [{ name: "Anek Latin", data: anek, weight: 700 as const }]
          : []),
        ...(geist ? [{ name: "Geist", data: geist, weight: 400 as const }] : []),
      ],
    },
  );
}
