import fs from "fs";
import path from "path";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { getTemplate } from "../../lib/pdf-templates";
import { callAI } from "../../lib/ai-service";
import {
  getTemplateForProfile,
  slugToProfileName,
  getProfileBySlug,
} from "../../lib/profile-template-mapping";
import { loadPromptForProfile } from "../../lib/prompt-loader";
import {
  buildResumeDocxBuffer,
  computeResumeBaseFileName,
} from "../../lib/resume-to-docx";
import {
  formatPermanentContextForPrompt,
  mergeBaseSkillsIntoAi,
  mergeExperienceDetails,
  profileHasPermanentContent,
} from "../../lib/merge-resume-base";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const {
      profile: profileSlug,
      jd,
      template,
      provider = "openai",
      model = null,
      companyName = null,
      format = "pdf",
    } = req.body;

    if (!profileSlug) return res.status(400).send("Profile slug required");
    if (!jd) return res.status(400).send("Job description required");

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
    if (!["claude", "openai"].includes(provider)) {
      return res
        .status(400)
        .send(`Unsupported provider: ${provider}. Supported: claude, openai`);
    }

    // Load profile JSON using resume name
    console.log(`Loading profile: ${resumeName} (slug: ${profileSlug})`);
    const profilePath = path.join(
      process.cwd(),
      "resumes",
      `${resumeName}.json`
    );

    if (!fs.existsSync(profilePath)) {
      return res
        .status(404)
        .send(`Profile file "${resumeName}.json" not found`);
    }

    const profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

    // Calculate years of experience
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

    // Prepare variables for prompt template
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
    const experienceBulletGuidance = hasPermanent
      ? "Generate **4-6 NEW** bullets per role in `experience[].details` (25-35 words each). These are **in addition to** the permanent base bullets above (prepended automatically). Do **not** repeat those permanent bullets in your JSON."
      : "Generate **6-8** bullets per role in `experience[].details` (25-35 words each).";

    // Load prompt template for this profile (using slug)
    const prompt = loadPromptForProfile(profileSlug, {
      name: profileData.name,
      email: profileData.email,
      location: profileData.location,
      yearsOfExperience: yearsOfExperience,
      workHistory: workHistory,
      education: education,
      jobDescription: jd,
      experienceCount: profileData.experience.length,
      resumeTitle: profileData.title || "Senior Software Engineer",
      permanentResumeContext,
      experienceBulletGuidance,
    });

    const aiResponse = await callAI(prompt, provider, model);

    // Log token usage to debug if we're hitting limits
    console.log(`${provider.toUpperCase()} API Response Metadata:`);
    console.log("- Provider:", aiResponse.provider);
    console.log("- Model:", aiResponse.model);
    console.log("- Stop reason:", aiResponse.stop_reason);
    console.log("- Input tokens:", aiResponse.usage?.input_tokens);
    console.log("- Output tokens:", aiResponse.usage?.output_tokens);

    let content;
    if (
      aiResponse.stop_reason === "max_tokens" ||
      aiResponse.stop_reason === "length"
    ) {
      console.error(
        `⚠️ WARNING: ${provider.toUpperCase()} hit max_tokens limit! Response was truncated.`
      );
      console.log(
        "🔄 Retrying with reduced requirements to fit in token limit..."
      );

      // Retry with a more concise prompt
      const concisePrompt = prompt
        .replace(/TOTAL: 60-80 skills maximum/g, "TOTAL: 50-60 skills maximum")
        .replace(/Per category: 8-12 skills/g, "Per category: 6-10 skills")
        .replace(/6 bullets each/g, "5 bullets each")
        .replace(/5-6 bullets per job/g, "4-5 bullets per job");

      const retryResponse = await callAI(concisePrompt, provider, model);
      console.log("Retry Response Metadata:");
      console.log("- Stop reason:", retryResponse.stop_reason);
      console.log("- Output tokens:", retryResponse.usage?.output_tokens);

      content = retryResponse.content[0].text.trim();
    } else {
      content = aiResponse.content[0].text.trim();
    }

    // Check if AI is apologizing instead of returning JSON
    if (
      content.toLowerCase().startsWith("i'm sorry") ||
      content.toLowerCase().startsWith("i cannot") ||
      content.toLowerCase().startsWith("i apologize")
    ) {
      console.error(
        "AI is apologizing instead of returning JSON:",
        content.substring(0, 200)
      );
      throw new Error(
        "AI refused to generate resume. The prompt may be too complex. Please try again with a shorter job description or simpler requirements."
      );
    }

    // Enhanced JSON extraction - handle various formats
    // Remove markdown code blocks (case insensitive)
    content = content.replace(/```json\s*/gi, "");
    content = content.replace(/```javascript\s*/gi, "");
    content = content.replace(/```\s*/g, "");

    // Remove common prefixes
    content = content.replace(
      /^(here is|here's|this is|the json is):?\s*/gi,
      ""
    );

    // Try to extract JSON from text if wrapped
    // Look for content between first { and last }
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    } else {
      console.error("No JSON object found in response");
      throw new Error("AI did not return valid JSON format. Please try again.");
    }

    content = content.trim();

    // Parse JSON with better error handling
    let resumeContent;
    try {
      resumeContent = JSON.parse(content);
    } catch (parseError) {
      console.error("=== JSON PARSE ERROR ===");
      console.error("Parse error:", parseError.message);
      console.error("Content length:", content.length);
      console.error("First 1000 chars:", content.substring(0, 1000));
      console.error(
        "Last 500 chars:",
        content.substring(Math.max(0, content.length - 500))
      );

      // Try to fix common JSON issues
      try {
        // Remove trailing commas
        let fixedContent = content.replace(/,(\s*[}\]])/g, "$1");
        // Fix unescaped quotes in strings (basic attempt)
        fixedContent = fixedContent.replace(
          /([^\\])"([^",:}\]]*)":/g,
          '$1\\"$2":'
        );
        resumeContent = JSON.parse(fixedContent);
        console.log("✅ Successfully parsed after fixing common issues");
      } catch (secondError) {
        console.error("Failed to parse even after fixes");
        throw new Error(
          `AI returned invalid JSON: ${parseError.message}. Please try again.`
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
      console.error(
        "Missing required fields in AI response:",
        Object.keys(resumeContent)
      );
      throw new Error(
        "AI response missing required fields (title, summary, skills, or experience)"
      );
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

    const mergedDetails = mergeExperienceDetails(
      profileData.experience,
      resumeContent.experience
    );
    const mergedSkills = mergeBaseSkillsIntoAi(
      profileData.base_skills,
      resumeContent.skills
    );

    // Prepare data for template
    const templateData = {
      name: profileData.name,
      title: profileData.title,
      email: profileData.email,
      phone: profileData.phone, // Excluded from resume
      location: profileData.location,
      linkedin: profileData.linkedin, // Excluded from resume
      website: null, // Excluded from resume (may contain GitHub)
      summary: resumeContent.summary,
      skills: mergedSkills,
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
      console.log("Word document generated successfully!");
      return;
    }

    // Get React PDF template component
    const TemplateComponent = getTemplate(templateName);

    if (!TemplateComponent) {
      console.error(`Template not found: ${templateName}`);
      return res.status(404).send(`Template "${templateName}" not found`);
    }

    // Render PDF with React PDF
    const pdfDocument = React.createElement(TemplateComponent, {
      data: templateData,
    });
    const pdfStream = await renderToStream(pdfDocument);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    console.log("PDF generated successfully!");

    const fileName = `${baseName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).send("PDF generation failed: " + err.message);
  }
}
