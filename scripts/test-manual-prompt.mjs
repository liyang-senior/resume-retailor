// Usage: node scripts/test-manual-prompt.mjs [profileSlug] [baseUrl]
import fs from "fs";

const profile = process.argv[2] || "carlos";
const base = process.argv[3] || "http://localhost:3000";

const jd = `Project Role : Full Stack Engineer
Must have skills : Python Frameworks, Multiplatform Application Development, Microsoft Front End Development (FED)
Minimum 3 year(s) of experience is required
Roles & Responsibilities:
- Collaborate with cross-functional teams.
- Document development processes, code changes, and system configurations.
- Assist junior team members.
Professional & Technical Skills:
- Strong experience in client-side and server-side components.
- Familiarity with cloud computing platforms.
- Experience with version control systems.
- Understanding of agile methodologies.`;

const res = await fetch(`${base}/api/manual-prompt`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ profile, jd }),
});
const data = await res.json();
if (!res.ok) {
  console.log("FAIL", res.status, data);
  process.exit(1);
}
const p = data.prompt;
fs.writeFileSync("scripts/.test-prompt.txt", p);
console.log("chars:", p.length, "approx tokens:", Math.round(p.length / 4));
console.log("unreplaced placeholders:", p.match(/\{\{[a-zA-Z]+\}\}/g) || "none");
for (const needle of [
  "10–12",
  "4–5",
  "Bullet counts for experience JSON",
  "JD REQUIREMENTS NOT SUPPORTED",
  "Python",
  "exactly",
]) {
  console.log(needle.padEnd(36), p.includes(needle));
}
