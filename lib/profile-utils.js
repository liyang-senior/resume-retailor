/**
 * Profile utility functions
 * Helper functions for working with profile configurations and mappings
 */

import { getProfileBySlug, slugToProfileName } from './profile-template-mapping';

/**
 * Validate that a profile slug exists in the mapping
 * @param {string} slug - Profile slug to validate
 * @returns {boolean} - True if slug exists, false otherwise
 */
export const isValidProfileSlug = (slug) => {
  if (!slug) return false;
  return getProfileBySlug(slug) !== null;
};

/**
 * Get resume name from slug, with validation
 * @param {string} slug - Profile slug
 * @returns {string|null} - Resume name or null if not found
 */
export const getResumeNameFromSlug = (slug) => {
  return slugToProfileName(slug);
};

