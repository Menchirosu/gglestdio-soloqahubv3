# Neuform Trending — Extracted Patterns for QA Solo Hub

Captured 2026-04-17 from `https://neuform.ai/community/trending`. Three templates studied:

| Short | Full title | UUID |
|---|---|---|
| `lumie` | Lumie Interface | `567aa132-f0af-4540-b938-0cf7b021c521` |
| `roadmap` | Strategic Roadmap | `d52c3799-1bfd-4ac8-a02c-aada43068100` |
| `aura` | Aura - Mobile Flow | `5ef674b2-0d48-4a53-94f5-d02b3523ddab` |

**Use as reference, not copy/paste.** Creators retain copyright. Adapt patterns, don't lift verbatim.

---

## Shared tech fingerprint

All three use the **same stack**, which is worth noting:
- Tailwind CDN (runtime) → we should use Tailwind v4 (already installed) with class names from these as inspiration
- **Iconify** (`solar:*` icon set) — calm line icons with optical grid
- **GSAP 3.12** + ScrollTrigger for entrance animations
- Google Fonts: mix of **Inter** (body), **Newsreader** / **Playfair Display** (serif display), **JetBrains Mono** (technical rails), **Geist** (aux)

→ For QA Solo Hub: we already have Inter + JetBrains Mono. Consider adding **Newsreader** for occasional italic accents (the "Use the 2pm window — I'll block it now" moment in Lumie). Keep Framer Motion (motion/react), don't add GSAP.

---

## PATTERN 1 — Masked word-by-word reveal (Lumie + Aura)

Both split heading text into per-word spans, clip with `overflow:hidden`, and animate `y: 100%→0` with stagger.

**Lumie's version** (adds slight rotate for organic feel):
```js
gsap.set(innerSpan, { y: "110%", rotate: 2 });
// …then on timeline:
tl.to('.reveal-inner', { y: "0%", rotate: 0, duration: 0.8, stagger: 0.02, ease: "power4.out" });
```

**Aura's version** (adds opacity for softer entrance):
```js
inner.style.cssText = "display: inline-block; transform: translateY(100%); opacity: 0;";
gsap.to(el.querySelectorAll('.gs-word'), {
  y: '0%', opacity: 1, duration: 0.8, stagger: 0.04, ease: "power3.out",
  scrollTrigger: { trigger: el, start: "top 95%", toggleActions: "play none none reverse" }
});
```

**Framer Motion port for our stack:**
```tsx
const words = text.split(' ');
return (
  <h2>
    {words.map((w, i) => (
      <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}>
        <motion.span
          style={{ display: 'inline-block' }}
          initial={{ y: '110%', rotate: 2, opacity: 0 }}
          animate={{ y: '0%', rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
          {w + (i < words.length - 1 ? ' ' : '')}
        </motion.span>
      </span>
    ))}
  </h2>
);
```

**Where to apply in QA Solo Hub:** Dashboard greeting heading, Achievement unlock celebration copy, Focus Zone mood-state transitions. Do NOT use everywhere — reserve for moments that deserve weight.

---

## PATTERN 2 — Contextual conversational block (Lumie)

The hero card of Lumie is the whole strategy:

> "3 hours of back-to-back meetings done. Your next one isn't until 3pm — that's a real window. Coffee break?"
>
> `[Yeah, need it ☕]  [Play something 🎵]  [I'm fine]`

**Anatomy:**
- Pill label: `LUMIE NOTICES` (uppercase, 10px, tracking 0.08em, accent color)
- Body: **serif**, 21px, line-height 1.3, soft color
- Three response pills: one primary (accent bg, white text), two ghost (white/80 bg, border). Emoji inline.
- Container: tinted soft surface (`#F7E5D8` — a warm tint of the bg, ~4% chroma)

