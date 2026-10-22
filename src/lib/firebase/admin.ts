import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { ADMIN_DOMAIN, grantsAdmin } from "../access";

let cached: App | null = null;

function credentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing service account env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  return {
    projectId,
    clientEmail,
    // CI systems and .env files store the key with literal \n sequences.
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

/**
 * On Firebase App Hosting the server runs as the project's own service
 * account, and FIREBASE_CONFIG is set for it, so the Admin SDK finds both the
 * project and its credentials without a key. Everywhere else - local dev,
 * scripts, any other host - the key comes from env vars as before.
 */
function onAppHosting(): boolean {
  return !!process.env.FIREBASE_CONFIG && !process.env.FIREBASE_PRIVATE_KEY;
}

export function adminApp(): App {
  if (cached) return cached;
  const existing = getApps();
  cached = existing.length
    ? existing[0]
    : onAppHosting()
      ? initializeApp()
      : initializeApp({ credential: cert(credentials()) });
  return cached;
}

let dbCache: Firestore | null = null;

export function adminDb(): Firestore {
  if (dbCache) return dbCache;
  const db = getFirestore(adminApp());
  // firebase-admin is a server external, so every route bundle shares one
  // Firestore instance but has its own copy of this module and its cache.
  // The first bundle to get here applies the settings; settings() throws if
  // called again, and the instance already has them, so a later bundle
  // just skips it.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already initialised by another bundle in this process.
  }
  dbCache = db;
  return dbCache;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Verifies the `Authorization: Bearer <idToken>` header and returns the
 * decoded token. Every write path goes through this: the client never gets
 * to assert who it is.
 *
 * About `checkRevoked`, which defaults to on:
 *
 * With it, verification makes a live call to Firebase Auth to ask whether the
 * token has been revoked since it was minted — measured at ~170ms per
 * request from here. Without it, verification is a local signature check
 * against cached public keys, which is effectively free.
 *
 * On is the right default: a route added later should inherit the strict
 * behaviour rather than silently lose it. Individual routes opt out when the
 * latency matters more than the window, and the vote route is the one that
 * does — see the note there for why that trade is safe for a vote and would
 * not be for a comment or an admin action.
 */
export async function requireUser(
  req: Request,
  { checkRevoked = true }: { checkRevoked?: boolean } = {},
): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(header.trim());
  if (!match) throw new AuthError("Missing bearer token", 401);
  try {
    return await adminAuth().verifyIdToken(match[1], checkRevoked);
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }
}

/**
 * Same as requireUser, but also demands admin access: a verified Google
 * account on ADMIN_DOMAIN, or an explicit claim. See src/lib/access.ts for
 * why the rule is written there and not here.
 *
 * Deliberately takes no options: an admin whose access was pulled mid-session
 * is the exact case revocation checking exists for, so this path always pays
 * for it. Revocation is also what makes the domain rule enforceable at all -
 * when someone leaves and Workspace suspends them, their refresh token stops
 * working and this route stops serving them, without anyone remembering to
 * run a script.
 */
export async function requireAdmin(req: Request): Promise<DecodedIdToken> {
  const token = await requireUser(req);
  if (!grantsAdmin(token)) {
    throw new AuthError(`Admin only - sign in with a @${ADMIN_DOMAIN} account`, 403);
  }
  return token;
}
