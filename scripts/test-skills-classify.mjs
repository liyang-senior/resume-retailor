import { sanitizeSkillMap, canonicalSkillName } from "../src/lib/resume/resume-sanitize.js";
import { reclassifyCatchAllSkills } from "../src/lib/resume/merge-resume-base.js";
import { ensureJdTermsInRecentRoles } from "../src/lib/resume/jd-experience-keywords.js";

let bad = 0;
const check = (ok, label) => {
  if (!ok) bad += 1;
  console.log(ok ? "PASS" : "FAIL", label);
};

check(canonicalSkillName("Convex Schemas") === "Convex", "Convex Schemas collapses");
check(canonicalSkillName("Convex Queries") === "Convex", "Convex Queries collapses");
check(canonicalSkillName("Convex Database") === "Convex", "Convex Database collapses");

const weird = sanitizeSkillMap(
  reclassifyCatchAllSkills({
    "Backend engineering": ["Express.js", "Ruby on Rails", "Full-Stack Development"],
    Languages: ["Ruby", "TypeScript", "JavaScript"],
    "Frontend engineering": ["Next.js", "React.js", "User Interface Development"],
    "Target stack requirements": [
      "CSS",
      "HTML",
      "Tailwind CSS",
      "shadcn/ui",
      "Form Handling",
      "CI/CD",
      "Authentication",
    ],
    Databases: [
      "Convex Schemas",
      "Convex Queries",
      "Convex Actions",
      "Convex",
      "Redis",
    ],
    "Software Engineering": ["Website Development", "Application Development"],
    "Engineering Tools": ["Jira", "Entity Framework", "Bitbucket"],
  })
);

check(!weird["Target stack requirements"], "Target stack requirements removed");
check(!weird["Software Engineering"], "Software Engineering removed");
check(!weird["Engineering Tools"], "Engineering Tools removed");
check(
  Object.keys(weird).every((k) =>
    [
      "Languages",
      "Frontend engineering",
      "Backend engineering",
      "Databases",
      "Data engineering",
      "DevOps",
      "Cloud engineering",
      "AI & machine learning",
      "Messaging",
      "Security",
      "Testing",
      "Engineering practices",
    ].includes(k)
  ),
  "only canonical stack categories remain"
);
check(
  (weird.Databases || []).filter((s) => /convex/i.test(s)).length === 1,
  "Convex listed once under Databases"
);
check(
  !(weird["Backend engineering"] || []).some((s) => /full-stack/i.test(s)),
  "Full-Stack Development dropped"
);
check((weird["Frontend engineering"] || []).includes("Tailwind CSS"), "Tailwind under Frontend");
check((weird["Backend engineering"] || []).includes("Entity Framework"), "Entity Framework under Backend");
check((weird.Security || []).includes("Authentication"), "Authentication under Security");

const jd = "Must have Convex, React.js, and Next.js experience.";
const ensured = ensureJdTermsInRecentRoles(
  [["Built Ruby on Rails APIs for internal tools."], ["Maintained legacy services."]],
  jd
);
check(
  ensured[0].some((b) => /convex/i.test(b)) &&
    ensured[0].some((b) => /react\.js/i.test(b)) &&
    ensured[0].some((b) => /next\.js/i.test(b)),
  "JD platform bullets added to most recent role"
);

process.exit(bad ? 1 : 0);
