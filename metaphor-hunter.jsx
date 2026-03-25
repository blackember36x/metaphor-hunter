import { useState, useRef, useEffect } from "react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');
`;

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "mh_entries_v1";
const COUNTER_KEY = "mh_next_id_v1";

async function loadEntries() {
  try {
    const result = await window.storage.get(STORAGE_KEY);
    if (result && result.value) return JSON.parse(result.value);
  } catch (_) {}
  return null;
}

async function persistEntries(entries) {
  await window.storage.set(STORAGE_KEY, JSON.stringify(entries));
}

async function loadNextId() {
  try {
    const result = await window.storage.get(COUNTER_KEY);
    if (result && result.value) return parseInt(result.value, 10);
  } catch (_) {}
  return null;
}

async function persistNextId(id) {
  await window.storage.set(COUNTER_KEY, String(id));
}

// ─── Seed data (shown only on first ever launch) ─────────────────────────────
const SEED_ENTRIES = [
  {
    id: 1,
    text: "The way morning commuters move through the subway like blood cells through arteries — each one knowing exactly where they need to go, forming a living circulatory system of the city.",
    tags: ["city", "people", "movement"],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    text: "Conversations layering over each other in the coffee shop like a jazz ensemble — each voice finding its own rhythm while contributing to something beautiful together.",
    tags: ["people", "sound", "language"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    text: "Morning light through my window feels like time made visible — not illuminating space but the passage itself, each dust mote a second drifting by.",
    tags: ["nature", "time", "light"],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Tag color palette ────────────────────────────────────────────────────────
const TAG_PALETTE = {
  nature:   { bg: "#1E3A2A", text: "#7BC99A", dot: "#4CAF7D" },
  people:   { bg: "#2A1E3A", text: "#B99AE0", dot: "#9B59B6" },
  space:    { bg: "#1E2A3A", text: "#7EB5E0", dot: "#3A9BD5" },
  emotion:  { bg: "#3A1E1E", text: "#E07E7E", dot: "#D45555" },
  time:     { bg: "#3A2E1E", text: "#E0B97E", dot: "#D49A35" },
  language: { bg: "#1E3A35", text: "#7ED4C8", dot: "#35C4B8" },
  city:     { bg: "#2A2A1E", text: "#CACF7A", dot: "#B0B835" },
  body:     { bg: "#3A1E2A", text: "#E07EAF", dot: "#D4558A" },
};
const PALETTE_KEYS = Object.keys(TAG_PALETTE);

const getTagColor = (tag) => {
  const lower = tag.toLowerCase();
  for (const key of PALETTE_KEYS) if (lower.includes(key)) return TAG_PALETTE[key];
  const hash = [...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE_KEYS.length;
  return TAG_PALETTE[PALETTE_KEYS[hash]];
};

// ─── Timestamp helpers ────────────────────────────────────────────────────────
function formatRelative(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)   return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFull(iso) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── TagPill ──────────────────────────────────────────────────────────────────
function TagPill({ tag, onClick, removable }) {
  const c = getTagColor(tag);
  return (
    <span
      onClick={onClick}
      title={removable ? "Remove" : `Filter by "${tag}"`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 20,
        background: c.bg, color: c.text,
        fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.06em", border: `1px solid ${c.dot}22`,
        cursor: onClick ? "pointer" : "default", transition: "opacity 0.15s",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {tag}
      {removable && <span style={{ marginLeft: 2, opacity: 0.6, fontSize: 13, lineHeight: 1 }}>×</span>}
    </span>
  );
}

// ─── EntryCard ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onTagClick, visible }) {
  const [showFull, setShowFull] = useState(false);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      background: "#1C1915", border: "1px solid #2E2A24",
      borderRadius: 12, padding: "22px 26px",
      display: "flex", flexDirection: "column", gap: 14,
      position: "relative", overflow: "hidden",
    }}>
      {/* Accent bar */}
      <div style={{
        position: "absolute", left: 0, top: "20%", bottom: "20%",
        width: 2, borderRadius: 2,
        background: "linear-gradient(to bottom, transparent, #C9A84C55, transparent)",
      }} />

      <p style={{
        margin: 0,
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 18, lineHeight: 1.65,
        color: "#EDE5D5", fontWeight: 300,
        fontStyle: "italic", letterSpacing: "0.01em",
      }}>
        "{entry.text}"
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {entry.tags.length > 0
            ? entry.tags.map((t) => <TagPill key={t} tag={t} onClick={() => onTagClick(t)} />)
            : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#3A3428" }}>untagged</span>
          }
        </div>
        {/* Tap/click to toggle between relative and full timestamp */}
        <span
          onClick={() => setShowFull((p) => !p)}
          title={formatFull(entry.createdAt)}
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "#4A4438", letterSpacing: "0.04em",
            cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
          }}
        >
          {showFull ? formatFull(entry.createdAt) : formatRelative(entry.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Save status badge ────────────────────────────────────────────────────────
function SaveBadge({ status }) {
  const styles = {
    saving: { text: "saving…",    color: "#7A6A52" },
    saved:  { text: "✓ saved",    color: "#4CAF7D" },
    error:  { text: "⚠ not saved",color: "#D45555" },
  };
  if (!styles[status]) return null;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, color: styles[status].color,
      letterSpacing: "0.08em", transition: "opacity 0.3s",
    }}>
      {styles[status].text}
    </span>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function MetaphorHunter() {
  const [entries,      setEntries]      = useState([]);
  const [loaded,       setLoaded]       = useState(false);
  const [saveStatus,   setSaveStatus]   = useState("idle");
  const [text,         setText]         = useState("");
  const [tagInput,     setTagInput]     = useState("");
  const [pendingTags,  setPendingTags]  = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [visibleIds,   setVisibleIds]   = useState(new Set());
  const textareaRef = useRef(null);
  const nextId      = useRef(1);

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      const [saved, savedId] = await Promise.all([loadEntries(), loadNextId()]);
      if (saved && saved.length > 0) {
        setEntries(saved);
        setVisibleIds(new Set(saved.map((e) => e.id)));
        nextId.current = savedId ?? (Math.max(...saved.map((e) => e.id)) + 1);
      } else {
        // First launch — populate with examples
        setEntries(SEED_ENTRIES);
        setVisibleIds(new Set(SEED_ENTRIES.map((e) => e.id)));
        nextId.current = SEED_ENTRIES.length + 1;
        await persistEntries(SEED_ENTRIES);
        await persistNextId(nextId.current);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded && textareaRef.current) textareaRef.current.focus();
  }, [loaded]);

  const allTags = [...new Set(entries.flatMap((e) => e.tags))].sort();

  const handleTagKey = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/,/g, "");
      if (tag && !pendingTags.includes(tag)) setPendingTags((p) => [...p, tag]);
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && pendingTags.length > 0) {
      setPendingTags((p) => p.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const id = nextId.current;
    nextId.current += 1;

    const newEntry = {
      id,
      text: text.trim(),
      tags: [...pendingTags],
      createdAt: new Date().toISOString(),
    };
    const newEntries = [newEntry, ...entries];

    setEntries(newEntries);
    setTimeout(() => setVisibleIds((p) => new Set([...p, id])), 40);
    setText("");
    setPendingTags([]);

    // Persist
    setSaveStatus("saving");
    try {
      await persistEntries(newEntries);
      await persistNextId(nextId.current);
      setSaveStatus("saved");
    } catch (_) {
      setSaveStatus("error");
    } finally {
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  const filteredEntries = activeFilter
    ? entries.filter((e) => e.tags.includes(activeFilter))
    : entries;

  // Loading state
  if (!loaded) return (
    <>
      <style>{FONTS}</style>
      <div style={{
        minHeight: "100vh", background: "#111009",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic", fontSize: 18, color: "#4A4438",
        }}>
          loading your observations…
        </p>
      </div>
    </>
  );

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #111009; }
        ::selection { background: #C9A84C33; }
        textarea { outline: none; }
        textarea::placeholder { color: #4A4438; font-style: italic; }
        input { outline: none; }
        input::placeholder { color: #4A4438; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2E2A24; border-radius: 2px; }
        .submit-btn:hover:not([disabled]) { background: #D4B050 !important; }
        .filter-btn { transition: all 0.15s; }
        .filter-btn:hover { opacity: 0.85; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#111009", paddingBottom: 80 }}>

        {/* ── Header ── */}
        <header style={{
          borderBottom: "1px solid #1E1C17",
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#111009", zIndex: 10,
        }}>
          <div>
            <h1 style={{
              margin: 0, fontFamily: "'DM Serif Display', serif",
              fontSize: 22, color: "#EDE5D5", fontWeight: 400, letterSpacing: "-0.01em",
            }}>
              metaphor{" "}
              <span style={{ color: "#C9A84C", fontStyle: "italic" }}>hunter</span>
            </h1>
            <p style={{
              margin: "2px 0 0", fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: "#4A4438", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              step 1 — notice
            </p>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#1C1915", border: "1px solid #2E2A24",
            borderRadius: 8, padding: "7px 13px",
          }}>
            <span style={{ fontSize: 12, color: "#C9A84C" }}>◆</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#7A6A52" }}>
              {entries.length} observation{entries.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <main style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px 0" }}>

          {/* ── Capture zone ── */}
          <div style={{
            background: "#1C1915",
            border: `1px solid ${text.length > 0 ? "#C9A84C44" : "#2E2A24"}`,
            borderRadius: 14, padding: "22px",
            marginBottom: 32,
            transition: "border-color 0.3s, box-shadow 0.3s",
            boxShadow: text.length > 0 ? "0 0 0 4px #C9A84C08" : "none",
          }}>
            <p style={{
              margin: "0 0 10px",
              fontFamily: "'DM Serif Display', serif",
              fontSize: 12, color: "#5C5448",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              What are you noticing?
            </p>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="The way light falls through those leaves reminds me of..."
              rows={4}
              style={{
                width: "100%", background: "transparent", border: "none", resize: "none",
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18, lineHeight: 1.65, color: "#EDE5D5",
                fontWeight: 300, fontStyle: text.length > 0 ? "italic" : "normal",
                letterSpacing: "0.01em",
              }}
            />

            {/* Tags + submit */}
            <div style={{
              borderTop: "1px solid #2E2A24", paddingTop: 12, marginTop: 4,
              display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
            }}>
              {pendingTags.map((t) => (
                <TagPill
                  key={t} tag={t} removable
                  onClick={() => setPendingTags((p) => p.filter((x) => x !== t))}
                />
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                placeholder={pendingTags.length === 0 ? "add tags (↵ to confirm)…" : ""}
                style={{
                  background: "transparent", border: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, color: "#9A8E7A", letterSpacing: "0.06em",
                  width: pendingTags.length > 0 ? 130 : 200, flexShrink: 0,
                }}
              />

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                <SaveBadge status={saveStatus} />
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  style={{
                    background: text.trim() ? "#C9A84C" : "#2A2520",
                    border: "none", borderRadius: 8, padding: "8px 18px",
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 14, letterSpacing: "0.02em",
                    color: text.trim() ? "#111009" : "#4A4438",
                    cursor: text.trim() ? "pointer" : "default",
                    transition: "background 0.2s",
                  }}
                >
                  capture ⌘↵
                </button>
              </div>
            </div>
          </div>

          {/* ── Tag filters ── */}
          {allTags.length > 0 && (
            <div style={{ marginBottom: 22, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "#4A4438", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 2,
              }}>
                filter
              </span>
              {[null, ...allTags].map((tag) => {
                const active = activeFilter === tag;
                const c = tag ? getTagColor(tag) : null;
                return (
                  <button
                    key={tag ?? "__all__"}
                    className="filter-btn"
                    onClick={() => setActiveFilter(tag)}
                    style={{
                      padding: "3px 12px", borderRadius: 20,
                      border: `1px solid ${active ? (c ? c.dot + "88" : "#C9A84C66") : (c ? c.dot + "22" : "#2E2A24")}`,
                      background: active ? (c ? c.bg : "#C9A84C15") : "transparent",
                      color: active ? (c ? c.text : "#C9A84C") : "#5C5448",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11, letterSpacing: "0.06em", cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {c && <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />}
                    {tag ?? "all"}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Entries feed ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "56px 0", color: "#4A4438" }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontStyle: "italic", margin: 0 }}>
                  {activeFilter ? `No observations tagged "${activeFilter}" yet.` : "Nothing noticed yet."}
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 8, letterSpacing: "0.08em" }}>
                  Start by capturing what catches your attention.
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  visible={visibleIds.has(entry.id)}
                  onTagClick={(tag) => setActiveFilter(activeFilter === tag ? null : tag)}
                />
              ))
            )}
          </div>

          {/* ── Footer quote ── */}
          <div style={{ marginTop: 56, textAlign: "center", padding: "0 20px" }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 15, fontStyle: "italic",
              color: "#3A3428", lineHeight: 1.7, margin: 0,
            }}>
              "You are revealed by what you consistently notice<br />
              and how you make sense of what you notice."
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
