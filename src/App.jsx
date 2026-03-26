import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ─── Design tokens ───────────────────────────────────────────────────────────
const SHARED = {
  serif:     "'Cormorant Garamond', Georgia, serif",
  display:   "'DM Serif Display', Georgia, serif",
  mono:      "'JetBrains Mono', monospace",
  ease:      "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
};

const THEMES = {
  dark: {
    ...SHARED,
    bg:        "#141210",
    surface:   "#1E1B18",
    border:    "#2E2924",
    text:      "#EAE4DC",
    textMuted: "#A89E92",
    textDim:   "#9C8B78",
    textFaint: "#5C4F42",
    accent:    "#C4A070",
    accentSoft:"#C4A07044",
    danger:    "#C27058",
  },
  light: {
    ...SHARED,
    bg:        "#F4EDE4",
    surface:   "#EDE5DA",
    border:    "#D4C8B8",
    text:      "#2A2420",
    textMuted: "#6E6258",
    textDim:   "#8E8072",
    textFaint: "#B8AA9A",
    accent:    "#9E7A4E",
    accentSoft:"#9E7A4E33",
    danger:    "#B85A42",
  },
};

const THEME_KEY = "mh_theme_v1";
// Backwards-compatible global T — will be overridden per render
let T = THEMES.dark;

// ─── Mobile detection ────────────────────────────────────────────────────────
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

// ─── Storage helpers ─────────────────────────────────────────────────────────
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

// ─── Data management ─────────────────────────────────────────────────────────
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
  a.download = `lucid-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

// ─── Constants ───────────────────────────────────────────────────────────────
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
    title: "Welcome to Lucid",
    body: "This is a tool for learning to notice — really notice — the world around you.",
    accent: "The way light hits a building. A stranger's gesture. The sound of rain on different surfaces.",
  },
  {
    title: "Why notice?",
    body: "Paying attention on purpose is powerful. It grounds you in the present moment, quiets anxiety, and cuts through the autopilot we all slip into. Over time, your observations become a mirror — revealing what you value, what moves you, and how you see the world.",
    accent: "Whether you're a writer, an artist, a musician, or simply someone who wants to feel more alive in their daily life — it all starts with what you choose to pay attention to.",
  },
  {
    title: "Glimpse",
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

// ─── Tag color palette ───────────────────────────────────────────────────────
const TAG_PALETTE = {
  nature:   { bg: "#1C2A22", text: "#8FBFA0", dot: "#6EA88A" },
  people:   { bg: "#261E30", text: "#B09CC8", dot: "#9484AE" },
  space:    { bg: "#1C2430", text: "#8AABC4", dot: "#7093AD" },
  emotion:  { bg: "#2E1E1E", text: "#CDA090", dot: "#B48878" },
  time:     { bg: "#2C2518", text: "#C8B08A", dot: "#B09870" },
  language: { bg: "#1C2A28", text: "#8AC0B8", dot: "#6EA8A0" },
  city:     { bg: "#28281C", text: "#B8BC88", dot: "#A0A470" },
  body:     { bg: "#2E1E26", text: "#C898AE", dot: "#B07E96" },
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

// ─── Timestamp helpers ───────────────────────────────────────────────────────
function formatRelative(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7)   return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFull(iso) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── TagColorPicker ──────────────────────────────────────────────────────────
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
    <div ref={pickerRef} className="glass" style={{
      position: "absolute", top: "100%", left: 0, marginTop: 8, zIndex: 20,
      background: T.surface + "F0", border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 12px 40px #00000044", minWidth: 180,
    }}>
      <span style={{
        fontFamily: T.serif, fontSize: 13,
        color: T.textMuted, fontStyle: "italic",
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
                width: 28, height: 28, borderRadius: "50%",
                background: c.bg, border: `2px solid ${selected ? c.dot : "transparent"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: `border-color 0.2s ${T.ease}`,
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
            background: "none", border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "5px 12px", cursor: "pointer",
            fontFamily: T.serif, fontSize: 12,
            color: T.textDim, fontStyle: "italic",
          }}
        >
          reset to default
        </button>
      )}
    </div>
  );
}

// ─── TagAnnotation (replaces TagPill — subtle colored text, not pills) ───────
function TagAnnotation({ tag, onClick, removable, customColors, mobile: mobileProp }) {
  const mobileHook = useIsMobile();
  const isMobile = mobileProp !== undefined ? mobileProp : mobileHook;
  const c = getTagColor(tag, customColors);
  return (
    <span
      onClick={onClick}
      className="filter-btn"
      title={removable ? "Remove" : `Filter by "${tag}"`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: isMobile ? "3px 0" : "2px 0",
        color: c.text + "CC",
        fontSize: 12, fontFamily: T.serif,
        fontStyle: "italic", letterSpacing: "0.02em",
        cursor: onClick ? "pointer" : "default",
        ...(isMobile ? { minHeight: 28 } : {}),
      }}
    >
      {tag}
      {removable && <span style={{ opacity: 0.4, fontSize: 11, marginLeft: 2 }}>×</span>}
    </span>
  );
}

