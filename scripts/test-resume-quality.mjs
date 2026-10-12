import fs from "fs";
import {
  mergeExperienceDetails,
  finalizeExportedResumeSummaryAndSkills,
} from "../src/lib/resume/merge-resume-base.js";
import {
  ensureJdTermsInRecentRoles,
  ensureMinExperienceBullets,
  ensureLongExperienceBullets,
} from "../src/lib/resume/jd-experience-keywords.js";
import {
  assessExperienceGaps,
  assessProfileCompleteness,
  canonicalSkillName,
  containsForbiddenPhrase,
  cleanBulletText,
  dedupeSimilarBullets,
  prepareExperienceForExport,
  sanitizeSkillMap,
  stripDraftWording,
  toAsciiPunctuation,
} from "../src/lib/resume/resume-sanitize.js";

let bad = 0;
const check = (ok, msg) => {
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", msg);
};

const forbidden = [
  "Built and shipped features using experience and capabilities.",
  "Owned end-to-end work on capabilities.",
  "Delivered production features with Code Review.",
  "Improved systems involving JavaScript.",
  "Partnering with product and engineering peers to validate outcomes, document decisions, and sustain reliable delivery under changing priorities.",
];
for (const line of forbidden) {
  check(containsForbiddenPhrase(line), "rejects: " + line.slice(0, 48));
}

const jobs = [
  {
    company: "Acme",
    title: "Backend Engineer",
    base_bullets: ["Built backend APIs using Java Spring Boot and PostgreSQL."],
    base_skills: null,
  },
];
const ai = [
  { details: ["Built backend APIs using Python FastAPI and MongoDB for the JD."] },
];
const merged = mergeExperienceDetails(jobs, ai);
const exported = prepareExperienceForExport(jobs, merged, "Java Spring Boot PostgreSQL");
const text = exported[0].join(" ");
check(/Java/.test(text) && /PostgreSQL/.test(text), "original Java/PostgreSQL facts kept");
check(!/FastAPI/.test(text) && !/MongoDB/.test(text), "unsupported FastAPI/MongoDB bullet removed");
check(!exported.flat().some(containsForbiddenPhrase), "export has no template bullets");

const padded = ensureMinExperienceBullets(
  [["Maintained Java services for internal tools."]],
  "Must have skills: Kubernetes"
);
check(padded[0].length === 1, "min-bullet helper does not invent bullets");
check(!/Delivered production features/.test(padded.flat().join(" ")), "no delivered-features template");

const injected = ensureJdTermsInRecentRoles(
  [["Maintained Java services for internal tools."]],
  "Must have skills: Kubernetes, Terraform"
);
check(injected[0].length === 1, "JD helper does not insert keyword bullets");
check(!/Kubernetes/.test(injected.flat().join(" ")), "Kubernetes was not injected");

const lengthened = ensureLongExperienceBullets([
  ["Shipped a feature with React for the team."],
]);
check(
  !/Partnering with product and engineering peers/.test(lengthened.flat().join(" ")),
  "long-bullet helper does not append the filler ending"
);

const skills = sanitizeSkillMap(
  finalizeExportedResumeSummaryAndSkills(
    ["Dremel", "Google Dremel", "experience", "capabilities", "C++"],
    "Built services.",
    {
      Algorithms: ["Convex", "C++"],
      "Frontend frameworks": ["Code Review", "React"],
    }
  ).skills
);
const flat = Object.values(skills).flat();
check(flat.filter((s) => /dremel/i.test(s)).length === 1, "Dremel and Google Dremel collapse");
check(!flat.some((s) => /^(experience|capabilities)$/i.test(s)), "experience and capabilities are not skills");
check(canonicalSkillName("Google Dremel") === "Dremel", "canonical Dremel name");
const front = skills["Frontend engineering"] || [];
check(!front.some((s) => /code review/i.test(s)), "Code Review is not left in Frontend engineering");
check(
  !(skills.Algorithms || []).some((s) => /convex/i.test(s)),
  "Convex is not filed under Algorithms"
);

check(
  cleanBulletText("[Draft - verify] Built Java APIs for the billing service.") ===
    "Built Java APIs for the billing service.",
  "Draft - verify labels are removed from bullets"
);
check(
  !/draft|confirmation/i.test(
    cleanBulletText("This JD-targeted draft built APIs. Responsibilities require confirmation.")
  ),
  "draft and confirmation wording is removed from bullets"
);
check(
  !/supplied materials|not documented/i.test(
    cleanBulletText(
      "Built Convex schemas for realtime reads (not documented in supplied materials)."
    )
  ) && /Built Convex schemas for realtime reads/.test(
    cleanBulletText(
      "Built Convex schemas for realtime reads (not documented in supplied materials)."
    )
  ),
  "not documented in supplied materials is stripped from bullets"
);
check(canonicalSkillName("NestJS") === "Nest.js" && canonicalSkillName("Nest.js") === "Nest.js", "NestJS and Nest.js collapse to one name");
const cased = sanitizeSkillMap({
  "Engineering Practices": ["Algorithms", "Code review"],
  "Engineering practices": ["Mentoring"],
});
check(
  Object.keys(cased).filter((k) => /engineering practices/i.test(k)).length === 1 &&
    cased["Engineering practices"].length === 3,
  "Engineering Practices and Engineering practices merge"
);
const algoSkills = sanitizeSkillMap({ "Frontend engineering": ["Algorithms", "React"] });
check(
  !(algoSkills["Frontend engineering"] || []).some((s) => /algorithm/i.test(s)) &&
    (algoSkills["Engineering practices"] || []).some((s) => /algorithm/i.test(s)),
  "Algorithms is not left under frontend"
);
check(
  canonicalSkillName("React") === "React.js" && canonicalSkillName("React.js") === "React.js",
  "React and React.js collapse to React.js"
);
check(
  canonicalSkillName("Convex Database") === "Convex" && canonicalSkillName("Convex") === "Convex",
  "Convex and Convex Database collapse to Convex"
);
check(
  cleanBulletText("Illustrative responsibility: Built React.js screens for the dashboard.") ===
    "Built React.js screens for the dashboard.",
  "Illustrative responsibility prefixes are removed"
);
check(
  dedupeSimilarBullets([
    "Completed an internal Machine Learning course and applied the lessons to ranking.",
    "Completed an internal Machine Learning course and applied those lessons to ranking models.",
    "Provisioned feature modules through a shared configuration service before release.",
  ]).length === 2,
  "near-duplicate bullets are removed"
);
check(canonicalSkillName("[Draft - verify] Python") === "Python", "Draft - verify labels are removed from skills");
check(toAsciiPunctuation("a \u2014 b \u2013 c \u201Cq\u201D") === 'a - b - c "q"', "punctuation becomes ASCII");
check(!/[\u2013\u2014\u201C\u201D]/.test(toAsciiPunctuation("Ada\u2019s resume")), "curly apostrophe normalized");

