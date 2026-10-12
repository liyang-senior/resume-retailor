import fs from "fs";
import { finalizeExportedResumeSummaryAndSkills } from "../src/lib/resume/merge-resume-base.js";

const skills = { Backend: ["Node.js"] };
const cases = {
  string: "Seasoned engineer. Hands-on with Node.js and AWS.",
  array: ["Seasoned engineer.", "Hands-on with Node.js and AWS."],
  newlines: "Seasoned engineer.\n\nHands-on with Node.js and AWS.",
  bulleted: "- Seasoned engineer.\n- Hands-on with Node.js and AWS.",
};
let bad = 0;
for (const [k, v] of Object.entries(cases)) {
  const { summary } = finalizeExportedResumeSummaryAndSkills([], v, skills);
  const ok = !summary.includes("\n") && !/^[-•*]/.test(summary);
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", k, JSON.stringify(summary));
}

import { buildResumePromptVariables } from "../src/lib/resume/build-prompt-variables.js";

const prompt = fs.readFileSync("src/lib/resume/prompts/default.txt", "utf8");
const required = [
  ["v9 title", /MASTER PROMPT V9/],
  ["original bullet preservation", /ORIGINAL EXPERIENCE PRESERVATION ENGINE/],
  ["summary length", /90-120 words/],
  ["skills density", /70-100 relevant technical skills/],
  ["profile placeholder", /\{\{CANDIDATE_PROFILE\}\}/],
  ["job description placeholder", /\{\{JOB_DESCRIPTION\}\}/],
  ["non-empty experience", /must not be empty/],
  ["no review labels", /Never label a bullet or skill as a draft/],
];
for (const [label, re] of required) {
  const ok = re.test(prompt);
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", label);
}
const vars = buildResumePromptVariables(
  {
    name: "Ada Lovelace",
    title: "Senior Engineer",
    email: "ada@example.com",
    location: "Austin, TX",
    experience: [
      { company: "Acme", title: "Engineer", start_date: "01/2020", end_date: "Present", base_bullets: [] },
    ],
    education: [],
    base_skills: ["Python"],
  },
  { jd: "Backend Engineer\nMust have skills: Python", targetRole: "Backend Engineer", companyName: "Example" }
);
let filled = prompt;
for (const [key, value] of Object.entries(vars)) {
  filled = filled.replaceAll(`{{${key}}}`, String(value ?? ""));
}
const leftover = filled.match(/\{\{[A-Za-z0-9_]+\}\}/g);
console.log(leftover ? "FAIL unfilled " + leftover.join(",") : "PASS all placeholders filled");
if (leftover) bad++;
const nameHits = filled.split("Ada Lovelace").length - 1;
const filledOk =
  nameHits === 1 &&
  filled.includes("Backend Engineer") &&
  filled.includes("no original bullets supplied for this role") &&
  filled.includes("exactly one complete JSON object") &&
  filled.includes("Every details array must meet the bullet count") &&
  filled.includes("Required job-description languages and technologies") &&
  filled.includes("every required language from the job description") &&
  filled.includes("Roles 1 and 2: 8-12 humanized bullets each") &&
  filled.includes("at least 5 three-line bullets") &&
  filled.includes("one-line (12-20 words) or two-line (22-32 words)") &&
  filled.includes("Every other role: at least 5 bullets") &&
  filled.includes("at least 3 three-line bullets") &&
  filled.includes("MANDATORY bullet counts") &&
  filled.includes("Mix 1-line, 2-line, and 3-line bullets") &&
  filled.includes("Write natural humanized professional English") &&
  filled.includes("more than 3 times inside one experience role") &&
  filled.includes("show that seniority across several roles") &&
  filled.includes("MANDATORY skills richness") &&
  filled.includes("MANDATORY experience coverage") &&
  filled.includes("MANDATORY naming format") &&
  filled.includes("write React.js not React") &&
  filled.includes("never write Illustrative responsibility") &&
  filled.includes("past tense") &&
  filled.includes("Convex and Convex Database are one skill") &&
  filled.includes("completed, humanized") &&
  filled.includes("Never sound robotic") &&
  filled.includes("keep their facts and add more until the count is met") &&
  filled.includes("Never refuse") &&
  filled.includes("Missing original bullets is normal") &&
  filled.includes("Every technology named in experience must also appear in skills") &&
  filled.includes("Write experience that is not too detailed") &&
  filled.includes("Never explain why experience is missing") &&
  filled.includes("Lead with the employer's core stack") &&
  filled.includes("Do not start a bullet with Examined") &&
  filled.includes("schemas, queries, mutations, actions") &&
  /\| \d+ months \| \d+-\d+ humanized bullets/.test(filled) &&
  filled.includes("Never repeat a classification") &&
  !filled.includes("even when the profile does not already name it") &&
  !filled.includes("Only add Python FastAPI experience if independently confirmed") &&
  !filled.includes("Do not invent:\n") &&
  filled.includes("Python") &&
  !filled.includes("return fewer truthful bullets") &&
  !filled.includes("Omit them unless") &&
  filled.includes("Python") &&
  !filled.includes("{{");
console.log(filledOk ? "PASS filled prompt is single-copy and requires JSON" : "FAIL filled content", "nameHits", nameHits);
if (!filledOk) bad++;
process.exit(bad ? 1 : 0);