// ─── Highlighted text (for search) ───────────────────────────────────────────
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{
            background: T.accentSoft, color: T.text,
            borderRadius: 2, padding: "0 2px",
          }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── EntryCard ───────────────────────────────────────────────────────────────
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

  const subtleBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: mobile ? "8px 10px" : "4px 6px",
    borderRadius: 6,
    fontFamily: T.serif, fontStyle: "italic",
    fontSize: mobile ? 13 : 12,
    transition: `opacity 0.2s ${T.ease}`,
    ...(mobile ? { minWidth: 36, minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center" } : {}),
  };

  if (editing) {
    return (
      <div style={{
        paddingBottom: 28, marginBottom: 8,
        borderBottom: `1px solid ${T.border}44`,
        display: "flex", flexDirection: "column", gap: 12,
        animation: `gentleIn 0.3s ${T.ease}`,
      }}>
        <textarea
          ref={editRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          rows={4}
          style={{
            width: "100%", background: "transparent", border: "none", resize: "none",
            fontFamily: T.serif,
            fontSize: 19, lineHeight: 1.7, color: T.text,
            fontWeight: 300, fontStyle: "italic", letterSpacing: "0.01em",
            outline: "none",
          }}
        />
        <div style={{
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          {editTags.map((t) => (
            <TagAnnotation key={t} tag={t} removable customColors={customColors} onClick={() => setEditTags((p) => p.filter((x) => x !== t))} />
          ))}
          <input
            value={editTagInput}
            onChange={(e) => setEditTagInput(e.target.value)}
            onKeyDown={handleEditTagKey}
            placeholder={editTags.length === 0 ? "add tags…" : ""}
            style={{
              background: "transparent", border: "none", outline: "none",
              fontFamily: T.serif, fontStyle: "italic",
              fontSize: 13, color: T.textMuted,
              width: 130, flexShrink: 0,
            }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={cancelEdit} style={{ ...subtleBtn, color: T.textDim }}>cancel</button>
            <button
              onClick={saveEdit}
              className="press"
              style={{
                background: T.accent, border: "none", borderRadius: 100,
                padding: "7px 20px", fontFamily: T.display,
                fontSize: 13, color: T.bg, cursor: "pointer",
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
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: `opacity 0.4s ${T.ease}, transform 0.4s ${T.ease}`,
      paddingBottom: 24, marginBottom: 8,
      borderBottom: `1px solid ${T.border}44`,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Observation text */}
      <p style={{
        margin: 0,
        fontFamily: T.serif,
        fontSize: 19, lineHeight: 1.75,
        color: T.text, fontWeight: 300,
        fontStyle: "italic", letterSpacing: "0.01em",
      }}>
        &ldquo;<HighlightedText text={entry.text} query={searchQuery} />&rdquo;
      </p>

      {/* Tags as subtle annotations */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {entry.tags.length > 0
          ? entry.tags.map((t) => <TagAnnotation key={t} tag={t} customColors={customColors} onClick={() => onTagClick(t)} />)
          : null
        }
      </div>

      {/* Meta row: timestamp + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          onClick={() => setShowFull((p) => !p)}
          title={formatFull(entry.createdAt)}
          style={{
            fontFamily: T.serif, fontSize: 13,
            color: T.textDim, fontStyle: "italic",
            cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
          }}
        >
          {showFull ? formatFull(entry.createdAt) : formatRelative(entry.createdAt)}
        </span>

        <span style={{ flex: 1 }} />

        <button onClick={startEdit} title="Edit" style={{ ...subtleBtn, color: T.textDim }}>edit</button>
        {confirmDelete ? (
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => onDelete(entry.id)} style={{ ...subtleBtn, color: T.danger }}>yes</button>
            <button onClick={() => setConfirmDelete(false)} style={{ ...subtleBtn, color: T.textDim }}>no</button>
          </span>
        ) : (
          <button onClick={() => setConfirmDelete(true)} title="Delete" style={{ ...subtleBtn, color: T.textDim }}>remove</button>
        )}
      </div>

      {/* Edited indicator */}
      {history.length > 0 && (
        <span
          onClick={() => setShowHistory((p) => !p)}
          style={{
            fontFamily: T.serif, fontSize: 12,
            color: T.textDim, fontStyle: "italic",
            cursor: "pointer", userSelect: "none",
          }}
        >
          edited {formatRelative(history[0].editedAt)} · {history.length} revision{history.length !== 1 ? "s" : ""} {showHistory ? "▲" : "▼"}
        </span>
      )}

      {/* Edit history */}
      {showHistory && history.map((h, i) => (
        <div key={i} style={{
          paddingLeft: 20,
          borderLeft: `2px solid ${T.border}`,
          display: "flex", flexDirection: "column", gap: 6,
          marginTop: 4,
        }}>
          <p style={{
            margin: 0, fontFamily: T.serif,
            fontSize: 15, lineHeight: 1.6, color: T.textDim,
            fontStyle: "italic", textDecoration: "line-through",
            textDecorationColor: T.textFaint,
          }}>
            &ldquo;{h.text}&rdquo;
          </p>
          {h.tags && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, opacity: 0.5 }}>
              {h.tags.map((t) => <TagAnnotation key={t} tag={t} customColors={customColors} />)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: T.serif, fontSize: 11, color: T.textDim, fontStyle: "italic" }}>
              {formatFull(h.editedAt)}
            </span>
            <button
              onClick={() => onEdit(entry.id, h.text, h.tags || entry.tags, true)}
              style={{ ...subtleBtn, color: T.accent, fontSize: 11 }}
            >
              revert
            </button>
            <button
              onClick={() => onDeleteRevision(entry.id, i)}
              style={{ ...subtleBtn, color: T.danger, fontSize: 11 }}
            >
              discard
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Save status ─────────────────────────────────────────────────────────────
function SaveBadge({ status }) {
  const styles = {
    saving: { text: "saving…",     color: T.textDim },
    saved:  { text: "saved",       color: T.textDim },
    error:  { text: "not saved",   color: T.danger },
  };
  if (!styles[status]) return null;
  return (
    <span style={{
      fontFamily: T.serif, fontStyle: "italic",
      fontSize: 12, color: styles[status].color,
      transition: `opacity 0.3s ${T.ease}`,
    }}>
      {styles[status].text}
    </span>
  );
}

// ─── Onboarding ──────────────────────────────────────────────────────────────
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
      background: T.bg, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: mobile ? "40px 28px" : "60px 40px",
    }}>
      {/* Skip */}
      <button
        onClick={complete}
        style={{
          position: "absolute", top: mobile ? 20 : 28, right: mobile ? 20 : 28,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: T.serif, fontSize: 14,
          color: T.textDim, fontStyle: "italic",
        }}
      >
        skip
      </button>

      {/* Content */}
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h2 style={{
          fontFamily: T.display,
          fontSize: mobile ? 26 : 32, color: T.text,
          fontWeight: 400, margin: "0 0 24px",
          letterSpacing: "-0.02em",
        }}>
          {current.title}
        </h2>

        <p style={{
          fontFamily: T.serif,
          fontSize: mobile ? 17 : 19, lineHeight: 1.75,
          color: T.textMuted, margin: "0 0 20px",
        }}>
          {current.body}
        </p>

        {current.accent && (
          <p style={{
            fontFamily: T.serif,
            fontSize: mobile ? 15 : 16, fontStyle: "italic",
            color: T.accent, lineHeight: 1.7, margin: 0,
            opacity: 0.85,
          }}>
            {current.accent}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        position: "absolute", bottom: mobile ? 48 : 64,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
      }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <span
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 20 : 5, height: 5,
                borderRadius: 3, cursor: "pointer",
                background: i === slide ? T.accent : T.border,
                transition: `all 0.3s ${T.ease}`,
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {slide > 0 && (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="press"
              style={{
                background: "none", border: `1px solid ${T.border}`,
                borderRadius: 100, padding: "11px 28px", cursor: "pointer",
                fontFamily: T.display, fontSize: 14, color: T.textDim,
              }}
            >
              back
            </button>
          )}
          <button
            onClick={isLast ? complete : () => setSlide((s) => s + 1)}
            className="press"
            style={{
              background: isLast ? T.accent : "none",
              border: isLast ? "none" : `1px solid ${T.accentSoft}`,
              borderRadius: 100, padding: "11px 32px", cursor: "pointer",
              fontFamily: T.display, fontSize: 14,
              color: isLast ? T.bg : T.accent,
            }}
          >
            {isLast ? "begin" : "next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings panel (iOS sheet on mobile) ────────────────────────────────────
function SettingsPanel({ onClose, onReset, onImport, onReplayOnboarding, theme, onToggleTheme }) {
  const mobile = useIsMobile();
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef(null);

  const rowBtn = {
    background: "none", border: "none", width: "100%",
    padding: "16px 0", cursor: "pointer", textAlign: "left",
    fontFamily: T.serif, fontSize: 15, color: T.textMuted,
    fontStyle: "italic", borderBottom: `1px solid ${T.border}44`,
    transition: `color 0.2s ${T.ease}`,
  };

  return (
    <div className="glass" style={{
      position: "fixed", inset: 0, zIndex: 90,
      background: "#1A1816BB",
      display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center",
      padding: mobile ? 0 : 40,
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: mobile ? "24px 24px 0 0" : 20,
        padding: mobile ? "8px 24px 40px" : "8px 32px 32px",
        maxWidth: 400, width: "100%",
        display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 40px #00000030",
        animation: `sheetUp 0.3s ${T.ease}`,
      }}>
        {/* Handle bar (mobile) */}
        {mobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{
            margin: 0, fontFamily: T.display,
            fontSize: 20, color: T.text, fontWeight: 400,
          }}>
            Settings
          </h2>
          {!mobile && (
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: T.serif, fontSize: 18, color: T.textDim,
            }}>×</button>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={onToggleTheme} style={rowBtn}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <button onClick={() => { exportData(); }} style={rowBtn}>
          Export backup
        </button>

        <button onClick={() => fileInputRef.current?.click()} style={rowBtn}>
          Import from backup
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

        <button onClick={() => { onReplayOnboarding(); onClose(); }} style={rowBtn}>
          Replay intro
        </button>

        {/* Reset */}
        <div style={{ paddingTop: 16, marginTop: 8 }}>
          {confirmReset ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{
                margin: 0, fontFamily: T.serif,
                fontSize: 14, color: T.danger, fontStyle: "italic", lineHeight: 1.6,
              }}>
                This will permanently delete all observations, tags, and settings.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { onReset(); onClose(); }} className="press" style={{
                  background: T.danger, border: "none",
                  borderRadius: 100, padding: "9px 20px", cursor: "pointer",
                  fontFamily: T.display, fontSize: 13, color: T.bg,
                }}>
                  delete everything
                </button>
                <button onClick={() => setConfirmReset(false)} className="press" style={{
                  background: "none", border: `1px solid ${T.border}`,
                  borderRadius: 100, padding: "9px 20px", cursor: "pointer",
                  fontFamily: T.display, fontSize: 13, color: T.textDim,
                }}>
                  cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={{
              ...rowBtn, color: T.danger, borderBottom: "none",
            }}>
              Reset all data
            </button>
          )}
        </div>

        {/* Close button for mobile */}
        {mobile && (
          <button onClick={onClose} className="press" style={{
            marginTop: 12, background: "none", border: `1px solid ${T.border}`,
            borderRadius: 100, padding: "12px 0", cursor: "pointer",
            fontFamily: T.display, fontSize: 14, color: T.textDim,
            width: "100%",
          }}>
            close
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Milestone banner ────────────────────────────────────────────────────────
function MilestoneBanner({ message }) {
  if (!message) return null;
  return (
    <div className="glass" style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      zIndex: 50, background: T.surface + "EE", border: `1px solid ${T.accentSoft}`,
      borderRadius: 100, padding: "12px 28px",
      boxShadow: "0 8px 32px #00000044",
      display: "flex", alignItems: "center", gap: 10,
      animation: `fadeInUp 0.4s ${T.ease}`,
      maxWidth: "calc(100vw - 32px)",
    }}>
      <span style={{
        fontFamily: T.serif,
        fontSize: 15, fontStyle: "italic",
        color: T.text, lineHeight: 1.4,
      }}>
        {message}
      </span>
    </div>
  );
}

// ─── GraphView ───────────────────────────────────────────────────────────────
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

    tags.forEach((tag) => {
      const id = `tag:${tag}`;
      tagIdMap[tag] = id;
      const c = getTagColor(tag, customColors);
      const r = 14 + (tagCounts[tag] / maxCount) * 16;
      nodes.push({ id, type: "tag", label: tag, color: c, radius: r, x: 0, y: 0, vx: 0, vy: 0, pinned: false });
    });

    entries.forEach((entry) => {
      const id = `entry:${entry.id}`;
      const primaryTag = entry.tags[0];
      const c = primaryTag ? getTagColor(primaryTag, customColors) : { bg: T.border, text: T.textDim, dot: T.textDim };
      nodes.push({ id, type: "entry", label: entry.text, tags: entry.tags, color: c, radius: 5, x: 0, y: 0, vx: 0, vy: 0, pinned: false });

      entry.tags.forEach((tag) => {
        edges.push({ source: id, target: tagIdMap[tag] });
      });
    });

    return { nodes, edges, tags };
  }, [entries, customColors]);

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

  const tick = useCallback(() => {
    if (!simRef.current) return;
    const { alpha, nodeMap } = simRef.current;
    if (alpha < 0.001) return;

    const nodes = graph.nodes;
    const edges = graph.edges;

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

    nodes.forEach((n) => {
      if (n.pinned) return;
      n.vx *= 0.88;
      n.vy *= 0.88;
      n.x += n.vx;
      n.y += n.vy;
    });

    simRef.current.alpha *= 0.997;
  }, [graph]);

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

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panOffset.x * dpr, panOffset.y * dpr);

    const hoverConnected = new Set();
    if (hover) {
      graph.edges.forEach(({ source, target }) => {
        if (source === hover.id || target === hover.id) {
          hoverConnected.add(source);
          hoverConnected.add(target);
        }
      });
    }

    graph.edges.forEach(({ source, target }) => {
      const a = nodeMap[source], b = nodeMap[target];
      if (!a || !b) return;
      const connected = hover && (hoverConnected.has(source) && hoverConnected.has(target));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = connected ? (b.type === "tag" ? b.color.dot + "88" : a.color.dot + "88") : T.border + "40";
      ctx.lineWidth = connected ? 1.5 : 0.5;
      ctx.stroke();
    });

    graph.nodes.forEach((node) => {
      const isHovered = hover && hover.id === node.id;
      const isConnected = hover && hoverConnected.has(node.id);
      const dimmed = hover && !isHovered && !isConnected;

      if (node.type === "tag") {
        const r = node.radius;
        ctx.font = `italic 12px 'Cormorant Garamond', serif`;
        const labelW = ctx.measureText(node.label).width;
        const pillW = labelW + 24;
        const pillH = r * 1.4;
        const pillR = pillH / 2; // fully rounded ends

        ctx.save();
        ctx.shadowBlur = isHovered ? 16 : 6;
        ctx.shadowColor = node.color.dot + (dimmed ? "08" : "22");

        ctx.beginPath();
        ctx.roundRect(node.x - pillW / 2, node.y - pillH / 2, pillW, pillH, pillR);

        ctx.fillStyle = dimmed ? node.color.bg + "44" : node.color.bg;
        ctx.fill();
        ctx.strokeStyle = dimmed ? node.color.dot + "18" : node.color.dot + "44";
        ctx.lineWidth = isHovered ? 1.5 : 0.5;
        ctx.stroke();
        ctx.restore();

        ctx.font = `italic 12px 'Cormorant Garamond', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = dimmed ? node.color.text + "33" : node.color.text;
        ctx.fillText(node.label, node.x, node.y);
        ctx.textBaseline = "alphabetic";
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = dimmed ? node.color.dot + "15" : (isHovered || isConnected) ? node.color.dot + "BB" : node.color.dot + "55";
        ctx.fill();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = T.accent + "66";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });

    if (hover && hover.type === "entry") {
      const canvasW = canvas.width / dpr;
      const canvasH = canvas.height / dpr;
      const text = hover.label.length > 90 ? hover.label.slice(0, 90) + "…" : hover.label;
      const maxWidth = Math.min(220, canvasW * 0.6);
      ctx.font = `italic 14px 'Cormorant Garamond', serif`;

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

      let bx = hover.x + 15;
      let by = hover.y - boxH / 2;

      const screenRight = (bx + boxW) * zoom + panOffset.x;
      const screenBottom = (by + boxH) * zoom + panOffset.y;
      if (screenRight > canvasW) bx = hover.x - boxW - 10;
      if (screenBottom > canvasH) by = hover.y - boxH;
      if ((by * zoom + panOffset.y) < 0) by = hover.y + 10;

      ctx.fillStyle = T.surface + "EE";
      ctx.strokeStyle = T.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = T.text;
      ctx.textAlign = "left";
      lines.forEach((l, i) => {
        ctx.fillText(l, bx + pad, by + pad + 12 + i * lineHeight);
      });
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `italic 11px 'Cormorant Garamond', serif`;
    ctx.fillStyle = T.textDim;
    ctx.textAlign = "left";
    const tagCount = graph.nodes.filter((n) => n.type === "tag").length;
    const entryCount = graph.nodes.filter((n) => n.type === "entry").length;
    ctx.fillText(`${entryCount} entries · ${tagCount} tags`, 16, h - 14);
  }, [graph]);

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

  useEffect(() => {
    simRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      initPositions(canvas.width / dpr, canvas.height / dpr);
    }
  }, [entries.length, initPositions]);

  const hitTest = useCallback((sx, sy) => {
    const { panOffset, zoom } = interRef.current;
    const wx = (sx - panOffset.x) / zoom;
    const wy = (sy - panOffset.y) / zoom;
    for (let i = graph.nodes.length - 1; i >= 0; i--) {
      const n = graph.nodes[i];
      const dx = wx - n.x, dy = wy - n.y;
      if (n.type === "tag") {
        // Pill hit test — rectangular with padding
        const hw = Math.max(n.radius, 30) + 12;
        const hh = n.radius * 0.7 + 4;
        if (Math.abs(dx) < hw && Math.abs(dy) < hh) return n;
      } else {
        const hitRadius = n.radius + 6;
        if (dx * dx + dy * dy < hitRadius * hitRadius) return n;
      }
    }
    return null;
  }, [graph]);

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
    const wx = (pos.x - panOffset.x) / zoom;
    const wy = (pos.y - panOffset.y) / zoom;
    interRef.current.zoom = newZoom;
    interRef.current.panOffset = {
      x: pos.x - wx * newZoom,
      y: pos.y - wy * newZoom,
    };
  };

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
        borderRadius: 20, overflow: "hidden",
        background: T.bg, position: "relative",
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
        position: "absolute", top: 14, right: 14,
        fontFamily: T.serif, fontSize: 11,
        color: T.textDim, fontStyle: "italic",
        background: T.surface + "CC", padding: "6px 14px", borderRadius: 100,
        pointerEvents: "none",
      }}>
        drag · scroll to zoom · double-click tag to filter
      </div>
    </div>
  );
}

// ─── TimeFilterBar ───────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function TimeFilterBar({ timeFilter, setTimeFilter, setDisplayCount, entries }) {
  const mobile = useIsMobile();
  const [popup, setPopup] = useState(null);
  const longPressTimer = useRef(null);
  const popupRef = useRef(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const availableYears = [...new Set(entries.map((e) => new Date(e.createdAt).getFullYear()))].sort((a, b) => b - a);

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

  const monthKey = `month:${currentMonth}:${currentYear}`;
  const yearKey = `year:${currentYear}`;

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
    padding: mobile ? "7px 16px" : "5px 14px", borderRadius: 100,
    border: "none",
    background: active ? T.accentSoft : "transparent",
    color: active ? T.accent : T.textDim,
    fontFamily: T.serif, fontStyle: "italic",
    fontSize: 13, cursor: "pointer",
    whiteSpace: "nowrap",
    transition: `all 0.2s ${T.ease}`,
  });

  const popupStyle = {
    position: "absolute", top: "100%", left: 0, marginTop: 8, zIndex: 20,
    background: T.surface + "F0", border: `1px solid ${T.border}`,
    borderRadius: 16, padding: "12px 14px",
    display: "flex", flexWrap: "wrap", gap: 6,
    boxShadow: "0 12px 40px #00000044", minWidth: 160, maxWidth: 280,
  };

  return (
    <div className="controls-row" style={{ marginBottom: 20 }}>
      <button className="filter-btn" onClick={() => apply("all")} style={btnStyle(timeFilter === "all")}>
        all time
      </button>
      <button className="filter-btn" onClick={() => apply("today")} style={btnStyle(timeFilter === "today")}>
        today
      </button>
      <button className="filter-btn" onClick={() => apply("week")} style={btnStyle(timeFilter === "week")}>
        this week
      </button>

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
                  style={{ ...btnStyle(active), padding: "3px 10px", fontSize: 12 }}
                >
                  {MONTH_SHORT[month]} {year}
                </button>
              );
            })}
          </div>
        )}
      </span>

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
                  style={{ ...btnStyle(active), padding: "3px 10px", fontSize: 12 }}
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

// ─── ControlsDrawer (search + filters, hidden by default) ────────────────────
function ControlsDrawer({ open, searchText, setSearchText, allTags, activeFilter, setActiveFilter, timeFilter, setTimeFilter, setDisplayCount, entries, customColors, colorMode, setColorMode, colorPickerTag, setColorPickerTag, handleTagColorSelect, mobile }) {
  if (!open) return null;

  return (
    <div style={{
      animation: `gentleIn 0.25s ${T.ease}`,
      marginBottom: 24,
    }}>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setDisplayCount(1); }}
          placeholder="search…"
          style={{
            width: "100%", background: "transparent",
            border: "none", borderBottom: `1px solid ${T.border}`,
            padding: "10px 0", fontFamily: T.serif, fontStyle: "italic",
            fontSize: 15, color: T.text,
            outline: "none", transition: `border-color 0.25s ${T.ease}`,
          }}
          onFocus={(e) => e.target.style.borderColor = T.accent}
          onBlur={(e) => e.target.style.borderColor = T.border}
        />
        {searchText && (
          <button
            onClick={() => { setSearchText(""); setDisplayCount(1); }}
            style={{
              position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: T.serif, fontSize: 16, color: T.textDim,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="controls-row" style={{ marginBottom: 14 }}>
          <button
            onClick={() => { setColorMode((p) => !p); setColorPickerTag(null); }}
            title={colorMode ? "Exit color mode" : "Customize colors"}
            style={{
              background: "none", border: "none", borderRadius: 6,
              padding: "2px 4px", cursor: "pointer",
              fontFamily: T.serif, fontSize: 13,
              color: colorMode ? T.accent : T.textDim,
              fontStyle: "italic",
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
                      setActiveFilter(tag);
                    }
                  }}
                  style={{
                    padding: mobile ? "5px 12px" : "4px 10px", borderRadius: 100,
                    border: "none",
                    background: active ? (c ? c.bg + "AA" : T.accentSoft) : "transparent",
                    color: active ? (c ? c.text : T.accent) : T.textDim,
                    fontFamily: T.serif, fontStyle: "italic",
                    fontSize: 13, cursor: "pointer",
                    outline: colorMode && tag ? `1px dashed ${T.accentSoft}` : "none",
                    outlineOffset: 2,
                  }}
                >
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

      {/* Time filters */}
      <TimeFilterBar timeFilter={timeFilter} setTimeFilter={setTimeFilter} setDisplayCount={setDisplayCount} entries={entries} />

      {/* Search result count */}
      {searchText.trim() && (
        <p style={{
          fontFamily: T.serif, fontSize: 13,
          color: T.textDim, fontStyle: "italic", marginBottom: 8,
        }}>
          {entries.length} result{entries.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const mobile = useIsMobile();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "dark"; } catch (_) { return "dark"; }
  });

  // Update global T and body whenever theme changes
  T = THEMES[theme] || THEMES.dark;
  useEffect(() => {
    document.body.style.background = T.bg;
    document.body.style.color = T.text;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", T.bg);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };

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
  const [viewMode,     setViewMode]     = useState("list");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showControls,   setShowControls]   = useState(false);
  const [milestoneMsg,   setMilestoneMsg]   = useState(null);
  const textareaRef = useRef(null);
  const nextId      = useRef(1);

  useEffect(() => {
    const saved = loadEntries();
    const savedId = loadNextId();
    if (saved && saved.length > 0) {
      const migrated = saved.map((e) => ({ ...e, history: e.history || [] }));
      setEntries(migrated);
      setVisibleIds(new Set(migrated.map((e) => e.id)));
      nextId.current = savedId ?? (Math.max(...migrated.map((e) => e.id)) + 1);
    }
    if (!localStorage.getItem(FIRST_USE_KEY)) {
      localStorage.setItem(FIRST_USE_KEY, new Date().toISOString());
    }
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
    setLoaded(true);
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

  // Filtering
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

  if (!loaded) return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <p style={{
        fontFamily: T.serif, fontStyle: "italic",
        fontSize: 18, color: T.textDim,
      }}>
        loading…
      </p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 80 }}>

      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onReset={handleReset}
          onImport={handleImport}
          onReplayOnboarding={() => setShowOnboarding(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      <MilestoneBanner message={milestoneMsg} />

      {/* ── Header — minimal, just title and essentials ── */}
      <header className="glass" style={{
        padding: mobile ? "14px 20px" : "16px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: T.bg + "DD", zIndex: 10,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: T.display,
            fontSize: 20, color: T.text, fontWeight: 400,
            letterSpacing: "-0.02em",
          }}>
            lucid
          </h1>
          <p style={{
            margin: "2px 0 0", fontFamily: T.serif,
            fontSize: 12, color: T.textDim, fontStyle: "italic",
            letterSpacing: "0.04em",
          }}>
            glimpse
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Search/filter toggle */}
          <button
            onClick={() => setShowControls((p) => !p)}
            className="press"
            style={{
              background: showControls ? T.accentSoft : "none",
              border: "none", borderRadius: 100,
              padding: "7px 12px", cursor: "pointer",
              fontFamily: T.serif, fontSize: 14, fontStyle: "italic",
              color: showControls ? T.accent : T.textDim,
            }}
          >
            {showControls ? "close" : "filter"}
          </button>

          {/* View toggle */}
          <button
            onClick={() => setViewMode(viewMode === "list" ? "graph" : "list")}
            className="press"
            style={{
              background: "none", border: "none",
              padding: "7px 12px", cursor: "pointer",
              fontFamily: T.serif, fontSize: 14, fontStyle: "italic",
              color: T.textDim,
            }}
          >
            {viewMode === "list" ? "map" : "list"}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="press"
            style={{
              background: "none", border: "none",
              padding: "7px 10px", cursor: "pointer",
              fontSize: 14, color: T.textDim,
            }}
          >
            ⚙
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: mobile ? "28px 20px 0" : "48px 24px 0" }}>

        {/* ── Capture zone — open, inviting, no box ── */}
        <div style={{ marginBottom: mobile ? 36 : 48 }}>
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
            placeholder="What are you noticing?"
            rows={mobile ? 2 : 3}
            style={{
              width: "100%", background: "transparent", border: "none", resize: "none",
              fontFamily: T.serif,
              fontSize: mobile ? 20 : 22, lineHeight: 1.75, color: T.text,
              fontWeight: 300,
              fontStyle: text.length > 0 ? "italic" : "normal",
              letterSpacing: "0.01em",
              ...(mobile ? { minHeight: 60, overflow: "hidden" } : {}),
            }}
          />

          {/* Tags + submit — appears when there's text */}
          <div style={{
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
            marginTop: 8,
            opacity: text.trim() ? 1 : 0.4,
            transition: `opacity 0.3s ${T.ease}`,
          }}>
            {pendingTags.map((t) => (
              <TagAnnotation
                key={t} tag={t} removable customColors={customColors}
                onClick={() => setPendingTags((p) => p.filter((x) => x !== t))}
              />
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              placeholder={pendingTags.length === 0 ? "tags…" : ""}
              style={{
                background: "transparent", border: "none",
                fontFamily: T.serif, fontStyle: "italic",
                fontSize: 13, color: T.textMuted,
                width: pendingTags.length > 0 ? 100 : 60, flexShrink: 0,
              }}
            />

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <SaveBadge status={saveStatus} />
              <button
                className="submit-btn press"
                onClick={handleSubmit}
                disabled={!text.trim()}
                style={{
                  background: text.trim() ? T.accent : "transparent",
                  border: text.trim() ? "none" : `1px solid ${T.border}`,
                  borderRadius: 100,
                  padding: mobile ? "9px 24px" : "8px 22px",
                  fontFamily: T.display,
                  fontSize: 14,
                  color: text.trim() ? T.bg : T.textDim,
                  cursor: text.trim() ? "pointer" : "default",
                  ...(mobile ? { minHeight: 40 } : {}),
                }}
              >
                {mobile ? "capture" : "capture ⌘↵"}
              </button>
            </div>
          </div>

          {/* Subtle divider */}
          <div style={{
            marginTop: 24,
            height: 1,
            background: `linear-gradient(to right, transparent, ${T.border}, transparent)`,
          }} />
        </div>

        {viewMode === "graph" ? (
          <GraphView
            entries={entries}
            customColors={customColors}
            onTagClick={(tag) => {
              setActiveFilter(tag);
              setViewMode("list");
            }}
          />
        ) : (
          <>
            {/* ── Controls drawer ── */}
            <ControlsDrawer
              open={showControls}
              searchText={searchText}
              setSearchText={setSearchText}
              allTags={allTags}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              setDisplayCount={setDisplayCount}
              entries={entries}
              customColors={customColors}
              colorMode={colorMode}
              setColorMode={setColorMode}
              colorPickerTag={colorPickerTag}
              setColorPickerTag={setColorPickerTag}
              handleTagColorSelect={handleTagColorSelect}
              mobile={mobile}
            />

            {/* Active filter indicator */}
            {(activeFilter || timeFilter !== "all") && !showControls && (
              <div style={{
                display: "flex", gap: 8, alignItems: "center", marginBottom: 16,
                fontFamily: T.serif, fontSize: 13, fontStyle: "italic", color: T.textDim,
              }}>
                {activeFilter && (
                  <span>
                    {activeFilter}
                    <button onClick={() => setActiveFilter(null)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: T.textDim, fontFamily: T.serif, fontSize: 13, marginLeft: 4,
                    }}>×</button>
                  </span>
                )}
                {timeFilter !== "all" && (
                  <span>
                    {timeFilter === "today" ? "today" : timeFilter === "week" ? "this week" : timeFilter}
                    <button onClick={() => setTimeFilter("all")} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: T.textDim, fontFamily: T.serif, fontSize: 13, marginLeft: 4,
                    }}>×</button>
                  </span>
                )}
              </div>
            )}

            {/* ── Entries ── */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {totalFiltered === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: T.textDim }}>
                  <p style={{ fontFamily: T.display, fontSize: 20, fontStyle: "italic", margin: 0 }}>
                    {searchText ? `Nothing matching "${searchText}".`
                      : activeFilter ? `No observations tagged "${activeFilter}" yet.`
                      : timeFilter !== "all" ? "Nothing in this period."
                      : "Your journal is empty."}
                  </p>
                  <p style={{ fontFamily: T.serif, fontSize: 14, marginTop: 8, fontStyle: "italic" }}>
                    {searchText ? "Try a different search."
                      : "Look around you. What catches your attention?"}
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
                      onTagClick={(tag) => setActiveFilter(activeFilter === tag ? null : tag)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDeleteRevision={handleDeleteRevision}
                    />
                  ))}

                  {hasMore && (
                    <div style={{
                      display: "flex", justifyContent: "center", gap: 14,
                      padding: "20px 0",
                    }}>
                      <button
                        onClick={() => setDisplayCount((c) => c + 4)}
                        className="press"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: T.serif, fontSize: 14, fontStyle: "italic",
                          color: T.textMuted,
                        }}
                      >
                        more ({Math.min(4, totalFiltered - displayCount)})
                      </button>
                      <span style={{ color: T.textFaint }}>·</span>
                      <button
                        onClick={() => setDisplayCount(totalFiltered)}
                        className="press"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: T.serif, fontSize: 14, fontStyle: "italic",
                          color: T.textDim,
                        }}
                      >
                        all ({totalFiltered})
                      </button>
                    </div>
                  )}

                  {!hasMore && displayCount > 1 && totalFiltered > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                      <button
                        onClick={() => setDisplayCount(1)}
                        className="press"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: T.serif, fontSize: 14, fontStyle: "italic",
                          color: T.textDim,
                        }}
                      >
                        collapse
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{ marginTop: 48, textAlign: "center", padding: "0 20px" }}>
              <p style={{
                fontFamily: T.serif,
                fontSize: 14, fontStyle: "italic",
                color: T.textFaint, lineHeight: 1.8, margin: 0,
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
