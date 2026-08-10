const DEFAULT_CONFIG = {
  urlProfileRules: [],
};

/** Machine-readable reasons when `resolveUrlAccess` fails. */
export const URL_ACCESS_RESOLVE_REASON = {
  NO_RULES: "NO_RULES",
  NO_URL: "NO_URL",
  NO_MATCH: "NO_MATCH",
};

function normalizeConfig(raw) {
  const rules = Array.isArray(raw?.urlProfileRules)
    ? raw.urlProfileRules
        .map((r) => ({
          matchSubstring:
            r && typeof r.matchSubstring === "string" ? r.matchSubstring : "",
          allowedProfileSlugs: Array.isArray(r?.allowedProfileSlugs)
            ? r.allowedProfileSlugs.map((s) => String(s).trim()).filter(Boolean)
            : [],
          showRightSidebar:
            r && typeof r === "object" && "showRightSidebar" in r
              ? Boolean(r.showRightSidebar)
              : true,
        }))
        .filter((r) => r.matchSubstring.length > 0)
    : [];
  return { urlProfileRules: rules };
}

/**
 * Parse `URL_ACCESS_RULES` env (JSON array of rules), or empty config.
 * Shape per rule: { matchSubstring, allowedProfileSlugs, showRightSidebar? }
 */
function parseRulesFromEnv() {
  const raw = process.env.URL_ACCESS_RULES;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    if (Array.isArray(parsed)) {
      return normalizeConfig({ urlProfileRules: parsed });
    }
    if (parsed && Array.isArray(parsed.urlProfileRules)) {
      return normalizeConfig(parsed);
    }
  } catch {
    console.error("URL_ACCESS_RULES is not valid JSON");
  }
  return null;
}

/**
 * Load URL access rules from `URL_ACCESS_RULES` (server-only).
 * Safe defaults if missing or invalid.
 */
export function loadUrlAccessRules() {
  return parseRulesFromEnv() || { ...DEFAULT_CONFIG };
}

/**
 * Match the browser-reported full URL against `urlProfileRules`.
 * First matching rule wins. No rules, empty URL, or no substring match → not ok (404).
 */
export function resolveUrlAccess(fullUrl, config) {
  const rules = config?.urlProfileRules;
  if (!Array.isArray(rules) || rules.length === 0) {
    return { ok: false, code: URL_ACCESS_RESOLVE_REASON.NO_RULES };
  }
  if (typeof fullUrl !== "string" || !fullUrl.trim()) {
    return { ok: false, code: URL_ACCESS_RESOLVE_REASON.NO_URL };
  }
  const u = fullUrl.trim();
  const uLower = u.toLowerCase();
  for (const rule of rules) {
    if (!rule?.matchSubstring) continue;
    const sub = rule.matchSubstring;
    const subLower = sub.toLowerCase();
    if (u.includes(sub) || uLower.includes(subLower)) {
      return {
        ok: true,
        allowedSlugs: new Set(rule.allowedProfileSlugs || []),
        showRightSidebar: rule.showRightSidebar !== false,
      };
    }
  }
  return { ok: false, code: URL_ACCESS_RESOLVE_REASON.NO_MATCH };
}
