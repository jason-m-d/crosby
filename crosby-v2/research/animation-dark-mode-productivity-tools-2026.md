# Animation & Micro-Interaction Patterns in Dark-Mode Productivity & AI Tools (2024–2026)

## Overview

The six tools examined — Linear, Raycast, Warp Terminal, Cursor IDE, Arc Browser, and Things 3 — share a unified design philosophy even though they span web, native macOS, and iOS platforms: **motion is a communication layer, not a decoration layer**. Each tool uses animation to answer one of three questions for the user: *What just changed? What is happening right now? What can I do here?* The result is motion that feels fast and earned rather than theatrical.

The deepest shared principle is restraint calibrated by surface area. Dark backgrounds amplify every animated element — a white glow or opacity shift that would be subtle on a light canvas becomes a laser pointer on `#050506`. This forces all six products to use smaller amplitudes, shorter durations, and more opacity-based transitions than equivalent light-mode tools would require. Overly bright or rapid transitions in dark UI directly cause eye fatigue, which is why the category converged on shorter durations and ease-out curves as defaults.[^1]

***

## Motion Philosophy: Purposeful vs. Delight

Before diving per-product, the taxonomy that drives every decision:

**Purposeful motion** answers a functional question. Examples: a streaming cursor that says "the AI is still writing", a list row highlight that says "this item is keyboard-focused", a toggle thumb slide that says "this setting is now on". If you stripped this animation, the user would be confused or miss information.

**Delight motion** exists because the tool earns trust through craft, not because the motion is required. Examples: Arc's fidget-spinner logo on empty tabs, Things 3's Magic Plus button that deforms like liquid under a finger, Raycast's spring-bounced launcher appearance. The user could complete the task without this motion — but its presence signals that the product team cares about the experience as deeply as the user.[^2][^3]

The golden rule: **if an animation does not communicate state, guide the user, or reduce uncertainty, it probably should not exist**. Tools that fall in love with delight motion and overuse it produce sluggish, bloated interfaces. The six products here are studied precisely because they get this balance right.[^4]

***

## Timing and Easing Reference

### Duration Scale

The industry converged on a consistent duration ladder for dark-mode productivity tools:[^5]

| Duration | Use Case | Examples |
|---|---|---|
| 50ms | Active/pressed states, immediate feedback | Button press, key-down highlight |
| 80–100ms | Ghost text fade-in, focused micro-interactions | Cursor IDE ghost completion |
| 150ms | Small element entrances, hover reveals | Warp block entry, action button reveal |
| 200–250ms | Standard transitions, list item enters | Warp AI suggestion, Linear row hover |
| 300–350ms | Modal/panel appearances, complex state changes | Command palette open, dialog entry |
| 400–500ms | Page transitions, panel slides | Navigation changes |
| 1000–1400ms | Infinite looping ambient states | Streaming cursors, AI thinking dots |

The important nuance for dark mode: durations at the shorter end feel snappier and less fatiguing than the same motion would on a white background, because contrast is already doing the perceptual work of separating layers.[^1]

### Easing Functions

- **Entrances**: `ease-out` or `cubic-bezier(0.33, 1, 0.68, 1)` — starts fast, decelerates into rest. Matches gravity; feels natural.[^6]
- **Exits**: `ease-in` or `cubic-bezier(0.55, 0, 1, 0.45)` — accelerates away. Dismissing something should feel decisive.
- **Color changes**: `linear` — steep curves on color transitions look jarring.[^7]
- **Hover in**: `ease-in-out` — hovering is often semi-accidental, so starting soft and ending soft feels correct.[^6]
- **Spring-based**: When using spring physics (Framer Motion, SwiftUI, react-spring), the standard productive profile is `stiffness: 260, damping: 22, mass: 1`. Higher stiffness (500–800) creates snappy launcher-style feels; lower stiffness (100–150) creates heavier, modal-weight motion.[^8]

### What to Always Animate (GPU Composited Properties Only)

