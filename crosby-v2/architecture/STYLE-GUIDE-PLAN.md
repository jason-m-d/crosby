# Style Guide Plan — Crosby v2

**Status: COMPLETE — All phases done. Design decisions locked. Style guide written.**
**Last updated: 2026-03-25**

---

## Why This Matters

Crosby v2 will be built in a one-shot process — multiple agents working in parallel, each building different parts of the app. Every agent needs to produce UI that looks like it came from the same designer. The style guide is the single source of truth that makes that possible.

A weak style guide means inconsistency, rework, and an app that feels stitched together. A strong one means every component, page, and interaction feels like it belongs — even when built by different agents with no coordination beyond the guide itself.

---

## Design Philosophies

Extracted from Jason's curated reference material. These are the non-negotiable principles that every design decision must honor.

### 1. Performance Is the Foundation

Every visual decision must earn its performance cost. Speed isn't a feature — it's the prerequisite that enables every other design trend to succeed.

**What this means in practice:**
- No animation that blocks rendering or causes layout shift
- Images optimized (WebP/AVIF), lazy-loaded below the fold
- Font loading strategy that prevents invisible text (FOIT)
- Bundle-split by route — no monolithic CSS/JS payloads
- Target: LCP < 2.5s, CLS < 0.1, FID < 100ms

### 2. Motion With Purpose

Micro-interactions must be intentional and informative, never decorative. Every animation answers a question: "What just happened?" or "What can I do here?"

**What this means in practice:**
- Button hover/press feedback confirms interactivity (subtle shift, opacity change)
- Form submission gets a checkmark animation confirming success
- Loading states feel responsive, not stalled
- Streaming AI text has a natural reveal rhythm
- No motion purely for visual interest — if you can't explain what it communicates, cut it
- All animations respect `prefers-reduced-motion`
- Duration range: 150–300ms for micro-interactions, max 400ms for transitions

### 3. Typography as Design Element

Text does heavy lifting — creating personality, hierarchy, and visual interest through font choice, weight variation, and scale. Variable fonts enable expressive typography from a single performant file.

**What this means in practice:**
- Variable font(s) for continuous weight control and performance
- Typography creates hierarchy through weight, size, and spacing — not color
- Display text has personality; body text has clarity
- Fluid type scale using `clamp()` for seamless scaling across devices
- Letter-spacing and line-height are intentional design decisions, not defaults

### 4. Fluid Over Fixed

Layouts scale gracefully across every device, resolution, and orientation — not just snapping between breakpoints. Uses `clamp()`, `vw`, `vh`, and container queries.

**What this means in practice:**
- Fluid spacing that maintains proportional relationships at every width
- Container queries for components that need to adapt to their context, not just the viewport
- Breakpoints still exist for structural layout shifts (sidebar → bottom nav), but sizing within those layouts is fluid
- No horizontal scroll at any width
- Mobile-first, scaling up

### 5. Depth Without Weight

Interfaces feel layered and dimensional without heavy shadows, borders, or blur effects. Depth comes from subtle surface differentiation, elevation cues, and spatial relationships.

**What this means in practice:**
- Surface layers differentiated by lightness/saturation shifts, not borders
- Shadows are extremely subtle in dark mode (or replaced by lighter surface tones)
- Blur used sparingly — only for modal/sheet background dismissal, not decoration
- No glassmorphism, no heavy drop shadows, no gradient backgrounds
- Depth hierarchy: 3–4 distinct surface levels max

### 6. Confident Restraint

The aesthetic sits between neo-brutalist confidence and neumorphic refinement. Opinionated but not aggressive. Premium but not precious. The design equivalent of Crosby's voice: direct, competent, with quiet personality.

**What this means in practice:**
- Strong typographic hierarchy — bold choices, not safe ones
- Minimal color palette used with conviction (one or two accent colors, max)
- Sharp corners or very subtle rounding — no mushy border-radius
- UI elements feel intentional, like each one was placed with reason
- Nothing decorative — everything earns its place
- Visual personality comes from typography and spacing, not from effects

### 7. Utilitarian Warmth

The interface is a tool first, but a tool you enjoy using. Warmth comes from color temperature (warm darks, not cold grays), natural typography, and thoughtful spacing — not from illustrations, emojis, or playful elements.

**What this means in practice:**
- Warm dark palette (brown-gray tones, not blue-gray or pure black)
- Generous whitespace / breathing room — not cramped
- Interaction feedback that feels responsive and alive
- Empty states and loading states that feel considered, not afterthoughts
- Error messages that sound like Crosby (direct, helpful, not robotic)

---

## Research Phase

### Perplexity Reports (In Progress)

Seven research prompts submitted. Reports will be filed in `crosby-v2/research/` when received:

