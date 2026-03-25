# Metaphor Hunter — Vision Document

*Session 1 — March 25, 2026*

---

## What Is This?

Metaphor Hunter is an app for cultivating conscious observation. Not a note-taking tool — a skill-building tool. The core premise is that how you see the world can be trained, and that training begins with deliberately noticing what catches your attention and putting it into words.

The app guides users through a progression:
1. **Notice** — capture observations from daily life
2. **Reflect** — recognize patterns in what you notice
3. **Understand** — AI-assisted insight into your attention patterns

Each step unlocks only after the user has genuinely developed the skill of the previous one.

---

## Why This Matters

### For Everyone
Paying attention on purpose is a form of mindfulness. It grounds you in the present, quiets the autopilot, and over time reveals what you value, what moves you, and how you see the world. Documenting observations creates a mirror — a record of your inner life that's more honest than a journal because it captures what you *noticed*, not what you *thought you should write about*.

### For Creatives
- **Writers** find characters in strangers' gestures, worlds in the way light hits a building
- **Visual artists** discover palettes in rust and shadow, compositions in everyday scenes
- **Musicians** hear rhythm in footsteps, melody in conversation cadence

### For Self-Understanding
Over time, your observations reveal patterns you can't see in the moment. What you consistently notice says something about who you are and where you're at. This is the foundation for the Reflect and Understand phases.

---

## Design Philosophy

### No Defaults
There are no default tags, no seed entries, no suggested categories. Every user builds their own vocabulary for attention. Defaults would steer observation in predetermined directions and undermine the entire point.

### Skill-Building Over Automation
The user should develop the ability to notice patterns *before* AI does it for them. AI is a validation and extension tool, not a replacement for the skill. If we feed insights to users before they've learned to find them, we've built a crutch, not a tool.

### Gentle Over Gamified
No XP bars, no badges, no streaks. Observation should feel contemplative, not performative. Milestones are quiet acknowledgments: "Ten observations. A habit is taking shape." The motivation should come from the practice itself, not from a reward loop.

### Organic Over Forced
Nothing in the app should make the user feel like they're completing a task. Gamified prompts are fine if they feel like invitations, not obligations. The moment observation feels like homework, it stops working.

### Personal and Private
Observations are deeply personal. The app should feel like a private space. Any future integrations (AI, cross-app connections) must be opt-in and instantly reversible.

---

## What We Built Today (Session 1)

### Core Functionality
- **Observation capture** — free-text textarea with auto-grow on mobile
- **Free-form tagging** — type a tag, press Enter. No presets. Users build their own taxonomy
- **Tag color system** — 8 base palette colors, auto-assigned by keyword or hash. Customizable per tag via a color picker (✦ button toggles customize mode)
- **Edit with version history** — inline editing, previous versions stored with timestamps. Revert to any version or discard old versions
- **Delete with confirmation** — two-step delete to prevent accidents
- **Search** — full-text search across observation text and tag names, with highlighted matches in results
- **Persistent storage** — all data in localStorage, persists across sessions

### Views & Filtering
- **Collapsed list view** — shows only the latest observation by default. "Show more" loads 4 more, "Show all" expands everything, "Collapse" returns to 1
- **Tag filters** — filter by any tag, stackable with time and search filters
- **Time filters** — today, this week, current month (long-press for any month), current year (long-press for any year). Duration filter persists across tag changes
- **Graph view** — Obsidian-inspired force-directed graph. Tag nodes are diamonds, observation nodes are circles. Tags that share observations naturally cluster. Drag, zoom, pan, pinch-to-zoom on mobile. Hover for tooltips, double-click a tag to jump to filtered list view

### Onboarding
- 6-slide sequence explaining the app's purpose and philosophy
- Skippable, replayable from settings
- Leads with mindfulness and self-discovery, includes creative use cases without alienating non-artists
- Auto-triggers on first launch

### Progress
- Milestone banners at 1, 5, 10, 25, 50 observations
- Gentle language, auto-dismiss after 5 seconds
- No points, badges, or competitive framing

### Data Management
- **Export** — download full JSON backup
- **Import** — restore from backup file
- **Reset** — two-step confirmation, clears everything, re-triggers onboarding

### Mobile / PWA
- Responsive design with `useIsMobile()` hook — separate layouts for desktop (>600px) and mobile (≤600px)
- Mobile: compact header, auto-grow textarea, larger tap targets, horizontally scrolling filter rows, safe area handling
- Desktop: original spacious layout with keyboard shortcuts (⌘↵)
- PWA manifest + service worker for installability and offline support
- SVG app icon (diamond motif)

### Technical Stack
- **Vite + React** (no TypeScript)
- **Inline styles** (no CSS framework beyond a minimal index.css)
- **No external dependencies** beyond React — graph view is pure Canvas, force simulation is custom
- **localStorage** for all persistence
- **Google Fonts**: Cormorant Garamond (body text), DM Serif Display (headings), JetBrains Mono (UI/labels)