Animate `transform` and `opacity` exclusively for performance-critical paths. These are compositor-only properties that run off the main thread at 60–120fps. Animating `width`, `height`, `top`, `left`, or `background-color` forces layout recalculation and produces dropped frames, which is especially noticeable during AI streaming where the document is actively changing.[^9][^10]

***

## Linear

Linear represents the platonic ideal of dark-mode productivity motion — what its community calls **cinematic minimalism**: "software that feels expensive without being ostentatious".[^11]

### Color System Foundation

Motion in Linear cannot be understood apart from its color tokens. The background stack is `#020203` (deepest), `#050506` (primary canvas), and `#0a0a0c` (elevated surfaces). Interactive surfaces hover at `rgba(255,255,255,0.05)` and shift to `rgba(255,255,255,0.08)` on hover, with border values moving from `rgba(255,255,255,0.06)` to `rgba(255,255,255,0.10)`. These are incredibly subtle shifts — 2–3% opacity change — that are only legible because the base canvas is nearly black.[^11]

The accent color `#5E6AD2` (indigo-purple) glows at `rgba(94,106,210,0.3)` as a halo on focused interactive elements. Linear uses the LCH color space for its entire theme generation system rather than HSL, which ensures perceptual uniformity across elevation layers — a red and a yellow at "lightness 50" appear equally light to the human eye. This means the team could define just three root variables (base color, accent color, contrast) and automatically generate 98 theme tokens.[^12][^11]

### Issue List Entrance Choreography

Linear's list items enter with a staggered pattern: each row fades in with `opacity: 0 → 1` and a small `translateY(-6px) → 0` at approximately `200ms` with `cubic-bezier(0.33, 1, 0.68, 1)` (expo-out). Stagger delay between items is approximately 20–30ms. The result is a cascade that reads top-to-bottom, implying the list is "loading in" rather than appearing all at once. For keyboard navigation, the focused row gets an immediate (0ms delay) background fill to `rgba(255,255,255,0.08)`.

### Hover State Feedback

Linear's hover states are deliberately understated. The row background transitions to `surface-hover` over `150ms ease-out`. What makes it feel premium is what Linear *doesn't* animate: there's no scale, no border glow, no shadow change. The only signal is the opacity bump. This restraint reads as confidence — the UI isn't begging for attention, it's simply reporting state.[^11]

### Page Transition Pattern

Linear is an Electron app with a custom navigation stack. Section transitions (e.g., switching from Issues to Inbox) use a `150ms` crossfade (`opacity` on both outgoing and incoming views) with a very slight horizontal translate (`translateX(±8px)`) that hints at spatial direction. This is functionally a View Transitions-style pattern implemented in JavaScript, predating the native CSS View Transitions API adoption.

***

## Raycast

Raycast is constrained by a single UX contract: the launcher must feel **instantaneous**. Any perceptible delay or animation hesitation breaks the illusion that Raycast is a zero-latency extension of the keyboard. The entire motion system is engineered to serve this constraint.

### Launcher Appearance and Dismissal

Raycast uses macOS spring physics via SwiftUI or AppKit spring timing. The appearance animation is a spring with high stiffness (approximately 400–600) and sufficient damping to prevent overshoot — roughly `stiffness: 500, damping: 35`. This reads as a very fast `120ms` settle into position. The launcher slides in from `translateY(10px)` with simultaneous `opacity: 0 → 1` and a very slight `scaleY: 0.96 → 1`. The combined effect is that the window seems to "snap" into existence rather than "slide" into it.

Dismissal is faster: `80ms ease-in` with the same properties reversed. Exits are always shorter than entrances — the user's attention has moved on.

Raycast specifically targets ProMotion displays (120fps) on Apple Silicon Macs, which means spring animations run at double the temporal resolution of a 60fps display. At 120fps, even a 100ms spring feels substantially smoother than at 60fps. The product team explicitly designs for this.[^13]

### Result List Navigation

When the user presses arrow keys, the focused row moves its selection indicator with a spring: `stiffness: 350, damping: 30`. This creates a subtle "sliding" highlight that tracks keyboard movement rather than teleporting. Individual result rows don't animate on navigation — only the focus indicator moves. The fade-out on HUD notifications uses a short ease-in (~150ms) that mimics a quick dismissal.[^14]

