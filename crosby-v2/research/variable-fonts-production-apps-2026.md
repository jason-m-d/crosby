# Variable Fonts in Production App Interfaces: Dark Mode, Animation & Font Selection Guide (2025–2026)

## Overview

Variable fonts have moved from experimental novelty to production infrastructure. By 2026, major developer tools, SaaS platforms, and creative apps are using them not just for load-time benefits, but as a deliberate system — adjusting weight axes for dark mode compensation, using optical size axes to serve 12px labels and 48px display text from a single file, and in some cases animating font-variation properties as a first-class interaction. This guide covers real production implementations, the typography mechanics behind them, and a curated selection of character-forward variable fonts for builders who want their UI to feel like something.

***

## Part 1: Variable Fonts in Production — Real App Implementations

### Linear (linear.app)

Linear is arguably the most-studied dark mode design system in developer tools, and its font choices reveal a sophisticated understanding of variable weight. The app uses **Inter Variable**, self-hosted, with body text at weight `510` and headings at `590` — not 500 and 600. These are non-standard values that static font systems cannot produce. The decision reflects awareness that on Linear's near-black dark canvas, slightly lighter weights maintain the visual parity that 500 (appearing too thin) or 600 (appearing chunky against the dark surface) would not achieve. Linear also deploys **Berkeley Mono** for all monospaced and code contexts at a static weight 400. The combination — a carefully fine-tuned variable grotesque for UI, paired with a premium code face — is a model for developer-tool dark mode typography.[^1]

The practical implication: Linear isn't using Inter because it lacks character. It's using it because the variable weight axis lets them dial in a precise value for dark mode that no "Inter Bold" file would provide.

### Vercel (vercel.com / v0)

Vercel built its own typeface, **Geist**, in collaboration with Basement Studio. The system ships as a variable font family with Geist Sans (weight range 100–900), Geist Mono (optimized for code editors, diagrams, and terminals), and the more recent Geist Pixel — a bitmap-inspired extension built on the same type system but interpreted through a pixel grid, available in five variants (Square, Grid, Circle, Triangle, Line). Geist is the default typeface for projects scaffolded with v0, meaning tens of thousands of production apps are now using it.[^2][^3][^4]

The Geist design lineage cites Inter, Univers, SF Mono, SF Pro, Suisse International, ABC Diatype Mono, and ABC Diatype as influences. This is a neutral-but-precise grotesque, not an expressive display face — but its variable weight and open-source licensing make it the right utilitarian infrastructure choice for Vercel's ecosystem. Geist Pixel was specifically designed to solve the problem pixel fonts have in production: they fail to scale, break metrics, and feel purely decorative. The Geist Pixel variant was engineered to maintain rhythm, spacing, and legibility at screen sizes.[^3][^5]

### GitHub (Mona Sans / Hubot Sans)

GitHub released **Mona Sans** and **Hubot Sans** as open-source variable fonts in December 2022. Mona Sans is "inspired by industrial-era grotesques" and serves as the primary typeface across GitHub's marketing pages, GitHub Universe, and product surfaces. Both fonts ship with three axes: weight (200–900), width (condensed 75% to expanded 125%), and slant (upright to italic). The variable width axis is where GitHub differentiates: compressed states read as bold and assertive for hero headlines, while expanded widths create a lighter, more open reading experience for body copy — all from a single file.[^6][^7]

GitHub's implementation demonstrates how a width axis amplifies hierarchy beyond weight alone. A headline at weight 800 / width 100% reads very differently from the same headline at weight 800 / width 75%. This two-axis hierarchy system gives designers significantly more range than a simple bold/regular switch.

### Google Products (Google Sans Flex)

Google released **Google Sans Flex** as open-source under the SIL Open Font License at the end of 2025. This is one of the most technically sophisticated variable fonts released publicly — developed with Font Bureau and Pathfinders, it exposes six axes: weight, width, optical size, slant, grade, and roundedness. The grade axis allows designers to increase perceived weight for contrast without changing glyph size (no layout shift). The roundedness axis lets designers tune terminal shapes from angular to soft, which directly affects how a UI "feels" emotionally.[^8][^9][^10]

Google's own research shows an 80% user preference when the expressive power of Google Sans Flex is used deliberately. The font powers Gemini's interface and is designed to be legible from smartwatch to billboard — the optical size axis handling proportional adjustments automatically based on rendered size.[^11][^8]

