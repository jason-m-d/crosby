# Crosby v2 — Design Direction

**Status: ALL DECISIONS LOCKED. Design phase complete.**
**Last updated: 2026-03-25**

---

## The Aesthetic in One Sentence

**Confidently precise, warm-dark, type-forward — a utilitarian tool that feels like a beautifully machined instrument.**

---

## Design Identity

Crosby sits at the intersection of three influences:

1. **The technical confidence of Linear/Raycast** — dark surfaces, luminance-based elevation, surgical accent color, information density that respects the user
2. **The typographic boldness of editorial design** — type as the primary design element, mixed registers (display + mono + body), uppercase tracked labels
3. **The warm humanity of Crosby's voice** — not cold developer aesthetic, not corporate polish. A warm dark palette, generous spacing, and personality moments that feel human

The result: an interface that looks like it was designed by someone who made decisions and committed to them. Nothing decorative. Nothing safe. Nothing generic.

---

## Color Direction

### Background & Surfaces — LOCKED
- **Very warm, almost sepia** — hue 35°, higher saturation than v1
- 5 surface levels:
  - **Sidebar/nav**: `hsl(35, 12%, 8%)`
  - **Root canvas**: `hsl(35, 10%, 11%)`
  - **Card/panel**: `hsl(35, 8%, 14%)`
  - **Elevated**: `hsl(35, 7%, 18%)`
  - **Overlay**: `hsl(35, 6%, 23%)`
- Each step is ~3-5 luminance points lighter, saturation decreases slightly at higher levels
- Surfaces differentiated by luminance shift, NOT borders
- Panels float on the darker canvas — the "cards on a desk" spatial model
- Warmer and richer than v1 — pairs naturally with amber accent

### Border Radius — LOCKED (Mixed/Contextual)
- Radius is semantic — each element type gets the radius that fits its purpose
- **Cards/containers**: 16px — structured but not sharp
- **Buttons**: 10px — compact, actionable
- **Chat messages**: 20px — conversational, approachable
- **Chat input bar**: pill (999px) — soft, inviting, says "talk to me"
- **KPI cards**: 12px — tighter, data = precision
- **Badges**: pill (100px) — always pill-shaped
- **Nav items**: 8px — subtle, functional
- **Preview/panel containers**: 16px — matches cards
- **Complementary radius rule**: nested elements use proportionally smaller radii than their parent. Formula: `inner = max(0, outer - padding + 4)`. A card at 16px containing a button should use ~10px on the button, not 16px.

### Borders & Elevation — LOCKED
- **Card borders: none (opacity 0)** — surfaces are differentiated by luminance alone, no visible borders on cards
- **Dividers: `rgba(255,255,255,0.05)`** — barely visible, just enough to separate sections within a card
- Shadows at 3-5x light-mode opacity when used (0.5-0.75 range)
- Shadows are a supporting tool, not the primary elevation signal
- The no-border approach is confident — it trusts the surface layering system to create hierarchy without outlines

### Accent Color — LOCKED
- **Amber** — `hsl(38, 90%, 55%)` / approximately `#E8A317`
- Used at **5-10% of any view**, max. Every appearance carries meaning.
- Accent on: user messages, active nav states, the "important" data point, primary CTAs, featured KPI border
- When accent appears, it's unapologetic — fully saturated, fully committed
- Muted variant: `hsla(38, 90%, 55%, 0.15)` — for accent backgrounds, hover states
- Text on accent: dark (`hsl(30, 6%, 10%)`) — dark text on amber, not white

### Text Colors — LOCKED
- Three-tier opacity system (base color: `hsl(40, 10%, 90%)`):
  - **Primary**: 80% — headings, labels, active content. Slightly pulled back from full white to reduce eye strain on dark backgrounds.
  - **Secondary**: 65% — body text, descriptions, chat messages. Higher than typical (55%) for better readability with the warm sepia palette.
  - **Tertiary**: 30% — captions, timestamps, metadata, disabled states