### Command Palette Physics

Raycast's spring-driven animation philosophy extends to secondary panels. When a sub-command or action panel opens, it enters from the bottom with `translateY(12px) → 0, opacity 0 → 1` over approximately `200ms` using the same spring profile. The panel feels like it's being revealed from beneath — appropriate for information that exists "under" the current context.

***

## Warp Terminal

Warp is architecturally unique: it's a GPU-rendered UI built in Rust using Metal, targeting 144fps+ even on 4K displays. This performance budget allows Warp to run animations that would stutter in an Electron app. The visual design uses animation explicitly to restructure the cognitive model of "what a terminal is."[^9]

### Block Entrance Animation

Every command-output pair is a structured "block" rather than continuous scrolling text. When a new block appears, it animates in with:[^9]

```css
@keyframes block-enter {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.block {
  animation: block-enter 150ms ease-out;
}
```


The `-4px` upward entry (not downward) is intentional — it implies the block is emerging from the command that generated it, connecting cause and effect spatially. This is purposeful motion: it communicates the relationship between input and output that traditional terminals leave ambiguous.

### AI Suggestion Reveal

When Warp's AI surfaces a contextual suggestion (e.g., after a failed git push), the suggestion panel reveals with:

```css
@keyframes suggestion-reveal {
  from { opacity: 0; transform: translateY(8px); max-height: 0; }
  to   { opacity: 1; transform: translateY(0); max-height: 200px; }
}
.ai-suggestion { animation: suggestion-reveal 200ms ease-out; }
.ai-suggestion.dismissing { animation: suggestion-reveal 150ms ease-in reverse; }
```


The `max-height` animation from `0` is a common pattern for "revealing" content without knowing its final height. It's slightly less performant than transform-only animation, but the height range (0–200px) is small enough that it doesn't cause layout thrashing at Warp's GPU rendering layer.

### Streaming and Loading States

Warp uses two distinct patterns for system status — a critical distinction that most tools conflate:

**Active execution (command running):** A blinking block cursor appended after the last output character, using `step-end` timing which creates a hard on/off blink (no fade) at 1s intervals — mimicking a physical terminal's character cursor.[^15]

```css
.block.executing::after {
  width: 8px; height: 16px;
  background: var(--color-focus);
  animation: cursor-blink 1s step-end infinite;
}
@keyframes cursor-blink { 50% { opacity: 0; } }
```

**AI processing (model generating a response):** Three dots with staggered scale pulses:

```css
.ai-thinking span {
  width: 6px; height: 6px;
  background: var(--color-ai); /* #A855F7 — purple */
  border-radius: 50%;
  animation: thinking-pulse 1.4s infinite ease-in-out both;
}
.ai-thinking span:nth-child(1) { animation-delay: 0s; }
.ai-thinking span:nth-child(2) { animation-delay: 0.16s; }
.ai-thinking span:nth-child(3) { animation-delay: 0.32s; }
@keyframes thinking-pulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40%           { transform: scale(1);   opacity: 1; }
}
```


The deliberate use of **purple** for the AI thinking state — while the rest of the terminal UI uses neutral grays and blues — is a semaphore: purple = machine cognition, blue = system focus, green = success. Color here is doing categorical work that goes beyond aesthetics.

The 1.4s cycle for the thinking dots is not arbitrary. It's calibrated to feel neither rushed (anxiety-inducing) nor too slow (suggesting something broke). This 1.4s value appears in both Warp and ChatGPT's typing indicator independently, suggesting the pattern emerged from shared user testing around perceived "AI responsiveness."[^16]

### Block Action Hover Reveal

Block action buttons (copy, share, re-run) are opacity-hidden until hover, following a pattern consistent across all six tools:

```css
.block-actions {
  opacity: 0;
  transition: opacity 150ms ease;
}
.block:hover .block-actions { opacity: 1; }
```


