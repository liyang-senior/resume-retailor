/**
 * Shared experience / skills guidance injected into the resume prompt.
 * Bullet-count, length and skills-inventory rules used by prompts/default.txt.
 */

export const EXPERIENCE_BULLET_RULES = {
  /** Most recent 2 roles: at least this many bullets each. */
  recentRolesMin: 8,
  recentRolesMax: 12,
  recentRolesCount: 2,
  /** All older roles: at least this many bullets each. */
  olderRolesMin: 5,
  /** ~1 printed line ≈ this many words (PDF ~90–100 chars/line). */
  shortBulletMaxWords: 20,
  /** ~2 printed lines ≈ this many words. */
  mediumBulletMinWords: 22,
  mediumBulletMaxWords: 32,
  /** ~3 printed lines ≈ this many words. */
  longBulletMinWords: 36,
  longBulletMaxWords: 48,
  /** Every role: at least this many ~3-line bullets. */
  longBulletsPerRoleMin: 3,
  /** Each of the 2 most recent roles: at least this many ~3-line bullets. */
  longBulletsRecentMin: 5,
};

const R = EXPERIENCE_BULLET_RULES;

/** Injected as {{experienceBulletGuidance}} when the profile has permanent base content. */
export const EXPERIENCE_BULLET_GUIDANCE_WITH_BASE = `Preserve every meaningful base_bullets fact and every classified base_skills technology. Rewrite, merge, split, or reorder for the detected job family; do not drop important original accomplishments and do not invent tools, employers, dates, or metrics. Use ${R.recentRolesMin}-${R.recentRolesMax} humanized bullets for each of the two most recent roles and at least ${R.olderRolesMin} for older roles. In each of the two most recent roles, at least ${R.longBulletsRecentMin} bullets are 3 lines (${R.longBulletMinWords}-${R.longBulletMaxWords} words); the rest are 1 line (up to ${R.shortBulletMaxWords} words) or 2 lines (${R.mediumBulletMinWords}-${R.mediumBulletMaxWords} words). Write natural professional American English. Order bullets by verified job-description relevance. Use 7-9 role-specific skill categories and about 45-65 verified skill entries when the background supports that breadth. Summary is one paragraph of 80-110 words and may name verified technologies.`;

/** Injected when the profile has no permanent base_skills / base_bullets. */
export const EXPERIENCE_BULLET_GUIDANCE_NO_BASE = `No base_bullets or base_skills were supplied. Write from the employment history, education, job title, dates, and job description. Use ${R.recentRolesMin}-${R.recentRolesMax} humanized bullets for each of the two most recent roles and at least ${R.olderRolesMin} for older roles. In each of the two most recent roles, at least ${R.longBulletsRecentMin} bullets are 3 lines (${R.longBulletMinWords}-${R.longBulletMaxWords} words); the rest are 1 line (up to ${R.shortBulletMaxWords} words) or 2 lines (${R.mediumBulletMinWords}-${R.mediumBulletMaxWords} words). Write natural professional American English. Use 7-9 skill categories for the detected job family and about 45-65 verified skill entries when the background supports that breadth. Summary is one paragraph of 80-110 words.`;