- Text hierarchy through opacity and size, NOT weight (bold appears heavier on dark backgrounds due to irradiation illusion)
- The 80/65/30 spread creates a gentler primary-to-secondary step while maintaining strong separation from tertiary

### Status Colors
- Success, warning, error, info — desaturated compared to light-mode equivalents
- Higher luminance to compensate for dark field
- Never rely on color alone — always paired with icon or text

---

## Typography Direction

### Philosophy
Typography is the primary design element. Not icons, not color, not effects — **type**. The right font at the right weight creates more personality than any decorative element.

### Four Typographic Registers — LOCKED

**1. Display — Fraunces (weight 600)**
- Variable serif with personality — slightly wonky letterforms, high contrast thick/thin strokes
- Google Fonts, SIL Open Font License, variable weight 100-900
- Used for: headlines, greetings, big numbers, KPI values, empty state titles, hero moments
- The editorial warmth of serif at display size gives Crosby a unique voice — no other AI assistant uses serif for display only
- npm: `@fontsource-variable/fraunces`

**2. Data Display — Plus Jakarta Sans (weight 700)**
- Same family as body but at bold weight — clean geometric numerals
- Used for: KPI numbers, big metrics, dashboard values, financial data
- Scannable and precise at large sizes where Fraunces's quirky numerals feel off
- No extra font to load — same variable font file as body

**3. Body — Plus Jakarta Sans (weight 400)**
- Warm geometric sans-serif, slightly rounded
- Google Fonts, SIL Open Font License, variable weight 200-800
- Used for: chat messages, descriptions, form fields, buttons, body text
- Readable at 14-16px, enough character to feel intentional, doesn't compete with Fraunces
- npm: `@fontsource-variable/plus-jakarta-sans`

**4. Mono — JetBrains Mono (weight 400)**
- Clean, readable monospace with ligatures
- Google Fonts, SIL Open Font License, variable weight 100-800
- Used for: timestamps, data values, units, category labels, tool call output, code blocks
- UPPERCASE + wide tracking for structural labels (section headings, nav categories)
- This register is where Crosby's technical identity lives
- npm: `@fontsource/jetbrains-mono`

### Type Scale
- Fluid using `clamp()` — scales continuously from mobile to desktop
- No fixed breakpoint jumps for font sizes
- Display sizes: large enough to be the design (48px+ on desktop)
- Body: 14-16px range
- Labels/meta: 10-12px range, uppercase tracked

### Font Loading
- Variable fonts for performance (single file per family)
- `font-display: swap` to prevent invisible text
- Preload Fraunces and Plus Jakarta Sans (critical path), lazy-load JetBrains Mono

---

## Layout Direction

### Desktop: Three-Panel
- **Left**: slim sidebar nav (icon + label, collapsible)
- **Center**: main content (chat timeline OR dashboard)
- **Right**: contextual panel (artifacts, contacts, detail views — collapsible)

### Mobile: Bottom Nav + Full Content
- Bottom tab bar (max 5 items)
- Full-width content area
- Side panels become full-screen overlays or sheets

### Spacing — LOCKED
- 4px base grid
- **Card padding**: 16px
- **Card gap** (between sibling cards): 12px
- **Section gap** (between content sections): 20px
- Fluid spacing using `clamp()` for responsive scaling
- Generous internal padding — content breathes inside containers
- Tight density between components, generous space within them
- Massive negative space for hero/personality moments (greetings, empty states)

### Asymmetry
- Dashboard cards are NOT all the same size — different data types get different formats
- Layout asymmetry is intentional, not accidental
- Centered/symmetrical is the exception, not the default

---

## Component Direction

### Chat Messages
- **User messages**: accent-colored background (warm amber/gold), rounded card, generous padding
- **Crosby messages**: dark surface card (one luminance step up from background), rounded card
- Strong visual distinction — you know who's talking before reading
- No speech bubble tails — clean card/pill shapes
- Timestamps small, muted, inside the card at bottom-right
- Mixed content types inline: text, data cards, charts, code blocks, tool output — all cohesive

