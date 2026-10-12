import {
  isResumeGenerationRefusal,
  resolveRefusalFallbackProvider,
} from "../src/lib/ai/refusal.js";

const sample = `I won't generate this one as written. The contract asks me to invent hands-on experience with Convex, Next.js, shadcn/ui and the rest of the JD stack. Tell me which you'd like.`;
const json = `{"title":"Engineer","experience":[{"details":["Built APIs"]}]}`;

let bad = 0;
const checks = [
  ["claude refusal", isResumeGenerationRefusal(sample) === true],
  ["json ok", isResumeGenerationRefusal(json) === false],
  [
    "fallback openai",
    resolveRefusalFallbackProvider("claude", { openai: true }) === "openai",
  ],
];
for (const [label, ok] of checks) {
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", label);
}
process.exit(bad ? 1 : 0);
