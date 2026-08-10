import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { LANDING_PAGE_THEME_CSS } from "@/lib/ui/app-shell-theme-css";
import {
  clearStoredAccessUrl,
  getEffectiveAccessHref,
  rememberValidatedAccessHref,
} from "@/client/access/browser-session";

export default function Home() {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfilesLoading(true);
      setProfilesError("");
      try {
        const accessHref = getEffectiveAccessHref();
        const r = await fetch(
          `/api/profiles?accessUrl=${encodeURIComponent(accessHref)}`
        );
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.status === 404) {
          clearStoredAccessUrl();
          router.replace("/404");
          return;
        }
        if (!r.ok) {
          setProfilesError(data.error || "Could not load resumes.");
          setProfiles([]);
          return;
        }
        rememberValidatedAccessHref(accessHref);
        setProfiles(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setProfilesError("Could not load resumes.");
          setProfiles([]);
        }
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const colors = {
    bg: "#0f172a",
    cardBorder: "rgba(148, 163, 184, 0.28)",
    text: "#f1f5f9",
    textSecondary: "#cbd5e1",
    inputBg: "rgba(30, 41, 59, 0.75)",
    inputBorder: "rgba(148, 163, 184, 0.35)",
    buttonBg: "#3b82f6",
    buttonText: "#ffffff",
    buttonHover: "#2563eb",
    buttonDisabled: "#475569",
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSlug) {
      router.push(`/${selectedSlug}`);
    }
  };

  return (
    <>
      <Head>
        <title>Resume Tailor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{LANDING_PAGE_THEME_CSS}</style>
      </Head>

      <div
        className="rt-landing-page"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: colors.bg,
          color: colors.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <div className="rt-landing-ambient" aria-hidden>
          <div className="rt-landing-ambient__glow" />
          <div className="rt-landing-sparks">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="rt-spark" />
            ))}
          </div>
        </div>
        <div
          className="rt-landing-inner"
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: "min(960px, 100%)",
            width: "100%",
            margin: "0 auto",
            padding: "16px 4px",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          <div
            className="rt-landing-card"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderRadius: "14px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "clamp(28px, 5vw, 48px)",
              boxSizing: "border-box",
            }}
          >
            <div className="rt-landing-card__glow" aria-hidden />
            <div className="rt-landing-card__sparks" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="rt-spark" />
              ))}
            </div>
            <div className="rt-landing-card__content">
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: "600",
                  color: colors.text,
                  margin: "0 0 32px 0",
                  minWidth: 0,
                }}
              >
                Resume Tailor
              </h1>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              >
                <div style={{ minWidth: 0, maxWidth: "100%" }}>
                  <label
                    htmlFor="rt-home-profile-select"
                    style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: "400",
                      color: colors.textSecondary,
                      marginBottom: "8px",
                    }}
                  >
                    Choose a resume
                  </label>
                  <select
                    id="rt-home-profile-select"
                    className="rt-home-profile-select"
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    disabled={profilesLoading || profiles.length === 0}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      fontSize: "16px",
                      fontFamily: "inherit",
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "8px",
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: profilesLoading || profiles.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="">
                      {profilesLoading
                        ? "Loading resumes…"
                        : profiles.length === 0
                          ? "No resumes available"
                          : "Select a resume…"}
                    </option>
                    {profiles.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {profilesError ? (
                    <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#f87171" }}>{profilesError}</p>
                  ) : null}
                  {!profilesLoading && profiles.length === 0 && !profilesError ? (
                    <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: colors.textSecondary }}>
                      No resumes found in the resumes folder.
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={!selectedSlug}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    padding: "14px 24px",
                    fontSize: "16px",
                    fontWeight: "500",
                    color: colors.buttonText,
                    background: selectedSlug ? colors.buttonBg : colors.buttonDisabled,
                    border: "none",
                    borderRadius: "8px",
                    cursor: selectedSlug ? "pointer" : "not-allowed",
                    boxSizing: "border-box",
                    transition: "background 0.2s ease, opacity 0.2s ease",
                  }}
                >
                  Go to Profile
                </button>

                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "20px",
                    borderTop: `1px solid ${colors.cardBorder}`,
                    textAlign: "center",
                  }}
                >
                  <Link
                    href="/manual"
                    className="rt-home-manual-link rt-home-manual-link--dark"
                  >
                    <span className="rt-home-manual-prefix">No API key? &nbsp;</span>
                    <span className="rt-home-manual-rest"> Use manual mode →</span>
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
