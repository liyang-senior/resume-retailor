/**
 * Low-motion “center sparkle” backgrounds (opacity + gentle breathing only).
 * SPARKLE_LANDING_CSS: API home + manual entry pages.
 * SPARKLE_PROFILE_CSS: profile + manual profile (two cards).
 */

export const SPARKLE_LANDING_CSS = `
  .rt-landing-page {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
  }
  .rt-landing-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  /* Light mode: soft pastel mesh behind sparks (slow opacity only) */
  .rt-landing-page--light .rt-landing-ambient::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse 130% 100% at 50% -5%, rgba(147, 197, 253, 0.5) 0%, transparent 55%),
      radial-gradient(ellipse 90% 70% at 100% 35%, rgba(196, 181, 253, 0.28) 0%, transparent 50%),
      radial-gradient(ellipse 90% 70% at 0% 65%, rgba(125, 211, 252, 0.26) 0%, transparent 48%),
      radial-gradient(ellipse 70% 50% at 50% 100%, rgba(186, 230, 253, 0.35) 0%, transparent 45%);
    animation: rtLightMeshBreath 16s ease-in-out infinite alternate;
  }
  @keyframes rtLightMeshBreath {
    from { opacity: 0.72; }
    to { opacity: 1; }
  }
  .rt-landing-ambient__glow {
    position: absolute;
    left: 50%;
    top: 44%;
    width: min(95vmin, 720px);
    height: min(95vmin, 720px);
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle at 50% 50%,
      rgba(74, 144, 226, 0.16) 0%,
      rgba(59, 130, 246, 0.06) 42%,
      transparent 68%
    );
    animation: rtLandGlow 10s ease-in-out infinite alternate;
  }
  @keyframes rtLandGlow {
    from { opacity: 0.45; transform: translate(-50%, -50%) scale(0.97); }
    to { opacity: 0.7; transform: translate(-50%, -50%) scale(1.03); }
  }
  .rt-landing-page--light .rt-landing-ambient__glow {
    background: radial-gradient(
      circle at 50% 48%,
      rgba(59, 130, 246, 0.22) 0%,
      rgba(96, 165, 250, 0.12) 38%,
      rgba(147, 197, 253, 0.06) 55%,
      transparent 72%
    );
    animation: rtLandGlowLight 11s ease-in-out infinite alternate;
  }
  @keyframes rtLandGlowLight {
    from { opacity: 0.55; transform: translate(-50%, -50%) scale(0.96); }
    to { opacity: 0.88; transform: translate(-50%, -50%) scale(1.04); }
  }

  .rt-landing-sparks {
    position: absolute;
    inset: 0;
  }
  .rt-landing-sparks .rt-spark {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(226, 238, 255, 0.95);
    box-shadow: 0 0 8px 2px rgba(147, 197, 253, 0.35);
    animation: rtSparkTwinkle 5s ease-in-out infinite;
  }
  .rt-landing-page--light .rt-landing-sparks .rt-spark {
    width: 4px;
    height: 4px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(59, 130, 246, 0.75) 100%);
    box-shadow:
      0 0 10px 3px rgba(59, 130, 246, 0.35),
      0 0 4px 1px rgba(147, 197, 253, 0.6);
    animation-name: rtSparkTwinkleLightLanding;
  }
  @keyframes rtSparkTwinkleLightLanding {
    0%, 100% { opacity: 0.3; transform: scale(0.92); }
    50% { opacity: 0.85; transform: scale(1.06); }
  }
  .rt-landing-sparks .rt-spark:nth-child(1) { left: 14%; top: 22%; animation-delay: 0s; }
  .rt-landing-sparks .rt-spark:nth-child(2) { left: 86%; top: 18%; animation-delay: 0.7s; }
  .rt-landing-sparks .rt-spark:nth-child(3) { left: 50%; top: 12%; animation-delay: 1.4s; }
  .rt-landing-sparks .rt-spark:nth-child(4) { left: 22%; top: 55%; animation-delay: 2.1s; }
  .rt-landing-sparks .rt-spark:nth-child(5) { left: 78%; top: 48%; animation-delay: 2.8s; }
  .rt-landing-sparks .rt-spark:nth-child(6) { left: 48%; top: 72%; animation-delay: 3.5s; }
  .rt-landing-sparks .rt-spark:nth-child(7) { left: 34%; top: 38%; animation-delay: 1s; }
  .rt-landing-sparks .rt-spark:nth-child(8) { left: 66%; top: 62%; animation-delay: 2.4s; }
  .rt-landing-sparks .rt-spark:nth-child(9) { left: 8%; top: 70%; animation-delay: 3.2s; }
  .rt-landing-sparks .rt-spark:nth-child(10) { left: 92%; top: 65%; animation-delay: 0.4s; }

  @keyframes rtSparkTwinkle {
    0%, 100% { opacity: 0.08; transform: scale(0.9); }
    50% { opacity: 0.42; transform: scale(1); }
  }

  .rt-landing-inner {
    position: relative;
    z-index: 1;
  }

  .rt-landing-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }
  .rt-landing-card__glow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 140%;
    height: 140%;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle at 50% 50%,
      rgba(74, 144, 226, 0.12) 0%,
      transparent 55%
    );
    animation: rtCardGlow 12s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 0;
  }
  @keyframes rtCardGlow {
    from { opacity: 0.35; }
    to { opacity: 0.6; }
  }
  .rt-landing-card--light .rt-landing-card__glow {
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.14) 0%,
      rgba(147, 197, 253, 0.1) 42%,
      transparent 62%
    );
    animation: rtCardGlowLight 13s ease-in-out infinite alternate;
  }
  @keyframes rtCardGlowLight {
    from { opacity: 0.45; }
    to { opacity: 0.78; }
  }
  .rt-landing-card__sparks {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }
  .rt-landing-card__sparks .rt-spark {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 5px 1px rgba(147, 197, 253, 0.3);
    animation: rtSparkTwinkle 6s ease-in-out infinite;
  }
  .rt-landing-card--light .rt-landing-card__sparks .rt-spark {
    width: 3px;
    height: 3px;
    background: radial-gradient(circle, #fff 0%, rgba(37, 99, 235, 0.7) 100%);
    box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.35);
    animation-name: rtSparkTwinkleLightLanding;
  }
  .rt-landing-card__sparks .rt-spark:nth-child(1) { left: 18%; top: 25%; animation-delay: 0s; }
  .rt-landing-card__sparks .rt-spark:nth-child(2) { left: 82%; top: 30%; animation-delay: 1.1s; }
  .rt-landing-card__sparks .rt-spark:nth-child(3) { left: 50%; top: 15%; animation-delay: 2.2s; }
  .rt-landing-card__sparks .rt-spark:nth-child(4) { left: 28%; top: 78%; animation-delay: 0.5s; }
  .rt-landing-card__sparks .rt-spark:nth-child(5) { left: 72%; top: 72%; animation-delay: 3s; }
  .rt-landing-card__sparks .rt-spark:nth-child(6) { left: 50%; top: 55%; animation-delay: 1.6s; }

  .rt-landing-card__content {
    position: relative;
    z-index: 1;
  }

  /* Manual link (API home): short label expands on hover */
  .rt-home-manual-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;
    border-radius: 8px;
    padding: 8px 10px;
    margin: -8px -10px;
    transition: color 0.2s ease, background 0.35s ease;
  }
  .rt-home-manual-link:hover,
  .rt-home-manual-link:focus-visible {
    background: rgba(106, 183, 255, 0.08);
    outline: none;
  }
  .rt-landing-card--light .rt-home-manual-link:hover,
  .rt-landing-card--light .rt-home-manual-link:focus-visible {
    background: rgba(37, 99, 235, 0.08);
  }
  .rt-home-manual-prefix { flex-shrink: 0; white-space: nowrap; }
  .rt-home-manual-rest {
    display: inline-block;
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    vertical-align: bottom;
    transition:
      max-width 0.5s cubic-bezier(0.22, 1, 0.32, 1),
      opacity 0.4s ease 0.05s,
      transform 0.45s cubic-bezier(0.22, 1, 0.32, 1);
    transform: translateX(-6px);
  }
  .rt-home-manual-link:hover .rt-home-manual-rest,
  .rt-home-manual-link:focus-visible .rt-home-manual-rest {
    max-width: 240px;
    opacity: 1;
    transform: translateX(0);
  }
  .rt-home-manual-link--dark { color: #6ab7ff; }
  .rt-home-manual-link--light { color: #2563eb; }

  .rt-landing-back-link {
    display: inline-block;
    font-size: 14px;
    text-decoration: none;
    border-radius: 8px;
    padding: 8px 10px;
    margin: -8px -10px;
    transition: background 0.25s ease, color 0.2s ease;
  }
  .rt-landing-back-link:hover,
  .rt-landing-back-link:focus-visible {
    outline: none;
    background: rgba(106, 183, 255, 0.08);
  }
  .rt-landing-card--light .rt-landing-back-link:hover,
  .rt-landing-card--light .rt-landing-back-link:focus-visible {
    background: rgba(37, 99, 235, 0.08);
  }

  @media (hover: none) {
    .rt-home-manual-rest {
      max-width: 260px;
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rt-landing-page--light .rt-landing-ambient::before {
      animation: none !important;
      opacity: 0.88;
    }
    .rt-landing-ambient__glow,
    .rt-landing-card__glow,
    .rt-spark {
      animation: none !important;
    }
    .rt-landing-ambient__glow,
    .rt-landing-card__glow {
      opacity: 0.5;
    }
    .rt-spark {
      opacity: 0.2;
    }
  }
`;

