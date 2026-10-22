import { ImageResponse } from "next/og";

import { RyderIcon } from "@/components/RyderIcon";

/**
 * The social card every page shares unless it brings its own. It has no
 * params and reads nothing at request time, so Next.js renders it once at
 * build and serves a static PNG.
 *
 * Everything sits in the centre 630×630 square. Slack, iMessage and others
 * show the card as a small square thumbnail cropped from the middle, and
 * the unfurl already prints the title and description beside it, so the
 * card carries the mark and one word rather than a sentence that would be
 * cut in half.
 *
 * Colours are the dark ramp and brand blue from globals.css, written out as
 * literals because Satori never sees the stylesheet. The mark fills with
 * currentColor, which Satori resolves from the `color` on its wrapper.
 */
export const alt = "Ryder Feedback — vote on what Ryder builds next";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORD = "Feedback";

/**
 * Anek Latin Expanded Bold, the site's headline face. Satori takes neither
 * woff2 nor variable fonts, so this asks Google Fonts for the static
 * TrueType instance at wdth=125, subset to the glyphs the card uses. The
 * build already reaches Google Fonts for next/font; if that fails here too,
 * the card falls back to Satori's built-in face rather than failing the
 * build.
 */
async function loadHeadlineFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Anek+Latin:wdth,wght@125,700&text=${encodeURIComponent(WORD)}`,
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
  const anek = await loadHeadlineFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
          background: "#08080a",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", color: "#0f3bff" }}>
          <RyderIcon style={{ width: 300, height: 300 }} />
        </div>
        <div
          style={{
            fontFamily: anek ? "Anek Latin" : undefined,
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {WORD}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: anek
        ? [{ name: "Anek Latin", data: anek, weight: 700 as const }]
        : undefined,
    },
  );
}
