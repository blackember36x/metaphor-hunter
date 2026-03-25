import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ─── Mobile detection ─────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 600);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "mh_entries_v1";
const COUNTER_KEY = "mh_next_id_v1";
const TAG_COLORS_KEY = "mh_tag_colors_v1";

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function persistEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadNextId() {
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (raw) return parseInt(raw, 10);
  } catch (_) {}
  return null;
}

function persistNextId(id) {
  localStorage.setItem(COUNTER_KEY, String(id));
}

function loadTagColors() {
  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

function persistTagColors(colors) {
  localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(colors));
}

// ─── Data management helpers ─────────────────────────────────────────────────
function exportData() {
  const data = {
    entries: localStorage.getItem(STORAGE_KEY),
    nextId: localStorage.getItem(COUNTER_KEY),
    tagColors: localStorage.getItem(TAG_COLORS_KEY),
    firstUse: localStorage.getItem("mh_first_use_v1"),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `metaphor-hunter-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(COUNTER_KEY);
  localStorage.removeItem(TAG_COLORS_KEY);
  localStorage.removeItem("mh_onboarding_done_v1");
  localStorage.removeItem("mh_first_use_v1");
}

// ─── Onboarding / Progress constants ─────────────────────────────────────────
const ONBOARDING_KEY = "mh_onboarding_done_v1";
const FIRST_USE_KEY = "mh_first_use_v1";

const MILESTONES = [
  { count: 1, message: "Your first observation. The journey begins." },
  { count: 5, message: "Five observations. You're starting to see differently." },
  { count: 10, message: "Ten observations. A habit is taking shape." },
  { count: 25, message: "Twenty-five. Your awareness is sharpening." },
  { count: 50, message: "Fifty observations. You see what others walk past." },
];

const ONBOARDING_SLIDES = [
  {
    title: "Welcome to Metaphor Hunter",
    body: "This is a tool for learning to notice — really notice — the world around you.",
    accent: "The way light hits a building. A stranger's gesture. The sound of rain on different surfaces.",
  },
  {
    title: "Why notice?",
    body: "Paying attention on purpose is powerful. It grounds you in the present moment, quiets anxiety, and cuts through the autopilot we all slip into. Over time, your observations become a mirror — revealing what you value, what moves you, and how you see the world.",
    accent: "Whether you're a writer, an artist, a musician, or simply someone who wants to feel more alive in their daily life — it all starts with what you choose to pay attention to.",
  },
  {
    title: "Step 1: Notice",
    body: "When something catches your attention — a sight, a sound, a thought — capture it here in your own words. Don't overthink it. Just describe what you noticed and why it stood out.",
    accent: "There are no right answers. Only your attention.",
  },
  {
    title: "Make it yours",
    body: "Create your own tags to organize observations. These are your categories, your language. There are no defaults because nobody else sees the world the way you do.",
    accent: "Type a tag and press Enter to create it. Assign colors that feel right to you.",
  },
  {
    title: "Build the habit",
    body: "Try to capture one observation a day. It doesn't need to be profound — mundane observations often reveal the most. Over time, you'll unlock new ways to reflect on what you've noticed.",
    accent: "This isn't about quantity. It's about attention.",
  },
  {
    title: "Ready?",
    body: "Look around you right now. What catches your eye? What do you hear? Start there.",
    accent: null,
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

const getDefaultTagColor = (tag) => {
  const lower = tag.toLowerCase();
  for (const key of PALETTE_KEYS) if (lower.includes(key)) return TAG_PALETTE[key];
  const hash = [...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE_KEYS.length;
  return TAG_PALETTE[PALETTE_KEYS[hash]];
};

const getTagColor = (tag, customColors = {}) => {
  if (customColors[tag]) return customColors[tag];
  return getDefaultTagColor(tag);
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

// ─── TagColorPicker ───────────────────────────────────────────────────────────
function TagColorPicker({ tag, customColors, onSelect, onClose }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isCustom = !!customColors[tag];

  return (
    <div ref={pickerRef} style={{
      position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 20,
      background: "#1C1915", border: "1px solid #2E2A24", borderRadius: 10,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 8px 24px #00000066", minWidth: 180,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "#5C5448", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        color for "{tag}"
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PALETTE_KEYS.map((key) => {
          const c = TAG_PALETTE[key];
          const selected = customColors[tag] && customColors[tag].dot === c.dot;
          return (
            <button
              key={key}
              onClick={() => onSelect(tag, c)}
              title={key}
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: c.bg, border: `2px solid ${selected ? c.dot : "transparent"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.15s",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot }} />
            </button>
          );
        })}
      </div>
      {isCustom && (
        <button
          onClick={() => onSelect(tag, null)}
          style={{
            background: "none", border: "1px solid #2E2A24", borderRadius: 6,
            padding: "4px 10px", cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "#5C5448", letterSpacing: "0.06em",
          }}
        >
          reset to default
        </button>
      )}
    </div>
  );
}

