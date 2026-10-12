import fs from "fs";
import path from "path";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { getTemplate } from "@/lib/pdf-templates";
import {
  getTemplateForProfile,
  getProfileBySlug,
} from "@/lib/profiles/registry";
import {
  buildResumeDocxBuffer,
  computeResumeBaseFileName,
} from "@/lib/resume/resume-to-docx";
import {
  finalizeExportedResumeSummaryAndSkills,
  mergeExperienceDetails,
  normalizeAiResumeContent,
  normalizeCertifications,
} from "@/lib/resume/merge-resume-base";
import { orderAllExperienceBulletsJdFirst } from "@/lib/resume/jd-experience-keywords";
import {
  prepareExperienceForExport,
  skillEvidenceText,
  stripDraftWording,
  toAsciiPunctuation,
} from "@/lib/resume/resume-sanitize";
import { splitLongestDetailInFirstRoleForPageFlow } from "@/lib/resume/page-flow-experience";
import { parseAiJson } from "@/lib/resume/parse-ai-json";
import { RESUMES_DIR } from "@/config/project-paths";

/**
 * Generate PDF from manually pasted ChatGPT response (no API key)
 * POST body: { profile: slug, chatgptResponse: string, companyName?: string }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const {
      profile: profileSlug,
      chatgptResponse: rawResponse,
      companyName = null,
      format = "pdf",
      jd: jdRaw = null,
    } = req.body;
    const jd =
      typeof jdRaw === "string" && jdRaw.trim() ? jdRaw.trim() : null;

    if (!profileSlug) return res.status(400).send("Profile slug required");
    if (!rawResponse || typeof rawResponse !== "string") {
      return res.status(400).send("ChatGPT response (JSON) required");
    }

    const profileConfig = getProfileBySlug(profileSlug);
    if (!profileConfig) {
      return res.status(404).send(`Profile "${profileSlug}" not found`);
    }

    const resumeName = profileConfig.resume;
    const templateName = getTemplateForProfile(profileSlug) || "Resume";
    const profilePath = path.join(RESUMES_DIR, `${resumeName}.json`);

    if (!fs.existsSync(profilePath)) {
      return res
        .status(404)
        .send(`Profile file "${resumeName}.json" not found`);
    }

    let profileData;
    try {
      profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    } catch (parseErr) {
      return res
        .status(400)
        .send(`Invalid profile JSON in "${resumeName}.json": ${parseErr.message}`);
    }
    if (!Array.isArray(profileData.experience)) profileData.experience = [];
    if (!Array.isArray(profileData.education)) profileData.education = [];

    // Parse pasted ChatGPT response (strips fences, repairs common JSON breakage)
    let resumeContent = parseAiJson(rawResponse);

    resumeContent = normalizeAiResumeContent(resumeContent, {
      fallbackTitle: profileData.title || "Senior Software Engineer",
    });

    // Validate required fields (summary may be string[] or string)
    const hasSummary =
      (Array.isArray(resumeContent.summary) &&
        resumeContent.summary.length > 0) ||
      (typeof resumeContent.summary === "string" &&
        resumeContent.summary.trim().length > 0);
    if (
      !resumeContent.title ||
      !hasSummary ||
      !resumeContent.skills ||
      !resumeContent.experience
    ) {
      throw new Error(
        "Missing required fields (title, summary, skills, or experience). Ensure ChatGPT returned the full JSON."
      );
    }
    if (typeof resumeContent.skills !== "object" || resumeContent.skills === null) {
      throw new Error("Invalid JSON: skills must be an object");
    }
    if (!Array.isArray(resumeContent.experience)) {
      throw new Error("Invalid JSON: experience must be an array");
    }

    const evidenceText = [
      skillEvidenceText(profileData),
      ...profileData.experience.flatMap((job) => job.base_bullets || job.base_details || []),
    ].join(" ");
    const { summary: exportSummary, skills: exportSkills } =
      finalizeExportedResumeSummaryAndSkills(
        profileData.base_skills,
        resumeContent.summary,
        resumeContent.skills,
        jd,
        evidenceText
      );
    const allowedTech = [
      evidenceText,
      String(jd || ""),
      ...Object.values(exportSkills).flat(),
    ].join(" ");
    let mergedDetails = prepareExperienceForExport(
      profileData.experience,
      mergeExperienceDetails(profileData.experience, resumeContent.experience),
      allowedTech,
      jd || ""
    );
    const emptyRoles = mergedDetails
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => !Array.isArray(row) || row.length === 0);
    if (emptyRoles.length > 0) {
      const gaps = emptyRoles.map(({ idx }) => {
        const job = profileData.experience[idx] || {};
        const label = [job.company, job.title].filter(Boolean).join(" | ") || `Role ${idx + 1}`;
        return `${label}: the generated experience section is empty.`;
      });
      console.warn("INCOMPLETE_INFORMATION\n" + gaps.join("\n"));
      return res.status(422).json({
        status: "INCOMPLETE_INFORMATION",
        message:
          "The model returned empty experience for one or more roles, so this was not exported as a completed resume.",
        gaps,
      });
    }
    mergedDetails = orderAllExperienceBulletsJdFirst(mergedDetails, jd);
    mergedDetails = splitLongestDetailInFirstRoleForPageFlow(mergedDetails);

    const templateData = {
      name: profileData.name,
      title: stripDraftWording(
        (typeof resumeContent.title === "string" && resumeContent.title.trim()) ||
          profileData.title ||
          ""
      ),
      email: profileData.email,
      phone: profileData.phone,
      location: profileData.location,
      linkedin: profileData.linkedin,
      website: profileData.website,
      summary: toAsciiPunctuation(exportSummary),
      skills: exportSkills,
      experience: profileData.experience.map((job, idx) => ({
        title: job.title || resumeContent.experience[idx]?.title || "Engineer",
        company: job.company,
        location: job.location,
        start_date: job.start_date,
        end_date: job.end_date,
        details: mergedDetails[idx] || [],
      })),
      certifications: normalizeCertifications(
        profileData.certifications,
        resumeContent.certifications
      ),
      education: profileData.education,
    };

    const baseName = computeResumeBaseFileName(resumeName, companyName);
    const outFormat =
      format === "docx" || format === "word" ? "docx" : "pdf";

    if (outFormat === "docx") {
      const docxBuffer = await buildResumeDocxBuffer(templateData);
      const fileName = `${baseName}.docx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.end(docxBuffer);
      return;
    }

    const TemplateComponent = getTemplate(templateName);
    if (!TemplateComponent) {
      return res.status(404).send(`Template "${templateName}" not found`);
    }

    const pdfDocument = React.createElement(TemplateComponent, {
      data: templateData,
    });
    const pdfStream = await renderToStream(pdfDocument);

    const chunks = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    const fileName = `${baseName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("Manual PDF generation error:", err);
    res.status(500).send("PDF generation failed: " + err.message);
  }
}
