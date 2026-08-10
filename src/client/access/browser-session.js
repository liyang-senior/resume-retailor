/**
 * Client-only: builds `accessUrl=…` for APIs gated by `config/url-access.json`.
 * After a successful access check, the full URL that matched is stored in
 * sessionStorage so navigation to `/`, `/rahulmonga`, `/manual`, etc. still
 * sends the same accessUrl to the server.
 */

const SESSION_KEY = "rt_access_source_href";

function sameOriginStored(stored) {
  try {
    if (typeof window === "undefined") return false;
    const u = new URL(stored);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Path segment that carries an access token (not a normal profile slug).
 * Profile slugs use lowercase letters, digits, and hyphen only.
 */
function isLikelyAccessPathSegment(segment) {
  if (!segment || typeof segment !== "string") return false;
  if (segment.length > 48) return true;
  return /[^a-z0-9-]/.test(segment);
}

/**
 * Full URL string used for the accessUrl query (current location or last validated).
 */
export function getEffectiveAccessHref() {
  if (typeof window === "undefined") return "";
  try {
    const current = window.location.href;

    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1 && isLikelyAccessPathSegment(segments[0])) {
      return current;
    }
    if (window.location.hash && window.location.hash.length > 2) {
      return current;
    }

    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored && stored.trim() && sameOriginStored(stored)) {
      return stored;
    }
    return current;
  } catch {
    return typeof window !== "undefined" ? window.location.href : "";
  }
}

/** Call after access-gated APIs return 200 using this href. */
export function rememberValidatedAccessHref(href) {
  if (typeof window === "undefined") return;
  try {
    if (typeof href === "string" && href.trim() && sameOriginStored(href)) {
      sessionStorage.setItem(SESSION_KEY, href);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Call when access APIs return 404 or access is invalid. */
export function clearStoredAccessUrl() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessUrlQuery() {
  if (typeof window === "undefined") return "";
  try {
    const href = getEffectiveAccessHref() || window.location.href;
    return `accessUrl=${encodeURIComponent(href)}`;
  } catch {
    return "accessUrl=";
  }
}
