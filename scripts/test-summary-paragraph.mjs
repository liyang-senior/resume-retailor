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
  ["skills density", /concrete tool and product names, about 8-15 names/],
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
const filledChecks = [
  ["name once", nameHits === 1],
  ["Backend Engineer", filled.includes("Backend Engineer")],
  ["no original bullets", filled.includes("no original bullets supplied for this role")],
  ["complete JSON", filled.includes("exactly one complete JSON object")],
  ["Required JD languages", filled.includes("Required job-description languages and technologies")],
  ["every required language", filled.includes("every required language from the job description")],
  ["100% JD match first", filled.includes("PRIORITY 1 - MANDATORY 100% JD match")],
  ["never omit undocumented JD", filled.includes("Never omit Convex, React.js, Next.js")],
  ["skills inventory", filled.includes("PRIORITY 2 - MANDATORY skills inventory")],
  ["JD skills plus related", filled.includes("every required JD skill plus related skills")],
  ["dual coverage", filled.includes("MANDATORY dual coverage")],
  ["related experience", filled.includes("PRIORITY 3 - MANDATORY related experience")],
  ["skill needs experience", filled.includes("related hands-on experience bullets for it")],
  ["no duplicate skills/categories", filled.includes("MANDATORY no duplicate skills or categories")],
  ["no gap analysis", filled.includes("gap analysis")],
  ["hands-on bullets", filled.includes("MANDATORY hands-on experience bullets")],
  ["fill details arrays", filled.includes("FILL every details array with hands-on bullets now")],
  ["roles 1-2 counts", filled.includes("Roles 1 and 2 (most recent): write 8-12 bullets each")],
  ["older 5-8", filled.includes("Every older role: write 5-8 bullets")],
  ["5 three-line", filled.includes("at least 5 three-line bullets each")],
  ["word counts", filled.includes("3-line = 36-48 words")],
  ["2-line words", filled.includes("2-line = 22-32 words")],
  ["1-line words", filled.includes("1-line = 12-20 words")],
  ["at most 1-2 one-liners", filled.includes("at most 1 or 2 bullets may be 1-line")],
  ["every role 3x3-line", filled.includes("Every role needs at least 3 three-line bullets")],
  ["humanized English", filled.includes("Write natural humanized professional English")],
  ["tech repeat cap", filled.includes("more than 3 times inside one experience role")],
  ["seniority across roles", filled.includes("show that seniority across several roles")],
  ["skills classification", filled.includes("MANDATORY skills classification")],
  ["no dump categories", filled.includes("Never create Target stack requirements")],
  ["skills richness", filled.includes("MANDATORY skills richness")],
  ["experience coverage", filled.includes("MANDATORY experience coverage")],
  ["Convex recent bullets", filled.includes("When the JD requires Convex, include separate recent-role bullets")],
  ["period realism", filled.includes("MANDATORY period realism")],
  ["period never omits JD", filled.includes("Never use period realism to omit a JD technology")],
  ["just generate JSON", filled.includes("Just generate the finished JSON resume")],
  ["naming format", filled.includes("MANDATORY naming format")],
  ["React.js", filled.includes("write React.js not React")],
  ["no Illustrative", filled.includes("never write Illustrative responsibility")],
  ["past tense", filled.includes("past tense")],
  ["Convex uniqueness", filled.includes("Convex, Convex Database, Convex Schemas, and Convex Queries are one skill")],
  ["humanized resume", filled.includes("completed, humanized")],
  ["clean text rule", filled.includes("MANDATORY clean text")],
  ["no supplied-materials note", filled.includes("not documented in supplied materials")],
  ["not robotic", filled.includes("Never sound robotic")],
  ["add until count met", filled.includes("keep their facts and add more until the count is met")],
  ["never refuse", filled.includes("Never refuse")],
  ["missing bullets normal", filled.includes("Missing original bullets is normal")],
  ["tech in skills", filled.includes("Every technology named in experience must also appear in skills")],
  ["concise experience", filled.includes("Write concise experience")],
  ["never explain missing", filled.includes("Never explain why experience is missing")],
  ["lead with stack", filled.includes("Lead with the employer's core stack")],
  ["no Examined", filled.includes("Do not start a bullet with Examined")],
  ["Convex capabilities", filled.includes("schemas, queries, mutations, actions")],
  ["count before stop", filled.includes("Before you stop: confirm every required JD skill")],
  ["confirm JD present", filled.includes("confirm every required JD skill and its related stack are present in skills")],
  ["confirm originals remain", filled.includes("confirm original skills and original experience facts remain")],
  ["FILL now", filled.includes("FILL every details array with hands-on bullets now")],
  ["REQUIRED fill plan", /REQUIRED fill \d+-\d+ hands-on details/.test(filled)],
  ["no duplicate classification", filled.includes("Never repeat a classification")],
  ["no invent gate", !filled.includes("even when the profile does not already name it")],
  ["no confirm gate", !filled.includes("Only add Python FastAPI experience if independently confirmed")],
  ["no Do not invent block", !filled.includes("Do not invent:\n")],
  ["Python present", filled.includes("Python")],
  ["no fewer truthful", !filled.includes("return fewer truthful bullets")],
  ["no Omit them", !filled.includes("Omit them unless")],
  ["no leftover placeholders", !filled.includes("{{")],
];
const filledOk = filledChecks.every(([, ok]) => ok);
for (const [label, ok] of filledChecks) {
  if (!ok) console.log("FAIL check:", label);
}
console.log(filledOk ? "PASS filled prompt is single-copy and requires JSON" : "FAIL filled content", "nameHits", nameHits);
if (!filledOk) bad++;
process.exit(bad ? 1 : 0);