**Why this works (the addictive mechanic):**
- **Time-aware copy** makes the tool feel like it's paying attention
- **Three choices with distinct tones** (action / distraction / dismiss) gives agency without decision fatigue
- **Low-stakes emoji** softens an internal tool
- Hero pattern is *decision-shaped* not *informational-shaped*

**Port for QA Solo Hub Dashboard:**
```tsx
// Greeting variants based on time + activity state
const greeting = useQaGreeting(); // returns { pill, body, actions: [...] }
// Examples:
// morning + no bugs today: "Morning. Inbox is quiet. Want to scan yesterday's regressions?" → [Yes, scan] [Log a bug] [Skip]
// afternoon + 4 bugs logged: "4 bugs down today. Solid streak. Take a win." → [Share to wall] [Keep going] [Wrap up]
// evening + overdue tip pending: "Your tip draft has been waiting 3 days. 2 minutes to publish." → [Publish it] [Schedule] [Discard]
```

Replace Lumie's warm palette with Linear indigo (`#7170ff` accent) + cool gray tints for the soft tinted surface.

---

## PATTERN 3 — AI suggestion inline on a row (Lumie)

On the overdue task, under the title, a small serif-italic line:
```
<iconify-icon icon="solar:round-transfer-horizontal-linear" class="text-[14px]"/>
<span class="font-serif-custom italic text-[13.5px]">Use the 2pm window — I'll block it now</span>
```

**The move:** The AI *doesn't* present options — it proposes a specific action in natural language, under the row. Single-tap acceptance is implied.

**Port for QA Solo Hub:**
- On a Bug Wall entry with similar priors: *"Looks like the one @dan filed last week. Same repro?"* [link to compare]
- On a Tip that matches a recent Bug: *"This would answer yesterday's Chrome regression. Attach it?"*
- On an Achievement near threshold: *"3 more bugs this week unlocks Weekend Warrior."*

The pattern is: **tiny serif italic + single icon = machine whisper**. Use sparingly — it loses magic if it's everywhere.

---

## PATTERN 4 — Ambient canvas background (Roadmap + Aura)

Both use a full-viewport `<canvas>` behind everything at low opacity.

**Roadmap (`animation` signal):** 2D canvas, 3 blurred orbs drifting with fractional velocity, `filter: blur(90px)`, opacity 0.4. Cheap.
```js
const orbs = [{ x: 0.2, y: 0.3, r: 0.45, vx: 0.0004, vy: 0.0003, color: 'rgba(255, 237, 213, 0.5)' }, ...];
function animate() {
  ctx.clearRect(0, 0, width, height);
  ctx.filter = 'blur(90px)';
  orbs.forEach(orb => {
    orb.x += orb.vx; orb.y += orb.vy;
    if (orb.x < -0.2 || orb.x > 1.2) orb.vx *= -1;
    if (orb.y < -0.2 || orb.y > 1.2) orb.vy *= -1;
    ctx.beginPath();
    ctx.arc(orb.x * width, orb.y * height, orb.r * Math.min(width, height), 0, Math.PI * 2);
    ctx.fillStyle = orb.color; ctx.fill();
  });
  requestAnimationFrame(animate);
}
```

**Aura (`webgl` signal):** GLSL fragment shader mixing two colors via `sin(uv.x * 2.0 + uv.y * 1.5 + u_time * 0.1)` + random noise. Generates an imperceptibly drifting gradient field. Heavier.

**Recommendation for QA Solo Hub:** Use Roadmap's approach (Canvas 2D, 3 orbs, low-opacity, `prefers-reduced-motion` respected). WebGL is overkill for an internal tool and hurts low-end devices. Scope to Focus Zone only — NOT on every screen (would fight Linear's precision).

---

## PATTERN 5 — Corner L-brackets + inner rail frame (Roadmap)

Gives a blueprint/technical-specification feel without being loud.

