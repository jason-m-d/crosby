# Dark Mode Surface Layering: How Premium Apps Create Visual Hierarchy Without Borders
## The Core Physics of Dark Mode Depth
In light mode, elevation is communicated through shadows — a darker element cast underneath a lighter surface. In dark mode, this mechanism collapses: a dark shadow on a dark background produces almost no visible contrast. The entire depth model must be rebuilt from scratch using a different principle: **lighter surfaces are closer to the viewer, darker surfaces recede**.[^1][^2][^3][^4]

This inversion mirrors real-world low-light environments. When a surface is elevated closer to a light source in a dark room, it catches more light and appears brighter. Premium dark-mode apps simulate this physically intuitive model through controlled lightness steps across 4–6 surface levels, using color rather than shadow as the primary depth signal.[^5][^1]

The general lightness architecture in perceptual color space (roughly L* in CIELAB or lightness in OKLCH) distributes surfaces across a narrow but clearly stratified band:[^2]

- **Level 0 — Root background**: L ≈ 10–12% (the darkest layer, the "floor")
- **Level 1 — Sidebars / secondary panels**: L ≈ 14–16%
- **Level 2 — Cards / content areas**: L ≈ 17–20%
- **Level 3 — Modal / overlay surfaces**: L ≈ 22–26%
- **Level 4 — Tooltips / popovers**: L ≈ 26–30%

Each 3–4 lightness points is enough for the human visual system to perceive a distinct layer. Go too wide and surfaces shout at each other; go too narrow and layers blend. The paradox of dark mode design is that this entire stratification happens inside roughly a 20-point lightness band — a range where light mode designers would barely distinguish two shades of white.[^2]

***
## App-by-App Surface Stack Analysis
### Linear
Linear is the canonical reference point for premium minimalist dark UI. Its aesthetic is defined by almost-invisible surface boundaries, surgical use of edge lighting, and the complete absence of decorative borders. The app doesn't publish its exact token values, but inspection and analysis reveal an approximate stack:[^6][^7]

- **Root background**: ~`#16161A` (desaturated near-black with a very subtle cool/violet lean)
- **Sidebar / left panel**: ~`#1C1C22` (4–6 hex steps lighter)
- **Content pane**: ~`#1F1F26` 
- **Hover states / focused rows**: noticeably brighter than the panel, but far below modal brightness
- **Command+K modal**: meaningfully brighter than the background behind it, creating unmistakable foreground pop

The key insight in Linear's hierarchy is **differential contrast**. The modal vs. background delta is subtle — just enough to feel elevated. But the row hover highlight inside the modal is a much larger jump relative to the modal surface. This communicates two things simultaneously: the modal occupies a higher Z-plane than the page, and the hover state is just a surface state, not a new layer.[^7]

Linear is famous for **edge lighting** — a 1px semi-transparent top border on elevated panels that simulates specular highlight. CSS equivalent: `border-top: 1px solid rgba(255,255,255,0.08)`. This appears prominently on modals and command palettes. The technique works because in dark environments, the light that would create a cast shadow is instead catching the upper edge of the elevated surface — and we can *see* that in dark mode in ways impossible against a white background.[^7]
### Vercel (Geist Design System)
Vercel's Geist system uses a functional color token model rather than a raw surface stack. It defines two background tiers plus a structured progression of gray tones. The dark palette from the open-source Geist UI implementation reveals the exact values:[^8][^9]

- **Background**: `#000` (or near-zero, effectively pure black for the page canvas)
- **accents_1 / surface**: `#111`
- **accents_2 / elevated surface**: `#333`
- **Component borders**: `#222–#444`
- **Secondary text**: `#888–#999`
- **Primary text**: `#eaeaea` through `#fff`

Vercel takes the most aggressive approach of any app here: it goes closer to true black than most, using `#000–#111` as its root surface. This creates a stark, high-end "blacker than black" aesthetic. The gap between levels is wide (jumping from `#111` to `#333` is a substantial visual leap), which keeps the hierarchy readable even without borders. The Vercel dashboard pairs this with very precise typography contrast — content titles at near-white, metadata at mid-gray, providing text-level hierarchy that reinforces the surface hierarchy.[^6]

