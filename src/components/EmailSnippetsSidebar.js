import { useState, useEffect, useCallback, useRef } from "react";
import { DockPinIcon } from "@/lib/ui/quick-copy-icons";
import { EMAIL_SNIPPET_TOPIC_ORDER } from "@/lib/email/email-snippet-topics";

function buildSnippetClipboardText(snippet, replyFirstName) {
  const body = snippet != null ? String(snippet) : "";
  const first = (replyFirstName || "").trim();
  if (first && body) return `${body}\n${first}`;
  if (first && !body) return first;
  return body;
}

/**
 * @param {{ replyFirstName?: string }} props — first name appended on a new line after the snippet when copying
 */
const RAIL_CLOSE_DELAY_MS = 520;

export function EmailSnippetsSidebar({ replyFirstName = "" }) {
  const [snippets, setSnippets] = useState({});
  const [pinned, setPinned] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [copiedTopic, setCopiedTopic] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const railCloseTimerRef = useRef(null);

  const clearRailCloseTimer = useCallback(() => {
    if (railCloseTimerRef.current != null) {
      clearTimeout(railCloseTimerRef.current);
      railCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearRailCloseTimer();
  }, [clearRailCloseTimer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/email-snippets.json", { cache: "no-store" });
        const raw = await res.text();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(res.statusText || String(res.status));
        }
        const trimmed = raw.trimStart();
        if (trimmed.startsWith("<")) {
          throw new Error(
            "Expected JSON from /email-snippets.json but got HTML (often a bad route or proxy rewrite)."
          );
        }
        const data = JSON.parse(raw);
        setSnippets(typeof data === "object" && data !== null && !Array.isArray(data) ? data : {});
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setSnippets({});
          setLoadError(e?.message || "Failed to load email-snippets.json");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openRail = useCallback(() => {
    clearRailCloseTimer();
    setRailOpen(true);
  }, [clearRailCloseTimer]);

  const scheduleCloseRail = useCallback(() => {
    if (pinned) return;
    clearRailCloseTimer();
    railCloseTimerRef.current = setTimeout(() => {
      railCloseTimerRef.current = null;
      setRailOpen(false);
    }, RAIL_CLOSE_DELAY_MS);
  }, [pinned, clearRailCloseTimer]);

  const copyTopic = useCallback(async (topic) => {
    const raw = snippets[topic];
    const text = buildSnippetClipboardText(raw, replyFirstName);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTopic(topic);
      setTimeout(() => setCopiedTopic(null), 2000);
    } catch (err) {
      console.error("Failed to copy email snippet:", err);
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedTopic(topic);
        setTimeout(() => setCopiedTopic(null), 2000);
      } catch (e2) {
        console.error("execCommand copy failed:", e2);
      }
      document.body.removeChild(textArea);
    }
  }, [snippets, replyFirstName]);

  const dockClass =
    `rt-right-email-dock${pinned ? " rt-right-email-dock--pinned" : ""}` +
    `${pinned || railOpen ? " rt-right-email-dock--open" : ""}`;

  return (
    <div
      className={dockClass}
      onMouseEnter={openRail}
      onMouseLeave={scheduleCloseRail}
    >
      <div className="rt-right-email-dock__hit" aria-hidden />
      <aside className="rt-right-email-dock__panel" aria-label="Email reply templates">
        <div className="rt-right-email-dock__head">
          <span className="rt-right-email-dock__title">Email Reply</span>
          <button
            type="button"
            className={`rt-right-email-dock__pin${pinned ? " rt-right-email-dock__pin--active" : ""}`}
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin email templates" : "Pin email templates open"}
            onClick={() => {
              clearRailCloseTimer();
              setPinned((p) => !p);
            }}
          >
            <DockPinIcon size={16} color="#0f172a" />
          </button>
        </div>
        {loadError ? (
          <p className="rt-right-email-dock__error" role="status">
            {loadError}
          </p>
        ) : null}
        <div className="rt-right-email-dock__topics">
          {EMAIL_SNIPPET_TOPIC_ORDER.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`rt-right-email-dock__topic${copiedTopic === topic ? " rt-right-email-dock__topic--copied" : ""}`}
              aria-label={
                copiedTopic === topic
                  ? `${topic} copied to clipboard`
                  : `Copy email: ${topic}`
              }
              onClick={() => copyTopic(topic)}
            >
              {copiedTopic === topic ? "Copied!" : topic}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