| # | Topic | Status | Target File |
|---|-------|--------|-------------|
| 1 | Dark UI design systems (Linear, Vercel, Raycast, etc.) | Pending | `research/dark-ui-design-systems-2026.md` |
| 2 | AI chat interface design patterns | Pending | `research/ai-chat-interface-design-2026.md` |
| 3 | Dashboard design for info-dense personal tools | Pending | `research/dashboard-design-personal-tools-2026.md` |
| 4 | Typography in utilitarian apps | Pending | `research/typography-utilitarian-apps-2026.md` |
| 5 | Motion & micro-interaction in professional tools | Pending | `research/motion-microinteraction-design-2026.md` |
| 6 | Mobile-first design for desktop-class apps | Pending | `research/mobile-first-desktop-class-2026.md` |
| 7 | AI coding tools for UI/UX (MCPs, plugins, CLI tools) | Pending | `research/ai-design-tooling-2026.md` |

### Internal Research (Claude Code)

| Topic | Status | Notes |
|-------|--------|-------|
| Available design MCP servers | Done | Playwright MCP + shadcn/ui MCP installed. UX MCP optional. |
| v1 style guide analysis | Done | Read current `STYLE-GUIDE.md` — good foundation, needs expansion |
| v1 color system audit | Not started | Extract exact HSL values from `globals.css`, evaluate what carries forward |
| Competitive UI screenshots | Not started | Waiting for Jason's inspiration screenshots |
| Font exploration | Not started | Blocked on research reports for direction |

---

## Tool Usage Plan

### Available Tools and When to Use Them

| Tool | What It Does | When to Use |
|------|-------------|-------------|
| **ui-ux-pro-max** | Design system generator, 200+ rules, searchable databases for colors, fonts, styles, products, UX patterns | Phase 2: Generate base design system recommendations. Phase 4: Component-level UX validation |
| **design-maestro** | Orchestrates all design skills, project-aware context analysis, ripple effect checking | Phase 3–4: Every component/page build gets a design-maestro pass for consistency |
| **frontend-design** | Distinctive, production-grade UI with bold aesthetic choices | Phase 3: Initial visual direction — use to break out of generic AI aesthetics |
| **Playwright MCP** | Navigate dev server, take screenshots, interact with pages, visual verification | Phase 4+: Verify every built component actually looks right in the browser |
| **shadcn/ui MCP** | Component docs, props, variants, installation | Phase 3–4: Look up exact component APIs when building |
| **Figma MCP** | Read designs from Figma, extract design context | If Jason creates Figma reference designs |
| **ui-ux-pro-max search script** | `python3 scripts/search.py` for detailed domain searches | Phase 2: Deep searches for color palettes, font pairings, chart types, UX rules |

### Tool Workflow Per Phase

**Phase 2 (Design System):**
1. Run `ui-ux-pro-max --design-system` for base recommendations
2. Run domain searches for color, typography, style refinement
3. Use `frontend-design` thinking to push past generic choices
4. Persist with `--persist` flag for session-to-session consistency

**Phase 3 (Components):**
1. For each component: check `shadcn/ui MCP` for base component API
2. Apply `design-maestro` for project context + consistency check
3. Apply `ui-ux-pro-max` rules for the relevant category (forms, navigation, etc.)

**Phase 4 (Pages):**
1. Build page layout
2. Start dev server, use `Playwright MCP` to screenshot at 375px, 768px, 1440px
3. Run `design-maestro` review for cross-page consistency
4. Run accessibility check via CLI (`npx axe-cli localhost:3010`)

---

## Design System Deliverables

### What the Final Style Guide Must Contain

Each section needs to be specific enough that an agent can implement it without asking questions.

#### 1. Color System
- [ ] Complete HSL token set (primitive → semantic → component layers)
- [ ] Surface elevation map (background → card → popover → tooltip)
- [ ] Text hierarchy colors (primary → secondary → muted → disabled)
- [ ] Accent color(s) with usage rules
- [ ] Status colors (success, warning, error, info) with dark-mode-tested contrast
- [ ] Opacity scale for layering effects
- [ ] All values as CSS custom properties with Tailwind mapping

#### 2. Typography System
- [ ] Font family selection (display + body + mono) with rationale
- [ ] Complete type scale (size, weight, line-height, letter-spacing per level)
- [ ] Fluid type scale using `clamp()` values
- [ ] Usage rules: which scale level for which UI element
- [ ] Font loading strategy (variable font, `font-display`, preload)

#### 3. Spacing & Layout
- [ ] Base spacing unit and scale
- [ ] Fluid spacing values using `clamp()` where appropriate
- [ ] Layout grid (content widths, gutters, margins per breakpoint)
- [ ] Component internal spacing rules
- [ ] Section spacing hierarchy
- [ ] Safe area handling (iOS notch, status bar, gesture bar)

#### 4. Borders, Radius & Elevation
- [ ] Border color tokens and usage rules
- [ ] Border-radius scale with usage rules per component type
- [ ] Elevation/shadow scale (if any — may be zero in dark mode)
- [ ] Divider patterns