The shadcn/ui dark theme (which heavily references Vercel/Geist aesthetics) uses modern OKLCH color values:[^10]
```
--background:  oklch(0.13 0.028 261.692)   /* slightly blue-tinted near-black */
--card:        oklch(0.21 0.034 264.665)   /* 8 lightness points above bg */
--border:      oklch(1 0 0 / 10%)          /* white at 10% opacity */
--input:       oklch(1 0 0 / 15%)          /* white at 15% opacity */
```

Note the **chroma value of 0.028–0.034** in the background and card tokens. This encodes a subtle blue-slate tint that is almost imperceptible as a color but prevents the surface from reading as a lifeless neutral gray.[^7][^10]
### Notion (Dark Mode)
Notion takes a distinctly different philosophy: **hue-embedded surfaces**. Rather than using neutral grays for every surface, Notion bakes a subtle hue resonance into each colored-block dark background:[^11][^12]

- **Page background**: `#191919` (near-neutral dark gray)
- **Gray block background**: `#252525` (neutral step up)
- **Blue block background**: `#1F282D` (~2–3 points lighter, but with a clear blue-slate lean)
- **Green block background**: `#242B26` (neutral-to-green shift)
- **Purple block background**: `#2A2430` (slight purple saturation in the dark)
- **Red background**: `#332523` (subtle warm-red shift)

The implication is that Notion uses surface color not just for elevation but for **semantic color coding at very low saturation**. The hue barely registers consciously, but it creates a felt sense that "this block is blue-coded" without blowing out contrast. The technique is justified by the color theory finding that dark colors tolerate saturation without looking distinctly colored: a blue-shifted `#1F282D` reads as "dark gray with some personality" rather than "blue background."[^7]

Notion's UI hierarchy runs 3 main levels: the bare page (deepest), standard block surfaces, and interactive/focused states. It's a simpler stack than Linear or Obsidian, which reflects Notion's document-centric rather than app-centric nature.[^13]
### Obsidian
Obsidian publishes its full CSS variable table openly, making it the most transparent of the group. The dark mode base color scale is:[^14]

| Variable | Dark Mode Value |
|----------|----------------|
| `--color-base-00` | `#1e1e1e` |
| `--color-base-05` | `#212121` |
| `--color-base-10` | `#242424` |
| `--color-base-20` | `#262626` |
| `--color-base-25` | `#2a2a2a` |
| `--color-base-30` | `#363636` |
| `--color-base-35` | `#3f3f3f` |
| `--color-base-40` | `#555555` |
| `--color-base-50` | `#666666` |
| `--color-base-60` | `#999999` |
| `--color-base-100` | `#dadada` |

This is a pure **neutral gray progression** with no hue shift whatsoever. The steps at the dark end (base-00 through base-25) are extremely fine-grained — as little as 2–4 hex steps — acknowledging that the human eye perceives small changes in dark lightness very sensitively. The wider steps at base-30 onward reflect that mid-range grays need more contrast to feel differentiated.[^7]

The accent system is entirely separate and computed via CSS custom property math:[^14]
```css
--accent-h: 254;
--accent-s: 80%;
--accent-l: 68%;
```
Tints and shades are derived with `calc(var(--accent-l) - 20%)` etc., meaning the entire accent hierarchy is parameterized from three root values. In practice, Obsidian uses 4–5 of the base steps for UI surfaces, relying on the fine gradations of base-00 through base-25 for its layer stack.
### Raycast
Raycast's surface system is the most precisely documented of the group through reverse-engineering analysis, and it exemplifies the macOS-native dark mode aesthetic:[^15]

```css
:root {
  --background:          #1C1C1E;  /* Apple standard dark base */
  --surface:             #242424;  /* Cards, panels; +8 luminance */
  --surface-elevated:    #2C2C2E;  /* Elevated elements; +8 more */
  --surface-overlay:     #3A3A3C;  /* Dropdowns, tooltips */
  --surface-translucent: rgba(36, 36, 36, 0.85);
  --overlay-translucent: rgba(44, 44, 46, 0.75);
}
```

Each step in the opaque stack is **6–8 luminance points** — precisely enough for the brain to register Z-separation without a visual jump. The text hierarchy is opacity-based rather than fixed-hex:[^15]
```css
--text-primary:   #FFFFFF;
--text-secondary: rgba(255, 255, 255, 0.55);
--text-tertiary:  rgba(255, 255, 255, 0.30);
```

