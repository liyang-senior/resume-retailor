/**
 * Merge permanent "base" bullets and skills from profile JSON with AI-generated resume JSON.
 *
 * Profile JSON (optional):
 * - `base_skills`: **array** of lines like `"Languages: Python, JavaScript"` (first `:` splits label vs skills),
 *   OR legacy object `{ "Category": ["A","B"], ... }` (values may be comma-separated strings).
 * - Each `experience[]` entry may include `base_bullets` (alias: `base_details`): string[]
 */

function normalizeStringList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

/**
 * Split comma-separated skills without breaking commas inside `(...)`.
 * Naive `.split(",")` turns `AWS (EC2, EKS), Azure (AKS)` into fragments and
 * causes merged output to repeat the same platforms when joined with full AI lines.
 */
function splitSkillsListLine(text) {
  const s = String(text ?? "").trim();
  if (!s) return [];
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      const piece = s.slice(start, i).trim();
      if (piece) parts.push(piece);
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function normalizeForMatch(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "their",
  "was",
  "were",
  "are",
  "has",
  "have",
  "had",
  "not",
  "but",
  "our",
  "your",
  "all",
  "any",
  "its",
  "via",
  "per",
  "using",
  "used",
  "use",
]);

function significantTokens(text) {
  const n = normalizeForMatch(text);
  return n
    .split(/[^a-z0-9%+$/]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * True if `haystack` (one bullet or several joined) still reflects the substance of `baseBullet`.
 * Used so merged / rewritten bullets do not drop permanent profile facts.
 */
function bulletHaystackCoversBase(haystack, baseBullet) {
  const h = normalizeForMatch(haystack);
  const b = normalizeForMatch(baseBullet);
  if (!b || b.length <= 2) return true;
  if (!h) return false;
  if (h.includes(b)) return true;
  if (b.length >= 14 && h.includes(b.slice(0, 14))) return true;

  const tokens = significantTokens(baseBullet);
  if (tokens.length === 0) return true;
  let hit = 0;
  for (const t of tokens) {
    if (h.includes(t)) hit++;
  }
  return hit / tokens.length >= 0.65;
}

function ensureAiBulletContainsBase(baseBullet, aiBullet) {
  const ai = String(aiBullet ?? "").trim();
  const base = String(baseBullet ?? "").trim();
  if (!base) return ai;
  if (bulletHaystackCoversBase(ai, base)) return ai;
  if (!ai) return base;
  return `${base} ${ai}`.replace(/\s+/g, " ").trim();
}

/**
 * Combine profile `base_bullets` with AI `details` for one role.
 * Bullet *count* may go up or down; every base fact must remain represented (enforced here when the model slips).
 */
function mergeDetailsForOneRole(base, fromAi) {
  if (base.length === 0) return [...fromAi];
  if (fromAi.length === 0) return [...base];

  if (fromAi.length === base.length) {
    return base.map((b, i) => ensureAiBulletContainsBase(b, fromAi[i] ?? ""));
  }

  const union = fromAi.join(" ");
  const uncovered = base.filter((b) => !bulletHaystackCoversBase(union, b));
  if (uncovered.length === 0) {
    return [...fromAi];
  }
  if (uncovered.length === base.length) {
    return [...base, ...fromAi];
  }
  return [...fromAi, ...uncovered];
}

function dedupeSkillsPreserveOrder(primary, secondary) {
  const seen = new Set();
  const out = [];
  for (const s of [...primary, ...secondary]) {
    const t = String(s).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Outcome/metrics prose from profile — belongs in Experience bullets, not Summary or Skills. */
function isImpactHighlightsCategoryName(cat) {
  const c = String(cat ?? "")
    .trim()
    .toLowerCase();
  if (!c) return false;
  return /\bimpact\s+highlights?\b/.test(c);
}

/** Categories that are résumé prose (belong in Summary), not the Skills section. */
function isNarrativeSkillsCategoryName(cat) {
  const c = String(cat ?? "")
    .trim()
    .toLowerCase();
  if (!c) return false;
  if (isImpactHighlightsCategoryName(cat)) return false;
  return (
    /\bprofessional\s+summary\b/.test(c) ||
    /\bcareer\s+summary\b/.test(c) ||
    /\bexecutive\s+summary\b/.test(c) ||
    /\bprofile\s+summary\b/.test(c) ||
    /\bkey\s+highlights?\b/.test(c)
  );
}

function canonicalSkillCategoryKey(cat) {
  return String(cat ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Merge skill categories whose names differ only by punctuation (e.g. "Cloud and DevOps" vs "Cloud & DevOps").
 * Preserves first-seen category label; dedupes skill tokens within the merged list.
 */
export function mergeDuplicateSkillCategories(skillMap) {
  const entries = Object.entries(skillMap || {}).filter(
    ([, v]) => Array.isArray(v) && v.length > 0
  );
  const buckets = new Map();
  const order = [];
  for (const [cat, list] of entries) {
    const can = canonicalSkillCategoryKey(cat);
    if (!buckets.has(can)) {
      buckets.set(can, { label: cat, items: [] });
      order.push(can);
    }
    const b = buckets.get(can);
    b.items = dedupeSkillsPreserveOrder(b.items, normalizeStringList(list));
  }
  const out = {};
  for (const can of order) {
    const { label, items } = buckets.get(can);
    out[label] = items;
  }
  return out;
}

/**
 * One paragraph for PDF/Word: strip paragraph breaks and collapse whitespace.
 */
export function normalizeSummaryToSingleParagraph(text) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove narrative categories from a skill map: summary prose vs quantified outcome blurbs.
 * `snippets` fold into exported Summary; `experienceContextSnippets` must be covered in work bullets only.
 */
export function extractNarrativeSnippetsFromSkillMap(skillMap) {
  const map = skillMap && typeof skillMap === "object" ? { ...skillMap } : {};
  const snippets = [];
  const experienceContextSnippets = [];
  for (const [cat, val] of Object.entries(map)) {
    const blob = Array.isArray(val)
      ? val.map((x) => String(x).trim()).filter(Boolean).join(" ")
      : typeof val === "string" && val.trim()
        ? val.trim()
        : "";
    if (!blob) continue;

    if (isImpactHighlightsCategoryName(cat)) {
      delete map[cat];
      experienceContextSnippets.push(blob);
      continue;
    }
    if (!isNarrativeSkillsCategoryName(cat)) continue;
    delete map[cat];
    snippets.push(blob);
  }
  return { skillMap: map, snippets, experienceContextSnippets };
}

/**
 * Normalize profile `base_skills` to a category → skills[] map for merge + PDF.
 * @param {unknown} baseSkills
 * @returns {Record<string, string[]>}
 */
export function normalizeBaseSkillsToSkillMap(baseSkills) {
  if (baseSkills == null) return {};

  if (Array.isArray(baseSkills)) {
    const out = {};
    for (const row of baseSkills) {
      const s = String(row).trim();
      if (!s) continue;
      const ci = s.indexOf(":");
      let cat;
      let rest;
      if (ci === -1) {
        cat = "Skills";
        rest = s;
      } else {
        cat = s.slice(0, ci).trim() || "Skills";
        rest = s.slice(ci + 1).trim();
      }
      const parts =
        isNarrativeSkillsCategoryName(cat) || isImpactHighlightsCategoryName(cat)
          ? rest
            ? [rest]
            : []
          : splitSkillsListLine(rest);
      if (!parts.length) continue;
      if (!out[cat]) out[cat] = [];
      out[cat].push(...parts);
    }
    for (const k of Object.keys(out)) {
      out[k] = dedupeSkillsPreserveOrder(out[k], []);
    }
    return out;
  }

  if (typeof baseSkills === "object") {
    const out = {};
    for (const [k, v] of Object.entries(baseSkills)) {
      if (Array.isArray(v)) {
        if (isNarrativeSkillsCategoryName(k) || isImpactHighlightsCategoryName(k)) {
          const blob = normalizeStringList(v).join(" ").replace(/\s+/g, " ").trim();
          out[k] = blob ? [blob] : [];
        } else {
          out[k] = dedupeSkillsPreserveOrder(normalizeStringList(v), []);
        }
      } else if (typeof v === "string") {
        out[k] =
          isNarrativeSkillsCategoryName(k) || isImpactHighlightsCategoryName(k)
            ? dedupeSkillsPreserveOrder(
                v.trim() ? [v.replace(/\s+/g, " ").trim()] : [],
                []
              )
            : dedupeSkillsPreserveOrder(splitSkillsListLine(v), []);
      }
    }
    return out;
  }

  return {};
}

export function profileHasPermanentContent(profileData) {
  if (!profileData || typeof profileData !== "object") return false;
  const skillMap = normalizeBaseSkillsToSkillMap(profileData.base_skills);
  if (Object.values(skillMap).some((arr) => arr.length > 0)) return true;
  const jobs = profileData.experience;
  if (!Array.isArray(jobs)) return false;
  return jobs.some((job) => {
    const b = normalizeStringList(job?.base_bullets ?? job?.base_details);
    return b.length > 0;
  });
}

/**
 * Text block for the AI prompt: permanent bullets per role + base skills.
 */
export function formatPermanentContextForPrompt(profileData) {
  if (!profileData || typeof profileData !== "object") {
    return "None — generate full skills and experience bullets from the profile and JD.";
  }

  const lines = [];
  const jobs = Array.isArray(profileData.experience)
    ? profileData.experience
    : [];

  jobs.forEach((job, idx) => {
    const bullets = normalizeStringList(job.base_bullets ?? job.base_details);
    if (bullets.length === 0) return;
    const company = job.company || `Role ${idx + 1}`;
    const title = job.title ? ` — ${job.title}` : "";
    lines.push(`**${company}${title}**`);
    bullets.forEach((b) => lines.push(`- ${b}`));
    lines.push("");
  });

  const skillMap = normalizeBaseSkillsToSkillMap(profileData.base_skills);
  const {
    skillMap: techSkillMap,
    snippets: narrativeSnippets,
    experienceContextSnippets,
  } = extractNarrativeSnippetsFromSkillMap(skillMap);

  if (narrativeSnippets.length > 0) {
    lines.push(
      "**Base prose for Summary (context only)** — the PDF summary uses **only** your JSON **summary** field; this text is **not** auto-appended. **Distill** it into a **short** **§3** paragraph (**3–6 lines**); **do not** paste it verbatim or duplicate its second half; weave missing facts into **details** and **skills** instead. Do not echo under **skills** as fake categories:"
    );
    narrativeSnippets.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }

  if (experienceContextSnippets.length > 0) {
    lines.push(
      "**Profile quantified outcomes** (the exporter does **not** put these in `summary`; weave every fact into **`experience[0]`** and **`experience[1]`** `details` as long bullets—never as `skills` tokens or a second summary paragraph):"
    );
    experienceContextSnippets.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }

  const skillEntries = Object.entries(techSkillMap).filter(([, arr]) => arr.length > 0);
  if (skillEntries.length > 0) {
    lines.push(
      "**Base classified skill groups (always kept in the Skills section; comma-separated technical tokens only):**"
    );
    for (const [cat, arr] of skillEntries) {
      lines.push(`- **${cat}:** ${arr.join(", ")}`);
    }
    lines.push("");
  }

  if (lines.length === 0) {
    return "None — generate full skills and experience bullets from the profile and JD.";
  }

  return (
    lines.join("\n").trim() +
    "\n\n**Merge rules (non-negotiable):** The app **never drops** permanent profile facts: **base_skills** classified lines stay in **skills**. **Professional Summary** / **Career Summary** prose is **not** pasted into the exported **summary**—you write a **fresh**, **short** **summary** in JSON (**§3**). **Impact Highlights** are **not** in **summary**—cover them in **experience[0]** / **experience[1]** **details**. For **experience:** every **base_bullets** fact must appear in that role’s **details** (merge/rewrite ok). If you **merge** **≥2** base lines into **one** bullet, that line **must** be **≥35 words**. JD themes must appear in **details**, not only **summary**/**skills**. **Never** claim unsupported must-haves. **details** order: **JD-first**, then length. One-for-one rewrites must **retain** each base line’s substance."
  );
}

/**
 * Merge `profileData.base_skills` (first) with AI `skills` object by category.
 */
export function mergeBaseSkillsIntoAi(baseSkills, aiSkills) {
  const base = normalizeBaseSkillsToSkillMap(baseSkills);
  const ai = aiSkills && typeof aiSkills === "object" ? aiSkills : {};
  const categories = new Set([
    ...Object.keys(base),
    ...Object.keys(ai),
  ]);
  const out = {};
  for (const cat of categories) {
    const b = normalizeStringList(base[cat]);
    const rawAi = ai[cat];
    const a = Array.isArray(rawAi)
      ? normalizeStringList(rawAi)
      : typeof rawAi === "string"
        ? splitSkillsListLine(rawAi)
        : [];
    out[cat] = dedupeSkillsPreserveOrder(b, a);
  }
  return out;
}

/**
 * Résumé export shape: Summary = model `summary` only when non-empty (profile Professional Summary stays in the prompt, not concatenated here); fallback joins narrative snippets if the model omitted `summary`. Skills = base merged with model lists.
 */
export function finalizeExportedResumeSummaryAndSkills(
  baseSkills,
  aiSummary,
  aiSkills
) {
  const baseMap = normalizeBaseSkillsToSkillMap(baseSkills);
  const { skillMap: baseTech, snippets: baseNar } =
    extractNarrativeSnippetsFromSkillMap(baseMap);

  const aiMap = normalizeBaseSkillsToSkillMap(
    aiSkills && typeof aiSkills === "object" ? aiSkills : {}
  );
  const { skillMap: aiTech, snippets: aiNar } =
    extractNarrativeSnippetsFromSkillMap(aiMap);

  const merged = mergeBaseSkillsIntoAi(baseTech, aiTech);
  const skills = mergeDuplicateSkillCategories(merged);

  const aiSummaryTrim = String(aiSummary ?? "").trim();
  const summary = normalizeSummaryToSingleParagraph(
    aiSummaryTrim
      ? aiSummaryTrim
      : [...baseNar, ...aiNar].filter(Boolean).join(" ")
  );

  return { summary, skills };
}

/**
 * Per job: merge AI `details` with `base_bullets` so **no base facts are lost** (heuristic + same-count glue).
 * Bullet count may differ from the profile when the model merges lines.
 */
export function mergeExperienceDetails(profileJobs, aiExperience) {
  const jobs = Array.isArray(profileJobs) ? profileJobs : [];
  const ai = Array.isArray(aiExperience) ? aiExperience : [];
  return jobs.map((job, idx) => {
    const base = normalizeStringList(job.base_bullets ?? job.base_details);
    const fromAi = normalizeStringList(ai[idx]?.details);
    return mergeDetailsForOneRole(base, fromAi);
  });
}