***

## Part 2: Dark Mode Typography Mechanics with Variable Fonts

### The Irradiation Illusion Problem

The core optical challenge in dark mode typography is well-documented: white text on black backgrounds appears *visually heavier* than the same weight of dark text on light backgrounds. This is the irradiation illusion — our visual system perceives light-colored objects as larger than dark ones of the same physical size. For UI designers, this means a font-weight: 400 that looks perfect in light mode will appear to be font-weight: 500 or heavier in dark mode, destroying carefully calibrated hierarchy.[^12][^13]

Before variable fonts, the only fix was manually reducing font-weight values in dark mode media queries — which is brittle, verbose, and easy to miss on individual components. Variable fonts unlock cleaner solutions.[^12]

### The GRAD Axis Solution

The `GRAD` (grade) variable axis was purpose-built for this problem. Unlike font-weight, adjusting `GRAD` changes the *perceived* thickness of strokes without altering glyph metrics — meaning no layout shift. The technique:[^14][^15]

```css
body {
  --GRAD: 0;
  font-variation-settings: "GRAD" var(--GRAD);
}

@media (prefers-color-scheme: dark) { 
  body { --GRAD: -50; } 
}

@media (prefers-color-scheme: dark) and (prefers-contrast: more) { 
  body { --GRAD: 150; } 
}
```

The negative `GRAD` value in dark mode reduces the perceived stroke weight, compensating for the irradiation illusion without reflowing text. Roboto Flex supports the `GRAD` axis, as does Google Sans Flex. Not all variable fonts support it — it's worth checking before adopting a font for serious dark mode work.[^14][^8][^12]

### The Dalton Maag Darkmode Font (DRKM Axis)

Dalton Maag designed **Darkmode** as the first retail typeface to build dark mode compensation directly into the font itself. It includes a proprietary `DRKM` axis that switches between lighter and heavier stroke variants — called DarkmodeOn and DarkmodeOff — while keeping proportions and widths identical, preventing text reflow. The font ships with Darkmode Mono as well, a 3-axis variable font covering Darkmode, Weight, and Slant across 18 styles and 820+ languages.[^16][^13][^17]

This is a commercial font (licenses from Dalton Maag), but it's the most architecturally correct solution for products that take dark mode seriously as a first-class design feature.

### The CSS Custom Property Multiplier Pattern

For teams using variable fonts that lack a `GRAD` axis, a cleaner approach than manual dark mode overrides is the **font-weight multiplier pattern**. A single CSS custom property (`--font-weight-multiplier`) changes in dark mode, and all font weights are calculated relative to it:

```css
:root { --font-weight-multiplier: 1; }

@media (prefers-color-scheme: dark) {
  :root { --font-weight-multiplier: 0.9; }
}

h1 { font-weight: calc(700 * var(--font-weight-multiplier)); }
p  { font-weight: calc(400 * var(--font-weight-multiplier)); }
```

This approach reduces dark mode weight globally from one declaration. It's the pattern used by serious production apps that need dark mode weight compensation but can't use the `GRAD` axis.[^12]

***

## Part 3: Font Animation in Production Interfaces

### What's Actually Being Animated

Weight animation in production falls into two patterns. The first is **state-driven**: a weight shift on hover or focus that acts as a lightweight microinteraction — nav items going from 400 to 600 on hover, or an active tab gaining weight to signal selection. Because variable fonts use continuous number axes rather than discrete static files, this transition can be smoothly CSS-animated using `font-variation-settings` in a `transition` property.[^18]

```css
.nav-item {
  font-weight: 400;
  transition: font-weight 0.2s ease;
}
.nav-item:hover {
  font-weight: 650;
}
```

The second pattern is **proximity-driven weight animation**, popularized by creative developers on the web: as the cursor moves near characters, adjacent letters gain weight in a ripple effect, creating a velvety, tactile sensation. GSAP's `mapRange` utility is commonly used to calculate per-character weight values based on cursor distance. This technique is used on creative agency sites and marketing surfaces, not dense tool UIs — but the principle appears in more restrained forms in premium SaaS products.[^19]

### The Constraint for Tooling UIs

