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
} from "@/lib/resume/merge-resume-base";
import {
  injectJdKeywordsIntoFirstRoleDetails,
  orderAllExperienceBulletsJdFirst,
} from "@/lib/resume/jd-experience-keywords";
import { splitLongestDetailInFirstRoleForPageFlow } from "@/lib/resume/page-flow-experience";
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

    // Clean and extract JSON from pasted ChatGPT response
    let content = rawResponse.trim();

    // Remove markdown code blocks
    content = content.replace(/```json\s*/gi, "");
    content = content.replace(/```javascript\s*/gi, "");
    content = content.replace(/```\s*/g, "");

    // Remove common prefixes
    content = content.replace(
      /^(here is|here's|this is|the json is):?\s*/gi,
      ""
    );

    // Extract content between first { and last }
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error(
        "No JSON object found. Please paste the full JSON from ChatGPT."
      );
    }

    content = content.trim();

    // Parse JSON
    let resumeContent;
    try {
      resumeContent = JSON.parse(content);
    } catch (parseError) {
      try {
        const fixedContent = content.replace(/,(\s*[}\]])/g, "$1");
        resumeContent = JSON.parse(fixedContent);
      } catch (secondError) {
        throw new Error(
          `Invalid JSON: ${parseError.message}. Check the pasted response.`
        );
      }
    }

    // Validate required fields
    if (
      !resumeContent.title ||
      !resumeContent.summary ||
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

    let mergedDetails = mergeExperienceDetails(
      profileData.experience,
      resumeContent.experience
    );
    if (jd && mergedDetails.length > 0) {
      mergedDetails = [
        injectJdKeywordsIntoFirstRoleDetails(
          mergedDetails[0],
          jd,
          profileData
        ),
        ...mergedDetails.slice(1),
      ];
    }
    mergedDetails = orderAllExperienceBulletsJdFirst(mergedDetails, jd);
    mergedDetails = splitLongestDetailInFirstRoleForPageFlow(mergedDetails);
    const { summary: exportSummary, skills: exportSkills } =
      finalizeExportedResumeSummaryAndSkills(
        profileData.base_skills,
        resumeContent.summary,
        resumeContent.skills
      );

    const templateData = {
      name: profileData.name,
      title: profileData.title,
      email: profileData.email,
      phone: profileData.phone,
      location: profileData.location,
      linkedin: profileData.linkedin,
      website: profileData.website,
      summary: exportSummary,
      skills: exportSkills,
      experience: profileData.experience.map((job, idx) => ({
        title: job.title || resumeContent.experience[idx]?.title || "Engineer",
        company: job.company,
        location: job.location,
        start_date: job.start_date,
        end_date: job.end_date,
        details: mergedDetails[idx] || [],
      })),
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