This is significant: opacity-based text tokens are *additive*. Tertiary text at 30% opacity reads differently on `#1C1C1E` vs. `#2C2C2E`, which creates automatic depth reinforcement — text in elevated panels has slightly higher effective contrast. The classic white-opacity text stack is Raycast's adaptation of Apple's Human Interface Guidelines dark mode text rendering.[^16]

The **command palette** uses a translucent layer with a critical `saturate(180%)` filter on the backdrop:[^15]
```css
.command-panel {
  background: rgba(28, 28, 30, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

The `saturate(180%)` is the detail most developers miss. It amplifies the colors in the content *behind* the panel, so they bleed through more vividly. The result is a jewel-like quality: the panel doesn't just blur its background, it enhances it, creating the premium "this knows what it's doing" feeling the app is famous for. Blur radius is also conservatively set at 20px rather than the typical overextended 40–60px developers default to.[^15]
### Arc Browser
![](images/image_1.png)
Arc Browser interface
Arc takes a fundamentally different approach from all others: **user-defined surface hues with system-level depth**. Arc's sidebar hue is the user's chosen Space color, and the depth model relies on macOS vibrancy/transparency rather than a fixed surface stack. On Mac, Arc's sidebar leverages the native `NSVisualEffectView` vibrancy system, which blurs and saturates the desktop content behind the window for depth.[^17][^18]

Within dark mode, Arc allows a "graininess dial" on macOS — a luminance noise overlay that users can intensify. This makes Arc the only app in this group that exposes noise texture as a *user-controllable parameter* rather than a fixed design decision. The grain breaks up the flat colored sidebar and gives it material texture.[^18]

The content area uses a standard browser-rendered background (typically white or the page's own background), which means Arc's dark mode is primarily a chrome/shell dark experience rather than a fully dark application canvas. The sharp contrast between the darkened sidebar/chrome and the white content area is a deliberate design choice, creating a studio-light-on-canvas feel.
---
## Color Shift Strategies: What Actually Changes Between Layers
### Pure Lightness Shift
The simplest approach: shift only the L (lightness) value while holding H (hue) and S/C (saturation/chroma) constant. Obsidian does this with its neutral gray scale — `#1e1e1e` to `#242424` is a pure lightness climb. The risk is flatness and lifelessness, which is why pure grays without any hue are rarely used in the best dark UIs.[^14]
### Lightness + Subtle Hue Tint (Cool Bias)
Most premium apps introduce a slight cool shift as surfaces darken. Dark mode is culturally and psychologically expected to be cool-toned — our brains associate nighttime with blue-shifted light. Warm dark surfaces read as "brown and dingy" while cool dark surfaces read as "clean and technical." Vercel/shadcn's `oklch(0.13 0.028 261.692)` has H=261° (blue-violet territory). Linear's approximately `#16161A` has the faintest violet lean.[^7][^10]
### Lightness + Embedded Semantic Hue (Notion's approach)
Notion goes further than a universal cool bias, embedding the *semantic color* of a block into its dark background at very low saturation. A blue Notion block's dark background (`#1F282D`) has a real but subdued blue shift. This is contextually appropriate depth: the surface is both elevated *and* semantically coded, and doing so at such low chroma means it never fights with readability.[^7][^11]
### Opacity Overlay Model (Material Design / Google)
Material Design defines dark surfaces as a fixed dark base (`#121212`) with white overlays at increasing opacities based on elevation in dp:[^19][^20]

| Elevation | White Overlay Opacity |
|-----------|----------------------|
| 0dp (base) | 0% |
| 1dp | 5% |
| 2dp | 7% |
| 4dp | 9% |
| 8dp | 11% |
| 16dp | 15% |
| 24dp (highest) | 16% |

The advantage is mathematical consistency and automatic hue inheritance. If the base surface has a slight blue tint, all elevated surfaces inherit that tint proportionally. The disadvantage is less control over each specific level and sensitivity to base color drift.