For a utilitarian app — the type you might be building for your restaurant management platform or a sports analytics dashboard — continuous weight animation is most appropriate on navigation, header elements, and interactive labels. Data tables and body text should not animate font properties, as it introduces visual noise and can cause subtle layout artifacts on certain rendering engines. The CSS `font-variation-settings` property, unlike `font-weight`, was not always part of the composited paint layer in older browser implementations; today (2025–2026) it is reliably animatable in Chrome, Firefox, and Safari.[^20]

***

## Part 4: Character-Forward Variable Fonts for Utilitarian UIs

The following fonts all have genuine personality while remaining functional at 12px UI labels. None of them are Inter. They're organized from most neutral-with-character to most expressive.

### Free / Google Fonts

#### Bricolage Grotesque

**Designer:** Mathieu Triay | **License:** SIL Open Font License | **Axes:** Weight, Width, Optical Size

Bricolage Grotesque is the most compelling free variable font for personality-forward UI in 2025. It blends French sources (Antique Olive) and British sources (Stephenson Blake Grotesque series) into something that reads as simultaneously vintage and contemporary. The compressed widths lean anxious and eccentric; regular widths take on Antique Olive's confident, relaxed attitude. The optical size axis is genuinely useful — at small sizes it opens up spacing and simplifies detail; at display sizes it tightens and gains ink trap sophistication. This is one of the few free fonts that holds character at 12px without becoming unreadable.[^21][^22][^23]

**Best for:** Editorial-flavored tools, brand-forward dashboards, any product that wants to feel *opinionated* without drifting into decoration.

#### Recursive

**Designer:** Stephen Nixon (ArrowType) | **License:** SIL Open Font License | **Axes:** Weight, Slant, Casual, Monospace, Cursive

Recursive is a five-axis variable font built for the overlap of code and UI. Its `CASL` (Casual) axis is unique: at 0, the letterforms are strict and linear; at 1, they're brushy and playful, evoking casual signpainting. Its `MONO` axis runs proportional (0, best for UI) to fixed-width (1, best for code) — meaning one font file can cover your entire typographic system including code blocks, with fluid transitions between contexts. The *superplexed* metrics mean every character occupies the same horizontal space across all styles, enabling weight and expression animations without any text reflow. This is technically remarkable.[^24][^25][^26]

**Best for:** Developer tool UIs, terminal-adjacent apps, products that need both a readable sans and a code font from a single file.

#### Instrument Sans

**Designer:** Rodrigo Fuenzalida, Jordan Egstad (for Instrument) | **License:** SIL Open Font License | **Axes:** Weight, Width

Instrument Sans is a variable sans-serif that "balances an abundance of precision with subtle notes of" warmth — it has slightly humanist details that push it away from pure geometric neutrality. Available free on Google Fonts, it's less common than Inter, making it a better choice for products that want to feel distinct. The variable weight and width axes cover UI needs from thin labels to bold display text.[^27][^28]

**Best for:** Clean professional tools that want slightly more warmth than Inter without stepping into expressive territory.

#### Manrope

**Designer:** Mikhail Sharanda | **License:** SIL Open Font License | **Axes:** Weight

Manrope sits between functional and expressive — clean and modern, but friendlier than Inter without becoming distracting in data-heavy contexts. It works well for approachable, product-led design. The variable weight axis is smooth and behaves predictably at fine-tuned intermediate values.[^29]

**Best for:** Consumer-facing products, fintech, healthcare tech — anything needing warmth at small sizes.

#### Space Grotesk

**Designer:** Florian Karsten | **License:** SIL Open Font License | **Axes:** Weight

Space Grotesk has genuine typographic character — slight quirks in the geometry that make it feel authored rather than neutral. It's used in products that want a distinctive feel without drifting into decoration. Particularly strong for headings and key UI elements; it earns its weight at display sizes and stays readable at small ones.[^29]

**Best for:** Creative tools, portfolio apps, brand-forward developer products.

#### Google Sans Flex *(newly open source, late 2025)*

**Designer:** David Berlow (Font Bureau) / Pathfinders | **License:** SIL Open Font License | **Axes:** Weight, Width, Optical Size, Slant, Grade, Roundedness

Google's brand typeface is now publicly available. Six axes make this the most technically versatile free variable font available. The `GRAD` axis enables the dark mode compensation technique described above. The roundedness axis is the unique differentiator — subtle shifts between sharp and soft terminals change the emotional register of the type without altering its legibility. This is one of the first retail-quality variable fonts where you can tune personality axis-by-axis.[^9][^10]

