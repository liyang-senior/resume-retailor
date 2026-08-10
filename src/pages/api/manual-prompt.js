import fs from "fs";
import path from "path";
import { getProfileBySlug } from "@/lib/profiles/registry";
import { loadPromptForProfile } from "@/lib/resume/prompt-loader";
import {
  formatPermanentContextForPrompt,
  profileHasPermanentContent,
} from "@/lib/resume/merge-resume-base";
import {
  formatJdExperienceKeywordsBlock,
  formatJdCredibilityGuardBlock,
} from "@/lib/resume/jd-experience-keywords";
import { RESUMES_DIR } from "@/config/project-paths";

/**
 * Build the full prompt for manual ChatGPT use (no API key)
 * POST body: { profile: slug, jd: job description }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { profile: profileSlug, jd } = req.body;

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

    const calculateYears = (experience) => {
      if (!experience || experience.length === 0) return 0;
      const parseDate = (dateStr) => {
        if (dateStr.toLowerCase() === "present") return new Date();
        return new Date(dateStr);
      };
      const earliest = experience.reduce((min, job) => {
        const date = parseDate(job.start_date);
        return date < min ? date : min;
      }, new Date());
      const years = (new Date() - earliest) / (1000 * 60 * 60 * 24 * 365);
      return Math.round(years);
    };

    const yearsOfExperience = calculateYears(profileData.experience);

    const workHistory = profileData.experience
      .map((job, idx) => {
        const parts = [`${idx + 1}. ${job.company}`];
        if (job.title) parts.push(job.title);
        if (job.location) parts.push(job.location);
        parts.push(`${job.start_date} - ${job.end_date}`);
        return parts.join(" | ");
      })
      .join("\n");

    const education = profileData.education
      .map((edu) => {
        let eduStr = `- ${edu.degree}, ${edu.school} (${edu.start_year}-${edu.end_year})`;
        if (edu.grade) eduStr += ` | GPA: ${edu.grade}`;
        return eduStr;
      })
      .join("\n");

    const hasPermanent = profileHasPermanentContent(profileData);
    const permanentResumeContext =
      formatPermanentContextForPrompt(profileData);
    const jdExperienceKeywords = formatJdExperienceKeywordsBlock(jd, {
      max: 45,
      profileData,
    });
    const jdCredibilityGuard = formatJdCredibilityGuardBlock(jd, profileData);
    const experienceBulletGuidance = hasPermanent
      ? "Follow **all seven rules** + **2b**, **4b**, **5a** in the prompt header. (**1**) Every **`base_bullets`** fact in **`details`**. (**2**) Count flexible; (**2b**) merge **≥2** bases → **≥35 words**. (**3**) Flagship lines **≥40** words typical (**exp[0]**/**[1]**); expand thin lines. (**4**) **`experience[0]`** **≥8** lines, **`experience[1]`** **≥6** lines in **`details`** (split/expand—**no** invented metrics). (**4b**) JD-first order. (**5/5a**) Metrics/tenure digits **never** in **`summary`**/**`skills`**; hard numbers only in **`details`** per rule **5**. (**6**) **Skills** **55–75** items, **title-complete**. (**7**) **2–3** pages; **`summary`** **3–6** lines only (export uses **model summary**—no pasted profile prose). **Impact Highlights** → **`experience[0]`/`[1]`**. **`base_skills` never removed.**"
      : "Follow **all seven rules** + **2b**, **4b**, **5a**. **`details`**: long, JD-first; flagship **≥40** words/line when credible; merged **≥35 words**. **Recent two roles:** **≥8** / **≥6** lines when credible. **Skills** **55–75** items, **title-complete**. **No** tenure digits or `%`/`$` in **`summary`**/**`skills`**. **2–3** pages; **`summary`** **3–6** lines. **JD → experience** when **profile-supported**—**never** claim **unsupported must-haves**.";

    const prompt = loadPromptForProfile(profileSlug, {
      name: profileData.name,
      email: profileData.email,
      location: profileData.location,
      yearsOfExperience,
      workHistory,
      education,
      jobDescription: jd,
      experienceCount: profileData.experience.length,
      resumeTitle: profileData.title || "Senior Software Engineer",
      permanentResumeContext,
      experienceBulletGuidance,
      jdExperienceKeywords,
      jdCredibilityGuard,
    });

    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ prompt });
  } catch (err) {
    console.error("Manual prompt error:", err);
    res.status(500).json({ error: "Failed to build prompt: " + err.message });
  }
}
