/**
 * Maps URL slug → résumé display name + PDF template id.
 * Keys are used in `config/url-access.json` (`allowedProfileSlugs`) and in routes `/[slug]`.
 */
export const profileTemplateMapping = {
  rahulmonga: {
    resume: "Rahul Monga",
    template: "Resume-Executive-Navy",
  },
  hasan: {
    resume: "Hasan Khan",
    template: "Resume-Executive-Navy",
  },
  davide: {
    resume: "Davide Giovanardi",
    template: "Resume-Executive-Navy",
  },
  deekshith: {
    resume: "Deekshith Reddy Gopidi",
    template: "Resume-Executive-Navy",
  },
  praveen: {
    resume: "Praveen Chaulagain",
    template: "Resume-Executive-Navy",
  },
  kedar: {
    resume: "Kedar Kumar Nanda",
    template: "Resume-Executive-Navy",
  },
  swetha: {
    resume: "Swetha Bezawada",
    template: "Resume-Executive-Navy",
  },
  hardika: {
    resume: "Hardika Narula",
    template: "Resume-Executive-Navy",
  },
  rao: {
    resume: "Amruutha Chandrasekarrao",
    template: "Resume-Executive-Navy",
  },
  oscar: {
    resume: "Oscar Adeyemi Adimi",
    template: "Resume-Executive-Navy",
  },
  /////////////////////////////
  maurice: {
    resume: "Maurice",
    template: "Resume-Executive-Navy",
  },
  sugar: {
    resume: "Sugar Ray",
    template: "Resume-Executive-Navy",
  },
  ricardo: {
    resume: "Ricardo",
    template: "Resume-Executive-Navy",
  },
  ariel: {
    resume: "Ariel Berjit",
    template: "Resume-Executive-Navy",
  },
  /////////////////////////////////////
  matthew: {
    resume: "Matthew",
    template: "Resume-Executive-Navy",
  },
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
