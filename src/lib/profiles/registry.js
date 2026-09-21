/**
 * Maps URL slug → résumé display name + PDF template id.
 * Keys are used in `URL_ACCESS_RULES` (`allowedProfileSlugs`) and in routes `/[slug]`.
 */
export const profileTemplateMapping = {
  carlos: {
    resume: "Carlos_Francisco_Esponda",
    template: "Resume-Executive-Navy",
  },
  christoper: {
    resume: "Christopher_Michael_Wood",
    template: "Resume-Executive-Navy",
  },
  elvis: {
    resume: "Elvis_Edinge",
    template: "Resume-Executive-Navy",
  },
  joshua: {
    resume: "Joshua_Eric_Person",
    template: "Resume-Executive-Navy",
  }
};

/**
 * URL slug for a resume JSON filename stem (e.g. "Hardika Narula" → "hardika").
 * @param {string} resumeFileId - Value from resumes/*.json without extension
 * @returns {string|null}
 */
export function slugForResumeId(resumeFileId) {
  if (!resumeFileId || typeof resumeFileId !== "string") return null;
  const needle = resumeFileId.trim();
  for (const [slug, cfg] of Object.entries(profileTemplateMapping)) {
    if (cfg?.resume === needle) return slug;
  }
  return null;
}

export const getProfileBySlug = (slug) => {
  if (!slug) return null;
  return profileTemplateMapping[slug] || null;
};

export const slugToProfileName = (slug) => {
  const config = getProfileBySlug(slug);
  return config?.resume || null;
};

export const getTemplateForProfile = (slug) => {
  const config = getProfileBySlug(slug);
  return config?.template || "Resume";
};

export const getAvailableSlugs = () => {
  return Object.keys(profileTemplateMapping);
};

export const getProfileById = (profileId) => {
  return profileTemplateMapping[profileId] || null;
};

export default profileTemplateMapping;
