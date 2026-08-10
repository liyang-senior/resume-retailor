// Profile to Template mapping
// Maps profile ID (filename without .json) to template ID and optional prompt file
export const profileTemplateMapping = {
  rahulmonga: {
    resume: "Rahul Monga",
    template: "Resume-Executive-Navy",
    prompt: "rahul-monga",
  },
  mine: {
    resume: "Dileep",
    template: "Resume-Executive-Navy",
    prompt: "mine",
  },
  vezly: {
    resume: "Vezly",
    template: "Resume-Executive-Navy",
    prompt: "vezly",
  },
  hasan: {
    resume: "Hasan",
    template: "Resume-Executive-Navy",
    prompt: "hasan",
  },
  davide: {
    resume: "Davide",
    template: "Resume-Executive-Navy",
    prompt: "davide",
  },
  maurice: {
    resume: "Maurice",
    template: "Resume-Executive-Navy",
    prompt: "maurice",
  },
  sugar: {
    resume: "Sugar Ray",
    template: "Resume-Executive-Navy",
    prompt: "sugar",
  },
  ricardo: {
    resume: "Ricardo",
    template: "Resume-Executive-Navy",
    prompt: "ricardo",
  },
  matthew: {
    resume: "Matthew",
    template: "Resume-Executive-Navy",
    prompt: "matthew",
  },
};

/**
 * Get profile configuration by slug (numeric ID)
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {object|null} - Profile configuration or null if not found
 */
export const getProfileBySlug = (slug) => {
  if (!slug) return null;
  return profileTemplateMapping[slug] || null;
};

/**
 * Get resume name (profile name) by slug
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {string|null} - Resume name or null if not found
 */
export const slugToProfileName = (slug) => {
  const config = getProfileBySlug(slug);
  return config?.resume || null;
};

/**
 * Get template for a profile by slug
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {string} - Template ID or "Resume" as default
 */
export const getTemplateForProfile = (slug) => {
  const config = getProfileBySlug(slug);
  return config?.template || "Resume";
};

/**
 * Get prompt file name for a profile by slug
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {string} - Prompt file name or "default"
 */
export const getPromptForProfile = (slug) => {
  const config = getProfileBySlug(slug);
  return config?.prompt || "default";
};

/**
 * Get all available slug values (numeric IDs from mapping)
 * @returns {string[]} - Array of available slugs (numeric IDs)
 */
export const getAvailableSlugs = () => {
  return Object.keys(profileTemplateMapping);
};

/**
 * Get profile configuration by profile ID (numeric key)
 * @param {string} profileId - The numeric profile ID
 * @returns {object|null} - Profile configuration or null if not found
 */
export const getProfileById = (profileId) => {
  return profileTemplateMapping[profileId] || null;
};

export default profileTemplateMapping;
