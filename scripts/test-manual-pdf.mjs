// Usage: node scripts/test-manual-pdf.mjs [baseUrl] [profileSlug]
import fs from "fs";

const base = process.argv[2] || "http://localhost:3000";
const profile = process.argv[3] || "carlos";

// Deliberately flawed JSON: unescaped inner quotes, raw newline, trailing comma, fenced.
const pasted = `Here is the JSON:
\`\`\`json
{
  "title": "Senior Full Stack Software Engineer",
  "summary": [
    "Seasoned engineer building "real-time" platforms with React, Node.js and AWS.",
    "Hands-on with TypeScript, PostgreSQL, Docker and Kubernetes across cloud-native services.",
    "Collaborative lead who mentors engineers and ships reliable systems end to end.",
    "Strong in CI/CD, observability and API design for customer-facing products.",
  ],
  "skills": {
    "Languages & runtimes": ["TypeScript", "JavaScript", "Node.js", "Python"],
    "Cloud services": ["AWS (Lambda, S3, ECS)", "Docker", "Kubernetes"],
  },
  "experience": [
    { "title": "Senior Software Engineer", "details": ["Built a "high-throughput" API layer with Node.js and AWS Lambda
 serving internal teams, improving reliability across services and releases for customers."] }
  ]
}
\`\`\``;

for (const format of ["pdf", "docx"]) {
  const res = await fetch(`${base}/api/generate-manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, chatgptResponse: pasted, format }),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(format, res.status, res.headers.get("content-type"), buf.length);
  if (!res.ok) {
    console.log(buf.toString("utf8").slice(0, 500));
    process.exitCode = 1;
    continue;
  }
  const out = `scripts/.test-output.${format}`;
  fs.writeFileSync(out, buf);
  console.log("magic:", buf.slice(0, 5).toString("latin1"), "->", out);
}