The 150ms ease here is notable: it's fast enough to feel responsive but slow enough that accidental micro-hovers don't flash buttons in and out.

***

## Cursor IDE

Cursor's motion design operates under a constraint no other tool in this list faces: it's built on VS Code (Electron), which means most rendering passes through VS Code's extension API and has limited access to compositor-only animation paths. The team compensates by controlling the specific Cursor-branded overlays and panels carefully.

### Ghost Text Completion Animation

Ghost text (the inline AI completion suggestion shown in dimmed text) uses a 80ms fade-in — deliberately faster than the 100ms standard — to feel "instant" and not create a visual pop:[^17]

```css
/* ghost-text.css — Cursor's proprietary layer */
.ghost-text-completion {
  font-style: normal;        /* non-italic, unlike default */
  color: var(--ghost-text-color); /* theme-aware */
  animation: ghost-fade-in 80ms ease-out forwards;
}
@keyframes ghost-fade-in {
  from { opacity: 0; }
  to   { opacity: 0.6; } /* never full opacity — signals "suggestion, not committed" */
}
```

The streaming animation for partial completions (as tokens arrive) is a progressive opacity reveal per-character rather than a full line replace. The ghost text dim value (`opacity: 0.6` against dark backgrounds) is critical — too dim and it's invisible, too bright and it looks committed.[^17]

### Streaming Diff View

When Cursor's Agent mode writes code into a file, the incoming lines use a green background highlight (`rgba(40, 167, 69, 0.15)` on dark themes) that fades in as each line is written. This is purposeful motion: it draws the eye to what changed without requiring the user to diff manually. Deleted lines use red (`rgba(220, 53, 69, 0.15)`). The highlight fades over approximately 2 seconds after the stream completes, leaving clean code.

### AI Response Streaming

Cursor historically supported a word-by-word streaming toggle; the current version streams by default. The streaming text pattern follows industry standard: tokens append to the DOM as they arrive via server-sent events, with a blinking cursor `▍` appended at the end of the stream. When streaming completes, the cursor disappears without animation — an abrupt end that signals "done" more clearly than a fade-out would.[^18]

***

## Arc Browser

Arc's motion design strategy is the most emotionally expressive of the six products — The Browser Company made a deliberate bet that delight-forward animations build brand loyalty in a category (web browsers) that had historically been motion-neutral.

### Sidebar and Space Transitions

Arc's sidebar uses a persistent left panel architecture. When switching between Spaces (workspaces), the content area transitions with a crossfade (~200ms ease-out) combined with a very slight horizontal slide (±8px translate). The sidebar itself doesn't animate on space switch — only the main content area moves. This asymmetry is intentional: the sidebar acts as a fixed navigational anchor while the "world" it points to shifts.

Tab pinning and dragging use a spring-based "snap" animation when tabs reach their resting position after a drag. The drag tracking is 1:1 (no animation during active drag), but release triggers a spring settle: `stiffness: 300, damping: 28`, creating a small bounce that communicates "locked in."

### Command Bar (Cmd+T)

Arc's command bar slides down from the top of the screen with `translateY(-12px) → 0, opacity 0 → 1` over approximately `200ms` using an `ease-out` curve. This downward entry from the top connects the command bar spatially to the tab bar above it. Dismissal is `120ms ease-in` with the reverse. The result sequence feels like the bar "drops" from the tab bar and retracts back to it.

### Page Navigation

Arc was an early adopter of Chromium's View Transitions API. Within-Space navigation uses a crossfade by default. The back/forward gesture (trackpad swipe) triggers a direction-aware slide: forward nav → new page slides in from right, back nav → old page slides back in from left. Duration is approximately `300ms` with native spring physics from Chromium's compositor.[^19]

### The Fidget Spinner: Purposeful Delight

When a user closes all tabs in a Space, the Arc logo appears and can be physically spun or flung across the screen with haptic feedback on iOS. This is the clearest example in the product catalog of **delight motion** serving a psychological purpose rather than a functional one: the empty-state moment (a frustrating UX dead end in most browsers) becomes playful and memorable. It doesn't help the user navigate — it builds an emotional association with the brand at a moment of potential abandonment.[^2]