**Best for:** Teams that need a mature, well-tested font system with dark mode-ready architecture from day one. Slightly less personality than Bricolage but far more technical depth.

***

### Commercial Options

#### Neue Montreal (Pangram Pangram Foundry)

**Price:** from $40 | **Axes:** Weight | **Styles:** 14 (7 uprights + 7 italics)

Neue Montreal is a grotesque with *the spirit of a display font* — slightly tighter default kerning, confident proportions, and a more assertive character than Inter while remaining fully functional for UI body copy. It's Expo 67 via contemporary Montreal design culture. The variable version gives access to the full weight range from a single file. This is a premium choice for a product that wants to feel like it has real brand presence without resorting to decorative typography.[^30][^31]

**Best for:** Products with a design-conscious, creative professional audience. Works especially well in dark mode against near-black backgrounds where the tighter kerning reads as precise rather than cramped.

#### Aktiv Grotesk (Dalton Maag)

**Price:** from £95 (1-axis) | **Axes:** Weight, Width, Italic

Dubbed a "Helvetica killer," Aktiv Grotesk takes Helvetica's neutrality and adds Univers' warmth — the result is an authoritative grotesque that doesn't feel sterile. The variable version (1-axis through 3-axis options) is a production powerhouse: weight axis from Hairline to Black, optional width axis from Condensed to Extended, and ten global writing systems including Arabic, Cyrillic, and Devanagari. For a product that needs to scale internationally, this is a serious choice.[^32][^33]

**Best for:** Enterprise tools, international products, any UI where systematic neutrality with subtle personality is the right tone.

#### Degular (OH no Type Co.)

**Price:** Varies by license | **Axes:** 3 optical sizes in static weights; variable version available

James Edmondson's Degular combines classic influence with "distinctive angled details and subtle slanted forms that give it a unique personality". OH no Type Co. fonts are famously expressive without being weird — Degular in particular occupies a sweet spot between humanist warmth and structural discipline. It ships in 7 weights across 3 optical sizes (roman and italic), designed to be used across the full size range from footnote to display headline without compromise.[^34][^35]

**Best for:** Products that want genuine character without being conspicuous about it. Excellent for long-form reading in UI — documentation tools, content platforms.

#### Darkmode (Dalton Maag)

**Price:** From Dalton Maag (commercial license) | **Axes:** DRKM (dark mode), Weight, Slant

A purpose-built UI font for dark-mode-first products. If your app is primarily dark mode and you want a type system that's architecturally correct — where dark mode weight compensation is not a CSS hack but a font feature — Darkmode is the right answer. The `DRKM` axis switches between carefully calibrated lighter and heavier stroke variants without changing metrics. It also ships with a Mono companion (Darkmode Mono) with the same dark mode axis, making it the most coherent dark mode type system available commercially.[^13][^16]

**Best for:** Developer tools, terminal apps, any product where dark mode is the default, not the afterthought.

***

## Part 5: Selection Matrix

| Font | License | Axes | Character Level | Best Size Range | Dark Mode Notes |
|------|---------|------|-----------------|-----------------|-----------------|
| **Bricolage Grotesque** | Free (OFL) | Weight, Width, Optical Size | High | 11px–80px | Optical size axis helps; no GRAD |
| **Recursive** | Free (OFL) | Weight, Slant, CASL, MONO, CRSV | High (tunable) | 11px–48px | No GRAD; use CSS multiplier pattern |
| **Instrument Sans** | Free (OFL) | Weight, Width | Medium-Low | 12px–64px | No GRAD; reliable with manual tuning |
| **Manrope** | Free (OFL) | Weight | Medium | 12px–48px | Reliable; no GRAD |
| **Space Grotesk** | Free (OFL) | Weight | Medium-High | 13px–80px | Works well; no GRAD |
| **Google Sans Flex** | Free (OFL) | Weight, Width, Optical Size, Slant, Grade, Roundedness | Medium | 10px–∞ | **GRAD axis** — dark mode compensation built in |
| **Neue Montreal** | Commercial ($40+) | Weight | Medium-High | 12px–120px | No GRAD; use CSS multiplier |
| **Aktiv Grotesk** | Commercial (£95+) | Weight, Width, Italic | Medium | 10px–∞ | No GRAD; broad intl. support |
| **Degular** | Commercial | Optical sizes (static) | High | 11px–120px | Optical sizes help with dark mode control |
| **Darkmode** | Commercial | DRKM, Weight, Slant | Medium | 11px–72px | **Built-in dark mode axis** — purpose-built |

