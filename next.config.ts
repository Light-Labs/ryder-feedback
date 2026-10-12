import type { NextConfig } from "next";

/**
 * Firebase App Hosting hands the build the web app's config as one JSON blob,
 * FIREBASE_WEBAPP_CONFIG. Spread it into the NEXT_PUBLIC_FIREBASE_* names the
 * client reads, so nothing has to be copied out of the console by hand.
 * Values set explicitly (.env.local, another host) win.
 */
function webAppEnv(): Record<string, string> {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return {};
  const c = JSON.parse(raw) as Record<string, string | undefined>;
  const out: Record<string, string> = {};
  const map: Record<string, string> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "apiKey",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "authDomain",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "projectId",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "storageBucket",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "messagingSenderId",
    NEXT_PUBLIC_FIREBASE_APP_ID: "appId",
  };
  for (const [name, key] of Object.entries(map)) {
    const value = process.env[name] || c[key];
    if (value) out[name] = value;
  }
  return out;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: webAppEnv(),
  // firebase-admin is server-only and pulls in native-ish deps; keep it external
  // so the bundler never tries to trace it into a client or edge chunk.
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // The embeddable widget route is meant to be iframed by ryder.id,
        // so it opts out of the SAMEORIGIN default above.
        source: "/embed/:path*",
        headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }],
      },
    ];
  },
};

export default nextConfig;
