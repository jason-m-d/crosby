# Crosby v2 — Style Guide

**Status: Locked. This is the build reference.**
**Last updated: 2026-03-25**

This is the definitive design system for Crosby v2. Every build agent follows this document. Every value is implementation-ready. If it is not specified here, it does not exist.

---

## Table of Contents

1. [Stack](#stack)
2. [Design Principles](#design-principles)
3. [Colors](#colors)
4. [Typography](#typography)
5. [Spacing](#spacing)
6. [Borders & Radius](#borders--radius)
7. [Components](#components)
8. [Motion](#motion)
9. [Icons](#icons)
10. [Accessibility](#accessibility)
11. [Never Do](#never-do)

---

## Stack

| Layer | Tool | npm Package | Notes |
|-------|------|-------------|-------|
| CSS Framework | Tailwind CSS v4 | `tailwindcss` | Utility-first, dark mode only |
| Base Components | shadcn/ui | Copy-paste from registry | Radix primitives, fully customizable |
| AI Chat Components | AI Elements (Vercel) | `ai-elements` | conversation, message, prompt-input, code-block, reasoning, tool viz, streaming response, citations, suggestions, loader |
| Complex Animation | Motion | `motion` | Springs, AnimatePresence, shared layout, gestures |
| Simple Animation | Tailwind CSS Motion | `tailwindcss-motion` | CSS-only hover/press/transitions |
| Icons | Lucide React | `lucide-react` | Stroke icons only |
| Class Merging | cn() utility | `clsx` + `tailwind-merge` | Always use for conditional classes |
| Display Font | Fraunces | `@fontsource-variable/fraunces` | Variable, 100-900 |
| Body Font | Plus Jakarta Sans | `@fontsource-variable/plus-jakarta-sans` | Variable, 200-800 |
| Mono Font | JetBrains Mono | `@fontsource/jetbrains-mono` | Variable, 100-800 |

---

## Design Principles

1. **Performance is the foundation.** Every visual choice must earn its render cost. Target: LCP < 2.5s, CLS < 0.1, FID < 100ms.
2. **Motion with purpose.** Every animation answers "What just happened?" or "What can I do here?" If you cannot explain what it communicates, cut it.
3. **Typography as design element.** Type creates personality, hierarchy, and visual interest. Not icons, not color, not effects.
4. **Fluid over fixed.** Sizes scale continuously via `clamp()`. Breakpoints exist for structural layout shifts only.
5. **Depth without weight.** Surfaces are differentiated by luminance alone. No borders on cards, no heavy shadows, no blur decoration.
6. **Confident restraint.** Opinionated but not aggressive. Every element earns its place. Nothing decorative.
7. **Utilitarian warmth.** A tool first, but warm dark tones and generous spacing make it a tool you enjoy.

---

## Colors

### CSS Custom Properties (globals.css)

Paste this block into `src/app/globals.css` inside `:root` (or a `[data-theme="dark"]` selector since the app is dark-only):

```css
:root {
  /* ── Surface Palette (warm sepia, 35deg hue) ── */
  --surface-sidebar:    hsl(35, 12%, 8%);
  --surface-root:       hsl(35, 10%, 11%);
  --surface-card:       hsl(35, 8%, 14%);
  --surface-elevated:   hsl(35, 7%, 18%);
  --surface-overlay:    hsl(35, 6%, 23%);

  /* ── Accent ── */
  --accent:             hsl(38, 90%, 55%);
  --accent-muted:       hsla(38, 90%, 55%, 0.15);
  --accent-foreground:  hsl(30, 6%, 10%);

  /* ── Text ── */
  --text-primary:       hsla(40, 10%, 90%, 0.80);
  --text-secondary:     hsla(40, 10%, 90%, 0.65);
  --text-tertiary:      hsla(40, 10%, 90%, 0.30);

  /* ── Status ── */
  --status-success:     hsl(145, 60%, 50%);
  --status-warning:     hsl(38, 90%, 55%);
  --status-error:       hsl(0, 60%, 55%);

  /* ── Dividers ── */
  --divider:            rgba(255, 255, 255, 0.05);

  /* ── Focus ── */
  --focus-ring:         hsla(38, 90%, 55%, 0.40);

  /* ── shadcn/ui semantic mapping ── */
  --background:         35 10% 11%;
  --foreground:         40 10% 90%;

  --card:               35 8% 14%;
  --card-foreground:    40 10% 90%;

  --popover:            35 7% 18%;
  --popover-foreground: 40 10% 90%;

  --primary:            38 90% 55%;
  --primary-foreground: 30 6% 10%;

  --secondary:          35 7% 18%;
  --secondary-foreground: 40 10% 90%;

  --muted:              35 6% 23%;
  --muted-foreground:   40 10% 90%;

  --accent:             38 90% 55%;
  --accent-foreground:  30 6% 10%;

  --destructive:        0 60% 55%;
  --destructive-foreground: 40 10% 90%;

  --border:             0 0% 100% / 0.05;
  --input:              0 0% 100% / 0.08;
  --ring:               38 90% 55%;

  --sidebar-background:           35 12% 8%;
  --sidebar-foreground:           40 10% 90%;
  --sidebar-primary:              38 90% 55%;
  --sidebar-primary-foreground:   30 6% 10%;
  --sidebar-accent:               38 90% 55%;
  --sidebar-accent-foreground:    30 6% 10%;
  --sidebar-border:               0 0% 100% / 0.05;
  --sidebar-ring:                 38 90% 55%;

  --radius: 0.625rem;

  /* ── Typography ── */
  --font-display:  'Fraunces Variable', 'Georgia', serif;
  --font-body:     'Plus Jakarta Sans Variable', 'system-ui', sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', monospace;
}
```

### Surface Elevation Map

| Level | Token | HSL | Usage |
|-------|-------|-----|-------|
| 0 - Deepest | `--surface-sidebar` | `hsl(35, 12%, 8%)` | Sidebar, bottom nav |
| 1 - Root | `--surface-root` | `hsl(35, 10%, 11%)` | Page background, canvas |
| 2 - Card | `--surface-card` | `hsl(35, 8%, 14%)` | Cards, panels, Crosby messages |
| 3 - Elevated | `--surface-elevated` | `hsl(35, 7%, 18%)` | Popovers, dropdowns, secondary buttons |
| 4 - Overlay | `--surface-overlay` | `hsl(35, 6%, 23%)` | Modal backdrops, tooltips, hover states |

Each step is 3-5 luminance points lighter. Saturation decreases slightly at higher levels. Surfaces are differentiated by luminance shift only -- no borders on cards.

### Text Hierarchy

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| Primary | `--text-primary` | `hsla(40, 10%, 90%, 0.80)` | Headings, labels, active content |
| Secondary | `--text-secondary` | `hsla(40, 10%, 90%, 0.65)` | Body text, descriptions, chat messages |
| Tertiary | `--text-tertiary` | `hsla(40, 10%, 90%, 0.30)` | Timestamps, captions, metadata, disabled |

Primary is pulled back from full white to reduce eye strain. Secondary is higher than typical (65% vs 55%) for readability on warm sepia. Hierarchy is through opacity and size, not weight.

### Accent Rules

- Accent appears on no more than 5-10% of any given view.
- Every accent appearance carries meaning: user messages, active nav, primary CTA, featured KPI, important data point.
- When accent appears it is fully saturated, fully committed.
- Text on accent backgrounds is always dark: `--accent-foreground` / `hsl(30, 6%, 10%)`.
- Muted variant (`--accent-muted`) for hover fills, subtle backgrounds.

### Status Colors

| Status | HSL | Usage |
|--------|-----|-------|
| Success | `hsl(145, 60%, 50%)` | Confirmations, completed states |
| Warning | `hsl(38, 90%, 55%)` | Same as accent. Contextual usage distinguishes. |
| Error | `hsl(0, 60%, 55%)` | Errors, destructive actions, failed states |

Never rely on color alone for status. Always pair with an icon or text label.

---

## Typography

### Tailwind Theme Extension

Add to `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    fontFamily: {
      display: ['var(--font-display)'],
      body:    ['var(--font-body)'],
      mono:    ['var(--font-mono)'],
    },
    fontSize: {
      // Display scale (Fraunces)
      'display-xl': ['clamp(3rem, 2.5rem + 2.5vw, 4.5rem)',   { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
      'display-lg': ['clamp(2.25rem, 2rem + 1.25vw, 3rem)',    { lineHeight: '1.1',  letterSpacing: '-0.015em', fontWeight: '600' }],
      'display-md': ['clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '600' }],
      'display-sm': ['clamp(1.25rem, 1.125rem + 0.625vw, 1.5rem)', { lineHeight: '1.2', letterSpacing: '-0.005em', fontWeight: '600' }],

      // Data display scale (Plus Jakarta Sans 700)
      'data-xl':  ['clamp(2.5rem, 2rem + 2.5vw, 4rem)',   { lineHeight: '1.0', letterSpacing: '-0.02em', fontWeight: '700' }],
      'data-lg':  ['clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem)', { lineHeight: '1.05', letterSpacing: '-0.01em', fontWeight: '700' }],
      'data-md':  ['clamp(1.25rem, 1.125rem + 0.625vw, 1.5rem)', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '700' }],

      // Body scale (Plus Jakarta Sans 400)
      'body-lg':  ['clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',  { lineHeight: '1.6', fontWeight: '400' }],
      'body-md':  ['clamp(0.875rem, 0.85rem + 0.125vw, 1rem)', { lineHeight: '1.6', fontWeight: '400' }],
      'body-sm':  ['0.875rem',                                   { lineHeight: '1.5', fontWeight: '400' }],

      // Label / meta scale (uppercase tracked)
      'label-lg': ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '500' }],
      'label-md': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '500' }],
      'label-sm': ['0.625rem', { lineHeight: '1.3', letterSpacing: '0.12em', fontWeight: '500' }],

      // Mono scale
      'mono-md':  ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
      'mono-sm':  ['0.75rem',   { lineHeight: '1.5', fontWeight: '400' }],
      'mono-xs':  ['0.625rem',  { lineHeight: '1.4', fontWeight: '400' }],
    },
    extend: {
      // ... rest of extensions below
    },
  },
}
```

### Four Typographic Registers

| Register | Font | Weight | Usage |
|----------|------|--------|-------|
| Display | Fraunces | 600 | Headlines, greetings, big numbers, empty state titles, hero moments |
| Data Display | Plus Jakarta Sans | 700 | KPI numbers, dashboard metrics, financial data, big counters |
| Body | Plus Jakarta Sans | 400 | Chat messages, descriptions, buttons, form fields, body text |
| Mono | JetBrains Mono | 400 | Timestamps, data labels, units, code blocks, tool output |

**Register selection rules:**
- If it is a greeting, section title, or personality moment: **Display** (Fraunces 600).
- If it is a number meant to be scanned quickly (KPI, metric, counter): **Data Display** (Plus Jakarta Sans 700).
- If the user reads it as prose: **Body** (Plus Jakarta Sans 400).
- If it is a timestamp, category label (uppercase tracked), code, or technical output: **Mono** (JetBrains Mono 400).

### Label Convention

All structural labels (section headings, nav categories, metadata keys) use:
```
font-mono text-label-md uppercase text-[--text-tertiary]
```

### Font Loading

```tsx
// layout.tsx
import '@fontsource-variable/fraunces';
import '@fontsource-variable/plus-jakarta-sans';

// Lazy-load mono (not on critical path)
import('@fontsource/jetbrains-mono');
```

All font declarations use `font-display: swap`. Preload Fraunces and Plus Jakarta Sans via `<link rel="preload">` in the document head. JetBrains Mono loads lazily after first paint.

---

## Spacing

### Base Grid

4px base unit. All spacing values are multiples of 4.

### Tailwind Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Tight inline gaps (icon + text) |
| `2` | 8px | Compact internal spacing |
| `3` | 12px | Card gap (between sibling cards) |
| `4` | 16px | Card padding (internal) |
| `5` | 20px | Section gap (between content sections) |
| `6` | 24px | Section padding on larger screens |
| `8` | 32px | Page-level vertical spacing |
| `10` | 40px | Hero/personality moment spacing |
| `16` | 64px | Maximum negative space |

### Fixed Rules

| Context | Value | Tailwind |
|---------|-------|----------|
| Card internal padding | 16px | `p-4` |
| Gap between sibling cards | 12px | `gap-3` |
| Gap between content sections | 20px | `gap-5` |
| Icon + text inline gap | 6px | `gap-1.5` |
| Input internal padding | 10px 12px | `px-3 py-2.5` |
| Page horizontal padding (mobile) | 16px | `px-4` |
| Page horizontal padding (desktop) | 24px | `md:px-6` |

### Fluid Spacing

Use `clamp()` for spacing that scales with viewport:
```css
/* Section gap: 20px mobile, 32px desktop */
gap: clamp(1.25rem, 1rem + 1.25vw, 2rem);

/* Page margin: 16px mobile, 32px desktop */
padding-inline: clamp(1rem, 0.5rem + 2.5vw, 2rem);
```

### Density Rule

Tight density *between* components. Generous space *within* them. Massive negative space for hero and personality moments (greetings, empty states).

---

## Borders & Radius

### Borders

| Element | Treatment |
|---------|-----------|
| Cards | No border. Luminance separation only. |
| Dividers (inside cards) | `border-color: rgba(255,255,255,0.05)` / `border-[--divider]` |
| Inputs | `border: 1px solid rgba(255,255,255,0.08)` / `border-input` |
| Input focus | Accent glow: `ring-2 ring-[--accent]/30` |

### Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Cards / containers | 16px | `rounded-2xl` |
| Buttons | 10px | `rounded-[10px]` |
| Chat messages | 20px | `rounded-[20px]` |
| Chat input | pill (999px) | `rounded-full` |
| KPI cards | 12px | `rounded-xl` |
| Badges | pill (100px) | `rounded-full` |
| Nav items | 8px | `rounded-lg` |
| Inputs (non-chat) | 10px | `rounded-[10px]` |

### Complementary Radius Rule

Nested elements use proportionally smaller radii than their parent:

```
inner radius = max(0, outer radius - padding + 4)
```

A card at 16px radius containing a button with 16px padding uses `max(0, 16 - 16 + 4) = 4px` minimum. In practice, buttons inside cards use 10px (their standard radius), which satisfies this rule.

### Shadows

Shadows are a supporting tool, not the primary elevation signal. When used:
- Opacity at 3-5x typical light-mode values (0.5-0.75 range)
- Example card shadow: `0 4px 24px rgba(0, 0, 0, 0.6)`
- Example elevated shadow: `0 8px 32px rgba(0, 0, 0, 0.75)`

---

## Components

### Buttons

**Four variants:**

| Variant | Background | Text | Border | Tailwind |
|---------|-----------|------|--------|----------|
| Primary | `--accent` | `--accent-foreground` | none | `bg-[--accent] text-[--accent-foreground] rounded-[10px]` |
| Secondary | `--surface-elevated` | `--text-primary` | none | `bg-[--surface-elevated] text-[--text-primary] rounded-[10px]` |
| Ghost | transparent | `--text-secondary` | none | `bg-transparent text-[--text-secondary] hover:bg-[--surface-elevated] rounded-[10px]` |
| Outline | transparent | `--accent` | 1px `--accent` | `bg-transparent text-[--accent] border border-[--accent] rounded-[10px]` |

**All button states:**
```
/* Hover */
hover:-translate-y-[1px] hover:brightness-[1.15]
transition-all duration-200 ease-[cubic-bezier(0,0,0.34,1)]

/* Press */
active:translate-y-[1px] active:opacity-90

/* Focus */
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4
focus-visible:ring-[--focus-ring] ring-offset-[--surface-root]

/* Disabled */
disabled:opacity-30 disabled:pointer-events-none
```

### Badges

Always pill-shaped. Always mono font.

```
font-mono text-mono-xs uppercase tracking-wider
bg-[--surface-elevated] text-[--text-secondary]
px-2.5 py-0.5 rounded-full
```

Accent badge variant:
```
bg-[--accent-muted] text-[--accent]
```

### Cards

No border. Surface color creates separation from canvas.

```
bg-[--surface-card] rounded-2xl p-4
```

Elevated card (popovers, dropdowns):
```
bg-[--surface-elevated] rounded-2xl p-4
shadow-[0_4px_24px_rgba(0,0,0,0.6)]
```

### KPI Cards

```
bg-[--surface-card] rounded-xl p-4
```

Internal structure:
- Label: `font-mono text-label-md uppercase text-[--text-tertiary]`
- Value: `font-body text-data-xl text-[--text-primary]`
- Trend: `font-mono text-mono-sm` + status color
- Featured variant: 2px accent top border via `border-t-2 border-[--accent]`

### Chat Messages

**User message:**
```
bg-[--accent] text-[--accent-foreground] rounded-[20px] p-4
max-w-[85%] ml-auto
```

**Crosby message:**
```
bg-[--surface-card] text-[--text-secondary] rounded-[20px] p-4
max-w-[85%] mr-auto
```

**Timestamps (inside both):**
```
font-mono text-mono-xs text-[--text-tertiary]
mt-2 text-right
```

No bubble tails. No avatars inside bubbles.

### Chat Input

```
bg-[--surface-card] rounded-full px-5 py-3
border border-[--divider]
focus-within:ring-2 focus-within:ring-[--accent]/30
text-body-md font-body text-[--text-primary]
placeholder:text-[--text-tertiary]
```

### Secondary Navigation (Tabs)

```
/* Container */
flex gap-1 bg-[--surface-sidebar] rounded-full p-1

/* Inactive tab */
font-body text-[0.8125rem] font-medium
text-[--text-secondary] px-3 py-1.5 rounded-full
hover:text-[--text-primary]
transition-colors duration-200

/* Active tab */
bg-[--accent] text-[--accent-foreground]
px-3 py-1.5 rounded-full
```

### Sidebar Navigation

```
/* Nav item — inactive */
font-display text-[22px] font-semibold
text-[--text-tertiary]
leading-tight py-0.5
hover:text-[--text-primary]
transition-colors duration-200
cursor-pointer

/* Nav item — active */
text-[--accent]
```

No icons. No backgrounds or fills. Typography is the design element.

### Inputs (Form Fields)

```
bg-[--surface-card] text-[--text-primary]
border border-input rounded-[10px]
px-3 py-2.5 text-body-md font-body
placeholder:text-[--text-tertiary]
focus:outline-none focus:ring-2 focus:ring-[--accent]/30
disabled:opacity-30 disabled:cursor-not-allowed
```

### Dialogs / Modals

```
/* Backdrop */
bg-black/60 backdrop-blur-sm

/* Dialog panel */
bg-[--surface-elevated] rounded-2xl p-6
shadow-[0_8px_32px_rgba(0,0,0,0.75)]
max-w-lg w-full mx-4

/* Title */
font-display text-display-sm text-[--text-primary]

/* Description */
text-body-md text-[--text-secondary] mt-2
```

### Empty States

Bold personality moments. Use display typography.

```
/* Container */
flex flex-col items-center text-center py-16 px-8

/* Headline */
font-display text-display-md text-[--text-primary]

/* Description */
text-body-md text-[--text-secondary] mt-3 max-w-sm
```

### Toasts

Use `sonner`. Style overrides:

```
bg-[--surface-elevated] text-[--text-primary]
border-none rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)]
font-body text-body-sm
```

---

## Motion

### Animation Libraries

| Library | Use For |
|---------|---------|
| Motion (`motion`) | Springs, AnimatePresence, shared layout, scroll-linked, gestures |
| Tailwind CSS Motion (`tailwindcss-motion`) | Hover, press, simple opacity/transform transitions |
| CSS keyframes | Loading pulse, skeleton states |

### Only Animate

`transform` and `opacity`. Nothing else. No animating `width`, `height`, `background-color`, `border`, `padding`, `margin`, or `box-shadow`.

Exception: `color` and `background-color` transitions are allowed for hover/focus state changes at 200ms.

### Timing Tokens

| Pattern | Duration | Easing |
|---------|----------|--------|
| Hover / press feedback | 200ms | `cubic-bezier(0, 0, 0.34, 1)` |
| Dropdown / popover in | 150-200ms | `ease-out` |
| Dropdown / popover out | 100-130ms | `ease-in` |
| Modal / sheet in | 250-350ms | Spring (see below) |
| Modal / sheet out | 150-200ms | `ease-in` |
| List entrance | 600ms | `cubic-bezier(0, 0, 0.34, 1)` |
| Exit | 60-70% of entrance duration | Same easing as entrance |

### Spring Configs (Motion library)

```ts
// Snappy UI interactions (tabs, toggles, small elements)
const snappy = { stiffness: 380, damping: 30 }

// Modal / sheet entrance
const modal = { stiffness: 260, damping: 20 }
```

### Entrance Animation (Default)

Fade up. Use for page sections, cards, list items.

```tsx
// Motion component
<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0, 0, 0.34, 1] }}
/>
```

Stagger children at 100ms intervals:
```tsx
<motion.div
  variants={{
    visible: { transition: { staggerChildren: 0.1 } }
  }}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.34, 1] } }
      }}
    />
  ))}
</motion.div>
```

### Button Interaction

CSS only (Tailwind classes):
```
transition-all duration-200 ease-[cubic-bezier(0,0,0.34,1)]
hover:-translate-y-[1px] hover:brightness-[1.15]
active:translate-y-[1px] active:opacity-90
```

### Hover Lift (Cards)

CSS only:
```
transition-transform duration-200 ease-[cubic-bezier(0,0,0.34,1)]
hover:-translate-y-1 hover:brightness-[1.15]
```

### Loading Pulse

CSS keyframes (globals.css):
```css
@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
```

### Tab Indicator

Spring-driven slide between tabs using Motion `layoutId`:
```tsx
{isActive && (
  <motion.div
    layoutId="tab-indicator"
    className="absolute inset-0 bg-[--accent] rounded-full"
    transition={{ type: "spring", stiffness: 380, damping: 30 }}
  />
)}
```

### Reduced Motion

All transform-based animations are replaced with simple opacity crossfade:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.2s !important;
  }
}
```

In Motion components:
```tsx
const prefersReducedMotion = useReducedMotion()

<motion.div
  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={prefersReducedMotion
    ? { duration: 0.2 }
    : { duration: 0.6, ease: [0, 0, 0.34, 1] }
  }
/>
```

---

## Icons

### Library

Lucide React. No other icon library. No custom SVGs unless Lucide does not have an appropriate icon.

### Sizing

| Context | Size | Tailwind |
|---------|------|----------|
| Inline with body text | 16px | `size-4` |
| Inline with small text | 14px | `size-3.5` |
| Button icon (standard) | 18px | `size-[18px]` |
| Icon-only button | 20px | `size-5` |
| Empty state / hero | 24-32px | `size-6` to `size-8` |

### Stroke Width

Default Lucide stroke width (2px). Do not change `strokeWidth` unless creating a deliberate visual contrast.

### Color Rules

- Icons inherit the text color of their context by default.
- Do not give icons their own color unless they represent status (success/error/warning).
- Status icons use the corresponding status color token.

### Import Pattern

```tsx
import { Plus, Check, Loader2, ChevronRight } from 'lucide-react'

// Loading spinner
<Loader2 className="size-4 animate-spin" />
```

---

## Accessibility

### WCAG 2.1 AA Compliance

This is not optional. Every component must meet these standards.

### Contrast Ratios

| Pairing | Ratio | Passes |
|---------|-------|--------|
| `--text-primary` on `--surface-root` | 9.8:1 | AAA |
| `--text-secondary` on `--surface-root` | 7.1:1 | AAA |
| `--text-tertiary` on `--surface-root` | 2.8:1 | Decorative only (not for readable text) |
| `--accent-foreground` on `--accent` | 10.2:1 | AAA |
| `--accent` on `--surface-root` | 5.4:1 | AA |

Tertiary text is for decorative labels, timestamps, and metadata only. Never use it for content a user needs to read to complete a task.

### Focus Ring

Every interactive element must show a visible focus ring on keyboard navigation:

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-[--focus-ring]
focus-visible:ring-offset-4
focus-visible:ring-offset-[--surface-root]
```

Width: 2px. Offset: 4px. Color: accent at 40% opacity. Never remove focus styles.

### Touch Targets

Minimum touch target: 44x44px (iOS) / 48x48px (Android). If the visual element is smaller, expand the hit area with padding or a transparent clickable wrapper.

### Keyboard Navigation

- All interactive elements reachable via Tab.
- Enter or Space activates buttons.
- Escape closes modals, dropdowns, popovers.
- Arrow keys navigate within lists, tabs, menus.
- Radix primitives (via shadcn/ui) handle this by default. Do not override.

### Screen Readers

- All images have `alt` text (or `alt=""` and `aria-hidden="true"` if decorative).
- Icon-only buttons have `aria-label`.
- Dynamic content updates use `aria-live` regions.
- Form inputs have associated `<label>` elements or `aria-label`.
- Loading states announce via `aria-live="polite"`.
- Chat messages use appropriate landmark roles.

### Reduced Motion

Covered in the Motion section. Summary: all transform animations degrade to opacity crossfade. No motion is removed entirely -- users still get visual feedback, just without movement.

---

## Never Do

1. **Never hardcode colors.** No hex values, no `rgb()`, no `hsl()` literals in components. Always use CSS custom property tokens.
2. **Never add borders to cards.** Surface luminance is the separation. If you feel like a card "needs a border," the surface colors are wrong.
3. **Never use gradients** as backgrounds, on buttons, or anywhere else.
4. **Never use glassmorphism** (backdrop-blur as a visual style). The only allowed blur is modal backdrop dimming.
5. **Never use emojis as icons.** Lucide only.
6. **Never animate layout properties** (width, height, padding, margin). Only `transform` and `opacity`.
7. **Never remove focus styles.** Every interactive element must have a visible focus ring.
8. **Never use `!important`** in component styles (allowed only in the reduced-motion media query).
9. **Never use generic component patterns** (Bootstrap cards, Material buttons). Everything is styled per this guide.
10. **Never use more than two accent colors.** Amber is the accent. That is it.
11. **Never add decorative illustrations** to the core UI. Personality comes from typography and spacing.
12. **Never use icons in the sidebar nav.** The Fraunces serif text is the design element.
13. **Never use `font-bold` for body text hierarchy.** Use opacity and size, not weight. Bold on dark backgrounds creates an irradiation illusion that makes text look heavier than intended.
14. **Never skip the `cn()` utility** for conditional class names. Import from `@/lib/utils`.
15. **Never create a custom component** when shadcn/ui or AI Elements has one that can be restyled.
