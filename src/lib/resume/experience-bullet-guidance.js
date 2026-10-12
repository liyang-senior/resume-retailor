/**
 * Shared experience / skills guidance aligned with prompts/default.txt §8–§9.
 */

export const EXPERIENCE_BULLET_RULES = {
  /** Most recent role: 8-12. Second-most-recent: 8-11. */
  recentRolesMin: 8,
  recentRolesMax: 12,
  secondRecentRolesMax: 11,
  recentRolesCount: 2,
  /** Older roles: 5-8 bullets scaled by tenure. */
  olderRolesMin: 5,
  olderRolesMax: 8,
  /** ~1 printed line ≈ this many words (PDF ~90–100 chars/line). */
  shortBulletMinWords: 12,
  shortBulletMaxWords: 20,
  /** Soft cap on short bullets when evidence allows variety. */
  shortBulletsPerRoleMax: 2,
  /** ~2 printed lines ≈ this many words. */
  mediumBulletMinWords: 22,
  mediumBulletMaxWords: 32,
  /** ~3 printed lines ≈ this many words. */
  longBulletMinWords: 36,
  longBulletMaxWords: 48,
  /** Prefer at least this many detailed bullets in older roles when evidence supports. */
  longBulletsPerRoleMin: 3,
  /** Prefer at least this many detailed bullets in recent roles when evidence supports. */
  longBulletsRecentMin: 5,
  /** Summary word band from default.txt §9. */
  summaryMinWords: 90,
  summaryMaxWords: 120,
};

const R = EXPERIENCE_BULLET_RULES;

/** Soft floor for role index (0-based); do not invent work solely to hit it. */
export function minBulletCountForRole(index) {
  return index < R.recentRolesCount ? R.recentRolesMin : R.olderRolesMin;
}

/**
 * Roles whose `details` arrays are below the soft floor.
 * @param {Array<{ details?: string[] }>} experience
 * @returns {{ index: number, have: number, need: number }[]}
 */
export function findUnderfilledExperienceRoles(experience) {
  const list = Array.isArray(experience) ? experience : [];
  const gaps = [];
  for (let i = 0; i < list.length; i += 1) {
    const have = Array.isArray(list[i]?.details)
      ? list[i].details.map((d) => String(d ?? "").trim()).filter(Boolean).length
      : 0;
    const need = minBulletCountForRole(i);
    if (have < need) gaps.push({ index: i, have, need });
  }
  return gaps;
}

/** Injected as {{experienceBulletGuidance}} when the profile has permanent base content. */
export const EXPERIENCE_BULLET_GUIDANCE_WITH_BASE = `Preserve every meaningful base_bullets fact and every classified base_skills technology. Rewrite, merge, split, or reorder for the job family; do not drop important original accomplishments. Also ADD hands-on bullets for every JD-required technology missing from the originals (100% JD experience coverage). Every experience bullet must be hands-on engineering (ACTION + TECHNOLOGY + IMPLEMENTATION). Every concrete skill in skills must appear in experience. Do not name the same technology more than 3 times in one role; spread senior/long-tenure depth across roles. Target ${R.recentRolesMin}-${R.recentRolesMax} bullets for the most recent role, ${R.recentRolesMin}-${R.secondRecentRolesMax} for the second-most-recent, and ${R.olderRolesMin}-${R.olderRolesMax} for older roles (scale by tenure). Prefer >=${R.longBulletsRecentMin} detailed bullets (${R.longBulletMinWords}-${R.longBulletMaxWords} words) in recent roles and >=${R.longBulletsPerRoleMin} in older roles. Mix short (${R.shortBulletMinWords}-${R.shortBulletMaxWords}), medium (${R.mediumBulletMinWords}-${R.mediumBulletMaxWords}), and detailed lengths. Summary: one paragraph of ${R.summaryMinWords}-${R.summaryMaxWords} words.`;

/** Injected when the profile has no permanent base_skills / base_bullets. */
export const EXPERIENCE_BULLET_GUIDANCE_NO_BASE = `No base_bullets or base_skills were supplied. Write completed hands-on experience from employment history, titles, dates, and the job description. ADD every JD-required skill and experience (100% JD coverage). Every experience bullet must be hands-on engineering. Every concrete skill in skills must appear in experience. Do not name the same technology more than 3 times in one role; spread senior/long-tenure depth across roles. Target ${R.recentRolesMin}-${R.recentRolesMax} bullets for the most recent role, ${R.recentRolesMin}-${R.secondRecentRolesMax} for the second-most-recent, and ${R.olderRolesMin}-${R.olderRolesMax} for older roles (scale by tenure). Prefer >=${R.longBulletsRecentMin} detailed bullets (${R.longBulletMinWords}-${R.longBulletMaxWords} words) in recent roles and >=${R.longBulletsPerRoleMin} in older roles. Mix short (${R.shortBulletMinWords}-${R.shortBulletMaxWords}), medium (${R.mediumBulletMinWords}-${R.mediumBulletMaxWords}), and detailed lengths. Summary: one paragraph of ${R.summaryMinWords}-${R.summaryMaxWords} words.`;