import type { Metadata } from "next";

import { PostDetail } from "@/components/PostDetail";
import { excerpt, getPublicPost } from "@/lib/public-post";
import { SITE_NAME } from "@/lib/site";
import { STATUS_META } from "@/lib/types";

/**
 * Per-idea link previews. Only published ideas get their own title and
 * description; anything else keeps the site defaults and stays out of
 * search, so sharing a pending idea's URL reveals nothing about it. The
 * image comes from the opengraph-image route next to this file.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await getPublicPost(id);
  if (!found) return { robots: { index: false, follow: false } };

  const { post } = found;
  const votes = `${post.voteCount} ${post.voteCount === 1 ? "vote" : "votes"}`;
  const summary = `${STATUS_META[post.status].label} · ${votes}`;
  const description = post.body.trim()
    ? `${summary} — ${excerpt(post.body, 180)}`
    : `${summary}. Vote on what Ryder builds next.`;

  return {
    title: post.title,
    description,
    alternates: { canonical: `/p/${post.id}` },
    openGraph: {
      title: post.title,
      description,
      // A child openGraph replaces the root one rather than merging, so the
      // site-wide fields are repeated here.
      siteName: SITE_NAME,
      locale: "en_US",
      type: "article",
      url: `/p/${post.id}`,
      publishedTime: new Date(post.createdAt).toISOString(),
      modifiedTime: new Date(post.updatedAt).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostDetail postId={id} />;
}
