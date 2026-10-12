import {
  extractNarrativeSnippetsFromSkillMap,
  normalizeBaseSkillsToSkillMap,
  normalizeCertifications,
  UNCATEGORIZED_SKILLS_KEY,
} from "./merge-resume-base.js";
import { extractJdRequirementTerms } from "./jd-experience-keywords.js";
import { demonstratedSkillsFromText } from "./resume-sanitize.js";
import {
  EXPERIENCE_BULLET_RULES,
  minBulletCountForRole,
} from "./experience-bullet-guidance.js";

function linesOf(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function bulletBlock(value, emptyLabel) {
  const lines = linesOf(value);
  if (lines.length === 0) return emptyLabel;
  return lines.map((line) => `- ${line}`).join("\n");
}

function parseJobDate(value) {
  const text = String(value ?? "").trim();
  if (!text || /present|current|now/i.test(text)) return new Date();
  const monthYear = text.match(/(\d{1,2})[\/\-.](\d{4})/);
  if (monthYear) return new Date(Number(monthYear[2]), Number(monthYear[1]) - 1, 1);
  const year = text.match(/(\d{4})/);
  if (year) return new Date(Number(year[1]), 0, 1);
  return null;
}

function tenureMonths(start, end) {
  const from = parseJobDate(start);
  const to = parseJobDate(end);
  if (!from || !to) return null;
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, months);
}

/**
 * Aligns with default.txt §6.5.
 * Role 1: 8-12. Role 2: 8-11. Older: 5-8 by tenure.
 */
function bulletPlan(months, index) {
  const floor = minBulletCountForRole(index);
  if (index === 0) {
    let range = "8-12";
    if (months != null && months < 12) range = "8-9";
    else if (months != null && months < 36) range = "9-11";
    else if (months != null) range = "11-12";
    return `REQUIRED ${range} depth-bearing hands-on bullets (min ${floor}) | >=5 detailed (36-48w) | short 12-20 / medium 22-32 / detailed 36-48 | max 3 mentions per tech`;
  }
  if (index === 1) {
    let range = "8-11";
    if (months != null && months < 12) range = "8-9";
    else if (months != null && months < 36) range = "9-10";
    else if (months != null) range = "10-11";
    return `REQUIRED ${range} depth-bearing hands-on bullets (min ${floor}) | >=5 detailed (36-48w) | short 12-20 / medium 22-32 / detailed 36-48 | max 3 mentions per tech`;
  }
  let range = "5-6";
  if (months == null) range = "5-6";
  else if (months < 12) range = "5-6";
  else if (months < 24) range = "6-7";
  else range = "7-8";
  return `REQUIRED ${range} depth-bearing hands-on bullets (min ${floor}, max ${EXPERIENCE_BULLET_RULES.olderRolesMax}) | >=3 detailed (36-48w) | short 12-20 / medium 22-32 / detailed 36-48 | max 3 mentions per tech`;
}

/** Compact contract — generate hands-on bullets + bidirectional JD coverage. */
const OUTPUT_CONTRACT = [
  "APPLICATION NOTES. Return only the completed JSON resume.",
  "- GENERATE ASAP: produce the full JSON now. No analysis, refusals, or confirmations.",
  "- AUTHORITY TO GENERATE: fill experience[].details with distinct hands-on bullets (ACTION+TECH+IMPLEMENTATION+PURPOSE). No generic filler. No repeated/synonym bullets.",
  "- BIDIRECTIONAL JD COVERAGE: JD skill → related experience bullets; JD experience → related skills. Both mandatory.",
  "- Classify: Entity Framework→Databases; Responsive Design/Web Accessibility→Frontend; Bitbucket/Git→DevOps; SSR/routing→Frontend; practices≠tools.",
  "- Preserve originals; ADD JD coverage. No invented employers/metrics/certs. Max 3 mentions of one tech per role.",
  `- Counts: role1 ${EXPERIENCE_BULLET_RULES.recentRolesMin}-${EXPERIENCE_BULLET_RULES.recentRolesMax}; role2 ${EXPERIENCE_BULLET_RULES.recentRolesMin}-${EXPERIENCE_BULLET_RULES.secondRecentRolesMax}; older ${EXPERIENCE_BULLET_RULES.olderRolesMin}-${EXPERIENCE_BULLET_RULES.olderRolesMax}. Words ${EXPERIENCE_BULLET_RULES.shortBulletMinWords}-${EXPERIENCE_BULLET_RULES.shortBulletMaxWords}/${EXPERIENCE_BULLET_RULES.mediumBulletMinWords}-${EXPERIENCE_BULLET_RULES.mediumBulletMaxWords}/${EXPERIENCE_BULLET_RULES.longBulletMinWords}-${EXPERIENCE_BULLET_RULES.longBulletMaxWords}. Summary 90-120. Under-filled details = fail.`,
  "- Run §10 quickly; if anything is missing, GENERATE it and return JSON only.",
].join("\n");

/**
 * Variables for the resume prompt. Each fact is supplied once.
 * @param {object} profileData
 * @param {{ jd?: string, targetRole?: string, companyName?: string }} [opts]
 */
