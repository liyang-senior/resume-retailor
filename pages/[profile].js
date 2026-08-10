import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { slugToProfileName } from "../lib/profile-template-mapping";
import { QuickCopyIcon } from "../lib/quick-copy-icons";
import { QUICK_COPY_ANIMATIONS_CSS, quickCopyAnimSlot } from "../lib/quick-copy-animations-css";
import { SPARKLE_PROFILE_CSS } from "../lib/sparkle-ui-css";

function ProfileLoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
      <style>{`
        @keyframes rtProfileSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(74, 144, 226, 0.3)",
          borderTop: "3px solid #4a90e2",
          borderRadius: "50%",
          animation: "rtProfileSpin 1s linear infinite",
        }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { profile: profileSlug } = router.query;

  const [jd, setJd] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [generating, setGenerating] = useState(null); // null | "pdf" | "docx"
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  // Lazy load profile data when profile slug changes
  useEffect(() => {
    if (!profileSlug) return;

    setLoading(true);
    const profileNameFromSlug = slugToProfileName(profileSlug);

    if (!profileNameFromSlug) {
      console.error(`Profile not found for slug: ${profileSlug}`);
      setLoading(false);
      router.push('/');
      return;
    }

    setProfileName(profileNameFromSlug);

    // Lazy load profile data with delay to show loading state
    const loadData = async () => {
      try {
        const response = await fetch(`/api/profiles/${encodeURIComponent(profileNameFromSlug)}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.error(`Profile file not found: ${profileNameFromSlug}`);
            router.push('/');
            return;
          }
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        const data = await response.json();
        setSelectedProfileData(data);
      } catch (err) {
        console.error("Failed to load profile data:", err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    // Small delay for better UX (allows loading state to show)
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [profileSlug, router]);

  // Copy to clipboard function
  const copyToClipboard = async (text, fieldName) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Get last company and role
  const getLastCompany = () => {
    return selectedProfileData?.experience?.[0]?.company || null;
  };

  const getLastRole = () => {
    return selectedProfileData?.experience?.[0]?.title || null;
  };

  const handleGenerate = async (outputFormat) => {
    if (!jd.trim()) {
      alert("Please enter a job description");
      return;
    }

    if (!selectedProfileData || !profileSlug) {
      alert("Profile data not loaded");
      return;
    }

    const fmt = outputFormat === "docx" ? "docx" : "pdf";
    setGenerating(fmt);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileSlug,
          jd: jd,
          companyName: companyName.trim() || null,
          format: fmt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      const ext = fmt === "docx" ? ".docx" : ".pdf";
      let filename = `${profileName?.replace(/\s+/g, "_") || profileSlug}${ext}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastGenerationTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    } catch (error) {
      console.error("Generation error:", error);
      alert(
        (fmt === "docx" ? "Failed to generate Word file: " : "Failed to generate PDF: ") +
          error.message
      );
    } finally {
      setGenerating(null);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      startTimeRef.current = null;
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Professional theme colors
  const themeColors = {
    dark: {
      bg: "#0f172a",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      text: "#f1f5f9",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      inputBg: "#1e293b",
      inputBorder: "#475569",
      inputFocus: "#3b82f6",
      textareaBg: "#1e293b",
      buttonBg: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      buttonDisabled: "#475569",
      wordButtonBg: "#0d9488",
      wordButtonHover: "#0f766e",
      successBg: "rgba(34, 197, 94, 0.1)",
      successText: "#22c55e",
      infoBg: "rgba(59, 130, 246, 0.1)",
      infoText: "#3b82f6",
      copyBg: "rgba(59, 130, 246, 0.15)",
      copyHover: "rgba(59, 130, 246, 0.25)",
    },
    light: {
      bg: "#ffffff",
      cardBg: "#ffffff",
      cardBorder: "#e2e8f0",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      inputBg: "#ffffff",
      inputBorder: "#cbd5e1",
      inputFocus: "#3b82f6",
      textareaBg: "#ffffff",
      buttonBg: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      buttonDisabled: "#cbd5e1",
      wordButtonBg: "#0f766e",
      wordButtonHover: "#115e59",
      successBg: "rgba(34, 197, 94, 0.1)",
      successText: "#16a34a",
      infoBg: "rgba(59, 130, 246, 0.1)",
      infoText: "#2563eb",
      copyBg: "#f1f5f9",
      copyHover: "#e2e8f0",
    }
  };

  const colors = themeColors[theme];

  if (!router.isReady || !profileSlug) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ProfileLoadingSpinner />
        <p style={{ marginTop: "12px", fontSize: "14px", color: colors.textSecondary }}>Loading…</p>
      </div>
    );
  }

  if (loading || !selectedProfileData) {
    return (
      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.text,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <ProfileLoadingSpinner />
        <p style={{ marginTop: "12px", fontSize: "14px", color: colors.textSecondary }}>Loading profile…</p>
      </div>
    );
  }

  // Quick copy fields
  const quickCopyFields = [
    { key: 'email', label: 'Email', value: selectedProfileData.email },
    { key: 'phone', label: 'Phone', value: selectedProfileData.phone },
    { key: 'location', label: 'Address', value: selectedProfileData.location },
    { key: 'postalCode', label: 'Postal Code', value: selectedProfileData.postalCode },
    { key: 'lastCompany', label: 'Last Company', value: getLastCompany() },
    { key: 'lastRole', label: 'Last Role', value: getLastRole() },
    { key: 'linkedin', label: 'LinkedIn', value: selectedProfileData.linkedin },
    { key: 'github', label: 'GitHub', value: selectedProfileData.github },
  ].filter(field => field.value); // Only show fields with values

  return (
    <>
      <Head>
        <title>Resume Generator - {profileName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{QUICK_COPY_ANIMATIONS_CSS}</style>
        <style>{SPARKLE_PROFILE_CSS}</style>
      </Head>

      <div
        className={`rt-profile-page${theme === "light" ? " rt-profile-page--light" : ""}`}
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: colors.bg,
          color: colors.text,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
          boxSizing: "border-box",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        <div className="rt-profile-page-ambient" aria-hidden>
          <div className="rt-profile-page-ambient__glow" />
          <div className="rt-profile-page-sparks">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="rt-spark" />
            ))}
          </div>
        </div>
        <div
          className="rt-profile-page-fill"
          style={{
            flex: "1 0 auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "16px",
            boxSizing: "border-box",
            minHeight: 0,
          }}
        >
        <div style={{
          maxWidth: "min(1600px, 100%)",
          width: "100%",
          margin: "0 auto",
          minWidth: 0,
          boxSizing: "border-box"
        }}>
          {/* Header Card */}
          <div
            className={`rt-profile-card rt-profile-card--header${theme === "light" ? " rt-profile-card--light" : ""}`}
            style={{
              background:
                theme === "dark"
                  ? "rgba(30, 41, 59, 0.68)"
                  : "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "16px",
              marginBottom: "12px",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              boxShadow: theme === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="rt-pcard-sparkle" aria-hidden>
              <div className="rt-pcard-sparkle__glow" />
              <div className="rt-pcard-sparkle__sparks">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="rt-spark" />
                ))}
              </div>
            </div>
            <div className="rt-pcard-inner">
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px"
            }}>
              <div>
                <h1 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: colors.text,
                  margin: "0 0 2px 0"
                }}>
                  {profileName}
                </h1>
                {selectedProfileData.title && (
                  <p style={{
                    fontSize: "12px",
                    color: colors.textSecondary,
                    margin: 0
                  }}>
                    {selectedProfileData.title}
                  </p>
                )}
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "500",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  color: colors.text,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? '#334155' : '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.inputBg;
                }}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            {/* Quick Copy Buttons */}
            {quickCopyFields.length > 0 && (
              <div
                style={{
                  maxWidth: "100%",
                  minWidth: 0,
                  paddingTop: "12px",
                  borderTop: `1px solid ${colors.cardBorder}`,
                  marginLeft: "-4px",
                  marginRight: "-4px",
                  paddingLeft: "4px",
                  paddingRight: "4px"
                }}
              >
              <div
                className="rt-quick-copy-grid"
                style={{
                  display: "grid",
                  width: "100%",
                  gridTemplateColumns: `repeat(${quickCopyFields.length}, minmax(0, 1fr))`,
                  gap: "8px",
                }}
              >
                {quickCopyFields.map(({ key, label, value }, index) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={copiedField === key ? `${label} copied` : `Copy ${label}`}
                    className={`rt-quick-copy-btn rt-qca-${quickCopyAnimSlot(key)}${copiedField === key ? " rt-quick-copy-btn--copied" : ""}`}
                    onClick={() => copyToClipboard(value, key)}
                    style={{
                      padding: "8px 6px",
                      background: copiedField === key ? colors.copyBg : colors.inputBg,
                      border: `1px solid ${copiedField === key ? colors.infoText : colors.inputBorder}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0,
                      minHeight: "52px",
                      justifyContent: "center",
                      minWidth: 0,
                      width: "100%",
                      animationDelay: `${index * 45}ms`
                    }}
                    onMouseEnter={(e) => {
                      if (copiedField !== key) {
                        e.currentTarget.style.background = colors.copyHover;
                        e.currentTarget.style.borderColor = colors.inputFocus;
                        e.currentTarget.style.boxShadow = `0 4px 14px ${theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.08)"}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (copiedField !== key) {
                        e.currentTarget.style.background = colors.inputBg;
                        e.currentTarget.style.borderColor = colors.inputBorder;
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <span className="rt-quick-copy-icon-wrap">
                      <QuickCopyIcon
                        fieldKey={key}
                        size={16}
                        color={copiedField === key ? colors.successText : colors.textSecondary}
                      />
                    </span>
                    <div
                      className="rt-quick-copy-label"
                      style={{
                        fontWeight: "600",
                        color: copiedField === key ? colors.successText : colors.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        maxWidth: "100%",
                      }}
                    >
                      {copiedField === key ? "Copied!" : label}
                    </div>
                  </button>
                ))}
              </div>
              </div>
            )}
            </div>
          </div>

          {/* Form Card */}
          <div
            className={`rt-profile-card rt-profile-card--form${theme === "light" ? " rt-profile-card--light" : ""}`}
            style={{
              background:
                theme === "dark"
                  ? "rgba(30, 41, 59, 0.65)"
                  : "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "16px",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              boxShadow: theme === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="rt-pcard-sparkle" aria-hidden>
              <div className="rt-pcard-sparkle__glow" />
              <div className="rt-pcard-sparkle__sparks">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className="rt-spark" />
                ))}
              </div>
            </div>
            <div className="rt-pcard-inner">
            {/* Job Description */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px"
              }}>
                Job Description
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                rows="12"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.textareaBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  resize: "vertical",
                  minHeight: "clamp(200px, 36vh, 520px)",
                  lineHeight: "1.5",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.infoBg}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px"
              }}>
                Company Name <span style={{ fontWeight: "400", textTransform: "none" }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name for filename..."
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.infoBg}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
                minWidth: 0,
              }}
            >
              <button
                type="button"
                onClick={() => handleGenerate("pdf")}
                disabled={generating !== null || !jd.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    generating !== null || !jd.trim()
                      ? colors.buttonDisabled
                      : colors.buttonBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    generating !== null || !jd.trim() ? "not-allowed" : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, box-shadow 0.2s ease",
                  boxShadow:
                    generating !== null || !jd.trim()
                      ? "none"
                      : theme === "dark"
                        ? "0 2px 8px rgba(59, 130, 246, 0.3)"
                        : "0 1px 4px rgba(59, 130, 246, 0.2)",
                }}
                onMouseEnter={(e) => {
                  if (generating === null && jd.trim()) {
                    e.currentTarget.style.background = colors.buttonHover;
                    e.currentTarget.style.boxShadow =
                      theme === "dark"
                        ? "0 4px 12px rgba(59, 130, 246, 0.4)"
                        : "0 2px 8px rgba(59, 130, 246, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (generating === null && jd.trim()) {
                    e.currentTarget.style.background = colors.buttonBg;
                    e.currentTarget.style.boxShadow =
                      theme === "dark"
                        ? "0 2px 8px rgba(59, 130, 246, 0.3)"
                        : "0 1px 4px rgba(59, 130, 246, 0.2)";
                  }
                }}
              >
                {generating === "pdf"
                  ? `Generating… (${elapsedTime}s)`
                  : "Download as PDF file"}
              </button>
              <button
                type="button"
                onClick={() => handleGenerate("docx")}
                disabled={generating !== null || !jd.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    generating !== null || !jd.trim()
                      ? colors.buttonDisabled
                      : colors.wordButtonBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    generating !== null || !jd.trim() ? "not-allowed" : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, box-shadow 0.2s ease",
                  boxShadow:
                    generating !== null || !jd.trim()
                      ? "none"
                      : theme === "dark"
                        ? "0 2px 8px rgba(13, 148, 136, 0.35)"
                        : "0 1px 4px rgba(13, 148, 136, 0.25)",
                }}
                onMouseEnter={(e) => {
                  if (generating === null && jd.trim()) {
                    e.currentTarget.style.background = colors.wordButtonHover;
                    e.currentTarget.style.boxShadow =
                      theme === "dark"
                        ? "0 4px 12px rgba(13, 148, 136, 0.45)"
                        : "0 2px 8px rgba(13, 148, 136, 0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (generating === null && jd.trim()) {
                    e.currentTarget.style.background = colors.wordButtonBg;
                    e.currentTarget.style.boxShadow =
                      theme === "dark"
                        ? "0 2px 8px rgba(13, 148, 136, 0.35)"
                        : "0 1px 4px rgba(13, 148, 136, 0.25)";
                  }
                }}
              >
                {generating === "docx"
                  ? `Generating… (${elapsedTime}s)`
                  : "Download as Word file"}
              </button>
            </div>

            {/* Status Messages */}
            {lastGenerationTime && (
              <div style={{
                padding: "10px 12px",
                background: colors.successBg,
                border: `1px solid ${colors.successText}`,
                borderRadius: "6px",
                color: colors.successText,
                fontSize: "12px",
                textAlign: "center",
                fontWeight: "500"
              }}>
                ✓ Resume generated successfully in {lastGenerationTime}s
              </div>
            )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