### Data Cards (Inline Artifacts)
- Data cards embedded in chat responses (not links — the data is RIGHT THERE)
- Big numbers as heroes — the metric IS the design
- Accent color only on the highlighted/important data point
- Progress bars, sparklines, mini-charts are first-class inline elements
- Monospace for data labels and units

### Dashboard
- KPI cards across the top: big number + trend + sparkline + time filter
- Accent strip/banner behind the headline number (inspired by Strava treatment)
- Charts: minimal, high-contrast on dark, accent-only highlighting
- Different card formats for different data types (tables, charts, progress, lists)
- Collapsible canvas — dashboard lives above or alongside chat

### Sidebar Navigation — LOCKED
- Large Fraunces text (22px, weight 600), tightly stacked (reduced line-height/padding)
- Active item: accent color text, no fill, no background
- Inactive items: tertiary opacity, hover transitions to primary
- Typography-driven — no icons in the sidebar nav, the serif font IS the design element
- Collapsible for more content area

### Secondary Navigation (Tabs, Filters)
- Filled active state with accent background
- Plus Jakarta Sans 500, 13px
- Pill-shaped tab container with 4px padding

### Inputs — LOCKED
- Chat input: pill shape (999px radius) — soft, inviting
- Minimal input area: text field + attachment + send
- Focus: accent glow ring (2px width, 4px offset, 0.4 opacity)

### Buttons — LOCKED
- Primary: accent-colored background, dark text, 10px radius
- Secondary: elevated surface background, primary text, 10px radius
- Ghost: transparent, secondary text
- Outline: accent border, accent text
- Press feedback: translateY(1px) + opacity 0.9
- Hover: translateY(-4px) + brightness(1.15)

### Empty States
- Personality moments — bold typography, possibly monochrome illustration or generative art
- Big headline ("No tasks yet" → make it feel intentional, not broken)
- A place where Crosby's warmth shows through visually

---

## Motion Direction

### Philosophy
Motion is communication, not decoration. Every animation answers: "What just happened?" "What is happening?" or "What can I do here?"

### Animation Stack — LOCKED
- **Motion (ex-Framer Motion)** — primary animation library for React. Handles spring physics, AnimatePresence (enter/exit), shared element transitions, scroll-linked effects, gesture-driven animation. npm: `motion`
- **Tailwind CSS Motion** — lightweight CSS-only complement for simple micro-interactions (hover states, button press, basic transitions). Zero JS runtime cost. npm: `tailwindcss-motion`. Use for the 80% of simple transitions; reserve Motion for complex stuff.
- Motion MCP server installed for build-phase API access

### Focus Ring — LOCKED
- Width: 2px
- Offset: 4px
- Opacity: 0.4
- Color: accent (amber)
- CSS: `ring-2 ring-offset-4 ring-accent/40`

### Button Press Feedback — LOCKED
- Translate Y: 1px down
- Scale: 1.0 (no scale change)
- Opacity: 0.9
- Combined: `active:translate-y-[1px] active:opacity-90`

### Hover Effects — LOCKED
- Lift: translateY -4px
- Scale: 1.0 (no scale change)
- Brightness: 1.15
- Combined: `hover:-translate-y-1 hover:brightness-[1.15]`
- Transition: 200ms cubic-bezier(0, 0, 0.34, 1)

### Entrance Animation — LOCKED
- Style: fade up
- Duration: 600ms
- Distance: 40px
- Stagger: 100ms between items
- Easing: cubic-bezier(0, 0, 0.34, 1)

### Loading State — LOCKED
- Style: pulse (opacity oscillation, not shimmer)
- Speed: 3 seconds per cycle
- Easing: ease-in-out

### Timing (General)
- Dropdown/popover: 150-200ms, ease-out in / ease-in out
- Modal/sheet: 250-350ms, spring physics
- Exits: 60-70% of entrance duration

### Physics
- Spring animations for interactive elements (Motion library)
- Snappy UI: `{ stiffness: 380, damping: 30 }`
- Modal entrance: `{ stiffness: 260, damping: 20 }`
- Only animate `transform` and `opacity` — nothing else

