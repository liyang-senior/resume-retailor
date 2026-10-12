/**
 * Shared experience / skills guidance injected into the resume prompt.
 * Bullet-count, length and skills-inventory rules used by prompts/default.txt.
 */

export const EXPERIENCE_BULLET_RULES = {
  /** Most recent 2 roles: at least this many bullets each. */
  recentRolesMin: 8,
  recentRolesCount: 2,
  /** All older roles: at least this many bullets each. */
  olderRolesMin: 5,
  /** ~3 printed lines ≈ this many words (PDF ~90–100 chars/line). */
  longBulletMinWords: 28,
  /** Every role: at least this many ~3-line bullets. */
  longBulletsPerRoleMin: 3,
  /** Each of the 2 most recent roles: at least this many ~3-line bullets. */
  longBulletsRecentMin: 5,
};

const R = EXPERIENCE_BULLET_RULES;

/** Injected as {{experienceBulletGuidance}} when the profile has permanent base content. */
export const EXPERIENCE_BULLET_GUIDANCE_WITH_BASE = `Preserve every meaningful base_bullets fact and every classified base_skills technology. Rewrite, merge, split, or reorder for the detected job family; do not drop important original accomplishments and do not invent tools, employers, dates, or metrics. When the source supports it, use about ${R.recentRolesMin}-12 bullets for each of the two most recent roles and about ${R.olderRolesMin}-8 for older roles. If the source is thin, use fewer bullets. Most bullets should be 20-35 words, with varied length. Order bullets by verified job-description relevance. Use 7-9 role-specific skill categories and about 45-65 verified skill entries when the background supports that breadth. Use fewer when it does not. Never invent entries to reach the count. Summary is one paragraph of 80-110 words and may name verified technologies.`;

/** Injected when the profile has no permanent base_skills / base_bullets. */
export const EXPERIENCE_BULLET_GUIDANCE_NO_BASE = `No base_bullets or base_skills were supplied. Write only from the employment history, education, and other provided facts. Do not invent employers, titles, dates, tools, or metrics. When the source supports it, use about ${R.recentRolesMin}-12 bullets for each of the two most recent roles and about ${R.olderRolesMin}-8 for older roles. Most bullets should be 20-35 words, with varied length. Use 7-9 skill categories for the detected job family and about 45-65 verified skill entries when the background supports that breadth. Use fewer when it does not. Never invent entries to reach the count. Summary is one paragraph of 80-110 words.`;
