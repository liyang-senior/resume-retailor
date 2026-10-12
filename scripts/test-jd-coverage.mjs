import fs from "fs";
import {
  extractJdRequirementTerms,
  findMissingJdTerms,
  ensureJdTermsInRecentRoles,
  ensureMinExperienceBullets,
  ensureLongExperienceBullets,
  formatJdExperienceKeywordsBlock,
  formatJdCredibilityGuardBlock,
  orderAllExperienceBulletsJdFirst,
} from "../src/lib/resume/jd-experience-keywords.js";
import {
  finalizeExportedResumeSummaryAndSkills,
  prioritizeJdTermsInSkills,
  normalizeCertifications,
  mergeDuplicateSkillCategories,
  limitSkillCategoryCount,
} from "../src/lib/resume/merge-resume-base.js";
import { EXPERIENCE_BULLET_RULES } from "../src/lib/resume/experience-bullet-guidance.js";

const JD = `Project Role : Full Stack Engineer
Project Role Description : Responsible for developing and/or engineering the end-to-end features of a system, from user experience to backend code. Use development skills to deliver innovative solutions that help our clients improve the services they provide. Leverage new technologies that can be applied to solve challenging business problems with a cloud first and agile mindset.
Must have skills : Python Frameworks, Multiplatform Application Development, Microsoft Front End Development (FED)
Good to have skills : NA
Minimum 3 year(s) of experience is required
Educational Qualification : 15 years full time education

Roles & Responsibilities:
- Expected to perform independently and become an SME.
- Collaborate with cross-functional teams to ensure alignment of project goals and deliverables.
- Maintain and improve existing systems by identifying areas for enhancement and implementing necessary changes.
- Document development processes, code changes, and system configurations to support knowledge sharing and future maintenance.
- Assist junior team members by providing guidance and support to foster their professional growth.

Professional & Technical Skills:
- Must To Have Skills: Proficiency in Python Frameworks, Multiplatform Application Development, Microsoft Front End Development (FED).
- Strong experience in developing both client-side and server-side components to create cohesive applications.
- Familiarity with cloud computing platforms and services to deploy and manage scalable applications.
- Experience with version control systems to manage codebase and collaborate effectively with team members.
- Understanding of agile methodologies to adapt to changing requirements and deliver iterative improvements.

Additional Information:
- The candidate should have minimum 3 years of experience in Python Frameworks.
- This position is based at our Gurugram office.
- A 15 years full time education is required.`;

const profile = JSON.parse(
  fs.readFileSync("resumes/Carlos_Francisco_Esponda.json", "utf8")
);

let bad = 0;
const check = (ok, msg) => {
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", msg);
};

const terms = extractJdRequirementTerms(JD);
console.log("JD terms (" + terms.length + "):", terms.join(" | "));
check(terms.length >= 5, "extracted a meaningful checklist");
check(
  !terms.some((t) => /gurugram|15 years|minimum|education|^na$/i.test(t)),
  "no location / years / education / NA noise"
);
check(
  terms.some((t) => /python framework/i.test(t)) &&
    terms.some((t) => /multiplatform/i.test(t)) &&
    terms.some((t) => /front end/i.test(t)),
  "must-have skills captured"
);

// Prompt blocks
const block = formatJdExperienceKeywordsBlock(JD, { profileData: profile });
check(/JD CHECKLIST/.test(block) && /Multiplatform/.test(block), "prompt checklist lists ALL JD terms");
const guard = formatJdCredibilityGuardBlock(JD, profile);
check(/ADD each one/i.test(guard), "guard block tells the model to add missing JD items");

// Simulated weak AI output: a few skills, nothing from the JD in recent experience
const aiSkills = {
  "Programming & Algorithms": ["C++", "MATLAB"],
  "Cloud services": ["AWS (Lambda, S3)", "Docker"],
};
const merged = [
  ["Built dashboards with React for internal teams, owning delivery end to end."],
  ["Maintained services on AWS Lambda for the platform."],
  ["Old role bullet one."],
];

const afterExp = ensureJdTermsInRecentRoles(merged, JD);
check(afterExp[0].length === merged[0].length, "JD helper does not add bullets to the most recent role");
check(afterExp[2].length === merged[2].length, "older roles untouched by JD inject");
check(afterExp[0][0] === merged[0][0], "original (base) bullets preserved");
check(
  !afterExp.flat().some((b) => /Delivered production features|Improved systems involving|Built and shipped features using/i.test(b)),
  "no template keyword bullets were inserted"
);

const afterPad = ensureMinExperienceBullets(afterExp, JD, {
  recentMin: EXPERIENCE_BULLET_RULES.recentRolesMin,
  olderMin: EXPERIENCE_BULLET_RULES.olderRolesMin,
  recentRoles: EXPERIENCE_BULLET_RULES.recentRolesCount,
});
check(afterPad[0].length === afterExp[0].length, `role 0 was not padded (got ${afterPad[0].length})`);
check(afterPad[1].length === afterExp[1].length, `role 1 was not padded (got ${afterPad[1].length})`);
check(afterPad[2].length === afterExp[2].length, `role 2 was not padded (got ${afterPad[2].length})`);
check(
  !afterPad.flat().some((b) => /Partnering with product and engineering peers/i.test(b)),
  "padding suffix is absent"
);

