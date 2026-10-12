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
  ["master prompt", /UNIVERSAL TECHNICAL RESUME GENERATOR - MASTER PROMPT/],
  ["experience engine", /MANDATORY TECHNICAL EXPERIENCE ENHANCEMENT AND JD COVERAGE ENGINE/],
  ["authority to generate", /AUTHORITY TO GENERATE/],
  ["bidirectional coverage", /Bidirectional JD coverage/],
  ["jd skill to experience", /JD skill → experience bullets/],
  ["jd experience to skills", /JD experience → related skills/],
  ["skills cleanup", /MANDATORY TECHNICAL SKILLS CLEANUP AND OPTIMIZATION/],
  ["bullet structure", /ACTION \+ TECHNOLOGY \+ TECHNICAL IMPLEMENTATION/],
  ["forbidden generics", /continued developing technical expertise/i],
  ["tech depth", /Do not merely mention a technology/],
  ["max 3 tech", /Max 3 mentions of the same technology per role/],
  ["summary length", /90-120 words/],
  ["profile placeholder", /\{\{CANDIDATE_PROFILE\}\}/],
  ["job description placeholder", /\{\{JOB_DESCRIPTION\}\}/],
  ["additional instructions placeholder", /\{\{ADDITIONAL_INSTRUCTIONS\}\}/],
  ["compact validation", /A — JD keywords/],
  ["final rule experience", /authorized and required to GENERATE hands-on technical experience/],
];
for (const [label, re] of required) {
  const ok = re.test(prompt);
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", label);
}

// Token budget: keep master prompt lean after optimization
const promptChars = prompt.length;
const lean = promptChars < 28000;
console.log(lean ? "PASS" : "FAIL", `prompt size ${promptChars} chars (<28000)`);
if (!lean) bad++;

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
  ["experience engine present", filled.includes("MANDATORY TECHNICAL EXPERIENCE ENHANCEMENT")],
  ["must generate bullets", filled.includes("AUTHORITY TO GENERATE")],
  ["generate asap", filled.includes("GENERATE ASAP")],
  ["entity framework databases", filled.includes("Entity Framework→Databases") || filled.includes("Entity Framework under Backend engineering → Databases")],
  ["responsive frontend", filled.includes("Responsive Design") && filled.includes("Frontend")],
  ["bidirectional in contract", filled.includes("BIDIRECTIONAL JD COVERAGE")],
  ["generate both ways in JD list", filled.includes("GENERATE coverage both ways")],
  ["depth-bearing plan", /REQUIRED \d+-\d+ depth-bearing hands-on bullets/.test(filled)],
  ["ACTION+TECH structure note", filled.includes("ACTION+TECH+IMPLEMENTATION+PURPOSE")],
  ["skills cleanup note", filled.includes("§5.7")],
  ["validation generate now", filled.includes("GENERATE and ADD now") || filled.includes("GENERATE it now")],
  ["JD tech list", filled.includes("Required JD technologies and phrases")],
  ["Python present", filled.includes("Python")],
  ["no leftover placeholders", !filled.includes("{{")],
  ["no old CHECK N dump", !filled.includes("CHECK N - Skills cleanup")],
  ["no old section 14 title", !filled.includes("## 14. FINAL GENERATION")],
];
const filledOk = filledChecks.every(([, ok]) => ok);
for (const [label, ok] of filledChecks) {
  if (!ok) console.log("FAIL check:", label);
}
console.log(filledOk ? "PASS filled prompt optimized with experience engine" : "FAIL filled content", "nameHits", nameHits);
if (!filledOk) bad++;
process.exit(bad ? 1 : 0);