***

## Things 3

Things 3 by Cultured Code represents the gold standard for native Apple platform animation. It uses a **custom-built animation toolkit** — Cultured Code didn't reach for UIKit's standard animations but built their own to achieve precise spring curves and haptic integration. The design philosophy is explicit and famous in the Apple design community:[^20]

> "Each animation is purposeful. Mainly, it is fun. It's a fun app to be in. To put stuff into, to rearrange."[^21]

### Task Completion Animation

The checkmark completion is Things 3's signature motion. When a task is checked, the circle completes with a spring-driven stroke animation (not a linear fill), the row scales down slightly (`scaleY: 0.85`) and simultaneously fades to ~30% opacity before sliding off to the right. On iOS, a subtle haptic tap fires in sync with the moment of completion. The combined sequence takes ~320ms and communicates: *this thing is gone, you did it, feel good about it.*[^22]

This is purposeful motion that also serves delight — it communicates the state change while providing emotional reward.

### List Entry Choreography

New tasks enter with `opacity: 0 → 1` and `translateY(8px) → 0` over ~200ms. When added via the Magic Plus button, the list briefly highlights the newly created row — a visual "here's what you just made" pointer. Multiple tasks added in quick succession (e.g., pasting a list) stagger at approximately 40ms per item.

When a task expands into its card view, the surrounding list items dim to approximately 50% opacity — an obscuration technique that reduces distraction rather than hiding content entirely. This is more sophisticated than a full-screen modal because the user can still see context.[^23]

### Magic Plus Button: Liquid Deformation

The Magic Plus button (the floating action button for task creation) is the most technically impressive animation in this product set. As the user drags it around the screen, **it deforms its shape in response to movement — behaving like a liquid**. The leading edge stretches forward while the trailing edge contracts. This requires per-frame shape morphing, not a simple transform. Cultured Code achieves this with their custom animation toolkit using `CAShapeLayer` and bezier path interpolation driven by velocity vectors.[^3]

This is pure delight motion — it adds no functional information — but it makes the act of task creation tactile and memorable.

### Glassy Button States

iOS buttons in Things 3 respond to touch with a subtle glow + `scale(0.96)` on press, returning with a spring overshoot to `scale(1.02)` before settling at `1.0`. This spring profile (`stiffness: ~350, damping: ~20`) gives the buttons a "clicky" physical quality. The glow is an outward radial opacity gradient in the accent color, appearing over ~80ms and fading over ~200ms.[^3]

***

## AI Response Streaming: A Category-Wide Pattern

All three AI-enabled tools (Warp, Cursor, Arc) — plus the broader category of AI productivity tools — share a convergent pattern for streaming responses that deserves unified analysis.

### The Streaming Cursor

The near-universal pattern is a blinking 2px vertical cursor (`▍` or a CSS pseudo-element) appended to the end of streaming text:[^24][^25]

```css
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  animation: cursor-blink 500ms step-end infinite;
}
@keyframes cursor-blink { 50% { opacity: 0; } }
```

The 500ms cycle is calibrated to match the perceived rhythm of human typing. Slower (1s+) feels robotic. Faster (200ms) creates anxiety. Step-end timing (hard on/off, no fade) is deliberately mechanical — it signals "machine writing" rather than "human pause."[^16]

When the stream completes, the cursor is removed without animation — an intentional hard cut. A fade-out would signal "winding down" rather than "complete."

### The Thinking / Loading Indicator

Before streaming begins (during model inference), the category uses the three-dot pulse pattern:[^16][^15]
- Three dots, 6–8px diameter
- Each pulses scale `0.6 → 1.0` and opacity `0.5 → 1.0`
- Stagger delay: ~160ms between each dot
- Total cycle: 1.4s, `ease-in-out`

The 1.4s total cycle emerged independently across ChatGPT, Warp, and other tools. It matches the rhythm of a person nodding in acknowledgment — "yes, I heard you, I'm thinking." This is motion as trust signal: it prevents the blank-screen "is this broken?" anxiety that leads to refresh loops.

