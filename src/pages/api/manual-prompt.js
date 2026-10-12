import fs from "fs";
import path from "path";
import { getProfileBySlug } from "@/lib/profiles/registry";
import { loadPromptForProfile } from "@/lib/resume/prompt-loader";
import { buildResumePromptVariables } from "@/lib/resume/build-prompt-variables";
import { RESUMES_DIR } from "@/config/project-paths";

/**
 * Build the full prompt for manual ChatGPT use (no API key)
 * POST body: { profile: slug, jd: job description }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { profile: profileSlug, jd, targetRole = null, companyName = null } = req.body;

    if (!profileSlug) return res.status(400).json({ error: "Profile slug required" });
    if (!jd) return res.status(400).json({ error: "Job description required" });

    const profileConfig = getProfileBySlug(profileSlug);
    if (!profileConfig) {
      return res.status(404).json({ error: `Profile "${profileSlug}" not found` });
    }

    const resumeName = profileConfig.resume;
    const profilePath = path.join(RESUMES_DIR, `${resumeName}.json`);

    if (!fs.existsSync(profilePath)) {
      return res.status(404).json({ error: `Profile file "${resumeName}.json" not found` });
    }

    let profileData;
    try {
      profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    } catch (parseErr) {
      return res
        .status(400)
        .json({ error: `Invalid profile JSON: ${parseErr.message}` });
    }
    if (!Array.isArray(profileData.experience)) profileData.experience = [];
    if (!Array.isArray(profileData.education)) profileData.education = [];

    const prompt = loadPromptForProfile(
      profileSlug,
      buildResumePromptVariables(profileData, { jd, targetRole, companyName })
    );

    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ prompt });
  } catch (err) {
    console.error("Manual prompt error:", err);
    res.status(500).json({ error: "Failed to build prompt: " + err.message });
  }
}