const { skills } = finalizeExportedResumeSummaryAndSkills(
  profile.base_skills,
  "summary",
  aiSkills,
  JD
);
const skillFlat = Object.values(skills).flat().join(" ");
check(!/Python Frameworks/i.test(skillFlat), "unverified JD skill Python Frameworks was not inserted");
check(!/\bexperience\b/i.test(skillFlat) && !/\bcapabilities\b/i.test(skillFlat), "experience and capabilities are not skills");
const all = Object.values(skills).flat().map((s) => s.toLowerCase());
check(new Set(all).size === all.length, "no skill repeated across rows");
check(
  !Object.keys(skills).some((c) => /^(technical |core |key )?skills$|^core competenc/i.test(c)),
  "no catch-all Skills / Core Competencies row"
);
for (const s of profile.base_skills) {
  if (/^programming$/i.test(s)) continue;
  check(all.includes(s.toLowerCase()), `base skill kept: ${s}`);
}
check(
  !(skills["Languages"] || []).some((s) => /^(programming|algorithms)$/i.test(s)),
  "languages row does not contain Programming or Algorithms"
);
// JD terms should be spread across natural themes, not one dump
const cats = Object.keys(skills);
check(cats.length >= 3, `skills use multiple natural categories (got ${cats.length}: ${cats.join(", ")})`);
check(cats.length <= 10, `skills capped at 10 categories (got ${cats.length})`);
check(
  cats.filter((c) => /architecture/i.test(c)).length <= 1,
  "no duplicate Architecture classification in finalized skills"
);
check(
  cats.some((c) => /language|data|cloud/i.test(c)),
  "documented skills stay in themed rows"
);

// Required JD skills should sort ahead of unrelated tokens in the same row
const prioritized = prioritizeJdTermsInSkills(
  {
    "Languages & frameworks": ["MATLAB", "Python Frameworks", "C++"],
    Misc: ["Dremel", "Multiplatform Application Development"],
  },
  JD
);
const langRow = prioritized["Languages & frameworks"] || [];
check(
  langRow[0] === "Python Frameworks",
  "required JD skill sorted first in its row (got " + langRow[0] + ")"
);

// Required-JD bullets ordered before supporting ones; length variety preserved
const mixed = [
  "Supported internal tooling with MATLAB for analytics.",
  "Built Multiplatform Application Development features with Python Frameworks for client portals.",
  "Improved dashboards for the team.",
];
const ordered = orderAllExperienceBulletsJdFirst([mixed], JD)[0];
check(
  /Python Frameworks|Multiplatform/i.test(ordered[0]),
  "required JD experience bullet sorted first"
);

// Each missing tech term should get a related bullet (not one mega-dump of 6+)
const sparse = [
  ["Kept the lights on for internal tools."],
  ["Supported releases for the platform."],
];
const filled = ensureJdTermsInRecentRoles(sparse, JD, { perBullet: 2 });
check(filled[0].length === sparse[0].length, "missing JD terms do not become extra bullets");
check(
  !filled.flat().some((b) => /Python Frameworks/i.test(b)),
  "Python Frameworks is not written into experience without evidence"
);
const wordCounts = afterPad[0].map(
  (b) => String(b).trim().split(/\s+/).filter(Boolean).length
);
const hasShort = wordCounts.some((w) => w < 24);
const hasLong = wordCounts.some((w) => w >= 22);
check(
  hasShort || hasLong,
  "experience bullets present with varied length (counts: " + wordCounts.join(", ") + ")"
);
check(wordCounts.length === 1, "a single real bullet is not cloned to vary length");

const certs = normalizeCertifications(
  [{ name: "AWS SAA", issuer: "Amazon", date: "2023" }],
  ["AWS SAA", "CKAD"]
);
check(certs.length === 2, "certifications dedupe profile+AI");
check(certs[0].name === "AWS SAA" && certs[0].issuer === "Amazon", "profile cert fields kept");

// Weird AI category titles should fold into standard rows; adjacent langs/frameworks added
const weirdMerged = finalizeExportedResumeSummaryAndSkills(
  profile.base_skills,
  "summary",
  {
    "Modern Web Frameworks": ["React", "PWA"],
    "Programming & Algorithms": ["C++"],
  },
  JD
).skills;
check(
  !Object.keys(weirdMerged).some((c) => /modern\s*web/i.test(c)),
  'no "Modern Web Frameworks" category'
);
check(
  !(weirdMerged["Frontend engineering"] || []).some((s) => /^react$/i.test(s)),
  "React absent from the candidate is omitted"
);
const flatWeird = Object.values(weirdMerged).flat().map((s) => s.toLowerCase());
check(!flatWeird.includes("react") && !flatWeird.includes("react.js"), "undocumented React.js is omitted");
check(!flatWeird.includes("typescript"), "TypeScript is not invented from a React mention");
check(flatWeird.includes("python"), "Python required by the JD is included in skills");
check(flatWeird.some((s) => /fastapi|django|flask/.test(s)), "Python's related stack from the JD is included");