***
## Shadow and Elevation in Dark Mode: What Actually Works
### Why Traditional Box Shadows Fail
A box shadow of `rgba(0,0,0,0.15)` on a `#1C1C1E` background is essentially invisible. The shadow is darker than the background, and the background is already near-zero in luminance — there's no room below it. In light mode, a 15% black shadow on a white card creates a visible 15% luminance drop. On a dark surface, the same percentage creates a change too small to perceive.[^3][^15]
### Heavy Shadows (But Used Sparingly)
The first solution is simply to scale shadow opacity dramatically. Raycast uses `rgba(0,0,0,0.5–0.75)` — 3–5× the opacity of equivalent light mode shadows. These shadows are *visible* because they're cast between a slightly elevated surface (e.g., `#2C2C2E`) and the lower base (`#1C1C1E`), giving them actual luminance contrast to work with. The trick is placement: cast them between surfaces, not between the lowest surface and void.[^15]
### Inset White Glow (Inner Glow Technique)
The most elegant single-line elevation signal in dark mode is an inset white glow:[^21][^22]
```css
box-shadow: inset 0 0 0.5px 1px rgba(255, 255, 255, 0.075);
```
This places a gossamer-thin white halo on the inside of the element's border box. It reads as the specular catch-light of a surface elevated close to a light source. It's invisible at 7.5% on most surfaces but creates a quality signal that communicates "this element has depth" in a way no shadow can match in dark mode.
### Light Borders as Elevation Signals
White/light borders at 4–12% opacity are Raycast's primary elevation mechanism alongside surface color:[^15][^21]
```css
--border-elevated: rgba(255, 255, 255, 0.08);
--border-subtle:   rgba(255, 255, 255, 0.04);
```
At 8%, a white border on `#242424` reads as a machined-aluminum edge. At 4%, it's a nearly invisible separator used for division without hard lines. The psychological effect is that the element looks *cut from material* rather than painted on a flat surface.
### The Full Elevation Recipe (Best Practice)
CodyHouse's well-validated formula stacks all three techniques:[^22]
```css
box-shadow:
  inset 0 0 0.5px 1px hsla(0, 0%, 100%, 0.075),  /* inner glow */
  0 0 0 1px hsla(0, 0%, 0%, 0.05),                 /* shadow ring */
  0 0.3px 0.4px hsla(0, 0%, 0%, 0.02),             /* soft depth 1 */
  0 0.9px 1.5px hsla(0, 0%, 0%, 0.045),            /* soft depth 2 */
  0 3.5px 6px hsla(0, 0%, 0%, 0.09);               /* soft depth 3 */
```
The inner glow carries the foreground signal; the layered soft shadows carry the elevation depth. The "shadow ring" at 5% prevents cards from disappearing against light backgrounds if the UI supports both modes.
### Edge Lighting
Linear's signature technique. Rather than a full inner glow, edge lighting applies only to the top edge of a card or modal:[^7]
```css
border-top: 1px solid rgba(255, 255, 255, 0.06);
```
This simulates a top-mounted light source hitting the upper edge of a raised surface — exactly the aesthetic of a well-lit product photo. It's more directional and cinematic than a full inner glow, and it reinforces the "this was crafted by people who think about light" brand impression.

***
## Opacity-Based vs. Color-Shift-Based Approaches: A Comparison
| Approach | How It Works | Primary Users | Advantages | Disadvantages |
|----------|-------------|---------------|------------|---------------|
| Fixed hex per level | Each Z-level gets a distinct color value | Obsidian, Linear, Notion | Predictable, designer-verified, performant | Manual synchronization across tokens |
| White opacity overlay on base | `rgba(255,255,255,0.05–0.16)` per elevation | Material Design, some component libs | Automatic hue inheritance, scale-friendly | Less controllable, sensitive to base color |
| OKLCH lightness steps | `oklch(calc(var(--base-l) + 0.05) c h)` | shadcn/ui, modern systems | Perceptually uniform steps, P3 support | Requires modern browser, tooling learning curve[^23] |
| Translucent blur layers | `rgba(r,g,b,0.75–0.90)` + `backdrop-filter` | Raycast, Arc, macOS-native apps | Native feel, content bleeds through for context | GPU-intensive, complex compositing, no fallback |

***
## Saturation Strategy: Preventing the Gray Slab Problem
A major unreported failure mode in dark mode is **saturation collapse**. When every surface is a neutral gray, the UI looks like a paper model — technically correct, emotionally flat. The solution is intentional saturation injection at dark levels.[^6][^7]