### Why Streaming Reduces Perceived Wait Time

Streaming text output transforms a 4-second wait into a 4-second reading experience. Users tested with streaming vs. batch responses reported 55–70% lower perceived wait times even when total generation time was identical. The mechanism: reading occupies working memory in a way that passive waiting does not. The cursor animation maintains this engagement during any inference pauses between token bursts.[^25]

***

## Toggle and Switch Animations

All six products use toggles/switches, and the pattern is highly consistent across iOS native and web implementations.

The thumb slides with spring physics (`stiffness: 300, damping: 25`), which creates a small overshoot on arrival. The background color transitions from off-state (dark neutral, ~`rgba(255,255,255,0.15)`) to on-state (accent color) over `200ms linear`. Linear timing for the color change is intentional — a steep curve on color makes the intermediate states look wrong.[^7]

The total toggle animation sequence:
1. **Thumb translate**: Spring, ~200ms perceived duration
2. **Background color fill**: Linear, 200ms, starts simultaneously
3. **Scale pulse** (on iOS/Things): `scale(0.95)` on press, spring back to `1.0` on release

What makes this feel satisfying is that the spring on the thumb and the linear on the background run concurrently but at slightly different "feels" — the thumb bounces to rest while the color crisply switches. The combination reads as mechanical (definitive) yet physical (spring).

***

## Page Transitions: Spatial Navigation

All tools that have meaningful navigation implement some form of spatial transition — motion that communicates *where* the new content is relative to where the user was.

| Tool | Pattern | Duration | Easing |
|---|---|---|---|
| Linear | Cross-fade + ±8px horizontal hint | 150ms | ease-out |
| Raycast | Spring drop-in from above | ~120ms spring | stiffness:500, damping:35 |
| Warp | Block fade from above (-4px) | 150ms | ease-out |
| Cursor | VS Code view transitions | 150ms | ease |
| Arc | Direction-aware slide (View Transitions API) | 300ms | spring/ease-out |
| Things 3 | Card expand with background dimming | ~280ms | spring |

The direction convention for drill-down navigation: **right/down for forward, left/up for back**. This mirrors iOS navigation conventions (push right, pop left) and creates a consistent spatial mental model across apps. Arc implements this explicitly with its View Transitions API integration.[^26][^19]

***

## Dark Mode-Specific Motion Considerations

Dark backgrounds change motion semantics in four critical ways:

**1. Amplitude reduction.** A `translateY(8px)` entrance on a dark background reads as aggressively as a `16px` move on a light one, because the contrast makes displacement more visible. Most dark-mode tools use 4–8px translations where their light-mode equivalents might use 8–16px.

**2. Opacity sensitivity.** On `#050506` backgrounds, opacity shifts of 3–5% are visible and sufficient for hover states. Light-mode tools need 8–15% shifts for equivalent perceptibility. This means dark-mode hover states are subtler absolutely but equivalent perceptually.

**3. Glow instead of shadow.** Light-mode uses drop shadows for elevation signaling. Dark-mode uses outward glows — `box-shadow: 0 0 0 1px rgba(94,106,210,0.3)` rather than `0 4px 8px rgba(0,0,0,0.3)`. Glows as transitions: opacity `0 → 0.3` signals focus or hover without a movement.[^27][^11]

**4. Color as categorical signal.** Against near-black, accent colors carry semantic weight that they can't achieve in light mode. Warp uses purple exclusively for AI state; Linear uses indigo exclusively for interactive focus. In dark mode, these colors become unmistakable semaphores.[^11][^15]

***

## The `prefers-reduced-motion` Obligation

Every tool in this set should — and the best implementations do — respect the `prefers-reduced-motion` OS preference:[^10][^4]

```css
@media (prefers-reduced-motion: reduce) {
  /* Replace spring/slide animations with instant opacity transitions */
  .animated-element {
    animation: none !important;
    transition: opacity 150ms ease !important;
  }
}
```

