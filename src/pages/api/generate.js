import fs from "fs";
import path from "path";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { getTemplate } from "@/lib/pdf-templates";
import {
  callAI,
  isResumeGenerationRefusal,
  resolveDefaultProvider,
  resolveRefusalFallbackProvider,
} from "@/lib/ai/ai-service";
import {
  getTemplateForProfile,
  slugToProfileName,
  getProfileBySlug,
} from "@/lib/profiles/registry";
import { loadPromptForProfile } from "@/lib/resume/prompt-loader";
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
import {
  ensureJdTermsInRecentRoles,
  orderAllExperienceBulletsJdFirst,
} from "@/lib/resume/jd-experience-keywords";
import {
  prepareExperienceForExport,
  skillEvidenceText,
  stripDraftWording,
  toAsciiPunctuation,
} from "@/lib/resume/resume-sanitize";
import { buildResumePromptVariables } from "@/lib/resume/build-prompt-variables";
import { findUnderfilledExperienceRoles } from "@/lib/resume/experience-bullet-guidance";
import { splitLongestDetailInFirstRoleForPageFlow } from "@/lib/resume/page-flow-experience";
import { repairJsonText } from "@/lib/resume/parse-ai-json";
import { RESUMES_DIR } from "@/config/project-paths";

function extractJsonObjectText(raw) {
  let content = String(raw ?? "");
  content = content.replace(/```json\s*/gi, "");
  content = content.replace(/```javascript\s*/gi, "");
  content = content.replace(/```\s*/g, "");
  content = content.replace(/^(here is|here's|this is|the json is):?\s*/gi, "");
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI did not return valid JSON format. Please try again.");
  }
  return content.substring(firstBrace, lastBrace + 1).trim();
}

function parseResumeJsonText(raw, fallbackTitle) {
  const extracted = extractJsonObjectText(raw);
  let parsed;
  try {
    parsed = JSON.parse(extracted);
  } catch (parseError) {
    parsed = JSON.parse(repairJsonText(extracted));
  }
  return normalizeAiResumeContent(parsed, {
    fallbackTitle: fallbackTitle || "Senior Software Engineer",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const {
      profile: profileSlug,
      jd,
      template,
      provider: requestedProvider = null,
      model = null,
      companyName = null,
      targetRole = null,
      format = "pdf",
      stage = "file",
      approvedResume = null,
    } = req.body;

    // Fall back to whichever provider is actually configured (prefers an API
    // key if set, otherwise the ChatGPT session) when the client doesn't
    // explicitly request one.
    const provider = requestedProvider || resolveDefaultProvider();

    if (!profileSlug) return res.status(400).send("Profile slug required");
    if (!jd && stage !== "export") return res.status(400).send("Job description required");

    // Get profile configuration from slug
    const profileConfig = getProfileBySlug(profileSlug);
    if (!profileConfig) {
      return res
        .status(404)
        .send(`Profile with slug "${profileSlug}" not found`);
    }

    const resumeName = profileConfig.resume;

    // Get template from profile mapping or use provided/default
    const templateName =
      template || getTemplateForProfile(profileSlug) || "Resume";

    // Validate provider
    if (!["claude", "openai", "chatgpt-session"].includes(provider)) {
      return res
        .status(400)
        .send(
          `Unsupported provider: ${provider}. Supported: claude, openai, chatgpt-session`
        );
    }

    // Load profile JSON using resume name
    console.log(`Loading profile: ${resumeName} (slug: ${profileSlug})`);
    const profilePath = path.join(RESUMES_DIR, `${resumeName}.json`);

    if (!fs.existsSync(profilePath)) {
      return res
        .status(404)
        .send(`Profile file "${resumeName}.json" not found`);
    }

    let profileData;
    try {
      profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    } catch (parseProfileErr) {
      console.error("Profile JSON parse error:", parseProfileErr);
      return res
        .status(400)
        .send(
          `Invalid profile JSON in "${resumeName}.json": ${parseProfileErr.message}`
        );
    }

    if (!Array.isArray(profileData.experience)) profileData.experience = [];
    if (!Array.isArray(profileData.education)) profileData.education = [];

    if (stage === "export") {
      const approved = approvedResume && typeof approvedResume === "object" ? approvedResume : null;
      if (!approved || !Array.isArray(approved.experience)) {
        return res.status(400).send("Approved resume content is required before export.");
      }
      const templateData = templateDataFromProfile(profileData, approved);
      return deliverResume(res, { templateData, templateName, resumeName, companyName, format });
    }

    const prompt = loadPromptForProfile(
      profileSlug,
      buildResumePromptVariables(profileData, { jd, targetRole, companyName })
    );
    console.log(
      `Resume prompt ready: ${prompt.length} chars, about ${Math.round(prompt.length / 4)} tokens`
    );

    async function runResumeModel(activeProvider, activeModel, activePrompt) {
      const aiResponse = await callAI(
        activePrompt,
        activeProvider,
        activeModel,
        16000,
        2,
        180000
      );
      console.log(`${activeProvider.toUpperCase()} API Response Metadata:`);
      console.log("- Provider:", aiResponse.provider);
      console.log("- Model:", aiResponse.model);
      console.log("- Stop reason:", aiResponse.stop_reason);
      console.log("- Input tokens:", aiResponse.usage?.input_tokens);
      console.log("- Output tokens:", aiResponse.usage?.output_tokens);

      let text;
      if (
        aiResponse.stop_reason === "max_tokens" ||
        aiResponse.stop_reason === "length"
      ) {
        console.error(
          `⚠️ WARNING: ${activeProvider.toUpperCase()} hit max_tokens limit! Response was truncated.`
        );
        const concisePrompt =
          activePrompt +
          "\n\nRetry after a truncated reply. Return one complete JSON object and nothing else. Keep every original skill and original bullet fact. Include every job-description skill and technology. Close every array and object.";
        const retryResponse = await callAI(
          concisePrompt,
          activeProvider,
          activeModel,
          16000,
          1,
          180000
        );
        text =
          typeof retryResponse?.content?.[0]?.text === "string"
            ? retryResponse.content[0].text.trim()
            : "";
      } else {
        text =
          typeof aiResponse?.content?.[0]?.text === "string"
            ? aiResponse.content[0].text.trim()
            : "";
      }
      if (!text) {
        throw new Error(
          "AI returned an empty response. Check API keys or model output."
        );
      }
      return text;
    }

    let activeProvider = provider;
    let activeModel = model;
    let content = await runResumeModel(activeProvider, activeModel, prompt);

    if (isResumeGenerationRefusal(content)) {
      console.error(
        "AI refused JSON generation:",
        content.substring(0, 280)
      );
      const fallbackProvider = resolveRefusalFallbackProvider(activeProvider);
      if (fallbackProvider) {
        console.warn(
          `Claude refused the dual-coverage draft contract. Falling back to ${fallbackProvider}.`
        );
        activeProvider = fallbackProvider;
        activeModel = null;
        content = await runResumeModel(activeProvider, activeModel, prompt);
      }
      if (isResumeGenerationRefusal(content)) {
        throw new Error(
          "Claude refused to generate a resume that includes both original profile content and all JD-required skills/experience. Use OpenAI / ChatGPT for this contract."
        );
      }
    }

    let resumeContent;
    try {
      resumeContent = parseResumeJsonText(
        content,
        profileData.title || "Senior Software Engineer"
      );
    } catch (parseError) {
      console.error("=== JSON PARSE ERROR ===");
      console.error("Parse error:", parseError.message);
      console.error("Content length:", content.length);
      console.error("First 1000 chars:", content.substring(0, 1000));
      throw new Error(
        `AI returned invalid JSON: ${parseError.message}. Please try again.`
      );
    }

    // Validate required fields
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
      console.error(
        "Missing required fields in AI response:",
        Object.keys(resumeContent)
      );
      throw new Error(
        "AI response missing required fields (title, summary, skills, or experience)"
      );
    }

    if (typeof resumeContent.skills !== "object" || resumeContent.skills === null) {
      throw new Error("AI response: skills must be an object");
    }
    if (!Array.isArray(resumeContent.experience)) {
      throw new Error("AI response: experience must be an array");
    }

    let underfilled = findUnderfilledExperienceRoles(resumeContent.experience);
    if (underfilled.length > 0) {
      const gapLines = underfilled
        .map(
          ({ index, have, need }) =>
            `Role ${index + 1}: returned ${have} details, need at least ${need}`
        )
        .join("\n");
      console.warn(
        `⚠️ Experience bullet counts under-filled. Retrying once.\n${gapLines}`
      );
      const fillRetryPrompt =
        prompt +
        "\n\nYour previous JSON under-filled experience bullets. Fix it now.\n" +
        gapLines +
        "\nRegenerate the COMPLETE resume JSON. Keep every original skill and original experience fact. Include every JD-required skill and experience. Fill every experience[].details array to at least its minimum count. Roles 1 and 2 need 8-12 bullets each. Older roles need at least 5. Count details before you stop. Return only JSON.";
      const fillRetry = await callAI(
        fillRetryPrompt,
        activeProvider,
        activeModel,
        16000,
        1,
        180000
      );
      const fillText =
        typeof fillRetry?.content?.[0]?.text === "string"
          ? fillRetry.content[0].text.trim()
          : "";
      if (fillText) {
        try {
          const retried = parseResumeJsonText(
            fillText,
            profileData.title || "Senior Software Engineer"
          );
          const retriedGaps = findUnderfilledExperienceRoles(retried.experience);
          const prevDeficit = underfilled.reduce((s, g) => s + (g.need - g.have), 0);
          const nextDeficit = retriedGaps.reduce((s, g) => s + (g.need - g.have), 0);
          if (
            retried?.skills &&
            Array.isArray(retried.experience) &&
            (retriedGaps.length === 0 || nextDeficit < prevDeficit)
          ) {
            resumeContent = retried;
            underfilled = retriedGaps;
          }
        } catch (retryParseErr) {
          console.warn("Bullet-count retry parse failed:", retryParseErr.message);
        }
      }
      if (underfilled.length > 0) {
        console.warn(
          "Still under-filled after retry:\n" +
            underfilled
              .map(
                ({ index, have, need }) =>
                  `Role ${index + 1}: ${have}/${need}`
              )
              .join("\n")
        );
      }
    }

    console.log("✅ AI content generated successfully");
    console.log("Skills categories:", Object.keys(resumeContent.skills).length);
    console.log("Experience entries:", resumeContent.experience.length);

    // Debug: Check if experience has details
    resumeContent.experience.forEach((exp, idx) => {
      console.log(
        `Experience ${idx + 1}: ${exp.title || "NO TITLE"} - Details count: ${
          exp.details?.length || 0
        }`
      );
      if (!exp.details || exp.details.length === 0) {
        console.error(
          `⚠️ WARNING: Experience entry ${idx + 1} has NO DETAILS!`
        );
      }
    });

    console.log(`Using template: ${templateName}`);

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
    mergedDetails = ensureJdTermsInRecentRoles(mergedDetails, jd || "");
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

    // Prepare data for template
    const templateData = {
      name: profileData.name,
      title: stripDraftWording(
        (typeof resumeContent.title === "string" && resumeContent.title.trim()) ||
          profileData.title ||
          ""
      ),
      email: profileData.email,
      phone: profileData.phone, // Excluded from resume
      location: profileData.location,
      linkedin: profileData.linkedin, // Excluded from resume
      website: null, // Excluded from resume (may contain GitHub)
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

    return deliverResume(res, { templateData, templateName, resumeName, companyName, format });
  } catch (err) {
    console.error("PDF generation error:", {
      message: err.message,
      status: err.status || err.statusCode || null,
    });
    res.status(500).send("PDF generation failed: " + err.message);
  }
}

function templateDataFromProfile(profileData, approved) {
  const experience = Array.isArray(approved.experience) ? approved.experience : [];
  return {
    name: profileData.name,
    title:
      (typeof approved.title === "string" && approved.title.trim()) || profileData.title,
    email: profileData.email,
    phone: profileData.phone,
    location: profileData.location,
    linkedin: profileData.linkedin,
    website: null,
    summary: toAsciiPunctuation(approved.summary || ""),
    skills: approved.skills && typeof approved.skills === "object" ? approved.skills : {},
    experience: profileData.experience.map((job, idx) => ({
      title: job.title || experience[idx]?.title || "Engineer",
      company: job.company,
      location: job.location,
      start_date: job.start_date,
      end_date: job.end_date,
      details: Array.isArray(experience[idx]?.details) ? experience[idx].details : [],
    })),
    certifications: normalizeCertifications(profileData.certifications, approved.certifications),
    education: profileData.education,
  };
}

async function deliverResume(res, { templateData, templateName, resumeName, companyName, format }) {
  const baseName = computeResumeBaseFileName(resumeName, companyName);
  const outFormat = format === "docx" || format === "word" ? "docx" : "pdf";
  if (outFormat === "docx") {
    const docxBuffer = await buildResumeDocxBuffer(templateData);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}.docx"`);
    res.end(docxBuffer);
    return;
  }
  const TemplateComponent = getTemplate(templateName);
  if (!TemplateComponent) {
    return res.status(404).send(`Template "${templateName}" not found`);
  }
  const pdfStream = await renderToStream(React.createElement(TemplateComponent, { data: templateData }));
  const chunks = [];
  for await (const chunk of pdfStream) chunks.push(chunk);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
  res.end(Buffer.concat(chunks));
}