The key insight from perceptual color research: dark colors can absorb substantial chroma before they "read" as a hue. A gray at `hsl(240, 8%, 11%)` appears nearly neutral to most viewers but has a rich, cool quality that a pure `hsl(0, 0%, 11%)` lacks. This is why best-practice dark backgrounds are defined in OKLCH or HSL with non-zero chroma/saturation rather than plain hex grays:[^7]

- Vercel/shadcn: `oklch(0.13 **0.028** 261.692)` — 2.8% chroma, H=261° (blue-violet)
- Raycast: `#1C1C1E` — a warm-neutral Apple charcoal, not pure gray
- Linear: `~#16161A` — slight violet lean
- Obsidian: pure neutral gray (compensates with colorful accent system)

Material Design provides quantitative guidance on dark mode saturation reduction: accent colors in dark mode should be **desaturated to the 200-level** of a palette rather than the 500-level used in light mode, to prevent the "vibrating" visual artifact that occurs with highly saturated colors against dark surfaces.[^24]

***
## Noise and Texture: Preventing Lifeless Flat Surfaces
Flat dark surfaces, even with a correct lightness stack, can feel sterile and two-dimensional. Subtle noise texture — sometimes called "grain" — solves this by introducing micro-variation that makes surfaces feel like they have material substance rather than being screen-rendered pixels.[^25][^26]
### Arc Browser's Grain System
Arc exposes a native "graininess dial" on macOS that adds a luminance noise overlay to the sidebar. This is one of the few cases where noise is a user-tunable preference rather than a static design decision. At low intensity it adds just enough texture to feel "real"; at high intensity it becomes the defining aesthetic character of the space.[^18]
### CSS Noise via SVG Turbulence
The canonical web technique uses SVG's `feTurbulence` filter as a `background-image` data URI:[^27][^28]
```css
.noisy-surface::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>");
  opacity: 0.03;
  mix-blend-mode: overlay;
}
```
Contrast and brightness boosting via CSS `filter` sharpens the grain. `mix-blend-mode: overlay` blends it naturally with the surface color beneath. Opacity should be kept in the 2–5% range — enough to feel textured, not enough to look dirty.
### Where Noise Is and Isn't Used
- **Yes**: Arc (user-controlled), Linear (implied in modal surfaces and background gradients), Raycast (macOS vibrancy handles this at the OS level), many Dribbble/design tool UIs[^27]
- **No, by design**: Notion (document app, texture would fight with content), Obsidian (developer/markdown tool, users expect flat precision), Vercel dashboard (data-heavy, texture distracts from information)

The rule of thumb: noise belongs on *chrome* (the app frame, sidebars, empty states) not on *content surfaces* (the document area, tables, code blocks). Texture is a material signal for the shell, not for the canvas.

***
## Surface Count Summary by App
| App | Distinct Surface Levels | Strategy | Hue Character |
|-----|------------------------|----------|---------------|
| **Linear** | 4–5 | Fixed hex + edge lighting | Slight violet-cool lean |
| **Vercel/Geist** | 3–4 | Fixed hex, wide steps | Near-pure neutral to black |
| **Notion** | 3 + 9 semantic variants | Fixed hex + semantic hue | Neutral base, hue per block color |
| **Obsidian** | 10 defined (4–5 in practice) | Fine-grained neutral gray | Pure neutral, accent via separate system |
| **Raycast** | 4 + translucent variants | Fixed hex + opacity stack | Apple charcoal, warm-neutral |
| **Arc** | 2–3 (chrome-based) | System vibrancy + user hue | User-defined, macOS vibrancy |

***
## The Perceptual Color Space Advantage
The shift toward OKLCH (Oklab Lightness-Chroma-Hue) in design systems like shadcn/ui is directly motivated by dark mode precision. In HSL or HEX, "equal numeric steps in lightness" don't produce perceptually equal steps — yellow appears 3–4× brighter than blue at the same HSL lightness value. This means a surface stack built in HSL can have inconsistent perceptual gaps between layers.[^23][^29][^30]

OKLCH is perceptually uniform: a +5% change in L produces approximately the same visual lightness jump regardless of hue. For dark mode surfaces, this means:[^30][^23]
- Surface stacks can be generated algorithmically: `oklch(from var(--base) calc(l + 0.05) c h)` creates a reliably perceived one-step elevation
- Saturation (chroma) changes don't accidentally change perceived lightness
- Wide-gamut P3 colors can be used for more vivid accents on modern displays without losing the exact lightness relationships