The implementation principle: never disable the state change, only disable the movement. A toggle that doesn't flip its color for reduced-motion users is broken. A toggle that flips its color without spring animation is accessible.

***

## Synthesis: What Makes This Motion Language Coherent

Across these six products, four principles create coherence:

**1. Opacity and transform are the only currencies.** Every animation in this category runs on `opacity` and `transform` exclusively, keeping all animation on the GPU compositor thread. This is non-negotiable at the performance expectations of developer and productivity tools.[^10]

**2. Spring physics, not bezier durations.** The shift away from fixed-duration easing curves to physics-based springs is the defining motion change of 2024–2026. Springs respond to interruption correctly (you can change direction mid-animation), feel physical rather than programmatic, and naturally produce the "snappy but not harsh" quality that dark-mode tools require.[^28][^29]

**3. Motion as semantic layer, not aesthetic layer.** The most studied animation in this category — the AI streaming cursor — exists entirely to communicate one bit of information: *generation is in progress*. Everything else follows: color designates category (purple = AI, blue = focus, green = success), direction designates hierarchy (down/right = forward), timing designates importance (fast = micro-feedback, slow = navigation).

**4. Delight is earned, not assumed.** Things 3's liquid Magic Plus button, Arc's fidget spinner, Raycast's spring bounce — each exists because the product first solved function completely, then added delight at moments of accomplishment or potential abandonment. Delight motion in this category is a reward for getting the core experience right, not a compensation for getting it wrong.

---

## References

