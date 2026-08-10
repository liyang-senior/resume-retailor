import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "config", "url-access.json");

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
 * Load `config/url-access.json` (server-only). Safe defaults if missing or invalid.
 */
export function loadUrlAccessRules() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return normalizeConfig(raw);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
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