The practical implication for developers building dark UIs today: define your surface base color in OKLCH and use `calc()` to derive elevated surfaces programmatically, rather than manually picking hex values that might drift perceptually between hues.

***
## Applied Principles: A Design System Checklist
For building a production dark surface system with the characteristics of these premium apps:

**Surface foundation:**
- Start at L ≈ 10–14% (not pure black) with 4–8% non-zero chroma for richness
- Define 4–5 levels at approximately 3–5 lightness-point intervals
- Use OKLCH for systematic derivation if building a new system

**Elevation signaling (without borders):**
- Inset white glow: `inset 0 0 0.5px 1px rgba(255,255,255,0.07)` on cards
- Light edge border: `border-top: 1px solid rgba(255,255,255,0.06)` on modals
- Heavy drop shadow (0.4–0.7 opacity) only between elevated and non-elevated surfaces

**Typography hierarchy:**
- Fixed-hex for primary text (white-ish, ~`#E8E8E8` not pure `#FFFFFF`)
- Opacity-stack for secondary/tertiary: `rgba(255,255,255,0.55)` and `rgba(255,255,255,0.30)`

**Translucent overlays:**
- Surface opacity 80–90% (not 50–60%)
- `backdrop-filter: blur(20px) saturate(150–180%)` — the saturation is the quality signal
- 1px white-opacity border at 8% around the panel

**Noise/texture:**
- Optional but recommended on shell surfaces: 2–4% opacity SVG turbulence via `::before` pseudo-element
- Skip for content areas, tables, and document zones

**Color strategy:**
- Desaturate accent colors vs. their light-mode values (200-level vs. 500-level)
- Introduce cool hue bias in surface stack for premium technical feel
- Reserve warm tones for semantic warning/error states only

---

## References

