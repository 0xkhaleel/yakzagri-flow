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
 * Wallet-frame exemption process: third-party wallet UIs that must be
 * embedded in an iframe (e.g. a hosted signing widget) should be added to
 * the `frame-src` allowlist below via WALLET_FRAME_ALLOWLIST (comma
 * separated origins) rather than relaxing the policy ad-hoc. Requires
 * security sign-off before merging an addition.
 *
 * PoD video (issue #127): the in-browser recorder captures via
 * getUserMedia/MediaRecorder and plays back the recorded clip from a
 * `blob:` object URL. `media-src` therefore allows `blob:` (and `'self'`
 * for any same-origin media), and the Permissions-Policy below grants
 * `camera`/`microphone` to same-origin so the recorder can request them.
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

function buildCsp(nonce: string): string {
  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": `'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data: blob: https:",
    "media-src": "'self' blob:",
    "font-src": "'self' data:",
    "connect-src": buildConnectSrc(),
    "frame-src": buildFrameSrc(),
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
    "upgrade-insecure-requests": "",
    "report-uri": "/api/csp-report",
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

  response.headers.set(headerName, csp);
  response.headers.set("x-nonce", nonce);

  // Defense-in-depth headers that pair naturally with the CSP rollout.
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=()",
  );

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
