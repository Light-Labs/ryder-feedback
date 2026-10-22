import { ImageResponse } from "next/og";

import { RyderIcon } from "@/components/RyderIcon";
import { ANEK_BOLD_EXPANDED, OG, loadGoogleFont } from "@/lib/og";

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
 * The mark fills with currentColor, which Satori resolves from the `color`
 * on its wrapper.
 */
export const alt = "Ryder Feedback — vote on what Ryder builds next";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORD = "Feedback";

export default async function OpengraphImage() {
  const anek = await loadGoogleFont(ANEK_BOLD_EXPANDED, WORD);

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
          background: OG.page,
          color: OG.ink,
        }}
      >
        <div style={{ display: "flex", color: OG.brand }}>
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
