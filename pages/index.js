import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { SPARKLE_LANDING_CSS } from "../lib/sparkle-ui-css";

export default function Home() {
  const router = useRouter();
  const [profileSlug, setProfileSlug] = useState("");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (profileSlug.trim()) {
      router.push(`/${profileSlug.trim()}`);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const themeColors = {
    dark: {
      bg: "#1a1d24",
      cardBorder: "rgba(255, 255, 255, 0.08)",
      text: "#e4e7eb",
      textSecondary: "#b0b5bb",
      textMuted: "#8a8f95",
      inputBg: "#23262d",
      inputBorder: "rgba(255, 255, 255, 0.14)",
      buttonBg: "#4a90e2",
      buttonText: "#ffffff",
      buttonHover: "#5aa0f2",
      buttonDisabled: "#4a5568",
    },
    light: {
      bg: "#f5f6f8",
      cardBorder: "rgba(0, 0, 0, 0.1)",
      text: "#2c3e50",
      textSecondary: "#5a6c7d",
      textMuted: "#7f8c9a",
      inputBg: "#ffffff",
      inputBorder: "#cbd5e1",
      buttonBg: "#4a90e2",
      buttonText: "#ffffff",
      buttonHover: "#5aa0f2",
      buttonDisabled: "#cbd5e1",
    },
  };

  const colors = themeColors[theme];

  return (
    <>
      <Head>
        <title>Resume Tailor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{SPARKLE_LANDING_CSS}</style>
      </Head>

      <div
        className={`rt-landing-page${theme === "light" ? " rt-landing-page--light" : ""}`}
        style={{
          minHeight: "100vh",
          background: colors.bg,
          color: colors.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
          padding: "20px",
          boxSizing: "border-box",
          transition: "background 0.3s ease, color 0.3s ease",
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
            maxWidth: "800px",
            width: "100%",
            margin: "0 auto",
            padding: "32px 20px",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          <div
            className={`rt-landing-card${theme === "light" ? " rt-landing-card--light" : ""}`}
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              background:
                theme === "dark"
                  ? "rgba(22, 26, 34, 0.72)"
                  : "rgba(255, 255, 255, 0.86)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderRadius: "12px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "clamp(24px, 4vw, 40px)",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease, background 0.3s ease",
            }}
          >
            <div className="rt-landing-card__glow" aria-hidden />
            <div className="rt-landing-card__sparks" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="rt-spark" />
              ))}
            </div>
            <div className="rt-landing-card__content">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "32px",
                  minWidth: 0,
                }}
              >
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: "600",
                    color: colors.text,
                    margin: 0,
                    minWidth: 0,
                    flex: "1 1 auto",
                  }}
                >
                  Resume Tailor
                </h1>
                <button
                  onClick={toggleTheme}
                  type="button"
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    background: "transparent",
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "8px",
                    color: colors.text,
                    cursor: "pointer",
                    boxSizing: "border-box",
                    transition:
                      "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                  }}
                >
                  {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                </button>
              </div>

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
                    style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: "400",
                      color: colors.textSecondary,
                      marginBottom: "8px",
                    }}
                  >
                    Enter Profile ID
                  </label>
                  <input
                    type="text"
                    value={profileSlug}
                    onChange={(e) => setProfileSlug(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      padding: "14px 16px",
                      fontSize: "16px",
                      fontFamily: "inherit",
                      color: colors.text,
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "8px",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.buttonBg;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.inputBorder;
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!profileSlug.trim()}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    padding: "14px 24px",
                    fontSize: "16px",
                    fontWeight: "500",
                    color: colors.buttonText,
                    background: profileSlug.trim()
                      ? colors.buttonBg
                      : colors.buttonDisabled,
                    border: "none",
                    borderRadius: "8px",
                    cursor: profileSlug.trim() ? "pointer" : "not-allowed",
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
                    className={`rt-home-manual-link ${theme === "dark" ? "rt-home-manual-link--dark" : "rt-home-manual-link--light"}`}
                  >
                    <span className="rt-home-manual-prefix">No API key?</span>
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