// ─── TagPill ──────────────────────────────────────────────────────────────────
function TagPill({ tag, onClick, removable, customColors, mobile: mobileProp }) {
  const mobileHook = useIsMobile();
  const isMobile = mobileProp !== undefined ? mobileProp : mobileHook;
  const c = getTagColor(tag, customColors);
  return (
    <span
      onClick={onClick}
      title={removable ? "Remove" : `Filter by "${tag}"`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: isMobile ? "5px 12px" : "3px 10px", borderRadius: 20,
        background: c.bg, color: c.text,
        fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.06em", border: `1px solid ${c.dot}22`,
        cursor: onClick ? "pointer" : "default", transition: "opacity 0.15s",
        ...(isMobile ? { minHeight: 28 } : {}),
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {tag}
      {removable && <span style={{ marginLeft: 2, opacity: 0.6, fontSize: 13, lineHeight: 1 }}>×</span>}
    </span>
  );
}

// ─── Highlighted text (for search) ────────────────────────────────────────────
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{
            background: "#C9A84C44", color: "#EDE5D5",
            borderRadius: 2, padding: "0 1px",
          }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── EntryCard ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onTagClick, onEdit, onDelete, onDeleteRevision, searchQuery, visible, customColors }) {
  const mobile = useIsMobile();
  const [showFull, setShowFull] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const [editTagInput, setEditTagInput] = useState("");
  const [editTags, setEditTags] = useState([...entry.tags]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editRef = useRef(null);

  const history = entry.history || [];

  const startEdit = () => {
    setEditText(entry.text);
    setEditTags([...entry.tags]);
    setEditing(true);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditText(entry.text);
    setEditTags([...entry.tags]);
    setEditTagInput("");
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    if (editText.trim() === entry.text && JSON.stringify(editTags) === JSON.stringify(entry.tags)) {
      setEditing(false);
      return;
    }
    onEdit(entry.id, editText.trim(), editTags);
    setEditing(false);
    setEditTagInput("");
  };

  const handleEditTagKey = (e) => {
    if ((e.key === "Enter" || e.key === ",") && editTagInput.trim()) {
      e.preventDefault();
      const tag = editTagInput.trim().toLowerCase().replace(/,/g, "");
      if (tag && !editTags.includes(tag)) setEditTags((p) => [...p, tag]);
      setEditTagInput("");
    }
    if (e.key === "Backspace" && !editTagInput && editTags.length > 0) {
      setEditTags((p) => p.slice(0, -1));
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const iconBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: mobile ? "8px 10px" : "4px 6px",
    borderRadius: mobile ? 6 : 4, transition: "background 0.15s",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: mobile ? 14 : 11,
    ...(mobile ? { minWidth: 36, minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center" } : {}),
  };

  if (editing) {
    return (
      <div style={{
        background: "#1C1915", border: "1px solid #C9A84C44",
        borderRadius: 12, padding: "22px 26px",
        display: "flex", flexDirection: "column", gap: 12,
        boxShadow: "0 0 0 4px #C9A84C08",
      }}>
        <textarea
          ref={editRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          rows={4}
          style={{
            width: "100%", background: "transparent", border: "none", resize: "none",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 18, lineHeight: 1.65, color: "#EDE5D5",
            fontWeight: 300, fontStyle: "italic", letterSpacing: "0.01em",
            outline: "none",
          }}
        />
        <div style={{
          borderTop: "1px solid #2E2A24", paddingTop: 10,
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
        }}>
          {editTags.map((t) => (
            <TagPill key={t} tag={t} removable customColors={customColors} onClick={() => setEditTags((p) => p.filter((x) => x !== t))} />
          ))}
          <input
            value={editTagInput}
            onChange={(e) => setEditTagInput(e.target.value)}
            onKeyDown={handleEditTagKey}
            placeholder={editTags.length === 0 ? "add tags…" : ""}
            style={{
              background: "transparent", border: "none", outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: "#9A8E7A", letterSpacing: "0.06em",
              width: 130, flexShrink: 0,
            }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={cancelEdit} style={{ ...iconBtn, color: "#5C5448" }}>cancel</button>
            <button
              onClick={saveEdit}
              style={{
                background: "#C9A84C", border: "none", borderRadius: 6,
                padding: "6px 14px", fontFamily: "'DM Serif Display', serif",
                fontSize: 13, color: "#111009", cursor: "pointer",
              }}
            >
              save
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        &ldquo;<HighlightedText text={entry.text} query={searchQuery} />&rdquo;
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {entry.tags.length > 0
            ? entry.tags.map((t) => <TagPill key={t} tag={t} customColors={customColors} onClick={() => onTagClick(t)} />)
            : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#3A3428" }}>untagged</span>
          }
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Edit / Delete buttons */}
          <button onClick={startEdit} title="Edit" style={{ ...iconBtn, color: "#4A4438" }}>✎</button>
          {confirmDelete ? (
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#D45555" }}>delete?</span>
              <button onClick={() => onDelete(entry.id)} style={{ ...iconBtn, color: "#D45555", fontSize: 10 }}>yes</button>
              <button onClick={() => setConfirmDelete(false)} style={{ ...iconBtn, color: "#5C5448", fontSize: 10 }}>no</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete" style={{ ...iconBtn, color: "#4A4438" }}>×</button>
          )}
          {/* Timestamp */}
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

      {/* Edited indicator */}
      {history.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            onClick={() => setShowHistory((p) => !p)}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#5C5448", letterSpacing: "0.04em",
              cursor: "pointer", userSelect: "none",
            }}
          >
            edited {formatRelative(history[0].editedAt)} · {history.length} revision{history.length !== 1 ? "s" : ""} {showHistory ? "▲" : "▼"}
          </span>
        </div>
      )}

      {/* Edit history */}
      {showHistory && history.map((h, i) => (
        <div key={i} style={{
          background: "#15130F", border: "1px solid #2E2A24",
          borderRadius: 8, padding: "14px 18px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <p style={{
            margin: 0, fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15, lineHeight: 1.55, color: "#7A6A52",
            fontStyle: "italic", textDecoration: "line-through",
            textDecorationColor: "#3A342844",
          }}>
            &ldquo;{h.text}&rdquo;
          </p>
          {h.tags && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, opacity: 0.5 }}>
              {h.tags.map((t) => <TagPill key={t} tag={t} customColors={customColors} />)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "#4A4438", letterSpacing: "0.04em",
            }}>
              {formatFull(h.editedAt)}
            </span>
            <button
              onClick={() => onEdit(entry.id, h.text, h.tags || entry.tags, true)}
              title="Revert to this version"
              style={{ ...iconBtn, color: "#C9A84C", fontSize: 10 }}
            >
              revert
            </button>
            <button
              onClick={() => onDeleteRevision(entry.id, i)}
              title="Discard this old version"
              style={{ ...iconBtn, color: "#D45555", fontSize: 10 }}
            >
              discard
            </button>
          </div>
        </div>
      ))}
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

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [slide, setSlide] = useState(0);
  const mobile = useIsMobile();
  const current = ONBOARDING_SLIDES[slide];
  const isLast = slide === ONBOARDING_SLIDES.length - 1;

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "#111009", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: mobile ? "40px 24px" : "60px 40px",
    }}>
      {/* Skip button */}
      <button
        onClick={complete}
        style={{
          position: "absolute", top: mobile ? 16 : 24, right: mobile ? 16 : 24,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "#4A4438", letterSpacing: "0.08em",
        }}
      >
        skip
      </button>

      {/* Slide content */}
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: mobile ? 24 : 28, color: "#EDE5D5",
          fontWeight: 400, margin: "0 0 20px",
          letterSpacing: "-0.01em",
        }}>
          {current.title}
        </h2>

        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: mobile ? 16 : 18, lineHeight: 1.7,
          color: "#9A8E7A", margin: "0 0 24px",
        }}>
          {current.body}
        </p>

        {current.accent && (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: mobile ? 15 : 16, fontStyle: "italic",
            color: "#C9A84C", lineHeight: 1.6, margin: 0,
          }}>
            {current.accent}
          </p>
        )}
      </div>

      {/* Dots + navigation */}
      <div style={{
        position: "absolute", bottom: mobile ? 40 : 60,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
      }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <span
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 20 : 6, height: 6,
                borderRadius: 3, cursor: "pointer",
                background: i === slide ? "#C9A84C" : "#2E2A24",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          {slide > 0 && (
            <button
              onClick={() => setSlide((s) => s - 1)}
              style={{
                background: "none", border: "1px solid #2E2A24",
                borderRadius: 8, padding: "10px 24px", cursor: "pointer",
                fontFamily: "'DM Serif Display', serif",
                fontSize: 14, color: "#5C5448",
              }}
            >
              back
            </button>
          )}
          <button
            onClick={isLast ? complete : () => setSlide((s) => s + 1)}
            style={{
              background: isLast ? "#C9A84C" : "none",
              border: isLast ? "none" : "1px solid #C9A84C66",
              borderRadius: 8, padding: "10px 28px", cursor: "pointer",
              fontFamily: "'DM Serif Display', serif",
              fontSize: 14,
              color: isLast ? "#111009" : "#C9A84C",
            }}
          >
            {isLast ? "begin" : "next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function SettingsPanel({ onClose, onReset, onImport, onReplayOnboarding }) {
  const mobile = useIsMobile();
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef(null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90,
      background: "#111009EE",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: mobile ? 20 : 40,
    }}>
      <div style={{
        background: "#1C1915", border: "1px solid #2E2A24",
        borderRadius: 14, padding: mobile ? "24px 20px" : "32px 28px",
        maxWidth: 400, width: "100%",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{
            margin: 0, fontFamily: "'DM Serif Display', serif",
            fontSize: 18, color: "#EDE5D5", fontWeight: 400,
          }}>
            Settings
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: "#5C5448",
          }}>×</button>
        </div>

        {/* Export */}
        <button onClick={() => { exportData(); }} style={{
          background: "#111009", border: "1px solid #2E2A24",
          borderRadius: 8, padding: "12px 16px", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "#9A8E7A", textAlign: "left", letterSpacing: "0.04em",
        }}>
          ↓ Export data backup
        </button>

        {/* Import */}
        <button onClick={() => fileInputRef.current?.click()} style={{
          background: "#111009", border: "1px solid #2E2A24",
          borderRadius: 8, padding: "12px 16px", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "#9A8E7A", textAlign: "left", letterSpacing: "0.04em",
        }}>
          ↑ Import data from backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const data = JSON.parse(ev.target.result);
                onImport(data);
                onClose();
              } catch (_) {
                alert("Invalid backup file.");
              }
            };
            reader.readAsText(file);
            e.target.value = "";
          }}
        />

        {/* Replay onboarding */}
        <button onClick={() => { onReplayOnboarding(); onClose(); }} style={{
          background: "#111009", border: "1px solid #2E2A24",
          borderRadius: 8, padding: "12px 16px", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "#9A8E7A", textAlign: "left", letterSpacing: "0.04em",
        }}>
          ? Replay intro
        </button>

        {/* Reset */}
        <div style={{ borderTop: "1px solid #2E2A24", paddingTop: 16 }}>
          {confirmReset ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{
                margin: 0, fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: "#D45555", letterSpacing: "0.04em",
              }}>
                This will permanently delete all observations, tags, and settings. Export a backup first if you want to keep your data.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { onReset(); onClose(); }} style={{
                  background: "#D45555", border: "none",
                  borderRadius: 6, padding: "8px 16px", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "#111009",
                }}>
                  yes, delete everything
                </button>
                <button onClick={() => setConfirmReset(false)} style={{
                  background: "none", border: "1px solid #2E2A24",
                  borderRadius: 6, padding: "8px 16px", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "#5C5448",
                }}>
                  cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={{
              background: "none", border: "1px solid #3A1E1E",
              borderRadius: 8, padding: "12px 16px", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "#D45555", textAlign: "left", letterSpacing: "0.04em",
              width: "100%",
            }}>
              ✕ Reset all data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Milestone banner ─────────────────────────────────────────────────────────
function MilestoneBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 50, background: "#1C1915", border: "1px solid #C9A84C44",
      borderRadius: 12, padding: "14px 24px",
      boxShadow: "0 8px 32px #00000066",
      display: "flex", alignItems: "center", gap: 10,
      animation: "fadeInUp 0.4s ease",
      maxWidth: "calc(100vw - 32px)",
    }}>
      <span style={{ fontSize: 16, color: "#C9A84C" }}>◆</span>
      <span style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 15, fontStyle: "italic",
        color: "#EDE5D5", lineHeight: 1.4,
      }}>
        {message}
      </span>
    </div>
  );
}

// ─── GraphView ────────────────────────────────────────────────────────────────
function GraphView({ entries, customColors, onTagClick }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const interRef = useRef({
    dragging: null, panning: false,
    panStart: { x: 0, y: 0 }, panOffset: { x: 0, y: 0 },
    zoom: 1, hover: null,
    lastPinchDist: null,
  });
  const animRef = useRef(null);

  // Build graph data
  const graph = useMemo(() => {
    const tagSet = new Set();
    entries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    const tags = [...tagSet];
    const tagCounts = {};
    tags.forEach((t) => { tagCounts[t] = entries.filter((e) => e.tags.includes(t)).length; });
    const maxCount = Math.max(1, ...Object.values(tagCounts));

    const nodes = [];
    const edges = [];
    const tagIdMap = {};

    // Tag nodes
    tags.forEach((tag) => {
      const id = `tag:${tag}`;
      tagIdMap[tag] = id;
      const c = getTagColor(tag, customColors);
      const r = 14 + (tagCounts[tag] / maxCount) * 16;
      nodes.push({ id, type: "tag", label: tag, color: c, radius: r, x: 0, y: 0, vx: 0, vy: 0, pinned: false });
    });

    // Entry nodes
    entries.forEach((entry) => {
      const id = `entry:${entry.id}`;
      const primaryTag = entry.tags[0];
      const c = primaryTag ? getTagColor(primaryTag, customColors) : { bg: "#2E2A24", text: "#7A6A52", dot: "#4A4438" };
      nodes.push({ id, type: "entry", label: entry.text, tags: entry.tags, color: c, radius: 5, x: 0, y: 0, vx: 0, vy: 0, pinned: false });

      entry.tags.forEach((tag) => {
        edges.push({ source: id, target: tagIdMap[tag] });
      });
    });

    return { nodes, edges, tags };
  }, [entries, customColors]);

  // Initialize positions
  const initPositions = useCallback((width, height) => {
    const cx = width / 2;
    const cy = height / 2;
    const tagNodes = graph.nodes.filter((n) => n.type === "tag");
    const entryNodes = graph.nodes.filter((n) => n.type === "entry");
    const tagRadius = Math.min(width, height) * 0.25;

    tagNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / tagNodes.length;
      node.x = cx + Math.cos(angle) * tagRadius;
      node.y = cy + Math.sin(angle) * tagRadius;
      node.vx = 0; node.vy = 0;
    });

    const nodeMap = {};
    graph.nodes.forEach((n) => { nodeMap[n.id] = n; });

    entryNodes.forEach((node) => {
      // Place near first tag with jitter
      const firstEdge = graph.edges.find((e) => e.source === node.id);
      if (firstEdge) {
        const tagNode = nodeMap[firstEdge.target];
        node.x = tagNode.x + (Math.random() - 0.5) * 80;
        node.y = tagNode.y + (Math.random() - 0.5) * 80;
      } else {
        node.x = cx + (Math.random() - 0.5) * 100;
        node.y = cy + (Math.random() - 0.5) * 100;
      }
      node.vx = 0; node.vy = 0;
    });

    simRef.current = { alpha: 1, nodeMap };
  }, [graph]);

  // Force simulation tick
  const tick = useCallback(() => {
    if (!simRef.current) return;
    const { alpha, nodeMap } = simRef.current;
    if (alpha < 0.001) return;

    const nodes = graph.nodes;
    const edges = graph.edges;

    // Repulsion (all pairs)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = a.radius + b.radius + 10;
        if (dist < minDist) dist = minDist;
        const strength = (a.type === "tag" && b.type === "tag") ? 1200 : (a.type === "tag" || b.type === "tag") ? 400 : 150;
        const force = (strength * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
        if (!b.pinned) { b.vx += fx; b.vy += fy; }
      }
    }

    // Attraction (edges)
    edges.forEach(({ source, target }) => {
      const a = nodeMap[source], b = nodeMap[target];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const restLength = 70;
      const force = 0.06 * (dist - restLength) * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.pinned) { a.vx += fx; a.vy += fy; }
      if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
    });

    // Center gravity
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
      const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
      nodes.forEach((n) => {
        if (n.pinned) return;
        n.vx += (cx - n.x) * 0.008 * alpha;
        n.vy += (cy - n.y) * 0.008 * alpha;
      });
    }

    // Apply velocity + damping
    nodes.forEach((n) => {
      if (n.pinned) return;
      n.vx *= 0.88;
      n.vy *= 0.88;
      n.x += n.vx;
      n.y += n.vy;
    });

    simRef.current.alpha *= 0.997;
  }, [graph]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const h = canvas.height / dpr;
    const { panOffset, zoom, hover } = interRef.current;
    const { nodeMap } = simRef.current || {};
    if (!nodeMap) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#111009";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panOffset.x * dpr, panOffset.y * dpr);

    // Determine hovered node's connections
    const hoverConnected = new Set();
    if (hover) {
      graph.edges.forEach(({ source, target }) => {
        if (source === hover.id || target === hover.id) {
          hoverConnected.add(source);
          hoverConnected.add(target);
        }
      });
    }

    // Draw edges
    graph.edges.forEach(({ source, target }) => {
      const a = nodeMap[source], b = nodeMap[target];
      if (!a || !b) return;
      const connected = hover && (hoverConnected.has(source) && hoverConnected.has(target));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = connected ? (b.type === "tag" ? b.color.dot + "88" : a.color.dot + "88") : "#2E2A2440";
      ctx.lineWidth = connected ? 1.5 : 0.5;
      ctx.stroke();
    });

    // Draw nodes
    graph.nodes.forEach((node) => {
      const isHovered = hover && hover.id === node.id;
      const isConnected = hover && hoverConnected.has(node.id);
      const dimmed = hover && !isHovered && !isConnected;

      if (node.type === "tag") {
        // Diamond shape
        const r = node.radius;
        // Measure label to size diamond horizontally
        ctx.font = `bold 10px 'JetBrains Mono', monospace`;
        const labelW = ctx.measureText(node.label).width;
        const hw = Math.max(r, labelW / 2 + 12); // half-width
        const hh = r; // half-height

        ctx.save();
        ctx.shadowBlur = isHovered ? 24 : 12;
        ctx.shadowColor = node.color.dot + (dimmed ? "22" : "55");

        ctx.beginPath();
        ctx.moveTo(node.x, node.y - hh);
        ctx.lineTo(node.x + hw, node.y);
        ctx.lineTo(node.x, node.y + hh);
        ctx.lineTo(node.x - hw, node.y);
        ctx.closePath();

        ctx.fillStyle = dimmed ? node.color.bg + "66" : node.color.bg;
        ctx.fill();
        ctx.strokeStyle = dimmed ? node.color.dot + "33" : node.color.dot + "88";
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();
        ctx.restore();

        // Label inside diamond
        ctx.font = `bold 10px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = dimmed ? node.color.text + "44" : node.color.text;
        ctx.fillText(node.label, node.x, node.y);
        ctx.textBaseline = "alphabetic";
      } else {
        // Circle for entries
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = dimmed ? node.color.dot + "22" : (isHovered || isConnected) ? node.color.dot + "CC" : node.color.dot + "66";
        ctx.fill();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = "#C9A84C88";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    });

    // Tooltip for hovered entry
    if (hover && hover.type === "entry") {
      const canvasW = canvas.width / dpr;
      const canvasH = canvas.height / dpr;
      const text = hover.label.length > 90 ? hover.label.slice(0, 90) + "…" : hover.label;
      const maxWidth = Math.min(220, canvasW * 0.6);
      ctx.font = `italic 14px 'Cormorant Garamond', serif`;

      // Word wrap
      const words = text.split(" ");
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);

      const lineHeight = 18;
      const pad = 12;
      const boxW = maxWidth + pad * 2;
      const boxH = lines.length * lineHeight + pad * 2;

      // Position tooltip, clamping to canvas edges
      let bx = hover.x + 15;
      let by = hover.y - boxH / 2;

      // Convert to screen coords for clamping
      const screenRight = (bx + boxW) * zoom + panOffset.x;
      const screenBottom = (by + boxH) * zoom + panOffset.y;
      if (screenRight > canvasW) bx = hover.x - boxW - 10;
      if (screenBottom > canvasH) by = hover.y - boxH;
      if ((by * zoom + panOffset.y) < 0) by = hover.y + 10;

      // Background
      ctx.fillStyle = "#1C1915EE";
      ctx.strokeStyle = "#2E2A24";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = "#EDE5D5";
      ctx.textAlign = "left";
      lines.forEach((l, i) => {
        ctx.fillText(l, bx + pad, by + pad + 12 + i * lineHeight);
      });
    }

    // Stats
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `10px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#4A4438";
    ctx.textAlign = "left";
    const tagCount = graph.nodes.filter((n) => n.type === "tag").length;
    const entryCount = graph.nodes.filter((n) => n.type === "entry").length;
    ctx.fillText(`${entryCount} entries · ${tagCount} tags`, 16, h - 12);
  }, [graph]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || graph.nodes.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const container = containerRef.current;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      if (!simRef.current) initPositions(rect.width, rect.height);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (!simRef.current) initPositions(canvas.width / dpr, canvas.height / dpr);

    const loop = () => {
      tick();
      render();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [graph, tick, render, initPositions]);

  // Re-init when entries change
  useEffect(() => {
    simRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      initPositions(canvas.width / dpr, canvas.height / dpr);
    }
  }, [entries.length, initPositions]);

  // Hit test helper
  const hitTest = useCallback((sx, sy) => {
    const { panOffset, zoom } = interRef.current;
    const wx = (sx - panOffset.x) / zoom;
    const wy = (sy - panOffset.y) / zoom;
    // Check in reverse so top-drawn nodes are hit first
    for (let i = graph.nodes.length - 1; i >= 0; i--) {
      const n = graph.nodes[i];
      const dx = wx - n.x, dy = wy - n.y;
      if (n.type === "tag") {
        // Diamond hit test: |dx|/hw + |dy|/hh <= 1
        const hw = Math.max(n.radius, 30) + 4;
        const hh = n.radius + 4;
        if (Math.abs(dx) / hw + Math.abs(dy) / hh <= 1) return n;
      } else {
        const hitRadius = n.radius + 6;
        if (dx * dx + dy * dy < hitRadius * hitRadius) return n;
      }
    }
    return null;
  }, [graph]);

  // Mouse handlers
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    const node = hitTest(pos.x, pos.y);
    if (node) {
      interRef.current.dragging = node;
      node.pinned = true;
      if (simRef.current) simRef.current.alpha = Math.max(simRef.current.alpha, 0.3);
    } else {
      interRef.current.panning = true;
      interRef.current.panStart = { x: pos.x - interRef.current.panOffset.x, y: pos.y - interRef.current.panOffset.y };
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasPos(e);
    const { dragging, panning, panStart, panOffset, zoom } = interRef.current;
    if (dragging) {
      dragging.x = (pos.x - panOffset.x) / zoom;
      dragging.y = (pos.y - panOffset.y) / zoom;
      dragging.vx = 0; dragging.vy = 0;
      if (simRef.current) simRef.current.alpha = Math.max(simRef.current.alpha, 0.1);
    } else if (panning) {
      interRef.current.panOffset = { x: pos.x - panStart.x, y: pos.y - panStart.y };
    } else {
      interRef.current.hover = hitTest(pos.x, pos.y);
      canvasRef.current.style.cursor = interRef.current.hover ? "pointer" : "grab";
    }
  };

  const handleMouseUp = () => {
    if (interRef.current.dragging) {
      interRef.current.dragging.pinned = false;
      interRef.current.dragging = null;
    }
    interRef.current.panning = false;
  };

  const handleDblClick = (e) => {
    const pos = getCanvasPos(e);
    const node = hitTest(pos.x, pos.y);
    if (node && node.type === "tag" && onTagClick) {
      onTagClick(node.label);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const { panOffset, zoom } = interRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(4, Math.max(0.15, zoom * delta));
    // Zoom toward cursor
    const wx = (pos.x - panOffset.x) / zoom;
    const wy = (pos.y - panOffset.y) / zoom;
    interRef.current.zoom = newZoom;
    interRef.current.panOffset = {
      x: pos.x - wx * newZoom,
      y: pos.y - wy * newZoom,
    };
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = getCanvasPos(touch);
      const node = hitTest(pos.x, pos.y);
      if (node) {
        interRef.current.dragging = node;
        node.pinned = true;
        if (simRef.current) simRef.current.alpha = Math.max(simRef.current.alpha, 0.3);
      } else {
        interRef.current.panning = true;
        interRef.current.panStart = { x: pos.x - interRef.current.panOffset.x, y: pos.y - interRef.current.panOffset.y };
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      interRef.current.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = getCanvasPos(touch);
      const { dragging, panning, panStart, panOffset, zoom } = interRef.current;
      if (dragging) {
        dragging.x = (pos.x - panOffset.x) / zoom;
        dragging.y = (pos.y - panOffset.y) / zoom;
        dragging.vx = 0; dragging.vy = 0;
        if (simRef.current) simRef.current.alpha = Math.max(simRef.current.alpha, 0.1);
      } else if (panning) {
        interRef.current.panOffset = { x: pos.x - panStart.x, y: pos.y - panStart.y };
      }
    } else if (e.touches.length === 2 && interRef.current.lastPinchDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / interRef.current.lastPinchDist;
      const { zoom, panOffset } = interRef.current;
      const newZoom = Math.min(4, Math.max(0.15, zoom * scale));

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = midX - rect.left, cy = midY - rect.top;
      const wx = (cx - panOffset.x) / zoom;
      const wy = (cy - panOffset.y) / zoom;

      interRef.current.zoom = newZoom;
      interRef.current.panOffset = { x: cx - wx * newZoom, y: cy - wy * newZoom };
      interRef.current.lastPinchDist = dist;
    }
  };

  const handleTouchEnd = () => {
    if (interRef.current.dragging) {
      interRef.current.dragging.pinned = false;
      interRef.current.dragging = null;
    }
    interRef.current.panning = false;
    interRef.current.lastPinchDist = null;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%", height: "calc(100vh - 200px)", minHeight: 400,
        borderRadius: 14, overflow: "hidden",
        border: "1px solid #2E2A24", background: "#111009",
        position: "relative",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDblClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ display: "block", cursor: "grab", touchAction: "none" }}
      />
      <div style={{
        position: "absolute", top: 12, right: 12,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "#4A4438", letterSpacing: "0.08em",
        background: "#1C1915CC", padding: "5px 10px", borderRadius: 6,
        border: "1px solid #2E2A24", pointerEvents: "none",
      }}>
        drag nodes · scroll to zoom · double-click tag to filter
      </div>
    </div>
  );
}