export const SPARKLE_PROFILE_CSS = `
  .rt-profile-page {
    position: relative;
  }
  .rt-profile-page-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .rt-profile-page--light .rt-profile-page-ambient::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse 120% 95% at 50% 0%, rgba(191, 219, 254, 0.55) 0%, transparent 52%),
      radial-gradient(ellipse 85% 65% at 95% 40%, rgba(221, 214, 254, 0.3) 0%, transparent 48%),
      radial-gradient(ellipse 85% 65% at 5% 60%, rgba(186, 230, 253, 0.32) 0%, transparent 46%);
    animation: rtLightMeshBreathProf 17s ease-in-out infinite alternate;
  }
  @keyframes rtLightMeshBreathProf {
    from { opacity: 0.68; }
    to { opacity: 0.98; }
  }
  .rt-profile-page-ambient__glow {
    position: absolute;
    left: 50%;
    top: 48%;
    width: min(100vmin, 900px);
    height: min(100vmin, 900px);
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.12) 0%,
      rgba(99, 102, 241, 0.05) 40%,
      transparent 70%
    );
    animation: rtProfGlow 12s ease-in-out infinite alternate;
  }
  @keyframes rtProfGlow {
    from { opacity: 0.4; transform: translate(-50%, -50%) scale(0.98); }
    to { opacity: 0.65; transform: translate(-50%, -50%) scale(1.02); }
  }
  .rt-profile-page--light .rt-profile-page-ambient__glow {
    background: radial-gradient(
      circle at 50% 48%,
      rgba(59, 130, 246, 0.2) 0%,
      rgba(96, 165, 250, 0.1) 40%,
      rgba(147, 197, 253, 0.05) 58%,
      transparent 74%
    );
    animation: rtProfGlowLight 12s ease-in-out infinite alternate;
  }
  @keyframes rtProfGlowLight {
    from { opacity: 0.5; transform: translate(-50%, -50%) scale(0.97); }
    to { opacity: 0.82; transform: translate(-50%, -50%) scale(1.03); }
  }

  .rt-profile-page-sparks {
    position: absolute;
    inset: 0;
  }
  .rt-profile-page-sparks .rt-spark {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: rgba(226, 238, 255, 0.9);
    box-shadow: 0 0 6px 1px rgba(147, 197, 253, 0.28);
    animation: rtSparkTwinkleProf 5.5s ease-in-out infinite;
  }
  .rt-profile-page--light .rt-profile-page-sparks .rt-spark {
    width: 4px;
    height: 4px;
    background: radial-gradient(circle, #fff 0%, rgba(59, 130, 246, 0.72) 100%);
    box-shadow:
      0 0 10px 3px rgba(59, 130, 246, 0.32),
      0 0 4px 1px rgba(147, 197, 253, 0.55);
    animation-name: rtSparkTwinkleLightProf;
  }
  @keyframes rtSparkTwinkleLightProf {
    0%, 100% { opacity: 0.28; transform: scale(0.9); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
  .rt-profile-page-sparks .rt-spark:nth-child(1) { left: 12%; top: 20%; animation-delay: 0s; }
  .rt-profile-page-sparks .rt-spark:nth-child(2) { left: 88%; top: 24%; animation-delay: 0.8s; }
  .rt-profile-page-sparks .rt-spark:nth-child(3) { left: 50%; top: 8%; animation-delay: 1.6s; }
  .rt-profile-page-sparks .rt-spark:nth-child(4) { left: 20%; top: 78%; animation-delay: 2.4s; }
  .rt-profile-page-sparks .rt-spark:nth-child(5) { left: 80%; top: 72%; animation-delay: 3.2s; }
  .rt-profile-page-sparks .rt-spark:nth-child(6) { left: 50%; top: 88%; animation-delay: 1s; }
  .rt-profile-page-sparks .rt-spark:nth-child(7) { left: 36%; top: 45%; animation-delay: 2s; }
  .rt-profile-page-sparks .rt-spark:nth-child(8) { left: 64%; top: 52%; animation-delay: 3.8s; }

  @keyframes rtSparkTwinkleProf {
    0%, 100% { opacity: 0.06; transform: scale(0.88); }
    50% { opacity: 0.38; transform: scale(1); }
  }

  .rt-profile-page-fill {
    position: relative;
    z-index: 1;
  }

  .rt-profile-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }
  .rt-pcard-sparkle {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }
  .rt-pcard-sparkle__glow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 120%;
    height: 120%;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.1) 0%,
      transparent 58%
    );
    animation: rtPcardGlowSoft 14s ease-in-out infinite alternate;
  }
  .rt-profile-card--form .rt-pcard-sparkle__glow {
    background: radial-gradient(
      circle at 50% 50%,
      rgba(45, 212, 191, 0.08) 0%,
      rgba(59, 130, 246, 0.06) 45%,
      transparent 60%
    );
  }
  @keyframes rtPcardGlowSoft {
    from { opacity: 0.3; }
    to { opacity: 0.55; }
  }
  .rt-profile-card--light .rt-pcard-sparkle__glow {
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.16) 0%,
      rgba(147, 197, 253, 0.1) 45%,
      transparent 62%
    );
    animation: rtPcardGlowLight 14s ease-in-out infinite alternate;
  }
  @keyframes rtPcardGlowLight {
    from { opacity: 0.42; }
    to { opacity: 0.72; }
  }

  .rt-pcard-sparkle__sparks .rt-spark {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 4px 1px rgba(147, 197, 253, 0.25);
    animation: rtSparkTwinkleProf 6s ease-in-out infinite;
  }
  .rt-profile-card--light .rt-pcard-sparkle__sparks .rt-spark {
    width: 3px;
    height: 3px;
    background: radial-gradient(circle, #fff 0%, rgba(37, 99, 235, 0.65) 100%);
    box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.3);
    animation-name: rtSparkTwinkleLightProf;
  }
  .rt-profile-card--header .rt-pcard-sparkle__sparks .rt-spark:nth-child(1) { left: 15%; top: 20%; animation-delay: 0s; }
  .rt-profile-card--header .rt-pcard-sparkle__sparks .rt-spark:nth-child(2) { left: 85%; top: 25%; animation-delay: 1.2s; }
  .rt-profile-card--header .rt-pcard-sparkle__sparks .rt-spark:nth-child(3) { left: 50%; top: 12%; animation-delay: 2.4s; }
  .rt-profile-card--header .rt-pcard-sparkle__sparks .rt-spark:nth-child(4) { left: 25%; top: 85%; animation-delay: 0.6s; }
  .rt-profile-card--header .rt-pcard-sparkle__sparks .rt-spark:nth-child(5) { left: 75%; top: 80%; animation-delay: 3s; }

  .rt-profile-card--form .rt-pcard-sparkle__sparks .rt-spark:nth-child(1) { left: 12%; top: 15%; animation-delay: 0.3s; }
  .rt-profile-card--form .rt-pcard-sparkle__sparks .rt-spark:nth-child(2) { left: 88%; top: 18%; animation-delay: 1.5s; }
  .rt-profile-card--form .rt-pcard-sparkle__sparks .rt-spark:nth-child(3) { left: 50%; top: 8%; animation-delay: 2.7s; }
  .rt-profile-card--form .rt-pcard-sparkle__sparks .rt-spark:nth-child(4) { left: 18%; top: 92%; animation-delay: 0.9s; }
  .rt-profile-card--form .rt-pcard-sparkle__sparks .rt-spark:nth-child(5) { left: 82%; top: 88%; animation-delay: 2.1s; }
  .rt-profile-card--form .rt-pcard-sparkle__sparks .rt-spark:nth-child(6) { left: 48%; top: 50%; animation-delay: 3.6s; }

  .rt-pcard-inner {
    position: relative;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .rt-profile-page--light .rt-profile-page-ambient::before {
      animation: none !important;
      opacity: 0.85;
    }
    .rt-profile-page-ambient__glow,
    .rt-pcard-sparkle__glow,
    .rt-spark {
      animation: none !important;
    }
    .rt-profile-page-ambient__glow { opacity: 0.45; }
    .rt-pcard-sparkle__glow { opacity: 0.4; }
    .rt-spark { opacity: 0.15; }
  }
`;