***

## Conclusion

The most interesting variable font implementations in 2025–2026 are not animation showcases — they're design systems where fine weight control solves specific problems: dark mode irradiation compensation, hierarchy that scales from dense data tables to 48px hero text, and type systems that feel authored rather than assembled from defaults. The `GRAD` axis is the underrated workhorse for anyone serious about dark mode. For personality-forward UI that isn't Inter, Bricolage Grotesque (free, three axes, genuine character) and Neue Montreal (commercial, tight and confident) are the two most compelling options in their respective categories. Google Sans Flex's open-source release changes the accessibility of six-axis variable typography, and Dalton Maag's Darkmode remains the architecturally correct answer for dark-mode-first products that want font behavior to solve the problem, not CSS patches.

---

## References

1. [linear.app Brand Kit — Colors, Fonts, Voice | ExtractVibe](http://extractvibe.com/brand/linear.app) - Comprehensive brand kit for linear.app: colors, typography, tone of voice, brand rules, and more. Ex...

2. [Geist Font - Vercel](https://vercel.com/font) - Geist is a typeface made for developers and designers, embodying Vercel's design principles of simpl...

3. [Introducing Geist Pixel - Vercel](https://vercel.com/blog/introducing-geist-pixel) - Geist Pixel is a bitmap-inspired typeface built on the same foundations as Geist Sans and Geist Mono...

4. [Constantly getting Geist font issues when deploying to Vercel - v0](https://community.vercel.com/t/constantly-getting-geist-font-issues-when-deploying-to-vercel/26851) - The first thing to do is check whether your code is importing it anywhere (for example, any import {...

5. [vercel/geist-font | DeepWiki](https://deepwiki.com/vercel/geist-font) - This page provides an introduction to the Geist Font repository, which contains the Geist Sans and G...

6. [Mona Sans & Hubot Sans](https://github.com/mona-sans) - Two variable, open source fonts from GitHub.

7. [Introducing Mona Sans and Hubot Sans - The GitHub Blog](https://github.blog/news-insights/company-news/introducing-mona-sans-and-hubot-sans/) - Learn how to use and express yourself with GitHub’s open source variable fonts, Mona Sans and Hubot ...

8. [Google Sans: Evolving Google's Typeface](https://design.google/library/google-sans-flex-font) - Google Sans is the iconic typeface used across every Google product from Search to Wallet. It's one ...

9. [Google's iconic brand font is now free for anyone to use - Yahoo Tech](https://tech.yahoo.com/ai/gemini/articles/googles-iconic-brand-font-now-070000065.html) - The latest addition to the family is Google Sans Flex. This was developed with variable font technol...

10. [Google Sans Flex: The new "reliable" for the modern web | Andes Dev](https://andes.la/digital-marketing/google-sans-flex-the-new-reliable-for-the-modern-web/) - Discover why Google Sans Flex is the new standard for web design in 2026. Explore how variable font ...

11. [Google Sans Flex is the font that grows with you. It adapts to be clear ...](https://www.instagram.com/p/DSfZak3kQ8a/) - It adapts to be clear on any size display, from your smartwatch to a massive billboard. 👀 Our typefa...

12. [Using CSS Custom Properties to Adjust Variable Font Weights in ...](https://css-tricks.com/using-css-custom-properties-to-adjust-variable-font-weights-in-dark-mode/) - Most variable text fonts have a weight axis, which lets us assign any specific font-weight value wit...

13. [Dalton Maag's Dark Mode](https://www.printmag.com/design-news/type-tuesday-dalton-maag-s-dark-mode/) - The increased prevalence of “dark modes” on the web and devices has caused a typographic problem—and...

14. [Using CSS to fix the irradiation illusion · November 29, 2025](https://nerdy.dev/adjust-perceived-typepace-weight-for-dark-mode-without-layout-shift) - This post teaches you how to account for this and adjust perceived font weight for dark mode without...

15. [The relative font weight axis — how variable fonts ease font weight ...](https://www.stefanjudis.com/today-i-learned/the-relative-font-weight-axis-how-variable-fonts-ease-font-weight/) - Variable fonts with a custom relative font weight axis ("GRAD") help to avoid layout shifts when tra...

16. [Darkmode: the typeface you didn't know you needed - Creative Bloq](https://www.creativebloq.com/news/darkmode-font) - There's more to this font than meets the eye.

17. [Font Library - Dalton Maag](https://www.daltonmaag.com/font-library/) - Our extensive font library features diverse typefaces to suit every need. Versatile sans, elegant sc...

18. [Why variable fonts are winning in 2026 (and how to use them) - Kittl](https://www.kittl.com/blogs/why-variable-fonts-are-winning-fnt/) - Animation potential: Because weight is a continuous axis, you can animate font weight smoothly — imp...

19. [velvety variable font weight hover with gsap](https://www.youtube.com/watch?v=K5CLg58oiNU) - Let's recreate this velvety variable font weight hover animation with GSAP! I stumbled on this anima...

20. [Variable fonts - CSS - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts/Variable_fonts) - Variable fonts are an evolution of the OpenType font specification that enables many different varia...

21. [Bricolage Grotesque — Free & Open Source Variable Font](https://ateliertriay.github.io/bricolage/) - An expressive variable font that blends iconic French and British designs across three axes: weight,...

22. [Bricolage Grotesque — Free Open Source Variable Font](https://fountn.design/resource/bricolage-grotesque-free-open-source-variable-font/) - An open-source variable font by Mathieu Triay, blending French and British influences, available for...

23. [Bricolage Grotesque - Pimp my Typepimpmytype.com › Fonts](https://pimpmytype.com/font/bricolage-grotesque/) - A free sans-serif font that shows confidence and personality with a vintage vibe, and versatility in...

24. [Recursive Sans & Mono - A typographic palette for vibrant code & UI](https://fountn.design/resource/recursive-sans-mono-a-typographic-palette-for-vibrant-code-ui/) - A versatile variable font with five axes of variation, supporting over 200 languages and suitable fo...

25. [Recursive, for Google Fonts - ArrowType](https://www.arrowtype.com/custom/recursive)

26. [Recursive Mono & Sans is a variable font family for code & UI - GitHub](https://github.com/arrowtype/recursive) - Recursive Sans & Mono is a variable type family built for better code & UI. It is inspired by casual...

27. [Instrument Sans Font Pairings (Google fonts) & Alternatives](https://maxibestof.one/typefaces/instrument-sans) - Instrument Sans is a Sans Serif font designed by Rodrigo Fuenzalida, Jordan Egstad and released by t...

28. [Instrument Sans - Google Fonts](https://fonts.google.com/specimen/Instrument+Sans) - Instrument Sans is a font designed for the Instrument brand. It's a variable sans-serif which balanc...

29. [Best Free Variable Fonts for UI and Web Design (2026) - Muzli](https://muz.li/blog/best-free-variable-fonts-for-ui-and-web-design-2026/) - Looking for free variable fonts that actually work in UI? A practical list of the best variable font...

30. [Neue Montreal - Free to Try Font](https://pangrampangram.com/products/neue-montreal) - A versatile Grotesque font with the spirit of a display font. Complete with 14 weights (7 Uprights, ...

31. [Neue Montreal: Grotesque Display Font in 14 Styles - Freebiesbug](https://freebiesbug.com/free-fonts/neue-montreal/) - Neue Montreal is a grotesque display font in 7 styles, each complemented by its own Italic variant. ...

32. [Aktiv Grotesk - Jenxi Seow](https://jenxi.com/aktiv-grotesk) - Aktiv Grotesk is a contemporary grotesque sans-serif typeface that combines neutrality with just a h...

33. [Font Library: Aktiv Grotesk - Dalton Maag](https://www.daltonmaag.com/font-library/aktiv-grotesk.html) - Aktiv Grotesk is a powerhouse of versatility and functionality. It's a grotesque sans typeface with ...

34. [Degular Font Family - Befonts](https://befonts.com/degular-font-family.html) - Degular Font Family is a versatile sans-serif typeface designed by James Edmondson and released thro...

35. [Degular ☠️ OH no Type Company](https://ohnotype.co/fonts/degular) - Degular also provides a once-in-a-lifetime opportunity to use an Ohno font more than once! 7 weights...

