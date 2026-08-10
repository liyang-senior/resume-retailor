import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { slugToProfileName } from "@/lib/profiles/registry";
import { firstNameFromFullName } from "@/lib/profiles/name-utils";
import { QuickCopyIcon, DockPinIcon } from "@/lib/ui/quick-copy-icons";
import {
  QUICK_COPY_ANIMATIONS_CSS,
  quickCopyAnimSlot,
} from "@/lib/ui/quick-copy-animations-css";
import { PROFILE_WORKSPACE_THEME_CSS } from "@/lib/ui/app-shell-theme-css";
import { EmailSnippetsSidebar } from "@/components/EmailSnippetsSidebar";
import {
  clearStoredAccessUrl,
  getEffectiveAccessHref,
  rememberValidatedAccessHref,
} from "@/client/access/browser-session";

function ManualProfileLoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
      <style>{`
        @keyframes rtManualProfileSpin {
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
          animation: "rtManualProfileSpin 1s linear infinite",
        }}
      />
    </div>
  );
}

export default function ManualProfilePage() {
  const router = useRouter();
  const { profile: profileSlug } = router.query;

  const [jd, setJd] = useState("");
  const [chatgptResponse, setChatgptResponse] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [generating, setGenerating] = useState(null);
  /** null | "resume-pdf" | "resume-docx" | "cover-pdf" | "cover-docx" */
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);
  const [lastGenerationWasCover, setLastGenerationWasCover] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  const [quickCopyDockPinned, setQuickCopyDockPinned] = useState(false);
  const [copyPromptLoading, setCopyPromptLoading] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!profileSlug) return;

    const profileNameFromSlug = slugToProfileName(profileSlug);
    if (!profileNameFromSlug) {
      setLoading(false);
      router.push("/manual");
      return;
    }

    setProfileName(profileNameFromSlug);
    setLoading(true);

    const loadData = async () => {
      const accessHref = getEffectiveAccessHref();
      const accessQ = `accessUrl=${encodeURIComponent(accessHref)}`;
      try {
        const cfgRes = await fetch(`/api/access-ui?${accessQ}`);
        if (cfgRes.status === 404) {
          clearStoredAccessUrl();
          router.replace("/404");
          return;
        }
        const cfgData = await cfgRes.json().catch(() => ({}));
        if (!cfgRes.ok) {
          clearStoredAccessUrl();
          router.replace("/404");
          return;
        }
        if (typeof cfgData?.showRightSidebar === "boolean") {
          setShowRightSidebar(cfgData.showRightSidebar);
        }

        const profileUrl = `/api/profiles/${encodeURIComponent(profileNameFromSlug)}?${accessQ}`;
        const response = await fetch(profileUrl, {
          credentials: "include",
        });
        if (response.status === 404) {
          clearStoredAccessUrl();
          router.replace("/404");
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        const data = await response.json();
        setSelectedProfileData(data);
        rememberValidatedAccessHref(accessHref);
      } catch (err) {
        console.error("Failed to load profile data:", err);
        clearStoredAccessUrl();
        router.replace("/404");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [profileSlug, router]);

  const copyToClipboard = async (text, fieldName) => {
    const str = text == null ? "" : String(text);
    try {
      await navigator.clipboard.writeText(str);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = str;
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

  const getLastCompany = () =>
    selectedProfileData?.experience?.[0]?.company || null;
  const getLastRole = () =>
    selectedProfileData?.experience?.[0]?.title || null;

  const copyPromptToClipboard = async () => {
    if (!jd.trim()) {
      alert("Please enter a job description first");
      return;
    }

    setCopyPromptLoading(true);
    try {
      const response = await fetch("/api/manual-prompt", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: profileSlug, jd }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to build prompt");
      }

      const { prompt } = await response.json();
      await navigator.clipboard.writeText(prompt);
      setCopiedField("prompt");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Copy prompt error:", err);
      alert("Failed to copy prompt: " + err.message);
    } finally {
      setCopyPromptLoading(false);
    }
  };

  const handleGenerate = async (outputFormat) => {
    if (!chatgptResponse.trim()) {
      alert("Please paste the ChatGPT response (JSON) first");
      return;
    }

    if (!selectedProfileData || !profileSlug) {
      alert("Profile data not loaded");
      return;
    }

    const fmt = outputFormat === "docx" ? "docx" : "pdf";
    setGenerating(fmt === "docx" ? "resume-docx" : "resume-pdf");
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    try {
      const response = await fetch("/api/generate-manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileSlug,
          chatgptResponse: chatgptResponse.trim(),
          companyName: companyName.trim() || null,
          format: fmt,
          jd: jd.trim() || null,
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
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastGenerationWasCover(false);
      setLastGenerationTime(
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
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

  const handleCoverLetterGenerate = async (outputFormat) => {
    if (!jd.trim()) {
      alert("Please enter a job description first");
      return;
    }

    if (!selectedProfileData || !profileSlug) {
      alert("Profile data not loaded");
      return;
    }

    const fmt = outputFormat === "docx" ? "docx" : "pdf";
    setGenerating(fmt === "docx" ? "cover-docx" : "cover-pdf");
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileSlug,
          jd: jd.trim(),
          companyName: companyName.trim() || null,
          targetRole: targetRole.trim() || null,
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
      let filename = `${profileName?.replace(/\s+/g, "_") || profileSlug}_cover_letter${ext}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastGenerationWasCover(true);
      setLastGenerationTime(
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
    } catch (error) {
      console.error("Cover letter error:", error);
      alert(
        (fmt === "docx"
          ? "Failed to generate cover letter Word file: "
          : "Failed to generate cover letter PDF: ") + error.message
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

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const colors = {
    bg: "#0f172a",
    cardBg: "#1e293b",
    cardBorder: "rgba(148, 163, 184, 0.28)",
    text: "#f1f5f9",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    inputBg: "rgba(30, 41, 59, 0.75)",
    inputBorder: "rgba(148, 163, 184, 0.35)",
    inputFocus: "#3b82f6",
    textareaBg: "rgba(30, 41, 59, 0.85)",
    buttonBg: "#3b82f6",
    buttonHover: "#2563eb",
    buttonText: "#ffffff",
    buttonDisabled: "#475569",
    wordButtonBg: "#0d9488",
    wordButtonHover: "#0f766e",
    coverPdfBg: "#7c3aed",
    coverPdfHover: "#6d28d9",
    coverWordBg: "#6366f1",
    coverWordHover: "#4f46e5",
    successBg: "rgba(34, 197, 94, 0.1)",
    successText: "#22c55e",
    infoBg: "rgba(59, 130, 246, 0.1)",
    infoText: "#3b82f6",
    copyBg: "rgba(59, 130, 246, 0.15)",
    copyHover: "rgba(59, 130, 246, 0.25)",
  };

  if (!router.isReady || !profileSlug) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: colors.bg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ManualProfileLoadingSpinner />
        <p style={{ marginTop: "12px", fontSize: "14px", color: colors.textSecondary }}>Loading…</p>
      </div>
    );
  }

  if (loading || !selectedProfileData) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: colors.bg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ManualProfileLoadingSpinner />
        <p style={{ marginTop: "12px", fontSize: "14px", color: colors.textSecondary }}>Loading profile…</p>
      </div>
    );
  }

  const cvLinkRaw =
    selectedProfileData?.cvLink ?? selectedProfileData?.cv_link;
  const cvLinkValue =
    typeof cvLinkRaw === "string" ? cvLinkRaw.trim() : cvLinkRaw;

  const quickCopyFields = [
    { key: "email", label: "Email", value: selectedProfileData?.email },
    { key: "phone", label: "Phone", value: selectedProfileData?.phone },
    { key: "location", label: "Address", value: selectedProfileData?.location },
    { key: "zip", label: "Zip", value: selectedProfileData?.zip },
    {
      key: "street",
      label: "STREET",
      value: selectedProfileData?.street ?? "",
      alwaysShow: true,
    },
    {
      key: "birthday",
      label: "BIRTHDAY",
      value: selectedProfileData?.birthday ?? "",
      alwaysShow: true,
    },
    {
      key: "ssn",
      label: "SSN",
      value: selectedProfileData?.ssn ?? "",
      alwaysShow: true,
    },
    { key: "lastCompany", label: "Last Company", value: getLastCompany() },
    { key: "lastRole", label: "Last Role", value: getLastRole() },
    { key: "linkedin", label: "LinkedIn", value: selectedProfileData?.linkedin },
    { key: "github", label: "GitHub", value: selectedProfileData?.github },
    { key: "cvLink", label: "CV Link", value: cvLinkValue },
  ].filter((f) => f.alwaysShow || f.value);

  const replyFirstName = firstNameFromFullName(selectedProfileData?.name);

  return (
    <>
      <Head>
        <title>Manual Resume - {profileName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{QUICK_COPY_ANIMATIONS_CSS}</style>
        <style>{PROFILE_WORKSPACE_THEME_CSS}</style>
      </Head>

      <div
        className="rt-profile-page"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: colors.bg,
          color: colors.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
          boxSizing: "border-box",
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

        {showRightSidebar ? (
          <EmailSnippetsSidebar replyFirstName={replyFirstName} />
        ) : null}

        {quickCopyFields.length > 0 && (
          <div className={`rt-top-copy-dock${quickCopyDockPinned ? " rt-top-copy-dock--pinned" : ""}`}>
            <div className="rt-top-copy-dock__hit" aria-hidden />
            <div className="rt-top-copy-dock__panel">
              {quickCopyFields.map(({ key, label, value }, index) => (
                <button
                  key={key}
                  type="button"
                  aria-label={copiedField === key ? `${label} copied` : `Copy ${label}`}
                  className={`rt-quick-copy-btn rt-dock-copy-btn rt-qca-${quickCopyAnimSlot(key)}${copiedField === key ? " rt-quick-copy-btn--copied" : ""}`}
                  onClick={() => copyToClipboard(value, key)}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <span className="rt-quick-copy-icon-wrap">
                    <QuickCopyIcon
                      fieldKey={key}
                      size={48}
                      color={copiedField === key ? colors.successText : "#1e293b"}
                    />
                  </span>
                  <div className="rt-quick-copy-label">{copiedField === key ? "Copied!" : label}</div>
                </button>
              ))}
              <button
                type="button"
                className={`rt-top-copy-dock__pin${quickCopyDockPinned ? " rt-top-copy-dock__pin--active" : ""}`}
                aria-pressed={quickCopyDockPinned}
                aria-label={quickCopyDockPinned ? "Unpin quick-copy bar" : "Pin quick-copy bar open"}
                onClick={() => setQuickCopyDockPinned((p) => !p)}
              >
                <DockPinIcon size={16} color="#0f172a" />
              </button>
            </div>
          </div>
        )}

        <div
          className="rt-profile-page-fill"
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            padding: "20px 12px",
            boxSizing: "border-box",
            minHeight: "100dvh",
            width: "100%",
          }}
        >
        <div
          className="rt-main-group"
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            maxWidth: "min(1600px, 100%)",
            width: "100%",
            margin: "0 auto",
            minWidth: 0,
            boxSizing: "border-box",
            overflow: "auto",
          }}
        >
          <div
            className="rt-profile-card rt-profile-card--form"
            style={{
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "16px",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
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
            <div
              className="rt-pcard-inner"
              style={{
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
            {/* Step 1: Job Description — layout matches API profile page */}
            <div
              style={{
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                marginBottom: "16px",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px 12px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "10px",
                      fontWeight: "600",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: colors.infoText,
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                      borderRadius: "4px",
                      padding: "3px 8px",
                    }}
                  >
                    Manual mode
                  </span>
                  <Link
                    href="/manual"
                    style={{
                      fontSize: "12px",
                      color: colors.infoText,
                      textDecoration: "none",
                    }}
                  >
                    ← Manual
                  </Link>
                </div>
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: colors.text,
                    margin: "0 0 4px 0",
                    lineHeight: 1.25,
                  }}
                >
                  {profileName}
                </h1>
                {selectedProfileData?.title ? (
                  <p
                    style={{
                      fontSize: "13px",
                      color: colors.textSecondary,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {selectedProfileData.title}
                  </p>
                ) : null}
              </div>
              <span
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  marginBottom: "6px",
                }}
              >
                Step 1 — Job Description
              </span>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                rows="12"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  flex: "1 1 260px",
                  minHeight: "min(52vh, 520px)",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.textareaBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.5",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxSizing: "border-box",
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

            {/* Step 2: Copy Prompt */}
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Step 2 — Copy Prompt for ChatGPT
              </label>
              <button
                type="button"
                onClick={copyPromptToClipboard}
                disabled={copyPromptLoading || !jd.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "8px 12px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    copyPromptLoading || !jd.trim()
                      ? colors.buttonDisabled
                      : colors.buttonBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    copyPromptLoading || !jd.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, opacity 0.2s ease",
                }}
              >
                {copiedField === "prompt"
                  ? "✓ Copied! Paste into ChatGPT"
                  : copyPromptLoading
                    ? "Building prompt..."
                    : "Copy Prompt (Profile + JD) → Paste in ChatGPT"}
              </button>
              <p
                style={{
                  fontSize: "11px",
                  color: colors.textMuted,
                  marginTop: "4px",
                  marginBottom: 0,
                }}
              >
                Paste the copied text into ChatGPT. Copy the JSON response back below.
              </p>
            </div>

            {/* Step 3: ChatGPT Response */}
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Step 3 — Paste ChatGPT Response (JSON)
              </label>
              <textarea
                value={chatgptResponse}
                onChange={(e) => setChatgptResponse(e.target.value)}
                placeholder='Paste the JSON from ChatGPT here (e.g. {"title":"...","summary":"...","skills":{...},"experience":[...]})'
                rows="10"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  color: colors.text,
                  background: colors.textareaBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  resize: "vertical",
                  minHeight: "clamp(200px, min(36vh, 480px), 560px)",
                  lineHeight: "1.5",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Company Name <span style={{ fontWeight: "400", textTransform: "none" }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name (filenames + letter when provided)…"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Role you&apos;re applying for{" "}
                <span style={{ fontWeight: "400", textTransform: "none" }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder={
                  selectedProfileData?.title
                    ? `Defaults to: ${selectedProfileData.title}`
                    : "Defaults to profile headline"
                }
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                marginBottom: "6px",
              }}
            >
              Résumé (needs JSON from Step 3)
            </span>
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
                disabled={generating !== null || !chatgptResponse.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    generating !== null || !chatgptResponse.trim()
                      ? colors.buttonDisabled
                      : colors.buttonBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    generating !== null || !chatgptResponse.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, opacity 0.2s ease",
                }}
              >
                {generating === "resume-pdf"
                  ? `Generating… (${elapsedTime}s)`
                  : "Download as PDF file"}
              </button>
              <button
                type="button"
                onClick={() => handleGenerate("docx")}
                disabled={generating !== null || !chatgptResponse.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    generating !== null || !chatgptResponse.trim()
                      ? colors.buttonDisabled
                      : colors.wordButtonBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    generating !== null || !chatgptResponse.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, opacity 0.2s ease",
                }}
              >
                {generating === "resume-docx"
                  ? `Generating… (${elapsedTime}s)`
                  : "Download as Word file"}
              </button>
            </div>

            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                marginBottom: "6px",
                marginTop: "2px",
              }}
            >
              Cover letter (uses JD only — API key on server)
            </span>
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
                onClick={() => handleCoverLetterGenerate("pdf")}
                disabled={generating !== null || !jd.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    generating !== null || !jd.trim()
                      ? colors.buttonDisabled
                      : colors.coverPdfBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    generating !== null || !jd.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, opacity 0.2s ease",
                }}
              >
                {generating === "cover-pdf"
                  ? `Generating… (${elapsedTime}s)`
                  : "Download Cover Letter as PDF file"}
              </button>
              <button
                type="button"
                onClick={() => handleCoverLetterGenerate("docx")}
                disabled={generating !== null || !jd.trim()}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background:
                    generating !== null || !jd.trim()
                      ? colors.buttonDisabled
                      : colors.coverWordBg,
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    generating !== null || !jd.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxSizing: "border-box",
                  transition: "background 0.2s ease, opacity 0.2s ease",
                }}
              >
                {generating === "cover-docx"
                  ? `Generating… (${elapsedTime}s)`
                  : "Download Cover Letter as Word file"}
              </button>
            </div>

            {lastGenerationTime && (
              <div
                style={{
                  padding: "10px 12px",
                  background: colors.successBg,
                  border: `1px solid ${colors.successText}`,
                  borderRadius: "6px",
                  color: colors.successText,
                  fontSize: "12px",
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                ✓ {lastGenerationWasCover ? "Cover letter" : "Résumé"} generated successfully in{" "}
                {lastGenerationTime}s
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
