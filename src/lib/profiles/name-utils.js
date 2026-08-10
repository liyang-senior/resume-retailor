import { getProfileBySlug, slugToProfileName } from "./registry";

export const isValidProfileSlug = (slug) => {
  if (!slug) return false;
  return getProfileBySlug(slug) !== null;
};

export const getResumeNameFromSlug = (slug) => {
  return slugToProfileName(slug);
};

/**
 * First word of a full name (for signatures / email clipboard).
 * @param {string|null|undefined} fullName
 * @returns {string}
 */
export const firstNameFromFullName = (fullName) => {
  if (fullName == null || typeof fullName !== "string") return "";
  const t = fullName.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] || "";
};
