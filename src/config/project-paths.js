import path from "path";

/** Repository root (`process.cwd()` in Next.js at runtime). */
export const PROJECT_ROOT = process.cwd();

/** Directory of `*.json` résumé source files (not bundled). */
export const RESUMES_DIR = path.join(PROJECT_ROOT, "resumes");

/** Prompt fragments merged into AI résumé requests. */
export const RESUME_PROMPTS_DIR = path.join(
  PROJECT_ROOT,
  "src",
  "lib",
  "resume",
  "prompts"
);