#### 5. Motion & Animation
- [ ] Timing tokens (duration scale, easing curves)
- [ ] Transition map: which properties animate for which interactions
- [ ] Entrance/exit patterns for components (modals, sheets, toasts, list items)
- [ ] Loading state patterns (skeleton, spinner, streaming text)
- [ ] Reduced-motion fallbacks
- [ ] Spring values for physics-based animations (if using Framer Motion)

#### 6. Component Patterns
- [ ] Button variants (primary, secondary, ghost, destructive) with all states
- [ ] Input/form field patterns with all states (default, focus, error, disabled)
- [ ] Card patterns with surface hierarchy
- [ ] Modal/dialog/sheet patterns with motion
- [ ] Toast/notification patterns
- [ ] Navigation patterns (sidebar, bottom tab bar, breadcrumbs)
- [ ] Chat-specific patterns (message bubbles, streaming, tool calls, artifacts)
- [ ] Dashboard-specific patterns (cards, widgets, data display)
- [ ] Empty state patterns
- [ ] Loading state patterns

#### 7. Iconography
- [ ] Icon library choice and rationale
- [ ] Size scale per context
- [ ] Stroke width consistency
- [ ] Color rules (when icons inherit text color vs have their own)

#### 8. Accessibility Standards
- [ ] Minimum contrast ratios (WCAG AA targets)
- [ ] Focus ring specification
- [ ] Touch target minimums
- [ ] Screen reader considerations per component type
- [ ] Keyboard navigation patterns
- [ ] Reduced motion support

---

## Process

### Phase 1: Research & Philosophy — DONE
- [x] Extract design philosophies from Jason's reference material (7 principles)
- [x] Research available design tools (MCPs, CLI tools)
- [x] Install Playwright MCP and shadcn/ui MCP
- [x] Receive and synthesize Perplexity research reports (9 reports filed)
- [x] Collect Jason's visual inspiration screenshots (13 screenshots, 48 design signals)
- [x] Analyze inspiration for patterns and preferences

### Phase 2: Design System Foundation — DONE
- [x] Built interactive design lab (crosby-v2/design-lab.html) with persistence
- [x] Select color palette — warm sepia (35° hue), 5 luminance layers
- [x] Select typography system — Fraunces 600, Plus Jakarta Sans 400/700, JetBrains Mono 400
- [x] Define spacing scale — 4px grid, 16/12/20 padding/gap/section
- [x] Define motion language — fade up 600ms, pulse 3s, spring physics
- [x] Define border/radius/elevation — no card borders, mixed contextual radius, complementary rule
- [x] Define text opacity — 80/65/30 three-tier system
- [x] Define focus ring — 2px width, 4px offset, accent at 0.4
- [x] Define interaction feedback — press (translateY+opacity), hover (lift+brightness)
- [x] Review with Jason — all decisions locked

### Phase 3: Component Specification — DONE
- [x] Spec component patterns (buttons, cards, inputs, badges, nav, chat, KPI, empty states)
- [x] Define chat-specific patterns (user/AI distinction, timestamps, inline data)
- [x] Define dashboard patterns (KPI cards, accent highlighting)
- [x] Define navigation patterns (Fraunces sidebar + filled tab bar)
- [x] Define interaction specification (hover, press, focus, loading, entrance)
- [x] Lock component stack (shadcn/ui + AI Elements + Motion + Tailwind Motion)

### Phase 4: Documentation & Integration — DONE
- [x] Write STYLE-GUIDE-v2.md (production-ready style guide)
- [x] Update CLAUDE.md with v2 design system section + quick reference table
- [x] Document MCP install commands for build phase
- [x] Update DESIGN-DIRECTION.md — all open questions resolved
- [x] Update README.md index with all new research files

### Skipped (Not Needed)
- Page template mockups — will be verified during build via Playwright
- ui-ux-pro-max design system generator — manual process with design lab was more effective
- Page-specific override files — single style guide is sufficient

---

## Inspiration Collection

Jason will provide screenshots of apps and interfaces he likes. They'll be analyzed and cataloged here.

### How Inspiration Gets Used

1. Jason shares screenshots
2. Claude analyzes each for: color, typography, spacing, layout, motion, interaction patterns
3. Patterns are extracted and mapped to Crosby's design philosophies
4. Specific elements are referenced in the design system decisions (e.g., "surface layering inspired by Linear's dark mode")

### Screenshots Received
*(Will be updated as Jason shares them)*

- None yet — waiting for inspiration collection phase

---

## CLAUDE.md Integration Plan

When the style guide is complete, the following updates go into `CLAUDE.md`:

1. **Replace the current `## UI Design` section** with a reference to the new style guide
2. **Add a `## Design System` section** with:
   - Path to the style guide
   - Path to the design token files
   - The 7 design philosophies as a quick reference
   - Rules for when to use which design tools
3. **Add to build agent instructions** in `architecture/BUILD-PLAN.md`:
   - Every UI-building agent must read the style guide before writing any component
   - Every agent must run design-maestro review before marking a component done
   - Playwright visual verification required for all page-level work
