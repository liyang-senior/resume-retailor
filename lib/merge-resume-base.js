/**
 * Merge permanent "base" bullets and skills from profile JSON with AI-generated resume JSON.
 *
 * Profile JSON (optional):
 * - `base_skills`: { "Category Name": ["Skill A", "Skill B"], ... }
 * - Each `experience[]` entry may include `base_bullets` (alias: `base_details`): string[]
 */

function normalizeStringList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

export function profileHasPermanentContent(profileData) {
  if (!profileData || typeof profileData !== "object") return false;
  const bs = profileData.base_skills;
  if (bs && typeof bs === "object" && Object.keys(bs).length) {
    for (const v of Object.values(bs)) {
      if (Array.isArray(v) && v.length) return true;
    }
  }
  const jobs = profileData.experience;
  if (!Array.isArray(jobs)) return false;
  return jobs.some((job) => {
    const b = job?.base_bullets ?? job?.base_details;
    return Array.isArray(b) && b.length > 0;
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

  const baseSkills = profileData.base_skills;
  if (baseSkills && typeof baseSkills === "object") {
    const entries = Object.entries(baseSkills).filter(
      ([, arr]) => Array.isArray(arr) && arr.length > 0
    );
    if (entries.length > 0) {
      lines.push("**Base skill groups (always kept on the resume):**");
      for (const [cat, arr] of entries) {
        lines.push(`- **${cat}:** ${normalizeStringList(arr).join(", ")}`);
      }
      lines.push("");
    }
  }

  if (lines.length === 0) {
    return "None — generate full skills and experience bullets from the profile and JD.";
  }

  return (
    lines.join("\n").trim() +
    "\n\nThese items are prepended automatically to the final resume. Your JSON must add **additional** JD-specific bullets and skills only; do not repeat the permanent bullets verbatim in `experience[].details`."
  );
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

/**
 * Merge `profileData.base_skills` (first) with AI `skills` object by category.
 */
export function mergeBaseSkillsIntoAi(baseSkills, aiSkills) {
  const base =
    baseSkills && typeof baseSkills === "object" ? baseSkills : {};
  const ai = aiSkills && typeof aiSkills === "object" ? aiSkills : {};
  const categories = new Set([
    ...Object.keys(base),
    ...Object.keys(ai),
  ]);
  const out = {};
  for (const cat of categories) {
    const b = normalizeStringList(base[cat]);
    const a = normalizeStringList(ai[cat]);
    out[cat] = dedupeSkillsPreserveOrder(b, a);
  }
  return out;
}

/**
 * For each profile job, `[...base_bullets, ...ai.details]`.
 */
export function mergeExperienceDetails(profileJobs, aiExperience) {
  const jobs = Array.isArray(profileJobs) ? profileJobs : [];
  const ai = Array.isArray(aiExperience) ? aiExperience : [];
  return jobs.map((job, idx) => {
    const base = normalizeStringList(job.base_bullets ?? job.base_details);
    const fromAi = normalizeStringList(ai[idx]?.details);
    return [...base, ...fromAi];
  });
}
