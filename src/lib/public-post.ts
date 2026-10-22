import "server-only";

import { cache } from "react";

import { adminDb } from "./firebase/admin";
import { isPubliclyVisible, toPost } from "./serialize";
import type { Post } from "./types";

export interface PublicPost {
  post: Post;
  boardName: string | null;
}

/**
 * One post for link previews, read with the admin SDK on the server.
 *
 * Returns null for anything the public cannot see — pending, rejected,
 * merged or missing — so a shared link to an unapproved idea unfurls as the
 * generic card and never leaks its title. Wrapped in cache() so the page's
 * metadata and anything else in the same render share one read; the
 * opengraph-image route is its own request and reads again.
 */
export const getPublicPost = cache(
  async (id: string): Promise<PublicPost | null> => {
    // Firestore rejects ids containing "/", and anything this long is not
    // one of ours; skip the round trip for junk paths.
    if (!id || id.length > 128 || id.includes("/")) return null;
    try {
      const db = adminDb();
      const snap = await db.doc(`posts/${id}`).get();
      if (!snap.exists || !isPubliclyVisible(snap.data())) return null;
      const post = toPost(snap);
      const board = post.boardId
        ? await db.doc(`boards/${post.boardId}`).get()
        : null;
      const boardName = board?.exists ? String(board.data()?.name ?? "") : "";
      return { post, boardName: boardName || null };
    } catch (err) {
      // A preview is never worth a failed page: fall back to the generic one.
      console.error("getPublicPost failed", id, err);
      return null;
    }
  },
);

/** Collapse whitespace and cut at a word boundary, for meta descriptions. */
export function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}
