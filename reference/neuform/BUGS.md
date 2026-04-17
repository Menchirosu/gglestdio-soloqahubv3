# Pre-redesign Bug Audit

**Date:** 2026-04-17
**Scope:** `src/App.tsx`, 4 uncommitted screens (`OverviewScreen`, `QueueScreen`, `SignalsScreen`, `ContributeScreen`), supporting firebase/hooks.
**Method:** Static reading + `tsc --noEmit` (passes clean). No runtime navigation performed — will add to PR 0 smoke tests.

## Triage key

- **P0** — Blocks redesign (crash, data loss, auth regression, build failure). Fix NOW.
- **P1** — User-visible functional issue that redesign will NOT inherently fix. Fold into relevant screen PR.
- **P2** — Polish / tech debt. Punt to PR 7 unless trivial.
- **N** — Redesign rewrites this code path. Log, do not fix.

---

## P0 — Blocks redesign

**None found.** `tsc --noEmit` passes. No crash-loop, no auth gate break, no Firestore listener leak detected statically.

---

## P1 — Fold into screen PRs

### P1-1 · QueueScreen selection doesn't sync with external `selectedItemId`
- **File:** `src/screens/QueueScreen.tsx:312-315`
- **Detail:** Initial selection pulled from `selectedItemId` via `useState` initializer; never re-reads when the prop changes. When a user clicks a search result that sets `selectedItemId` globally, Queue opens but doesn't highlight the bug.
- **Expected in:** PR 3 (Queue redesign) — the redesign will rebuild selection state against a controlled-prop pattern anyway. Fold the sync into that PR.

### P1-2 · Notifications dropdown backdrop at low z-index
- **File:** `src/App.tsx:483-484`
- **Detail:** `<div className="fixed inset-0 z-10" onClick={close}>` sits inside `.relative` container with notifications panel at z-20. Elsewhere on the page, `fixed` elements with z-30+ (mobile bottom nav at z-30, search backdrop at z-55) can paint over or swallow clicks intended for the backdrop.
- **Expected in:** PR 1 (foundation) — the Lumie shell rewrites the topbar anyway; do z-index audit at that time.

### P1-3 · `useMemo` dep lists compute `now` outside closure in Queue
- **File:** `src/screens/QueueScreen.tsx:317,333-353`
- **Detail:** `const now = Date.now()` lives OUTSIDE the `useMemo`, but the memo depends on `[filteredBugs, activeFilter, now]`. Since `now` is recomputed on every render, the memo effectively never hits cache. `SignalsScreen.tsx:171-172` correctly keeps `now` inside the memo — Queue deviates.
- **Expected in:** PR 3 (Queue redesign) — either fold `now` into the memo closure OR stabilize via `useRef`.

---

## P2 — Punt to polish PR (PR 7) unless trivial

### P2-1 · Dead custom `ChevronRight` SVG in OverviewScreen
- **File:** `src/screens/OverviewScreen.tsx:256-262`
- **Detail:** Inline `<svg>` component duplicates `lucide-react`'s `ChevronRight` used elsewhere (e.g., `QueueScreen.tsx:9`). Remove the local version and import from `lucide-react` — or defer: PR 1 replaces all Lucide with Iconify Solar, so this is fixed by replacement.
- **Recommendation:** N candidate, but keeping P2 for now.

### P2-2 · `key` declared as prop on row-component interfaces
- **Files:** `src/screens/QueueScreen.tsx:51-58` (`AiCueChip`), `:60-65` (`BugTriageRow`), `src/screens/SignalsScreen.tsx:44-49` (`SignalCard`).
- **Detail:** Interface props include `key?: React.Key`. React reserves `key` — declaring it as a prop has no effect and can mislead. Remove from interface.

### P2-3 · Unused `tips` prop on SignalsScreen
- **File:** `src/screens/SignalsScreen.tsx:161-165`
- **Detail:** `SignalsScreenProps` declares `tips: Tip[]` but body destructures only `{ bugs }`. `App.tsx:605-607` still passes tips. Either use it or drop from the interface.

### P2-4 · Hardcoded viewport math in Queue layout
- **File:** `src/screens/QueueScreen.tsx:367,397`
- **Detail:** `calc(100vh - 44px - 48px)` / `calc(100vh - 44px - 120px)` hardcodes topbar + toolbar heights. Breaks if topbar height changes (it will in PR 1 — Lumie shell uses different spec). Also `100vh` doesn't account for mobile browser chrome.
- **Expected in:** PR 3 — rebuild against flex-based layout using CSS vars (`--topbar-h`, `--toolbar-h`) instead of magic numbers.

### P2-5 · Dead props on QueueScreen
- **File:** `src/screens/QueueScreen.tsx:284-300`
- **Detail:** `onReact`, `onComment`, `onReactComment`, `onReplyComment`, `onDeleteComment`, `onEditComment`, `showToast`, `onAddBugSubmit` are in the props interface but never referenced in the body. Previous Bug Wall had them; Queue inspector doesn't support comments/reactions yet.
- **Expected in:** PR 3 — either implement inspector commenting (per Q15 AI repro suggestion scope) or drop the dead props.

### P2-6 · `sanitizeText` / `unreadCount` defined per-render
- **File:** `src/App.tsx:262-263,303`
- **Detail:** `sanitizeText` is a pure function redefined every render. `unreadCount` is a linear scan redone every render. Hoist `sanitizeText` to module scope and memoize `unreadCount` via `useMemo(..., [notifications])`.
- **Expected in:** PR 1 (foundation) — App.tsx gets touched heavily; fold in.

### P2-7 · Effect deps miss hook-returned functions
- **File:** `src/App.tsx:142-145`
- **Detail:** `useEffect(() => updateUserAvatars(...))` deps `[profile?.uid, profile?.photoURL, profile?.displayName]` miss `updateUserAvatars`. `useStorage` needs to return a stable reference (via `useCallback`) or the effect needs it in deps. Today: no visible bug because the hook likely returns stable refs via closure, but fragile.
- **Expected in:** PR 1.

---

## N — Redesign rewrites this code path

- **N-1 · `isDarkMode` state + toggle** — `App.tsx:78-84,460-466`. Q4 locks light-only; PR 1 removes all dark mode state, localStorage key, `<Sun/Moon>` button, and the `dark` class toggle on `<html>`.
- **N-2 · 52px icon rail styling + mood-related classes** — `App.tsx:311-387`. PR 1 rebuilds shell with warm canvas + framed cream card; rail sits on canvas.
- **N-3 · Mobile bottom nav with 5 items + search** — `App.tsx:748-783`. Q10 reduces to 4 items; Focus + creation intents move to "open on desktop" prompts.
- **N-4 · Stat tiles on Overview (4-tile grid)** — `OverviewScreen.tsx:122-127`. PR 2 replaces with 3 big serif-numbered KPI tiles (Q6/Q8 pattern).
- **N-5 · AI-cue chips on Queue rows (`<Cpu>` icon + indigo pill)** — `QueueScreen.tsx:51-58`. PR 3 replaces with Newsreader italic "AI whisper" pattern (Q15 hybrid scope — templated copy for the whisper, optional real AI for "Suggest repro" button).
- **N-6 · `AiCueChip`, signal `SignalTypePill`, `SeverityPill` color tokens** — all bound to Linear's indigo/red palette. PR 1 replaces the palette; these components inherit via CSS vars if refactored correctly.

---

## Recommendation

Do not block on P0 (none exist). Proceed directly to test harness (`PR 0` scope) and PR 1 foundation.

Keep this file updated as PRs land — when a P1/P2 is fixed, strike it through and note the PR number.
