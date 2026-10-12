import fs from "fs";
import {
  enrichRelatedStacks,
  finalizeExportedResumeSummaryAndSkills,
  formatPermanentContextForPrompt,
  mergeDuplicateSkillCategories,
} from "../src/lib/resume/merge-resume-base.js";

const profile = JSON.parse(
  fs.readFileSync("resumes/Carlos_Francisco_Esponda.json", "utf8")
);

// Simulates the AI re-listing base tokens across themed rows (the reported bug)
const aiSkills = {
  "Programming & Algorithms": ["Programming", "Algorithms", "C++", "MATLAB", "TypeScript", "Python"],
  "Data Query & Analysis": ["GoogleSQL", "Dremel", "PostgreSQL"],
  "Machine Learning": ["Machine Learning", "Unsupervised Machine Learning", "Predictive Modeling"],
  "Data Platforms": ["Dremel", "GoogleSQL", "Data Management", "Data Storage", "Redis"],
  "Cloud services": ["AWS (Lambda, S3, ECS)", "Docker", "Kubernetes"],
  Skills: ["React", "Node.js", "Software Performance Improvement"],
};

const { skills } = finalizeExportedResumeSummaryAndSkills(
  profile.base_skills,
  "summary",
  aiSkills
);

let bad = 0;
const check = (ok, msg) => {
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", msg);
};

console.log(JSON.stringify(skills, null, 1));
const cats = Object.keys(skills);
check(!cats.some((c) => /^(technical |core |key )?skills$/i.test(c)), 'no catch-all "Skills" row');
check(!cats.includes("__uncategorized__"), "no internal key leaked");

const all = Object.values(skills).flat().map((s) => s.toLowerCase());
check(new Set(all).size === all.length, "no skill repeated across rows");

for (const s of profile.base_skills) {
  if (/^programming$/i.test(s)) continue;
  check(all.includes(s.toLowerCase()), `base skill kept: ${s}`);
}
const languageRow = skills["Languages"] || [];
check(
  languageRow.every((s) => !/^(programming|algorithms)$/i.test(s)),
  "languages row contains only languages"
);
check(
  !all.includes("react") && !all.includes("react.js") && !all.includes("next.js") && !all.includes("convex"),
  "undocumented React.js, Next.js, and Convex are omitted"
);
check(!all.some((s) => /\baws\b|docker|kubernetes/.test(s)), "undocumented cloud products are omitted");
const aiRow = (skills["AI & machine learning"] || []).map((s) => s.toLowerCase());
check(
  aiRow.includes("pytorch") && aiRow.includes("tensorflow") && aiRow.includes("scikit-learn"),
  "documented machine learning adds PyTorch, TensorFlow, and scikit-learn under AI"
);
const jsSkills = finalizeExportedResumeSummaryAndSkills(
  ["TypeScript", "Node.js"],
  "summary",
  {},
  null,
  "TypeScript and Node.js services"
).skills;
check(
  (jsSkills["Backend engineering"] || []).some((s) => /nest\.js/i.test(s)) &&
    (jsSkills["Backend engineering"] || []).some((s) => /express\.js/i.test(s)),
  "JavaScript stack adds Nest.js and Express.js"
);
const pythonOnly = enrichRelatedStacks({ Languages: ["Python"] }, "Python");
const pythonBackend = pythonOnly["Backend engineering"] || [];
check(pythonBackend.some((s) => /fastapi/i.test(s)), "Python stack adds FastAPI");
check(!pythonBackend.some((s) => /nest\.js/i.test(s)), "Python stack does not add Nest.js");
const djangoJd = finalizeExportedResumeSummaryAndSkills([], "summary", {}, "Required: Django").skills;
check(
  (djangoJd["Languages"] || []).some((s) => /^python$/i.test(s)),
  "Django in the JD adds Python"
);
const aiJd = finalizeExportedResumeSummaryAndSkills([], "summary", {}, "Required: AI engineering").skills;
check(
  (aiJd["Languages"] || []).some((s) => /^python$/i.test(s)) &&
    (aiJd["AI & machine learning"] || []).some((s) => /pytorch/i.test(s)),
  "AI engineering adds Python and the ML stack"
);
check(
  !(aiJd["Backend engineering"] || []).some((s) => /django/i.test(s)),
  "AI engineering does not add Django"
);
const goOnly = enrichRelatedStacks({ Languages: ["Go"] }, "Go");
check((goOnly["Backend engineering"] || []).some((s) => /gin/i.test(s)), "Go stack adds Gin");
check(!(goOnly["Backend engineering"] || []).some((s) => /nest\.js|fastapi|spring/i.test(s)), "Go stack stays on the Go ecosystem");

const testing = mergeDuplicateSkillCategories({
  Testing: ["Jest"],
  "Testing and Quality Engineering": ["Unit Testing", "Test Automation"],
});
check(Object.keys(testing).length === 1 && testing.Testing.length === 3, "Testing titles collapse into one row");

const ctx = formatPermanentContextForPrompt(profile);
check(/NO category/.test(ctx) && /MATLAB/.test(ctx), "prompt context lists uncategorized base skills");
check(!/\*\*__uncategorized__/.test(ctx) && !/- \*\*Skills:\*\*/.test(ctx), 'prompt context has no fake "Skills:" group');

process.exit(bad ? 1 : 0);
