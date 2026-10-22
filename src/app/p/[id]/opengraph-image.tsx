import { ImageResponse } from "next/og";

import { RyderLogo } from "@/components/RyderLogo";
import {
  ANEK_BOLD_EXPANDED,
  GEIST_MEDIUM,
  OG,
  loadGoogleFont,
} from "@/lib/og";
import { excerpt, getPublicPost } from "@/lib/public-post";
import { STATUS_META, type PostStatus } from "@/lib/types";

import SiteCard from "../../opengraph-image";

/**
 * The card a shared idea unfurls with: its status, its title and how many
 * people back it, drawn from the post itself.
 *
 * Like the site card, everything that matters sits in the centre 630×630,
 * because Slack and iMessage crop to a square from the middle. The lockup
 * and the address in the corners are for the wide views (X, LinkedIn,
 * Discord) and are the parts a square crop may lose.
 *
 * The route is dynamic, so caching comes from the response header: the
 * App Hosting CDN keeps each card for ten minutes, fresh enough for a vote
 * count, without a Firestore read and a render on every crawler hit.
 */
const CACHE_CONTROL =
  "public, max-age=600, s-maxage=600, stale-while-revalidate=86400";
export const alt = "An idea on the Ryder feedback board";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The dark-theme Label pairs from globals.css for each status. In progress
 * keeps its high-contrast amber, as on the site, so it is still the
 * loudest chip.
 */
const CHIP: Record<PostStatus, { bg: string; fg: string }> = {
  open: { bg: "#1c1c22", fg: "#c1c1c7" },
  "under-review": { bg: "#3d1400", fg: "#ffaf2e" },
  planned: { bg: "#001b3d", fg: "#398fff" },
  "in-progress": { bg: "#ffaf2e", fg: "#3d1400" },
  shipped: { bg: "#0a1f11", fg: "#00c357" },
  declined: { bg: "#320f0f", fg: "#ff5062" },
};

/** Longer titles step down a size so three lines still fit the square. */
function titleSize(title: string): number {
  if (title.length <= 24) return 76;
  if (title.length <= 48) return 58;
  if (title.length <= 72) return 50;
  return 42;
}

export default async function PostImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getPublicPost(id);
  // Pending, rejected, merged or missing: the generic card, nothing leaked.
  if (!found) return SiteCard();

  const { post, boardName } = found;
  const title = excerpt(post.title, 100);
  const chip = CHIP[post.status];
  const status = STATUS_META[post.status].label;
  const votes = String(post.voteCount);
  const votesLabel = post.voteCount === 1 ? "vote" : "votes";
  const comments = post.commentCount
    ? `${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`
    : null;
  const meta = [status, boardName, votesLabel, comments, "feedback.ryder.id"]
    .filter(Boolean)
    .join(" ");

  const [anek, geist] = await Promise.all([
    loadGoogleFont(ANEK_BOLD_EXPANDED, title + votes),
    loadGoogleFont(GEIST_MEDIUM, meta + "·"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: OG.page,
          color: OG.ink,
          fontFamily: geist ? "Geist" : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 56,
            display: "flex",
          }}
        >
          <RyderLogo style={{ width: 158, height: 40 }} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 56,
            fontSize: 22,
            color: OG.ink2,
          }}
        >
          feedback.ryder.id
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 24px",
              borderRadius: 999,
              background: chip.bg,
              color: chip.fg,
            }}
          >
            {status}
          </div>
          {boardName ? (
            <div style={{ color: OG.ink2 }}>{boardName}</div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 40,
            maxWidth: 620,
            textAlign: "center",
            fontFamily: anek ? "Anek Latin" : undefined,
            fontSize: titleSize(title),
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 52,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* The vote arrow from VoteButton, filled as it is once voted. */}
          <svg width="56" height="56" viewBox="0 0 16 16">
            <path
              d="M8 3.2 13.4 10H2.6L8 3.2Z"
              fill={OG.brand}
              stroke={OG.brand}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              fontFamily: anek ? "Anek Latin" : undefined,
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {votes}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 26,
              lineHeight: 1.25,
              color: OG.ink2,
            }}
          >
            <span>{votesLabel}</span>
            {comments ? <span>{comments}</span> : null}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": CACHE_CONTROL },
      fonts: [
        ...(anek
          ? [{ name: "Anek Latin", data: anek, weight: 700 as const }]
          : []),
        ...(geist ? [{ name: "Geist", data: geist, weight: 500 as const }] : []),
      ],
    },
  );
}