---

## Where We're Going

### Next Session (Tomorrow)

1. **Git + GitHub** — initialize repo, first commit, push
2. **Deploy to Vercel/Netlify** — real HTTPS URL for proper PWA install + sharing
3. **Polish pass** — full phone walkthrough after fresh reset, fix rough edges
4. **"Reflect" unlock gate** — define the formula (observation count + tag variety + duration). Add a locked "step 2" indicator
5. **Reflection exercises** — show 3-4 random entries side by side, ask "what connects these?", free-text answer becomes a suggested tag. This is the core skill-building mechanic of Step 2
6. **Brainstorm app names** — "Metaphor Hunter" is personally meaningful but may not convey the intention to new users. Explore alternatives that communicate conscious observation, noticing, attention training

### Medium Term

7. **AI integration (Step 3)** — analyze observation patterns, suggest tags (sense-based, mood-based, thematic). Research: which model, billing, free tier limits. Key constraint: AI extends the user's reflection, never replaces it
8. **Multimedia observations** — photo capture from the app (describe what was worth photographing: colors, composition, subject). Audio recording (sounds, ambience). These expand the types of attention the app trains
9. **Personalized backgrounds** — user's own photos as app backgrounds, rotating daily
10. **"Note/Sound of the day"** — surface a random past observation or recorded sound on app open as a reflection prompt

### Long Term Vision

11. **Cross-app integration layer** — opt-in connections to external trackers:
    - **Habit/mood trackers** — correlate observation patterns with emotional states
    - **Media consumption** (Goodreads, Letterboxd, Trakt, etc.) — "your observations shifted after you read X"
    - **Productivity tools** — connections between creative output and observation habits

    This enables emergent self-knowledge: insights that no single app can surface. The AI (or the user themselves, ideally) finds connections between moods, media, observations, and goals.

    **The potential benefits are genuinely powerful:**

    - **Emergent self-knowledge** — the most interesting insights about ourselves come from unexpected connections. "I notice more nature on days I feel anxious" or "My observations got sharper the week after I read that Murakami book" — these are things no single app can surface, but a connected system could.
    - **The AI becomes a mirror, not a tracker** — instead of "you watched 3 movies this week" (boring data), it says "you keep gravitating toward stories about isolation right after your most socially observant weeks" (genuine insight).
    - **Observations gain context** — a note about light through a window hits differently when the system knows you wrote it the morning after a sleepless night vs. after a vacation.

    **The pitfalls are equally real and must be designed around carefully:**

    - **Over-interpretation** — AI drawing connections that aren't there, or that feel invasive. "You watched a sad movie and wrote a melancholy note" might be coincidence, not causation. The system needs to suggest, never assert.
    - **Contamination of the observation practice** — if users know their notes are being cross-referenced with habits and moods, they might self-censor or perform for the system. The observation space needs to feel sacred and private first. This is perhaps the biggest risk — the moment someone writes an observation while thinking "I wonder what the AI will connect this to," the practice is compromised.
    - **Scope creep** — this vision is essentially "a second brain with AI." That's a massive product. The core — learning to notice — must be rock-solid before any of this gets built. If the observation tool isn't compelling on its own, no amount of integrations will save it.
    - **Privacy** — connecting Letterboxd, Goodreads, etc. means API keys, OAuth, data storage. The moment you store someone's reading habits alongside their private observations, the trust bar goes way up. A data breach here isn't just embarrassing — it's intimate.

    **Recommendation:** Build it as an opt-in "connections" layer that sits *on top* of an already complete observation practice. The user should have months of notes before they ever see a prompt saying "want to connect your other tools?" And the disconnect should be instant and complete — with the option to delete all cross-referenced data.

    **Critical guardrails (summary):**
    - Opt-in only, presented after months of established observation practice
    - Instant disconnect with option to delete all cross-referenced data
    - AI suggests, never asserts — correlation is not causation
    - The observation space must feel private and uncontaminated by external data
    - User controls what's connected and can separate at any time if notes feel influenced

12. **Community features (maybe)** — anonymous sharing of observations, collaborative pattern-finding. Only if it can be done without making the practice performative.

---

## App Name Brainstorm (To Explore)

Current: **Metaphor Hunter** — evocative, personal, but potentially confusing. "Metaphor" implies literary focus. "Hunter" implies aggression.

Directions to explore:
- Attention/noticing: what names convey "paying attention on purpose"?
- Observation journal: but without sounding clinical
- The mirror metaphor: your observations reflect you
- Something simple and warm that works as a verb ("I'm going to ___ this")

*To be discussed next session.*

---

*This document will be updated as the project evolves.*