// Duplicate Architecture rows must collapse; total rows capped at 7–10
const archDup = mergeDuplicateSkillCategories({
  "Architecture & Engineering Leadership": [
    "Scalable Architecture",
    "Engineering Mentorship",
  ],
  "Architecture & delivery": ["Agile", "Scrum", "Code review"],
  "CI/CD & quality": ["Git", "CI/CD"],
  "Search & Content Discovery": ["Technical SEO", "AEO"],
  "Content Management & Publishing": ["Headless CMS"],
  "Experimentation & Product Optimization": ["A/B Testing"],
  "Cloud services": ["AWS"],
  "Frontend frameworks": ["React"],
  "Languages & runtimes": ["TypeScript"],
  "Backend & APIs": ["Node.js"],
  "Data & analytics": ["SQL"],
  "Extra Niche Toolkit": ["Foo", "Bar"],
});
const archCats = Object.keys(archDup);
check(
  archCats.filter((c) => /architecture/i.test(c)).length === 1,
  "only one Architecture category after merge (got: " +
    archCats.filter((c) => /architecture/i.test(c)).join(", ") +
    ")"
);
const capped = limitSkillCategoryCount(archDup, { min: 7, max: 10 });
const cappedN = Object.keys(capped).length;
check(cappedN >= 7 && cappedN <= 10, `skills capped to 7–10 rows (got ${cappedN})`);
check(
  (capped["Architecture & delivery"] || []).some((s) => /Agile|Scrum|Mentorship|Scalable/i.test(s)),
  "merged Architecture row keeps items from both sources"
);

// Long-bullet floors: ≥5 in recent roles, ≥3 in older
const shortHeavy = [
  Array(8).fill("Shipped a feature with React for the team."),
  Array(8).fill("Maintained APIs on Node.js for clients."),
  Array(5).fill("Supported legacy tools in MATLAB."),
];
const longFixed = ensureLongExperienceBullets(shortHeavy, JD, {
  recentRoles: 2,
  longMinWords: EXPERIENCE_BULLET_RULES.longBulletMinWords,
  minLongPerRole: EXPERIENCE_BULLET_RULES.longBulletsPerRoleMin,
  minLongRecent: EXPERIENCE_BULLET_RULES.longBulletsRecentMin,
});
const countLong = (arr) =>
  arr.filter(
    (b) =>
      String(b).trim().split(/\s+/).filter(Boolean).length >=
      EXPERIENCE_BULLET_RULES.longBulletMinWords
  ).length;
check(longFixed[0].length === shortHeavy[0].length, "recent role 0 is not length-padded");
check(
  !longFixed.flat().some((b) => /Partnering with product and engineering peers/i.test(b)),
  "length helper does not append the filler ending"
);
check(countLong(longFixed[0]) === 0, `short real bullets stay short (got ${countLong(longFixed[0])} padded long)`);

// Framework rows: concrete tech first; methods relocated out
const mixedFront = finalizeExportedResumeSummaryAndSkills(
  [],
  "summary",
  {
    "Frontend frameworks": [
      "Responsive Design",
      "Internationalization",
      "Accessibility",
      "React",
      "Next.js",
      "Astro",
      "Core Web Vitals",
      "HTML5",
      "CSS3",
    ],
    "Languages & runtimes": ["TypeScript", "JavaScript"],
    "Backend & APIs": ["Node.js", "Express.js"],
    "Cloud services": ["AWS"],
    "CI/CD & quality": ["Git"],
    "Data & analytics": ["SQL"],
    "Architecture & delivery": ["Agile"],
  },
  JD
).skills;
const front = mixedFront["Frontend engineering"] || [];
check(front.length > 0, "Frontend engineering row kept");
check(
  front.some((s) => /responsive\s*design/i.test(s)) &&
    front.some((s) => /accessibility/i.test(s)),
  "Responsive Design and Accessibility stay under Frontend (got: " + front.join(", ") + ")"
);
check(
  !front.some((s) => /internationali|core web vitals/i.test(s)),
  "non-UI methods removed from Frontend engineering (got: " + front.join(", ") + ")"
);
check(
  /^(react|next|astro)/i.test(front[0]),
  "Frontend engineering starts with a real framework (got: " + front[0] + ")"
);
const practices = mixedFront["Engineering practices"] || [];
check(
  practices.some((s) => /internationali|core web vitals/i.test(s)),
  "Internationalization / Core Web Vitals moved into Engineering practices"
);

console.log("\nSKILLS:\n" + JSON.stringify(skills, null, 1));
console.log("\nEXP[0] word counts:", wordCounts.join(", "));
process.exit(bad ? 1 : 0);