const gaps = assessExperienceGaps([["one"], ["one"], ["one", "two"]]);
check(gaps.length === 3, "sparse roles are reported instead of padded");
check(/Most recent role has 1/.test(gaps[0]), "gap names the most recent role");

const devOps = prepareExperienceForExport(
  [{ base_bullets: ["Automated AWS infrastructure with Terraform."] }],
  [[]],
  "AWS Terraform"
);
check(/Terraform/.test((devOps[0] || []).join(" ")), "documented DevOps bullet survives an empty AI reply");

const recovered = finalizeExportedResumeSummaryAndSkills(
  ["C++"],
  "Backend engineer summary.",
  {},
  "Must have skills: Python, Kubernetes",
  "Built backend APIs using Java Spring Boot and PostgreSQL."
).skills;
const recoveredFlat = Object.values(recovered).flat();
check(recoveredFlat.includes("PostgreSQL"), "PostgreSQL from an original bullet is added to skills");
check(recoveredFlat.includes("Spring Boot"), "Spring Boot from an original bullet is added to skills");
check(recoveredFlat.some((s) => /^python$/i.test(s)), "Python required by the JD is added to skills");
check(recoveredFlat.some((s) => /fastapi/i.test(s)), "Python's related stack is added to skills");
check(recoveredFlat.some((s) => /kubernetes/i.test(s)), "Kubernetes required by the JD is added to skills");

const jdKept = prepareExperienceForExport(
  [{ company: "Acme", title: "Engineer", base_bullets: [] }],
  [["Rewrote the aggregation path in GoogleSQL and cut scan time on the location history tables."]],
  "GoogleSQL"
);
check(/GoogleSQL/.test((jdKept[0] || []).join(" ")), "a generated bullet that uses a documented technology is kept");
check((jdKept[0] || []).length > 0, "a role with no original bullets keeps generated experience");

const invented = prepareExperienceForExport(
  [{ company: "Acme", title: "Engineer", base_bullets: [] }],
  [["Shipped the product UI in React, Next.js, and Convex."]],
  "C++ GoogleSQL Machine Learning"
);
check((invented[0] || []).length === 0, "React, Next.js, and Convex bullets are removed when the candidate never used them");

const draftSummary = stripDraftWording(
  "This resume draft presents proposed experience for the role. He builds data systems with C++."
);
check(!/resume draft|proposed experience/i.test(draftSummary), "resume draft and proposed experience are removed");
check(/data systems/.test(draftSummary), "the rest of the summary stays");

const mlGrouped = finalizeExportedResumeSummaryAndSkills(
  ["Machine Learning", "C++"],
  "Builds models.",
  { "Architecture & delivery": ["PyTorch", "TensorFlow"], "AI & Intelligent Features": ["scikit-learn"] }
).skills;
const mlRow = mlGrouped["AI & machine learning"] || [];
check(
  ["PyTorch", "TensorFlow", "scikit-learn"].every((name) => mlRow.includes(name)),
  "PyTorch, TensorFlow, and scikit-learn share the AI category"
);
check(
  !(mlGrouped["Architecture & delivery"] || []).some((s) => /pytorch|tensorflow|scikit-learn/i.test(s)),
  "ML libraries are not left under architecture"
);

const carlos = JSON.parse(fs.readFileSync("resumes/Carlos_Francisco_Esponda.json", "utf8"));
const carlosGaps = assessProfileCompleteness(carlos.experience);
check(carlosGaps.length === 5, "sparse five-role profile is incomplete (got " + carlosGaps.length + ")");
check(
  carlosGaps.filter((g) => /no original experience bullets/.test(g)).length === 4,
  "four roles with no bullets are named"
);
check(
  carlosGaps.some((g) => /Google/.test(g) && /3 original bullets/.test(g)),
  "the three Google bullets are kept as a shortfall, not discarded"
);
const completeJobs = [8, 8, 6, 5, 5].map((n, i) => ({
  company: "Company " + (i + 1),
  title: "Engineer",
  base_bullets: Array.from({ length: n }, () => "Maintained Java services for documented workflows."),
}));
check(assessProfileCompleteness(completeJobs).length === 0, "roles that already meet the counts are complete");

process.exit(bad ? 1 : 0);