export function buildResumePromptVariables(profileData, opts = {}) {
  const profile = profileData && typeof profileData === "object" ? profileData : {};
  const jd = typeof opts.jd === "string" ? opts.jd : "";
  const jobs = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];

  const contact = [profile.email, profile.phone].filter(Boolean).join(" | ");
  const educationText = education
    .map((edu) => {
      let line = `- ${edu.degree || "Degree"}, ${edu.school || "School"} (${edu.start_year || ""}-${edu.end_year || ""})`;
      if (edu.grade) line += ` | GPA: ${edu.grade}`;
      return line;
    })
    .join("\n");

  const candidateProfile = [
    `Name: ${profile.name || "(not supplied)"}`,
    `Headline: ${profile.title || "(not supplied)"}`,
    `Contact: ${contact || "(not supplied)"}`,
    `Location: ${profile.location || "(not supplied)"}`,
    educationText ? `Education:\n${educationText}` : "Education: (none supplied)",
  ].join("\n");

  const employmentHistory =
    jobs
      .map((job, idx) => {
        const parts = [`${idx + 1}. ${job.company || "Unknown employer"}`];
        if (job.title) parts.push(job.title);
        if (job.location) parts.push(job.location);
        parts.push(`${job.start_date || ""} - ${job.end_date || ""}`.trim());
        const months = tenureMonths(job.start_date, job.end_date);
        parts.push(months == null ? "length unknown" : `${months} months`);
        parts.push(bulletPlan(months, idx));
        return parts.join(" | ");
      })
      .join("\n") || "(none supplied)";

  const originalBullets =
    jobs
      .map((job, idx) => {
        const header = `${idx + 1}. ${job.company || "Unknown employer"}${job.title ? ` | ${job.title}` : ""}`;
        const bullets = linesOf(job.base_bullets ?? job.base_details);
        if (bullets.length === 0) {
          return `${header}\n(no original bullets supplied for this role)`;
        }
        return `${header}\n${bullets.map((b) => `- ${b}`).join("\n")}`;
      })
      .join("\n\n") || "(none supplied)";

  const skillMap = normalizeBaseSkillsToSkillMap(profile.base_skills);
  const { skillMap: techSkillMap, snippets, experienceContextSnippets } =
    extractNarrativeSnippetsFromSkillMap(skillMap);
  const skillLines = [];
  for (const [cat, arr] of Object.entries(techSkillMap)) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    if (cat === UNCATEGORIZED_SKILLS_KEY) skillLines.push(`Uncategorized: ${arr.join(", ")}`);
    else skillLines.push(`${cat}: ${arr.join(", ")}`);
  }

  const certs = normalizeCertifications(profile.certifications);
  const certText =
    certs.length === 0
      ? "(none documented)"
      : certs
          .map((c) => `- ${[c.name, c.issuer, c.date].filter(Boolean).join(" | ")}`)
          .join("\n");

  const jdTechnologies = demonstratedSkillsFromText(jd).map((item) => item.name);
  const jdTopics = extractJdRequirementTerms(jd, { max: 40 }).filter(
    (term) => !/^(experience|capabilities)$/i.test(term)
  );

  const notes = [OUTPUT_CONTRACT];
  notes.push(
    `Generate exactly ${jobs.length} experience objects in employment-history order. Item 1 is most recent. Preserve original job titles. Fill every details array with depth-bearing bullets meeting the per-role targets and covering every JD-required technology.`
  );
  if (opts.companyName && String(opts.companyName).trim()) {
    notes.push(
      `Target company name, for context only: ${String(opts.companyName).trim()}. The company name is not proof of a technology stack.`
    );
  }
  if (snippets.length > 0) {
    notes.push(
      "Profile narrative, context only. Do not paste it verbatim and do not treat it as a skill category:\n" +
        snippets.map((s) => `- ${s}`).join("\n")
    );
  }
  if (jdTechnologies.length > 0 || jdTopics.length > 0) {
    const lines = [
      ...jdTechnologies,
      ...jdTopics.filter((term) => !jdTechnologies.includes(term)),
    ];
    notes.push(
      "Required JD technologies and phrases. GENERATE coverage both ways: (1) ADD each to skills if missing + GENERATE related hands-on experience bullets; (2) if an item is an experience/responsibility, also ADD related concrete skills. ACTION+TECH+IMPLEMENTATION+PURPOSE for every bullet:\n" +
        lines.map((s) => `- ${s}`).join("\n")
    );
  }
  const profileNotes = linesOf(profile.additional_instructions);
  if (profileNotes.length > 0) notes.push(profileNotes.join("\n"));

  const separateResume =
    (typeof profile.original_resume === "string" && profile.original_resume.trim()) ||
    (typeof profile.resume_text === "string" && profile.resume_text.trim()) ||
    "";

  const targetRole = String(opts.targetRole || "").trim();

  return {
    CANDIDATE_PROFILE: candidateProfile,
    EMPLOYMENT_HISTORY: employmentHistory,
    ORIGINAL_RESUME: separateResume || "(not supplied separately)",
    ORIGINAL_EXPERIENCE_BULLETS: originalBullets,
    VERIFIED_TECHNICAL_SKILLS: skillLines.join("\n") || "(none supplied)",
    CONFIRMED_SKILLS: bulletBlock(
      profile.confirmed_additional_skills ?? profile.confirmed_skills,
      "(none supplied)"
    ),
    CONFIRMED_RESPONSIBILITIES: bulletBlock(
      profile.confirmed_responsibilities,
      "(none supplied)"
    ),
    CONFIRMED_PROJECTS: bulletBlock(
      profile.confirmed_projects ?? profile.confirmed_projects_and_responsibilities,
      "(none supplied)"
    ),
    DOCUMENTED_ACHIEVEMENTS: bulletBlock(experienceContextSnippets, "(none supplied)"),
    CERTIFICATIONS: certText,
    TARGET_JOB_TITLE:
      targetRole ||
      "Not supplied separately. Infer the target role from the job description. The profile headline is a hint, not a required title.",
    JOB_DESCRIPTION: jd || "(none supplied)",
    ADDITIONAL_INSTRUCTIONS: notes.join("\n\n"),
  };
}
