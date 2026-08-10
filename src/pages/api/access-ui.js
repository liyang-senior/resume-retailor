import { loadUrlAccessRules, resolveUrlAccess } from "@/server/access/url-rules";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const accessUrl =
    typeof req.query.accessUrl === "string" ? req.query.accessUrl : "";
  const resolved = resolveUrlAccess(accessUrl, loadUrlAccessRules());
  if (!resolved.ok) {
    return res.status(404).json({ error: "Not found", code: resolved.code });
  }
  res.status(200).json({
    showRightSidebar: resolved.showRightSidebar,
  });
}
