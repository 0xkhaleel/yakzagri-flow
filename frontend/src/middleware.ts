import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Origins allowed to be embedded as frames and connected to (wallet providers).
 * Drives both `connect-src` and `frame-src` below.
 */
const WALLET_FRAME_ALLOWLIST = [
  "https://walletconnect.com",
  "https://*.walletconnect.com",
  "https://verify.walletconnect.com",
  "https://*.walletconnect.org",
];

/**
 * IPFS/storage origins used for video proof upload and playback.
 * `gateway.pinata.cloud` serves pinned proof videos; `api.pinata.cloud`
 * receives the upload from VideoUploadCard.
 */
const IPFS_MEDIA_ORIGINS = [
  "https://gateway.pinata.cloud",
  "https://*.mypinata.cloud",
  "https://ipfs.io",
  "https://*.ipfs.io",
];

/**
 * Build the Content-Security-Policy for a given request.
 *
 * Every directive/source is documented so the policy can be reviewed and
 * tightened without guesswork. Keep this strict: no broad wildcards, and
 * only add a source when a concrete feature requires it.
 */
function buildCsp(nonce: string): string {
  const directives: Record<string, string[]> = {
    // Fallback for directives that are not declared explicitly.
    "default-src": ["'self'"],

    // Scripts: Next.js requires a per-request nonce; 'strict-dynamic' lets
    // nonce-trusted scripts load their own dependencies.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],

    // Styles: 'unsafe-inline' is required by the toast library, which injects
    // inline <style> tags at runtime.
    "style-src": ["'self'", "'unsafe-inline'"],

    // Images: local assets plus data: URIs and IPFS gateways for proof media.
    "img-src": ["'self'", "data:", "blob:", ...IPFS_MEDIA_ORIGINS],

    // Media: video proof upload/playback. `blob:` is required for the local
    // preview created via URL.createObjectURL in VideoUploadCard; the IPFS
    // origins allow playback of pinned proof videos.
    "media-src": ["'self'", "blob:", ...IPFS_MEDIA_ORIGINS],

    // Fonts: self-hosted only.
    "font-src": ["'self'"],

    // Connections: self, wallet providers, and IPFS upload/gateway origins.
    "connect-src": [
      "'self'",
      ...WALLET_FRAME_ALLOWLIST,
      ...IPFS_MEDIA_ORIGINS,
    ],

    // Frames: wallet provider iframes only.
    "frame-src": ["'self'", ...WALLET_FRAME_ALLOWLIST],

    // Workers: self only.
    "worker-src": ["'self'", "blob:"],

    // Lock down embedding and base/form targets.
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Report-only during the rollover window (#202); flip to the enforcing
  // `Content-Security-Policy` header once violations are clean.
  response.headers.set("Content-Security-Policy-Report-Only", csp);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
