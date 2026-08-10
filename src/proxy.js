import { NextResponse } from "next/server";
import profileTemplateMapping from "@/lib/profiles/registry";

const RESERVED_TOP_LEVEL = new Set(["manual", "parse"]);

function isKnownProfileSlug(segment) {
  return (
    typeof segment === "string" &&
    segment.length > 0 &&
    Object.prototype.hasOwnProperty.call(profileTemplateMapping, segment)
  );
}

/**
 * Access tokens are substrings of the full URL. A path like /YOUR_TOKEN would
 * otherwise match `pages/[profile].js`, fail slug lookup, and redirect to `/`,
 * stripping the token. Rewrite those requests to `/` while keeping the browser
 * URL unchanged so client APIs still see the secret in `window.location.href`.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  /* /public files (e.g. /email-snippets.json) — rewriting would serve HTML and break JSON fetch */
  if (/\.(json|ico|txt|xml|webmanifest|woff2?|ttf|map)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) {
    return NextResponse.next();
  }

  const seg = segments[0];
  if (RESERVED_TOP_LEVEL.has(seg) || isKnownProfileSlug(seg)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml|webmanifest|woff2?|ttf|map)$).*)",
  ],
};
