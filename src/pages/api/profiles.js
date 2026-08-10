import fs from "fs";
import { RESUMES_DIR } from "@/config/project-paths";
import { slugForResumeId } from "@/lib/profiles/registry";
import { loadUrlAccessRules, resolveUrlAccess } from "@/server/access/url-rules";

export default async function handler(req, res) {
  try {
    const resumesDir = RESUMES_DIR;
    const files = fs.readdirSync(resumesDir);

    let profiles = files
      .filter((file) => file.endsWith(".json") && file !== "_template.json")
      .map((file) => {
        const id = file.replace(".json", "");
        const slug = slugForResumeId(id);
        return {
          id,
          name: file.replace(".json", "").replace(/_/g, " "),
          slug,
        };
      })
      .filter((p) => p.slug);

    const accessUrl =
      typeof req.query.accessUrl === "string" ? req.query.accessUrl : "";
    const rules = loadUrlAccessRules();
    const resolved = resolveUrlAccess(accessUrl, rules);
    if (!resolved.ok) {
      return res.status(404).json({ error: "Not found", code: resolved.code });
    }

    profiles = profiles.filter((p) => resolved.allowedSlugs.has(p.slug));

    res.status(200).json(profiles);
  } catch (error) {
    console.error("Error reading profiles:", error);
    res.status(500).json({ error: "Failed to load profiles" });
  }
}