```html
<main class="relative bg-[#fdfbf8] rounded-[2rem]">
  <!-- Inner rails -->
  <div class="absolute top-4 left-4 bottom-4 w-px bg-[#dfdcd6]/60"></div>
  <div class="absolute top-4 right-4 bottom-4 w-px bg-[#dfdcd6]/60"></div>
  <div class="absolute top-4 left-4 right-4 h-px bg-[#dfdcd6]/60"></div>
  <div class="absolute bottom-4 left-4 right-4 h-px bg-[#dfdcd6]/60"></div>
  <!-- Corner brackets -->
  <div class="absolute top-5 left-5 w-2 h-2 border-t border-l border-orange-400"></div>
  <div class="absolute top-5 right-5 w-2 h-2 border-t border-r border-orange-400"></div>
  <div class="absolute bottom-5 left-5 w-2 h-2 border-b border-l border-orange-400"></div>
  <div class="absolute bottom-5 right-5 w-2 h-2 border-b border-r border-orange-400"></div>
  <!-- content -->
</main>
```

**Where to apply in QA Solo Hub:** Achievements screen (feels like a spec document), Focus Zone (quiet technical frame while deep in a session), or on the Admin Dashboard header card.

---

## PATTERN 6 — Monospace metadata rails (Roadmap)

Small uppercase tracked text in JetBrains Mono acting as document chrome, not as content.

```html
<div class="absolute top-10 left-16 text-xs uppercase tracking-widest font-mono text-neutral-400">
  SYS.DOC // 001.4
</div>
<div class="absolute bottom-10 left-16 flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-neutral-400">
  <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
  LIVE TRAJECTORY
</div>
```

**Where to apply:** Bug Wall header (`BUG.LOG // 2026-Q2`, `LIVE STREAM` with pulsing dot on real-time listener status), Admin Dashboard ("SYSTEM.STATUS"). Gives the app a "machine is listening" flavor.

---

## PATTERN 7 — Left-border accent card (Roadmap Gantt blocks)

Horizontal card with a colored left edge that changes on group-hover. Cheap, legible, stealable.

```html
<div class="group transition-transform duration-500 hover:-translate-y-1">
  <div class="h-12 flex items-center px-4 bg-white border rounded-lg shadow-sm relative overflow-hidden">
    <div class="absolute left-0 top-0 bottom-0 w-1 bg-neutral-200 group-hover:bg-orange-400 transition-colors duration-300"></div>
    <span class="text-xs uppercase tracking-widest font-normal ml-2">Initiation</span>
  </div>
  <div class="mt-3 text-xs text-neutral-500 uppercase tracking-widest">Subtitle metadata</div>
</div>
```

The **highlight variant** also adds: orange left bar, orange right dot, subtle tinted overlay, bigger layered shadow.

**Where to apply:** Bug Wall entries (left edge color = severity), Tip entries (left edge = category), Achievement entries (left edge = tier).

---

## PATTERN 8 — Gradient border via mask (Aura + Lumie)

True 1px gradient border — not a fake via pseudo. Works with any shape/radius.

```html
<div class="relative rounded-sm">
  <div class="absolute inset-0 rounded-sm pointer-events-none"
       style="padding: 1px;
              background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%, rgba(44,59,49,0.1) 100%);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;"></div>
  <!-- card content -->
</div>
```

**Where to apply:** Achievement cards, hero card on Dashboard, premium-feeling tiles on Admin Dashboard.

---

## PATTERN 9 — Noise overlay (Lumie)

Inline SVG turbulence at 3% opacity. No image request needed.

```html
<div class="absolute inset-0 pointer-events-none z-50 opacity-[0.03]"
     style='background-image: url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27nf%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23nf)%27/%3E%3C/svg%3E")'>
</div>
```

Kills the plastic flatness of solid backgrounds. Excellent for dark themes.

**Where to apply:** Globally (3% on the app shell), or scoped to Focus Zone for a paper feel.

---

## PATTERN 10 — Bar chart with dashed backlight grid (Aura)