1. [Mastering Elevation in Dark Mode: An In-Depth Guide](https://itsyourdesigner.co.in/mastering-elevation-in-dark-mode-an-in-depth-guide/) - In dark mode, where shadows are less impactful, mastering elevation through controlled color adjustm...

2. [Dark Mode Color Design: Building a System, Not Just an ...](https://colorarchive.me/guides/dark-mode-color-design-guide/) - Dark mode is no longer optional — it's a baseline expectation for digital products across all platfo...

3. [Mastering Elevation for Dark UI: A Comprehensive Guide](https://medium.muz.li/mastering-elevation-for-dark-ui-a-comprehensive-guide-04cc770dd0d6) - A comprehensive guide to mastering elevation in dark mode, ensuring your designs are both functional...

4. [Designing a Scalable and Accessible Dark Theme - FourZeroThree](https://www.fourzerothree.in/p/scalable-accessible-dark-mode) - For example, for surfaces like buttons, blue 600 from my light mode palette corresponds to blue 700 ...

5. [Overview - Elevation - Atlassian Design System](https://atlassian.design/foundations/elevation) - Shadows can be harder to see in dark mode, so dark mode elevations also rely on different surface co...

6. [Why Linear Design Systems Break in Dark Mode (And How to Fix ...](https://chyshkala.com/blog/why-linear-design-systems-break-in-dark-mode-and-how-to-fix-them) - Minimalist UIs amplify accessibility failures across color modes—here's the token strategy that actu...

7. [A guide to dark mode design - James Robinson](https://www.jamesrobinson.io/post/a-guide-to-dark-mode-design) - My definitive guide to designing dark interfaces, from one of dark mode's biggest fans (me). Continu...

8. [Colors - Vercel](https://vercel.com/geist/colors) - Vercel's design system called Geist. Made for building consistent and delightful web experiences.

9. [Colors - Geist UI](https://geist-ui.dev/en-us/guide/colors) - An open-source design system for building modern websites and applications.

10. [Theming - shadcn/ui](https://v3.shadcn.com/docs/theming) - We use a simple background and foreground convention for colors. The background variable is used for...

11. [How To Get Custom Colors in...](https://matthiasfrank.de/en/notion-colors/) - Get the hexcodes for all Notion Colors, learn how to get custom colors in Notion and how to color el...

12. [Notion Color Codes: Your Ultimate Guide to Customization](https://notioneers.eu/en/insights/notion-colors-codes) - Discover the ultimate guide to Notion color codes! Enhance your workspace with vibrant colors. Explo...

13. [Did Notion update the shade of black they se for their dark mode?](https://www.reddit.com/r/Notion/comments/sywi7t/did_notion_update_the_shade_of_black_they_se_for/) - Did Notion update the shade of black they se for their dark mode?

14. [Colors - Developer Documentation](https://docs.obsidian.md/Reference/CSS%20variables/Foundations/Colors) - The Obsidian color palette defines a range of colors used in the app. Base colors The base colors is...

15. [The Raycast Design System: How Dark UI Is Actually Done - SeedFlip](https://www.seedflip.co/blog/raycast-design-system-dark-ui) - Deep charcoal surfaces, surgical accent placement, translucent layering, and type optimized for dens...

16. [Colors - Raycast API](https://developers.raycast.com/api-reference/user-interface/colors) - A dynamic color applies different colors depending on the active Raycast theme. When using a Dynamic...

17. [Thoughts on the light/dark colors for spaces' themes... : r/ArcBrowser](https://www.reddit.com/r/ArcBrowser/comments/1888j67/thoughts_on_the_lightdark_colors_for_spaces_themes/) - However, as an auto dark-mode user, I find that switching to dark mode only slightly dims the theme ...

18. [How to change Theme on Arc browser? - YouTube](https://www.youtube.com/watch?v=DQCTcV2Jd3Y) - ... designs for print and web, here: https://corel.sjv.io/Gmq76L Looking to up your streaming game? ...

19. [6 Tips for Designing a Dark Mode Version of Your App - SEP](https://sep.com/blog/6-tips-for-designing-a-dark-mode-version-of-your-app/) - Dark Mode Design Guidelines and Best Practices · 1. Try to Avoid Pure Black · 2. Try to Avoid Pure W...

20. [The Ultimate Guide on Designing a Dark Theme for your Android app.](https://blog.prototypr.io/how-to-design-a-dark-theme-for-your-android-app-3daeb264637) - Design Application. Every component in dark theme is built using 2 layers. It is built by placing a ...

21. [CSS Box Shadow - CodyHouse](https://codyhouse.co/ds/docs/framework/util-box-shadow) - Inner glow classes # ... The inner glow classes are used to create a light ring inside an element. T...

22. [Beautiful CSS Shadows](https://codyhouse.co/nuggets/beautiful-css-shadows) - 3 steps to create CSS shadows that look great on any background.

23. [OKLCH vs RGB, HEX, HSL: Modern Color Science for Designers](https://ava-palettes.com/modern-color-science) - Learn why OKLCH color space outperforms traditional RGB, HSL, and HEX for modern design. Discover ho...

24. [Dark Mode UI Best Practices - Prototypr](https://blog.prototypr.io/dark-mode-ui-best-practices-8101782de93f) - A dark mode is a night-friendly color theme that mainly focuses on using dimed/grey colors for surfa...

25. [Make Your Web Images More Realistic With SVG Grainy Filters](https://webdesign.tutsplus.com/better-web-images-with-svg-grainy-filters--cms-39739t) - In this video tutorial you'll learn how to create some SVG grainy filters (noise) and use them to ma...

26. [Making noisy SVGs - Daniel Immke](https://daniel.do/article/making-noisy-svgs) - Adding noise texture with only code. ... One of my ongoing fixations with the web is how improvement...

27. [Grainy Gradients - CSS-Tricks](https://css-tricks.com/grainy-gradients/) - In this article, we'll generate colorful noise to add texture to a gradient with only a small amount...

28. [Make Your Web Images More Realistic With SVG Grainy Filters ...](https://www.youtube.com/watch?v=1bYAwpPPD6U) - Learn how to add grainy SVG noise filters to your web images in this video with Adi Purdila. ▻ Downl...

29. [OKLCH, explained for designers - Desktop of Samuel](https://desktopofsamuel.com/oklch-explained-for-designers) - OKLCH is a new color space that improves design and development with a wider color gamut. Learn why ...

30. [OKLCH in CSS: why we moved from RGB and HSL - Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) - OKLCH frees designers from the need to manually choose every color. Designers can define a formula, ...

