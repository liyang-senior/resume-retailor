import fs from "fs";
import path from "path";
import { RESUMES_DIR } from "@/config/project-paths";
import { slugForResumeId } from "@/lib/profiles/registry";
import { loadUrlAccessRules, resolveUrlAccess } from "@/server/access/url-rules";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const idStr = Array.isArray(id) ? id[0] : id;
    if (!idStr) {
      return res.status(400).json({ error: "Profile ID required" });
    }

    const profilePath = path.join(RESUMES_DIR, `${idStr}.json`);

    if (!fs.existsSync(profilePath)) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const accessUrl =
      typeof req.query.accessUrl === "string" ? req.query.accessUrl : "";
    const rules = loadUrlAccessRules();
    const resolved = resolveUrlAccess(accessUrl, rules);
    if (!resolved.ok) {
      return res.status(404).json({ error: "Not found", code: resolved.code });
    }

    const slug = slugForResumeId(String(idStr));
    if (!slug || !resolved.allowedSlugs.has(slug)) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    res.status(200).json(profileData);
  } catch (error) {
    console.error("Error reading profile:", error);
    res.status(500).json({ error: "Failed to load profile" });
  }
}