Stacked horizontal bars, each preceded by a small label. Background has 5 evenly-spaced dashed verticals at 40% opacity to imply scale without needing numeric axis labels visible.

The first ("User Research") bar uses a **repeating 45° stripe** fill (a "hatched" treatment) to signal "in progress / data pending" vs solid fill for "completed".

```css
background-image: repeating-linear-gradient(-45deg,
  rgba(44,59,49,0.1), rgba(44,59,49,0.1) 2px,
  transparent 2px, transparent 4px);
```

**Where to apply:** Dashboard KPI: "bugs logged this week" as hatched bar (still counting), "bugs fixed" as solid bar.

---

## PATTERN 11 — Big number + soft supporting copy (Aura)

```
24.1%
Task Success Rate - Upto
```

- Number: **Playfair Display**, 7xl (72px), `font-light`, `tracking-tighter`, `leading-none`
- Support: small, neutral, directly beneath

The deliberate choice of a **serif light-weight huge number** is what makes it feel editorial rather than sporty-dashboard. Linear's aesthetic would keep this idea but substitute Inter 200 with tighter tracking.

**Where to apply:** Dashboard KPI tiles — total bugs logged, streak days, tips published.

---

## PATTERN 12 — Timeline connector line between list items (Lumie)

Between consecutive schedule events, a short vertical 1px line links the current-event bullet to the previous one:
```html
<div class="absolute left-[70px] top-[-20px] bottom-[20px] w-px bg-[#5A8B58]/30"></div>
```

Bullet gets a ring shadow that punches through the line at its center:
```html
<div class="w-2 h-2 rounded-full bg-[#5A8B58] shadow-[0_0_0_4px_#F5F4F0]"></div>
```

**Where to apply:** Focus Zone session timeline, Achievement progression, tip → bug → fix chain on a bug detail view.

---

## Recommendations — what to actually apply

Prioritized by ROI (impact × effort) for QA Solo Hub:

1. **PATTERN 2 (Conversational hero)** on Dashboard — highest addictive-loop impact, low effort. Build `useQaGreeting()` hook keyed on time + today's activity.
2. **PATTERN 3 (AI suggestion inline)** on Bug Wall rows — medium effort, high charm. Start with rule-based suggestions (similar bugs, matching tips).
3. **PATTERN 1 (Masked word reveal)** on 2-3 hero headings — zero logic, pure motion. Dashboard + Achievement unlock + (maybe) Focus Zone entry.
4. **PATTERN 11 (Big serif number)** on Dashboard KPI tiles — swap current tiles, keep Linear tokens.
5. **PATTERN 7 (Left-border accent card)** on Bug Wall — refactor existing cards, huge legibility win for severity scan.
6. **PATTERN 4 (Ambient canvas orbs)** on Focus Zone ONLY — respects reduced-motion; don't put on every screen.
7. **PATTERN 6 (Monospace rails)** on Bug Wall header + Admin — adds "system" texture without disrupting Linear.
8. **PATTERN 12 (Timeline connector)** on Achievements — aligns with "progression log" concept.

Defer (lower ROI for our brief):
- PATTERN 5 (L-brackets) — cute but fights Linear's clean rectangles
- PATTERN 8 (gradient mask border) — nice but Linear's flat edges already read premium
- PATTERN 9 (noise overlay) — try it, but could clash with Linear's flat surfaces
- PATTERN 10 (hatched bar) — only if we add actual bar charts

## What NOT to lift

- Lumie's warm palette (`#C86948`, `#F7E5D8`) — clashes with Linear indigo
- Playfair Display / Newsreader for *everything* — limit to single hero accents or skip entirely
- GSAP — we have motion/react, adding GSAP doubles the animation layer

## Dependencies

If we adopt these patterns, we need:
- Install `@iconify/react` (or keep using existing icons; Iconify is optional)
- Consider `Newsreader` Google Font for one accent line only (Lumie AI-suggestion italic)
- Nothing else — GSAP stays out