1. [Dark Mode in App Design: Principles & Tips | Ramotion Agency](https://www.ramotion.com/blog/dark-mode-in-app-design/) - The dark mode version is an alternative visual option where the device or application interface is d...

2. [3 Impactful Micro-Interaction Examples That Improved UX](https://cxl.com/blog/micro-interaction-examples/) - Micro-interactions are subtle, interactive design elements that guide, delight, or provide feedback ...

3. [Things Blog - Cultured Code](https://culturedcode.com/things/blog/) - We've rebuilt Things Cloud from the ground up. The system that keeps your to-dos in sync is now fast...

4. [Micro-interactions in web design: practical guide](https://midrocket.com/en/guides/micro-interactions-web-design/) - Discover what micro-interactions are, common types, implementation best practices and their real imp...

5. [Motion Design Principles | Ultimate MkDocs Material Guide](https://albrittonanalytics.com/brand/motion-principles/) - Animation philosophy, timing guidelines, and implementation patterns for creating a cohesive motion ...

6. [Animation for Developers - DEV Community](https://dev.to/iamschulz/animation-for-developers-c4b) - This is going to be an article about motion in Interface Design. You'll hear me rambling about the i...

7. [Animation and motion standards - ASU Brand Guide](https://brandguide.asu.edu/execution-guidelines/web/ux-design/animation) - An animation is a series of images or state changes that create an illusion of movement. It allows a...

8. [Adaptive Microinteraction Design 2025 — Motion Guidelines ...](https://unifiedimagetools.com/en/articles/adaptive-microinteraction-design-2025) - A framework for crafting microinteractions that adapt to input devices and personalization rules whi...

9. [How Warp Works](https://www.warp.dev/blog/how-warp-works) - Understand more about the product and engineering choices behind Warp - why Rust + Metal, compatibil...

10. [CSS Animations & Transitions Mastery: From Hover Effects to ...](https://munsifshaik.com/blog/css-animations-transitions-mastery) - Master CSS transitions and animations. Covers timing functions, @keyframes, animation-fill-mode, per...

11. [Linear Modern Website Design | FindSkill.ai — Master Any Skill with AI](https://findskill.ai/skills/design-media/linear-modern-design/) - Create cinematic dark mode websites with ambient gradient blobs, mouse-tracking spotlights, multi-la...

12. [How we redesigned the Linear UI (part Ⅱ)](https://linear.app/now/how-we-redesigned-the-linear-ui) - Linear is compatible with both light and dark modes, and we also provide a custom theme generator fo...

13. [Animated Window Manager - Raycast Store](https://www.raycast.com/matheuschein/animated-window-manager) - Smooth, animated window snapping on macOS using Raycast + Hammerspoon. Bring macOS-native-feeling wi...

14. [Windows Changelog - Raycast](https://www.raycast.com/changelog/windows/2) - Now, you can customize the list by clicking the new Settings icon, next to the title of the list sec...

15. [Warp: The Terminal Reimagined](https://blakecrosley.com/guides/design/warp) - How Warp reimagined the terminal: block-based output, bottom-anchored input, native AI integration, ...

16. [I Reverse-Engineered ChatGPT's UI. Here's What OpenAI Doesn't ...](https://javascript.plainenglish.io/i-reverse-engineered-chatgpts-ui-here-s-what-openai-doesn-t-want-you-to-know-93df9b31009d) - The Streaming Psychology. The typing animation isn't just visual feedback — it's psychological manip...

17. [Enhancements: Ghost Text, Performance, Code Intelligence Fixes](https://www.linkedin.com/posts/aaron-grace-aa3274118_agentprime-solo-ide-activity-7414327216668372992-VCS3) - ghost-text.css: Completed a restyle to align with Cursor's aesthetic, including: - Non-italic text -...

18. [Where did the Stream responses option go in the new version? I ...](https://forum.cursor.com/t/where-did-the-stream-responses-option-go-in-the-new-version-i-want-streaming-word-by-word-output-back/131750) - Hi everyone, In older versions of Cursor, there used to be a setting called “Stream responses”, whic...

19. [Getting started with View Transitions on multi-page apps](https://daverupert.com/2023/05/getting-started-view-transitions/) - Include the view-transition meta tag CSS @-rule. The first step towards multipage view transitions i...

20. [What's New in the all-new Things. Your to-do list for Mac & iOS](https://culturedcode.com/things/features/) - The design team at Cultured Code have worked their magic all over the app, and every individual bit ...

21. [Things - To-Do List App for Mac & iOS](https://www.culturedcode.com) - Things is the award-winning personal task manager that helps you plan your day, manage your projects...

22. [Things 3.5 Brings UI Refinements, Tagging and Automation ...](https://www.macstories.net/ios/things-3-5-brings-ui-refinements-tagging-and-automation-improvements-clipboard-integration/) - You can change the list a task belongs to or mark it as a complete. Everything a task in Things supp...

23. [Things 3 For iOS Review: – APP HUNT - WordPress.com](https://apphuntt.wordpress.com/2018/08/07/things-3-for-ios-review/) - Things 3 is packed with a stunning new interface, delightful animations, and tons of powerful featur...

24. [Ideas on ways to show animated cursor during data streaming on UI?](https://github.com/vercel/ai/discussions/528) - Anyone got any ideas on how we can get an animated cursor/prompt element when the message is being s...

25. [10 UI/UX Design Trends for AI Apps in 2026 - Groovy Web](https://www.groovyweb.co/blog/ui-ux-design-trends-ai-apps-2026) - The 10 UI/UX design trends shaping AI apps in 2026: conversational interfaces, adaptive layouts, tru...

26. [A beginner-friendly guide to view transitions in CSS - MDN Web Docs](https://developer.mozilla.org/en-US/blog/view-transitions-beginner-guide/) - Learn how to bring smooth, animated navigation to multi-page apps with view transitions. With just o...

27. [Dark Mode: How Users Think About It and Issues to Avoid - NN/G](https://www.nngroup.com/articles/dark-mode-users-issues/) - Dark Mode Issues to Avoid. It can be fairly simple to render a design in dark mode — for example, by...

28. [How Figma put the bounce in spring animations | Figma Blog](https://www.figma.com/blog/how-we-built-spring-animations/) - We're excited to share the mechanics behind the movement, and the story of how spring animations bou...

29. [Animate with springs - WWDC23 - Videos - Apple Developer](https://developer.apple.com/videos/play/wwdc2023/10158/) - Discover how you can bring life to your app with animation! We'll show you how to create amazing ani...