// ─── TimeFilterBar ────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function TimeFilterBar({ timeFilter, setTimeFilter, setDisplayCount, entries }) {
  const mobile = useIsMobile();
  const [popup, setPopup] = useState(null); // "month" or "year"
  const longPressTimer = useRef(null);
  const popupRef = useRef(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Derive available years from entries
  const availableYears = [...new Set(entries.map((e) => new Date(e.createdAt).getFullYear()))].sort((a, b) => b - a);

  // Derive available months (from entries, for the popup)
  const availableMonths = [...new Set(entries.map((e) => {
    const d = new Date(e.createdAt);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }))].map((s) => {
    const [y, m] = s.split("-").map(Number);
    return { year: y, month: m };
  }).sort((a, b) => b.year - a.year || b.month - a.month);

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopup(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const apply = (key) => {
    setTimeFilter(key);
    setDisplayCount(1);
  };

  const startLongPress = (type) => {
    longPressTimer.current = setTimeout(() => {
      setPopup(type);
    }, 400);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Current labels
  const monthKey = `month:${currentMonth}:${currentYear}`;
  const yearKey = `year:${currentYear}`;

  // Figure out active label for month/year buttons
  const activeMonthLabel = timeFilter.startsWith("month:")
    ? (() => {
        const [, m, y] = timeFilter.split(":").map(Number);
        return m === currentMonth && y === currentYear
          ? MONTH_NAMES[m]
          : `${MONTH_SHORT[m]} ${y}`;
      })()
    : MONTH_NAMES[currentMonth];

  const activeYearLabel = timeFilter.startsWith("year:")
    ? timeFilter.split(":")[1]
    : String(currentYear);

  const btnStyle = (active) => ({
    padding: mobile ? "6px 14px" : "3px 12px", borderRadius: 20,
    border: `1px solid ${active ? "#C9A84C66" : "#2E2A24"}`,
    background: active ? "#C9A84C15" : "transparent",
    color: active ? "#C9A84C" : "#5C5448",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, letterSpacing: "0.06em", cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const popupStyle = {
    position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 20,
    background: "#1C1915", border: "1px solid #2E2A24", borderRadius: 10,
    padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 4,
    boxShadow: "0 8px 24px #00000066", minWidth: 160, maxWidth: 280,
  };

  return (
    <div className="scroll-row" style={{ marginBottom: 16 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "#4A4438", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 2,
      }}>
        when
      </span>

      {/* All time */}
      <button className="filter-btn" onClick={() => apply("all")} style={btnStyle(timeFilter === "all")}>
        all time
      </button>

      {/* Today */}
      <button className="filter-btn" onClick={() => apply("today")} style={btnStyle(timeFilter === "today")}>
        today
      </button>

      {/* This week */}
      <button className="filter-btn" onClick={() => apply("week")} style={btnStyle(timeFilter === "week")}>
        this week
      </button>

      {/* Month — click for current, long-press for picker */}
      <span style={{ position: "relative" }}>
        <button
          className="filter-btn"
          onClick={() => { if (!popup) apply(monthKey); }}
          onMouseDown={() => startLongPress("month")}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={() => startLongPress("month")}
          onTouchEnd={cancelLongPress}
          style={btnStyle(timeFilter.startsWith("month:"))}
        >
          {activeMonthLabel}
        </button>
        {popup === "month" && (
          <div ref={popupRef} style={popupStyle}>
            {availableMonths.map(({ year, month }) => {
              const key = `month:${month}:${year}`;
              const active = timeFilter === key;
              return (
                <button
                  key={key}
                  className="filter-btn"
                  onClick={() => { apply(key); setPopup(null); }}
                  style={{
                    ...btnStyle(active),
                    padding: "3px 10px", fontSize: 10,
                  }}
                >
                  {MONTH_SHORT[month]} {year}
                </button>
              );
            })}
          </div>
        )}
      </span>

      {/* Year — click for current, long-press for picker */}
      <span style={{ position: "relative" }}>
        <button
          className="filter-btn"
          onClick={() => { if (!popup) apply(yearKey); }}
          onMouseDown={() => startLongPress("year")}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={() => startLongPress("year")}
          onTouchEnd={cancelLongPress}
          style={btnStyle(timeFilter.startsWith("year:"))}
        >
          {activeYearLabel}
        </button>
        {popup === "year" && (
          <div ref={popupRef} style={popupStyle}>
            {availableYears.map((y) => {
              const key = `year:${y}`;
              const active = timeFilter === key;
              return (
                <button
                  key={key}
                  className="filter-btn"
                  onClick={() => { apply(key); setPopup(null); }}
                  style={{
                    ...btnStyle(active),
                    padding: "3px 10px", fontSize: 10,
                  }}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}
      </span>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const mobile = useIsMobile();
  const [entries,      setEntries]      = useState([]);
  const [loaded,       setLoaded]       = useState(false);
  const [saveStatus,   setSaveStatus]   = useState("idle");
  const [text,         setText]         = useState("");
  const [tagInput,     setTagInput]     = useState("");
  const [pendingTags,  setPendingTags]  = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchText,   setSearchText]   = useState("");
  const [visibleIds,   setVisibleIds]   = useState(new Set());
  const [customColors, setCustomColors] = useState(() => loadTagColors());
  const [colorMode,    setColorMode]    = useState(false);
  const [colorPickerTag, setColorPickerTag] = useState(null);
  const [timeFilter,   setTimeFilter]   = useState("all");
  const [displayCount, setDisplayCount] = useState(1);
  const [viewMode,     setViewMode]     = useState("list"); // "list" or "graph"
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [milestoneMsg,   setMilestoneMsg]   = useState(null);
  const textareaRef = useRef(null);
  const nextId      = useRef(1);

  // Load persisted data on mount
  useEffect(() => {
    const saved = loadEntries();
    const savedId = loadNextId();
    if (saved && saved.length > 0) {
      const migrated = saved.map((e) => ({ ...e, history: e.history || [] }));
      setEntries(migrated);
      setVisibleIds(new Set(migrated.map((e) => e.id)));
      nextId.current = savedId ?? (Math.max(...migrated.map((e) => e.id)) + 1);
    }
    // Record first use timestamp
    if (!localStorage.getItem(FIRST_USE_KEY)) {
      localStorage.setItem(FIRST_USE_KEY, new Date().toISOString());
    }
    // Show onboarding if never completed
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && textareaRef.current) textareaRef.current.focus();
  }, [loaded]);

  const allTags = [...new Set(entries.flatMap((e) => e.tags))].sort();

  const applyTagFilter = (tag) => {
    setActiveFilter(tag);
  };

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

  const save = (newEntries) => {
    setSaveStatus("saving");
    try {
      persistEntries(newEntries);
      persistNextId(nextId.current);
      setSaveStatus("saved");
    } catch (_) {
      setSaveStatus("error");
    } finally {
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    const id = nextId.current;
    nextId.current += 1;

    const newEntry = {
      id,
      text: text.trim(),
      tags: [...pendingTags],
      createdAt: new Date().toISOString(),
      history: [],
    };
    const newEntries = [newEntry, ...entries];

    setEntries(newEntries);
    setTimeout(() => setVisibleIds((p) => new Set([...p, id])), 40);
    setText("");
    setPendingTags([]);
    setDisplayCount(1);
    save(newEntries);

    // Check milestones
    const newCount = newEntries.length;
    const milestone = MILESTONES.find((m) => m.count === newCount);
    if (milestone) {
      setMilestoneMsg(milestone.message);
      setTimeout(() => setMilestoneMsg(null), 5000);
    }
  };

  const handleEdit = (id, newText, newTags, isRevert = false) => {
    const newEntries = entries.map((e) => {
      if (e.id !== id) return e;
      const historyEntry = {
        text: e.text,
        tags: [...e.tags],
        editedAt: new Date().toISOString(),
      };
      return {
        ...e,
        text: newText,
        tags: newTags,
        history: isRevert ? e.history : [historyEntry, ...e.history],
      };
    });
    setEntries(newEntries);
    save(newEntries);
  };

  const handleDeleteRevision = (id, revisionIndex) => {
    const newEntries = entries.map((e) => {
      if (e.id !== id) return e;
      return { ...e, history: e.history.filter((_, i) => i !== revisionIndex) };
    });
    setEntries(newEntries);
    save(newEntries);
  };

  const handleTagColorSelect = (tag, color) => {
    const updated = { ...customColors };
    if (color === null) {
      delete updated[tag];
    } else {
      updated[tag] = color;
    }
    setCustomColors(updated);
    persistTagColors(updated);
    setColorPickerTag(null);
  };

  const handleReset = () => {
    resetAllData();
    setEntries([]);
    setVisibleIds(new Set());
    setCustomColors({});
    nextId.current = 1;
    setShowOnboarding(true);
  };

  const handleImport = (data) => {
    if (data.entries) {
      localStorage.setItem(STORAGE_KEY, data.entries);
      const parsed = JSON.parse(data.entries).map((e) => ({ ...e, history: e.history || [] }));
      setEntries(parsed);
      setVisibleIds(new Set(parsed.map((e) => e.id)));
      nextId.current = parsed.length > 0 ? Math.max(...parsed.map((e) => e.id)) + 1 : 1;
    }
    if (data.nextId) localStorage.setItem(COUNTER_KEY, data.nextId);
    if (data.tagColors) {
      localStorage.setItem(TAG_COLORS_KEY, data.tagColors);
      setCustomColors(JSON.parse(data.tagColors));
    }
    if (data.firstUse) localStorage.setItem(FIRST_USE_KEY, data.firstUse);
  };

  const handleDelete = (id) => {
    const newEntries = entries.filter((e) => e.id !== id);
    setEntries(newEntries);
    save(newEntries);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  // Filter by tag, then by time, then by search text
  let filteredEntries = activeFilter
    ? entries.filter((e) => e.tags.includes(activeFilter))
    : entries;

  if (timeFilter !== "all") {
    const now = new Date();
    let cutoff, cutoffEnd;
    if (timeFilter === "today") {
      cutoff = new Date(now); cutoff.setHours(0, 0, 0, 0);
    } else if (timeFilter === "week") {
      cutoff = new Date(now); cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - cutoff.getDay());
    } else if (timeFilter.startsWith("month:")) {
      const [, monthIdx, yearStr] = timeFilter.split(":");
      const m = parseInt(monthIdx, 10);
      const y = parseInt(yearStr, 10);
      cutoff = new Date(y, m, 1);
      cutoffEnd = new Date(y, m + 1, 1);
    } else if (timeFilter.startsWith("year:")) {
      const y = parseInt(timeFilter.split(":")[1], 10);
      cutoff = new Date(y, 0, 1);
      cutoffEnd = new Date(y + 1, 0, 1);
    }
    if (cutoff) {
      filteredEntries = filteredEntries.filter((e) => {
        const d = new Date(e.createdAt);
        return d >= cutoff && (!cutoffEnd || d < cutoffEnd);
      });
    }
  }

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    filteredEntries = filteredEntries.filter((e) =>
      e.text.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const totalFiltered = filteredEntries.length;
  const displayedEntries = filteredEntries.slice(0, displayCount);
  const hasMore = displayCount < totalFiltered;

  // Loading state
  if (!loaded) return (
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
  );

  return (
    <div style={{ minHeight: "100vh", background: "#111009", paddingBottom: 80 }}>

      {/* ── Onboarding overlay ── */}
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {/* ── Settings panel ── */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onReset={handleReset}
          onImport={handleImport}
          onReplayOnboarding={() => setShowOnboarding(true)}
        />
      )}

      {/* ── Milestone banner ── */}
      <MilestoneBanner message={milestoneMsg} />

      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid #1E1C17",
        padding: mobile ? "12px 16px" : "20px 24px",
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

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle */}
          <div style={{
            display: "flex", background: "#1C1915", border: "1px solid #2E2A24",
            borderRadius: 8, overflow: "hidden",
          }}>
            <button
              onClick={() => setViewMode("list")}
              title="List view"
              style={{
                background: viewMode === "list" ? "#C9A84C22" : "transparent",
                border: "none", padding: "7px 10px", cursor: "pointer",
                color: viewMode === "list" ? "#C9A84C" : "#4A4438",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                borderRight: "1px solid #2E2A24",
                transition: "all 0.15s",
              }}
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode("graph")}
              title="Graph view"
              style={{
                background: viewMode === "graph" ? "#C9A84C22" : "transparent",
                border: "none", padding: "7px 10px", cursor: "pointer",
                color: viewMode === "graph" ? "#C9A84C" : "#4A4438",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                transition: "all 0.15s",
              }}
            >
              ◈
            </button>
          </div>

          {/* Observation count */}
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

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{
              background: "#1C1915", border: "1px solid #2E2A24",
              borderRadius: 8, padding: "7px 10px", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: "#4A4438",
              transition: "color 0.15s",
            }}
          >
            ⚙
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: mobile ? "20px 14px 0" : "36px 20px 0" }}>

        {/* ── Capture zone ── */}
        <div style={{
          background: "#1C1915",
          border: `1px solid ${text.length > 0 ? "#C9A84C44" : "#2E2A24"}`,
          borderRadius: 14, padding: mobile ? "16px" : "22px",
          marginBottom: mobile ? 24 : 32,
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
            onChange={(e) => {
              setText(e.target.value);
              if (mobile) {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="The way light falls through those leaves reminds me of..."
            rows={mobile ? 2 : 4}
            style={{
              width: "100%", background: "transparent", border: "none", resize: "none",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18, lineHeight: 1.65, color: "#EDE5D5",
              fontWeight: 300, fontStyle: text.length > 0 ? "italic" : "normal",
              letterSpacing: "0.01em",
              ...(mobile ? { minHeight: 60, overflow: "hidden" } : {}),
            }}
          />

          {/* Tags + submit */}
          <div style={{
            borderTop: "1px solid #2E2A24", paddingTop: 12, marginTop: 4,
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
          }}>
            {pendingTags.map((t) => (
              <TagPill
                key={t} tag={t} removable customColors={customColors}
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
                  border: "none", borderRadius: 8,
                  padding: mobile ? "10px 20px" : "8px 18px",
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 14, letterSpacing: "0.02em",
                  color: text.trim() ? "#111009" : "#4A4438",
                  cursor: text.trim() ? "pointer" : "default",
                  transition: "background 0.2s",
                  ...(mobile ? { minHeight: 40 } : {}),
                }}
              >
                {mobile ? "capture" : "capture ⌘↵"}
              </button>
            </div>
          </div>
        </div>

        {viewMode === "graph" ? (
          <GraphView
            entries={entries}
            customColors={customColors}
            onTagClick={(tag) => {
              applyTagFilter(tag);
              setViewMode("list");
            }}
          />
        ) : (
          <>
            {/* ── Search bar ── */}
            <div style={{
              marginBottom: 16,
              position: "relative",
            }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#4A4438",
                pointerEvents: "none",
              }}>
                ⌕
              </span>
              <input
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setDisplayCount(1); }}
                placeholder="search observations…"
                style={{
                  width: "100%", background: "#1C1915", border: "1px solid #2E2A24",
                  borderRadius: 10, padding: "10px 14px 10px 36px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, color: "#EDE5D5", letterSpacing: "0.04em",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#C9A84C44"}
                onBlur={(e) => e.target.style.borderColor = "#2E2A24"}
              />
              {searchText && (
                <button
                  onClick={() => { setSearchText(""); setDisplayCount(1); }}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#5C5448",
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* ── Tag filters ── */}
            {allTags.length > 0 && (
              <div className="scroll-row" style={{ marginBottom: 22 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "#4A4438", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 2,
                }}>
                  filter
                </span>
                <button
                  onClick={() => { setColorMode((p) => !p); setColorPickerTag(null); }}
                  title={colorMode ? "Exit color customization" : "Customize tag colors"}
                  style={{
                    background: colorMode ? "#C9A84C22" : "none",
                    border: colorMode ? "1px solid #C9A84C44" : "1px solid transparent",
                    borderRadius: 6, padding: "2px 7px", cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: colorMode ? "#C9A84C" : "#4A4438",
                    transition: "all 0.15s",
                  }}
                >
                  ✦
                </button>
                {[null, ...allTags].map((tag) => {
                  const active = activeFilter === tag;
                  const c = tag ? getTagColor(tag, customColors) : null;
                  return (
                    <span key={tag ?? "__all__"} style={{ position: "relative" }}>
                      <button
                        className="filter-btn"
                        onClick={() => {
                          if (colorMode && tag) {
                            setColorPickerTag(colorPickerTag === tag ? null : tag);
                          } else {
                            applyTagFilter(tag);
                          }
                        }}
                        style={{
                          padding: mobile ? "6px 14px" : "3px 12px", borderRadius: 20,
                          border: `1px solid ${active ? (c ? c.dot + "88" : "#C9A84C66") : (c ? c.dot + "22" : "#2E2A24")}`,
                          background: active ? (c ? c.bg : "#C9A84C15") : "transparent",
                          color: active ? (c ? c.text : "#C9A84C") : "#5C5448",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, letterSpacing: "0.06em", cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: 5,
                          outline: colorMode && tag ? "1px dashed #C9A84C44" : "none",
                          outlineOffset: 1,
                        }}
                      >
                        {c && <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />}
                        {tag ?? "all"}
                      </button>
                      {colorMode && colorPickerTag === tag && tag && (
                        <TagColorPicker
                          tag={tag}
                          customColors={customColors}
                          onSelect={handleTagColorSelect}
                          onClose={() => setColorPickerTag(null)}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* ── Time filters ── */}
            <TimeFilterBar timeFilter={timeFilter} setTimeFilter={setTimeFilter} setDisplayCount={setDisplayCount} entries={entries} />

            {/* ── Search result count ── */}
            {searchText.trim() && (
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "#5C5448", letterSpacing: "0.06em", marginBottom: 12,
              }}>
                {totalFiltered} result{totalFiltered !== 1 ? "s" : ""} for &ldquo;{searchText}&rdquo;
              </p>
            )}

            {/* ── Entries feed ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {totalFiltered === 0 ? (
                <div style={{ textAlign: "center", padding: "56px 0", color: "#4A4438" }}>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontStyle: "italic", margin: 0 }}>
                    {searchText ? `No observations matching "${searchText}".`
                      : activeFilter ? `No observations tagged "${activeFilter}" yet.`
                      : timeFilter !== "all" ? `No observations ${timeFilter === "today" ? "today" : "this " + timeFilter}.`
                      : "Your observation journal is empty."}
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 8, letterSpacing: "0.08em" }}>
                    {searchText ? "Try a different search term."
                      : "Look around you. What catches your attention right now?"}
                  </p>
                </div>
              ) : (
                <>
                  {displayedEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      visible={visibleIds.has(entry.id)}
                      searchQuery={searchText}
                      customColors={customColors}
                      onTagClick={(tag) => applyTagFilter(activeFilter === tag ? null : tag)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDeleteRevision={handleDeleteRevision}
                    />
                  ))}

                  {/* Show more / show all controls */}
                  {hasMore && (
                    <div style={{
                      display: "flex", justifyContent: "center", gap: 12,
                      padding: "16px 0",
                    }}>
                      <button
                        onClick={() => setDisplayCount((c) => c + 4)}
                        style={{
                          background: "#1C1915", border: "1px solid #2E2A24",
                          borderRadius: 8, padding: "8px 20px", cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, color: "#7A6A52", letterSpacing: "0.06em",
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = "#C9A84C44"}
                        onMouseLeave={(e) => e.target.style.borderColor = "#2E2A24"}
                      >
                        <span style={{ fontSize: 14 }}>▼</span>
                        show more ({Math.min(4, totalFiltered - displayCount)})
                      </button>
                      <button
                        onClick={() => setDisplayCount(totalFiltered)}
                        style={{
                          background: "none", border: "1px solid #2E2A24",
                          borderRadius: 8, padding: "8px 20px", cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, color: "#5C5448", letterSpacing: "0.06em",
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = "#C9A84C44"}
                        onMouseLeave={(e) => e.target.style.borderColor = "#2E2A24"}
                      >
                        show all ({totalFiltered})
                      </button>
                    </div>
                  )}

                  {/* Collapse button when showing more than 1 */}
                  {!hasMore && displayCount > 1 && totalFiltered > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                      <button
                        onClick={() => setDisplayCount(1)}
                        style={{
                          background: "none", border: "1px solid #2E2A24",
                          borderRadius: 8, padding: "8px 20px", cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, color: "#5C5448", letterSpacing: "0.06em",
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = "#C9A84C44"}
                        onMouseLeave={(e) => e.target.style.borderColor = "#2E2A24"}
                      >
                        <span style={{ fontSize: 14 }}>▲</span>
                        collapse
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer quote ── */}
            <div style={{ marginTop: 56, textAlign: "center", padding: "0 20px" }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 15, fontStyle: "italic",
                color: "#3A3428", lineHeight: 1.7, margin: 0,
              }}>
                &ldquo;You are revealed by what you consistently notice<br />
                and how you make sense of what you notice.&rdquo;
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