### Specific Patterns
- **Streaming AI text**: word/chunk reveal with soft cursor (Motion AnimatePresence)
- **Loading placeholders**: pulse animation at 3s cycle — CSS only via Tailwind Motion
- **Optimistic UI**: animate to success state immediately, shake on failure
- **Tab indicators**: spring-driven slide between tabs (Motion layoutId)
- **List entrance**: fade up with 100ms stagger (Motion staggerChildren)
- **Reduced motion**: replace all transforms with opacity crossfade
- **Shared element transitions**: task-to-detail, card-to-expanded (Motion layoutId)

### Dark Mode Consideration
- Dark backgrounds amplify motion — use smaller amplitudes than light mode
- Bright elements on dark animate more noticeably — restrain accordingly

---

## Personality & Brand Expression

### Where Crosby Gets Bold
The core UI is restrained and utilitarian. But specific moments get visual personality:
- **Onboarding hero** — generative/particle art, big display type
- **Empty states** — monochrome illustration or typographic treatment
- **Success moments** — brief animation confirming completion
- **Dashboard greetings** — "Morning." in large display type, not hidden in a small label
- **Loading/thinking** — generative dots/waveform, not a generic spinner

### Component Stack — LOCKED
- **shadcn/ui** — base component library (already in v1). Copy-paste, fully customizable, zero lock-in. Radix primitives for accessibility. Restyle via CSS variables.
- **AI Elements** (Vercel) — shadcn registry for AI chat interfaces. 18 components: conversation, message, prompt-input, code-block, reasoning display, tool visualization, streaming response, citations, suggestions, loader. Install specific components as needed. npm: `ai-elements`. Site: elements.ai-sdk.dev
- **Motion** (ex-Framer Motion) — primary animation library. npm: `motion`
- **Tailwind CSS Motion** — CSS-only animation utilities for simple transitions. npm: `tailwindcss-motion`
- **Lucide React** — icons (carried forward from v1)

### What Crosby Never Does
- No glassmorphism, no gradients as backgrounds
- No decorative illustrations in the core UI
- No emojis as icons
- No generic UI patterns (standard Bootstrap/Material cards)
- No safe, forgettable choices

### The Crosby Feel
Imagine opening a perfectly weighted leather notebook with graph paper inside. The leather is warm. The paper is precise. The pen writes smoothly. Everything about it says: this was made by someone who cares about tools.

That's Crosby.

---

## Inspiration Sources (Cataloged)

| # | Source | Key Takeaways |
|---|--------|---------------|
| 1 | Chat app (3-panel, light) | Three-panel layout, mixed content timeline, collapsible info panel |
| 2 | Dark chat with amber accent | Bold accent on dark, strong user/AI distinction, warm dark bg |
| 3 | AI assistant home (light) | Big headline greeting, asymmetric action cards, recent activity list |
| 4 | Finance dashboard + AI chat | Dashboard+chat coexisting, inline data cards in responses, KPI cards |
| 5 | Dark chat with surface layering | Multi-layer luminance elevation, vertical bar nav indicator, tab filters |
| 6-8 | Bold graphic art (3 screenshots) | Color confidence, organic+geometric tension, texture through patterns, black as anchor |
| 9-10 | Studio Linear website | Type as design, mixed font styles, pixel/mono fonts, uppercase tracked nav |
| 11 | Newsletter signup (serif + illustration) | Serif display option, monochrome illustrations, pill inputs, generous space |
| 12 | WorldQuant Foundry | Condensed display type, generative particle art, massive negative space, monospace+display pairing |
| 13 | Strava Year in Sport | Big numbers as heroes, accent-only data highlighting, tilted color banners, monospace data labels |

## Research Reports (Filed)

All in `crosby-v2/research/`:
- Dark UI design systems (Linear, Vercel, Raycast, etc.)
- Confident minimalism design language
- Animation & micro-interaction (2 reports — general + dark-mode specific)
- Typography & text rendering in AI chat interfaces
- Variable fonts in production apps
- Fluid typography & spacing in Next.js/Tailwind
- Dark mode surface layering
- AI design tooling (MCPs, CLIs)
