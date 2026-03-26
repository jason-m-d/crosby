# AI Coding Assistant UI/UX Tools: MCP Servers, Plugins & CLIs (2025–2026)

## Executive Summary

The Model Context Protocol (MCP) ecosystem has matured rapidly throughout 2025 and into 2026, producing a rich set of design-focused tools that Claude Code and other AI coding agents can call programmatically. As of March 2026, every major category of frontend design work — from design tokens and color systems to accessibility auditing, component libraries, and browser automation — now has at least one production-ready MCP server or CLI tool. This report catalogs what is available, how to install it, and which use cases each tool covers.

***

## 1. Design System MCP Servers

### Panda CSS MCP Server

The Panda CSS framework ships an official MCP server (`panda init-mcp`) that exposes your project's full design system to AI assistants. Once initialized, Claude Code can query design tokens and their values, available component recipes and variants, layout patterns, breakpoints, and token/recipe usage across your entire codebase. Setup is a single command with a guided selector for which AI clients to configure (Claude, Cursor, VS Code, Windsurf, Codex).[^1][^2]

```bash
pnpm panda init-mcp
# or: panda init-mcp --client claude
```

### AINative Design System MCP Server

Published on npm as `ainative-design-system-mcp-server`, this server is purpose-built for Claude Code and can extract design tokens from CSS, SCSS, Less, and Stylus files; parse CSS variables and custom properties; analyze color palettes and generate variations; detect and optimize typography scales; and export tokens in JSON, YAML, or JavaScript formats. It also performs accessibility compliance checking and real-time design system validation.[^3][^4][^5][^6]

```bash
npm i ainative-design-system-mcp-server
```

### Building Your Own Token MCP Server

For teams with existing design token JSON files, a lightweight custom MCP server can be built in 30 minutes using Node.js v16+ and the MCP SDK. This provides real-time token access, bidirectional read/write, and persistent context for tasks like token migration, documentation generation, and cross-reference analysis ("Which tokens are unused in our Button component?").[^7]

***

## 2. Screenshot & Visual Feedback Tools

### frontend-review-mcp

This is the most purpose-built visual design QA tool in the ecosystem. Published by zueai on GitHub and available via `npx frontend-review-mcp`, it creates a closed feedback loop: the agent takes a "before" screenshot, makes a code edit, takes an "after" screenshot, and then calls `reviewEdit` to get an AI-powered yes/no verdict on whether the change satisfied the user's request.[^8][^9][^10]

The review model defaults to `Qwen/Qwen2-VL-72B-Instruct` via Hyperbolic, with automatic fallback through Llama and Pixtral models. This approach enables what developers describe as "AI-graded self-improving UIs" — a continuous feedback loop where the UI is constantly evaluated by what functions as a senior product designer.[^11][^10][^12]

```json
"mcpServers": {
  "frontend-review": {
    "command": "npx",
    "args": ["frontend-review-mcp HYPERBOLIC_API_KEY=<YOUR_API_KEY>"]
  }
}
```

### VRT MCP (Visual Regression Testing)

The `vrt-mcp` server (available on LobeHub) compares live page screenshots against design reference images — either local PNG files or Figma frames via the Figma API. Key capabilities include viewport auto-matching, element-level cropping (`crop_to_element`), pre-action sequencing (click → wait → screenshot), and a configurable diff threshold. Requires `odiff` for pixel-level image comparison.[^13]

### PuppeteerMCP

`hushaudio/PuppeteerMCP` on GitHub provides Puppeteer-based screenshot capture for AI assistants working with MCP-compatible hosts like Cursor. It navigates to any URL, captures screenshots at multiple viewport breakpoints, and returns visual feedback with structured metadata. Supports both headless and headful browser modes.[^14]

### Screenshot MCP Server (m-mcp)

The `m-mcp` Screenshot Capture MCP Server enables AI agents to capture screenshots from multiple displays across macOS, Windows, and Linux on-demand, providing visual context for UI debugging and design tasks. It has been used in workflows where prompts like "Make the middle square pink and rearrange the boxes into a column" are executed based on live visual feedback.[^15][^16]

***

## 3. Font & Typography Tools

### Google Fonts CSS API v2

The Google Fonts CSS API v2 (`fonts.googleapis.com/css2`) supports variable fonts and clean URL-based querying that Claude Code can call programmatically. An AI agent can construct font-loading URLs dynamically, request specific weight ranges, and integrate results into CSS variables or Tailwind configuration.[^17][^18]

```
https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap
```

For programmatic font discovery, the Google Fonts Developer API (`https://www.googleapis.com/webfonts/v1/webfonts?key=API_KEY`) returns the full catalog with metadata including variants, subsets, and file URLs.[^18][^19]

### Iconfont MCP Server

The `zys8119/iconfont-mcp-server` provides AI agents access to the Iconfont.cn icon library, enabling seamless icon search and integration during UI development. While focused on icons rather than fonts, it addresses a closely related design asset category.[^20]

### Practical Typography Pairing Approach for AI Agents

No dedicated MCP server for font pairing exists yet, but AI agents can use the Google Fonts API directly combined with prompt-based logic (e.g., "select a geometric sans-serif heading font + humanist body font for a SaaS dashboard") to generate pairing recommendations with CSS output. Tools like Poper.ai's typography pairing API return structured JSON with heading font, body font, pairing reasoning, and CSS code.[^21]

***

## 4. Color System Tools

### Color Palette Generator (MCP Market Skill)

Available at `mcpmarket.com`, this Claude Code skill transforms a single brand hex color into an 11-shade scale (50–950). It automatically generates semantic tokens for light and dark modes, maps variables to the Tailwind CSS v4 `@theme` syntax, and performs real-time WCAG contrast checking.[^22]

### colors-mcp (VS Code Extension with MCP Server)

Published by SyedSyab on the VS Code Marketplace, this extension includes an MCP-style JSON-RPC server (stdio-framed) that AI agents and scripts can call programmatically. It accepts a seed hex color (or array of seeds), a theme context (e.g., "ecommerce"), number of shades, and an `includeAccessibility` flag — returning a full semantic palette as CSS variables with optional WCAG contrast metadata.[^23]

```json
{
  "seed": "#3B82F6",
  "theme": "ecommerce",
  "shades": 10,
  "includeAccessibility": true
}
```

### Radix UI Colors (`@radix-ui/colors`)

The `@radix-ui/colors` npm package provides a complete 12-step color scale for 28 hues, including dark mode variants and alpha (transparency) scales. Each step is semantically defined (e.g., steps 1–2 for app backgrounds, 3–5 for component backgrounds, 9–10 for solid fills, 11–12 for text). Claude Code can import these scales directly and use them as the foundation for a semantic design token system.[^24][^25]

### culori & chroma.js for Programmatic Palette Generation

**culori** is the most technically capable color manipulation library for agents working in modern color spaces. It supports OKLCH — a perceptually uniform color space that produces equal visual steps between shades — which is how Tailwind v4 generates its own color system. An AI agent can use culori to:[^26]

- Generate full color scales from a single base hue with mathematically uniform lightness steps[^26]
- Convert between any color space (RGB, HSL, OKLCH, LCH, CIELAB)
- Mix colors in OKLCH, which preserves saturation better than RGB blending[^26]

**chroma.js** (`gka/chroma.js`) is a lighter zero-dependency alternative covering color conversions, scales, and brewer palettes.[^27]

### accessible-color-contrast CLI

`StackOverflowIsBetterThanAnyAI/accessible-color-contrast` is a CLI tool that checks two colors against WCAG 2.2 AA and AAA criteria. It accepts Tailwind CSS class names as color inputs (e.g., `zinc-50`, `zinc-950`), making it directly useful when an agent is working with a Tailwind-based project.[^28]

```bash
npx accessible-color-contrast "zinc-50" "#1a1a2e"
```

The npm package `color-contrast-checker` and `@mdhnpm/wcag-contrast-checker` both offer programmatic APIs for batch contrast validation across color pairs.[^29][^30]

***

## 5. Animation & Motion Tools

### Framer Motion (React Library)

Framer Motion remains the dominant animation library for React in 2025–2026. An AI agent authoring motion code can leverage:[^31][^32]

- `motion.div` + `variants` for declarative state-based animation
- `AnimatePresence` for exit/enter transitions between route changes[^33][^32]
- `useAnimation` hook for imperative sequencing[^31]
- Built-in spring physics via the `transition` prop (e.g., `{ type: "spring", stiffness: 300, damping: 30 }`)

The library is accessibility-aware: it respects `prefers-reduced-motion` and provides hooks for conditional animation.[^32]

### Motion Design Token Pattern

Emerging practice in 2025 involves defining **motion tokens** as CSS custom properties and mapping them to Framer Motion `transition` configs. This gives AI agents a consistent vocabulary for animation authoring:

```css
:root {
  --duration-fast: 150ms;
  --duration-base: 300ms;
  --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

No dedicated MCP server for motion tokens currently exists, but the Panda CSS MCP server can track custom motion tokens defined in your Panda config as part of its design system exposure.[^1]

### Tailwind CSS Animations

Tailwind CSS v4 ships with a set of built-in animation utilities (`animate-spin`, `animate-ping`, `animate-pulse`, `animate-bounce`) and allows custom keyframes via `@theme`. For more complex needs, the `tailwindcss-animate` plugin extends this with additional easing and duration utilities compatible with the `@theme` directive in v4.

***

## 6. Accessibility Auditing

### Axe MCP Server (Deque Systems)

Deque's `axe MCP Server` embeds the industry-standard `axe-core` accessibility testing engine directly into AI coding agents. It provides AI-backed automated issue detection and remediation guidance within the IDE. Developers can ask their AI agent to "test and make this component accessible" and receive tailored fix suggestions they can accept or reject with a single click. This represents the most mature dedicated accessibility MCP server available as of early 2026.[^34][^35]

### Accessibility Scanner MCP (justasmonkev)

The `justasmonkev/accessibility-scanner` MCP server integrates both **axe-core** and **Playwright** to perform automated web accessibility testing, supporting continuous integration, compliance auditing, and identification of accessibility barriers. Listed on PulseMCP, it was released in January 2025.[^36]

### A11y MCP Server (Priyankar Kumar)

The **A11y** MCP server performs accessibility audits on webpages using axe-core and returns structured results for use in an agentic loop. Released April 2025, it's designed specifically for AI agents to iterate on fixes until violations are resolved.[^36]

### Accessibility MCP Server (duds)

Available on LobeHub, this server integrates **axe-core**, the **Lighthouse CLI**, and the optional **WAVE API**. It requires Playwright's Chromium browser (`npx playwright install chromium`) and is configured via a `.env` file. It's the most comprehensive multi-tool accessibility MCP, combining automated rule checking (axe-core), performance-integrated auditing (Lighthouse), and visual/structural analysis (WAVE).[^37]

### Pa11y CLI

Pa11y (`pa11y.org`) is a battle-tested command-line accessibility testing tool that highlights issues on any web page with a single command. It outputs structured JSON results that an AI agent can parse and act on. The `pa11y-ci` variant is designed for CI pipelines and iterates over lists of URLs.[^38]

```bash
pa11y --reporter json http://localhost:3000 > a11y-results.json
```

### Lighthouse CLI

Google Lighthouse can be run from the Node CLI to produce structured JSON accessibility reports. Pass `--output json --only-categories accessibility` to receive a machine-readable accessibility score and issue list. A Chrome DevTools MCP GitHub issue (opened October 2025) tracks adding Lighthouse accessibility scores directly to the Chrome DevTools MCP, which would create a single integrated tool.[^39][^40][^41]

### WCAG Audit Patterns (FastMCP Skill)

Available at FastMCP as `wcag-audit-patterns`, this Claude Code skill provides WCAG 2.2 audit patterns with axe-core integration code, Playwright test scaffolding, and manual verification checklists.[^42]

***

## 7. Component Library MCP Servers

### shadcn/ui Official MCP Server

The official shadcn/ui MCP server was launched in April 2025 and overhauled in August 2025 with CLI 3.0. It supports all registries with zero configuration, natural language component installation ("add the button, dialog and card components"), multi-registry support, and private company registries with namespaced access (e.g., `@acme/auth-form`).[^43][^44][^45]

Install for Claude Code with one command:
```bash
claude mcp add shadcn
```

The server exposes tools to: list all available components and blocks, search across registries, get detailed documentation, and trigger CLI-based installation.[^46][^47]

A community-built alternative (`@jpisnice/shadcn-ui-mcp-server`) provides multi-framework support (React, Svelte, Vue, React Native), complete TypeScript source code for each component, block implementations, and smart GitHub API caching.[^47]

### Radix UI MCP Server

`@gianpieropuleo/radix-mcp-server` on npm is a dedicated MCP server for all three Radix UI packages: **Themes**, **Primitives**, and **Colors**. It provides AI assistants with component source code, installation guides, and design tokens. Compatible with Claude Desktop, Cursor, Continue.dev, and VS Code.[^48]

### ui-layouts MCP (Open Source)

The `ui-layouts/mcp` server (GitHub) connects AI agents to ui-layouts.com's library of 100+ free Tailwind + React components. Instead of having Claude hallucinate component code, the agent can locate available components, read authentic documentation, examine metadata, and retrieve actual TSX source code.[^49]

### shadcn.io Free MCP Server

A community server at `shadcn.io/mcp` provides direct access to the shadcn/ui component registry with accurate TypeScript props and React component data, explicitly designed to eliminate AI hallucinations about component APIs.[^50]

***

## 8. Browser Automation for Design QA

### Playwright MCP (`@playwright/mcp`)

Microsoft's official Playwright MCP server is the most capable and widely used browser automation tool for AI design QA in 2025–2026. It exposes 34 tools across categories including core automation, tab management, vision-based interactions, and test assertions. Key design QA tools:[^51]

| Tool | Use Case |
|------|----------|
| `browser_navigate` | Open dev server or staging URL |
| `browser_take_screenshot` | Capture full-page or element screenshots |
| `browser_snapshot` | Capture ARIA accessibility tree |
| `browser_click` / `browser_type` | Simulate user interactions |

Install in Claude Code in one command:[^52]
```bash
claude mcp add playwright -s local npx '@playwright/mcp@latest'
```

A key architectural advantage is that Playwright MCP uses the **accessibility tree** rather than screenshot pixels for most interactions — making it faster, more token-efficient, and more reliable. For design QA purposes, the `browser_take_screenshot` tool is used in combination with `frontend-review-mcp` for the full AI visual review loop.[^51][^52]

Browser state (sessions, cookies, form state) persists across MCP calls within a conversation, enabling multi-step design review flows without re-authentication.[^52]

### Chrome DevTools MCP

Google's Chrome DevTools MCP provides programmatic access to Chrome DevTools capabilities including `take_screenshot`, `navigate_page`, `emulate_network`, `performance_start_trace`, and `click`. It's particularly useful for Core Web Vitals analysis combined with visual output validation.[^53][^54]

### Playwright Visual Regression with Baseline Comparison

The Playwright MCP supports a structured visual regression workflow: capture screenshots during stable page states → compare against baseline images → collect DOM/accessibility context → analyze code changes → classify as regression, acceptable change, or manual review. The addition of accessibility tree data reduces false positives compared to pure pixel-diff approaches.[^55]

***

## 9. Tailwind CSS Tooling

### Flowbite MCP Server

The official Flowbite MCP server (`npx flowbite-mcp`) is the most feature-complete Tailwind-focused MCP available. It provides:[^56][^57]

- **60+ UI components** as complete, copy-ready Tailwind CSS markup[^58][^56]
- **Theme file generator**: creates a branded Tailwind config from any hex color with a single prompt[^59]
- **Figma to Tailwind code**: paste a Figma node URL to get Tailwind output (requires `FIGMA_ACCESS_TOKEN`)[^58][^56]

```bash
npx flowbite-mcp
```

Prompt example for theme generation:
```
use flowbite mcp to generate a theme file using "#0000FF" brand color
and create a professional, enterprise, clean looking UI
```

### Tailwind CSS v4 Skills (MCP Market)

Two Claude Code skills on MCP Market target Tailwind v4 specifically:

- **Tailwind CSS v4 Development** — handles everything from layout and typography to the new CSS-first `@theme` configuration and OKLCH color spaces[^60]
- **Tailwind CSS v4 Best Practices** — fetches live Tailwind docs, converts raw CSS to utility classes, generates accessible component templates, and enforces v4-specific syntax[^61]

### TailwindPlus MCP Server

`richardkmichael/mcp-tailwindplus` provides access to the TailwindPlus premium component library through MCP. Add to Claude Code with:[^62][^63]

```bash
claude mcp add mcp-tailwindplus [-s project] uvx -- \
  --from git+https://github.com/richardkmichael/mcp-tailwindplus@latest \
  mcp-tailwindplus \
  --tailwindplus-data /path/to/tailwindplus-components.json
```

The server supports Tailwind v4 React components and is recommended to have Claude annotate installed components with their name and version for future maintenance.[^62]

### Tailwind UI Components Skill (MCP Market)

This Claude Code skill integrates 657 hand-crafted Tailwind UI templates into the development environment, including HTML, React, and Vue snippets with dark mode, ARIA features, and mobile-first responsiveness.[^64]

### accessible-color-contrast for Tailwind

As noted above, `accessible-color-contrast` CLI accepts Tailwind color class names directly as inputs, making it the natural choice for WCAG contrast checking in Tailwind workflows.[^28]

***

## Quick Reference: Install Commands

| Tool | Category | Install / Config |
|------|----------|-----------------|
| Panda CSS MCP | Design tokens | `pnpm panda init-mcp` |
| AINative Design System MCP | Design tokens | `npm i ainative-design-system-mcp-server` |
| shadcn/ui Official MCP | Components | `claude mcp add shadcn` |
| Playwright MCP | Browser QA | `claude mcp add playwright -s local npx '@playwright/mcp@latest'` |
| Flowbite MCP | Tailwind + themes | `npx flowbite-mcp` |
| frontend-review-mcp | Visual feedback | `npx frontend-review-mcp HYPERBOLIC_API_KEY=<key>` |
| Axe MCP Server (Deque) | Accessibility | Contact Deque / IDE integration |
| Accessibility Scanner MCP | Accessibility | PulseMCP: justasmonkev |
| Accessibility MCP (duds) | Accessibility | LobeHub: duds-accessibility-mcp |
| Radix UI MCP | Components | `npm i @gianpieropuleo/radix-mcp-server` |
| ui-layouts MCP | Tailwind components | `github.com/ui-layouts/mcp` |
| Pa11y | Accessibility CLI | `npm i -g pa11y` |
| culori | Color system | `npm i culori` |
| chroma.js | Color system | `npm i chroma-js` |
| @radix-ui/colors | Color tokens | `npm i @radix-ui/colors` |
| accessible-color-contrast | WCAG CLI | `npx accessible-color-contrast` |
| VRT MCP | Visual regression | `github.com/yourusername/vrt-mcp` |

***

## Recommended Workflow Stacks

### Vibe-coding UI stack (your use case: Next.js + shadcn + Tailwind)

1. **shadcn/ui Official MCP** for component discovery, search, and installation
2. **Playwright MCP** for browser-based design QA at multiple viewports
3. **frontend-review-mcp** for AI-graded visual iteration (before/after loop)
4. **Flowbite MCP** or **Tailwind CSS v4 Skills** for theme generation from brand color
5. **Axe MCP** or **Accessibility Scanner MCP** for WCAG auditing inline
6. **culori** or **@radix-ui/colors** for programmatic color scale generation
7. **AINative Design System MCP** for extracting tokens from existing stylesheets

### Comprehensive design system management

Start with **Panda CSS MCP** (if using Panda) or the **AINative Design System MCP** to give Claude a live read on your tokens. Layer in **@radix-ui/colors** for the color foundation, **culori** for OKLCH-based scale generation, and **pa11y + axe** for accessibility validation at each iteration. Use **Playwright MCP** as the final QA step to validate visual output at all breakpoints.

***

## Gaps & Limitations (as of March 2026)

- **No dedicated motion/animation MCP server** — Framer Motion authoring relies on Claude's built-in knowledge plus motion token patterns in Panda CSS or Tailwind v4 configs
- **No font pairing MCP server** — Google Fonts API can be queried directly but no structured pairing algorithm is exposed through MCP
- **VRT MCP maturity** — The visual regression testing MCP servers are functional but younger and less battle-tested than Playwright; production teams should evaluate stability
- **Axe MCP availability** — Deque's axe MCP Server was previewed in early 2026 but may require enterprise access; the community `accessibility-scanner` MCP is a viable open-source fallback
- **Chrome DevTools MCP accessibility** — A GitHub issue is open (October 2025) to expose Lighthouse accessibility scores through the Chrome DevTools MCP, but this is not yet merged[^41]

---

## References

1. [MCP Server | Panda CSS](https://panda-css.com/docs/ai/mcp-server) - Expose your Panda CSS design system to AI assistants using the Model Context Protocol (MCP).

2. [CLI Reference | Panda CSS](https://panda-css.com/docs/references/cli) - Start the MCP (Model Context Protocol) server for AI assistants. This exposes your design system to ...

3. [ainative-design-system-mcp-server](https://www.npmjs.com/package/ainative-design-system-mcp-server?activeTab=readme) - AINative Design System MCP Server for Claude Code - Extract design tokens, analyze components, and g...

4. [ainative-design-system-mcp-server](https://www.npmjs.com/package/ainative-design-system-mcp-server) - AINative Design System MCP Server for Claude Code - Extract design tokens, analyze components, and g...

5. [Design System & AI Kit - AI Native Studio](https://www.ainative.studio/design-system-showcase) - Build Stunning AI-Native Interfaces. Production-ready design system with AINative Design MCP server,...

6. [Introducing the AINative Design System MCP Server - LinkedIn](https://www.linkedin.com/pulse/introducing-ainative-design-system-mcp-server-toby-morning-lkdmc) - Design tokens, straight from source. Pull tokens out of CSS/SCSS/Less/Stylus, normalize them, and ex...

7. [Build your own MCP server for design tokens](https://learn.thedesignsystem.guide/p/build-your-own-mcp-server-for-design) - MCP (Model Context Protocol) is a new way to connect your tools and data directly to Claude Desktop,...

8. [Frontend Review MCP](https://glama.ai/mcp/servers/@zueai/frontend-review-mcp) - An MCP server that visually reviews UI edit requests by comparing screenshots before and after edits...

9. [zueai/frontend-review-mcp](https://github.com/zueai/frontend-review-mcp) - MCP server that visually reviews your agent's design edits - zueai/frontend-review-mcp

10. [frontend-review-mcp | MCP Servers · LobeHub](https://lobehub.com/zh/mcp/zueai-frontend-review-mcp) - 一个执行UI编辑请求视觉审核的MCP服务器。需要设置HYPERBOLIC_API_KEY环境变量以进行与Hyperbolic审核模型服务的身份验证。

11. [5 Claude Code MCP Servers You Need To Be Using - YouTube](https://www.youtube.com/watch?v=sF799nFJONk) - ... UI testing and improvement LINKS: Ref: https ... claude code, you need these mcp server tools in...

12. [GitHub - smithery-ai/frontend-review-mcp-1: MCP server that visually reviews your agent's design edits](https://github.com/smithery-ai/frontend-review-mcp-1) - MCP server that visually reviews your agent's design edits - smithery-ai/frontend-review-mcp-1

13. [VRT MCP | MCP Servers](https://lobehub.com/nl/mcp/anthropics-vrt-mcp)

14. [GitHub - hushaudio/PuppeteerMCP](https://github.com/hushaudio/puppeteermcp) - Contribute to hushaudio/PuppeteerMCP development by creating an account on GitHub.

15. [Screenshot MCP Server: Giving Your AI Agent the Gift of Sight](https://skywork.ai/skypage/en/screenshot-mcp-server-ai-sight/1978699130249453568) - Unlock the power of AI with the Screenshot MCP Server by m-mcp, enabling your agents to see and anal...

16. [Screenshot MCP Server by m-mcp - PulseMCP](https://www.pulsemcp.com/servers/screenshot) - Enables AI to capture and analyze screenshots from a user's desktop on demand, providing visual cont...

17. [Google Fonts Developer Guide — API, CSS, Performance - FontFYI](https://fontfyi.com/blog/google-fonts-developers-guide/) - Everything a developer needs to know about Google Fonts — the API, CSS integration, self-hosting, pe...

18. [Developer API - Fonts](https://developers.google.com/fonts/docs/developer_api)

19. [CSS API update | Google Fonts](https://developers.google.com/fonts/docs/css2)

20. [Iconfont MCP Server by zys8119: Your AI's Secret Weapon for ...](https://skywork.ai/skypage/en/iconfont-mcp-server-ai-design/1981215646021812224) - Unlock seamless UI design with the Iconfont MCP Server by zys8119. Effortlessly integrate AI and acc...

21. [Free Typography Pairing Tool - Google Fonts Combinations](https://www.poper.ai/tools/typography-pairing-tool/) - Free AI typography pairing tool. Select your project type, mood, and industry to get 3 expert Google...

22. [Color Palette Generator - Accessible Design Tokens](https://mcpmarket.com/tools/skills/color-palette-generator)

23. [colors-mcp - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=SyedSyab.colors-mcp) - Extension for Visual Studio Code - Generate professional color palettes as CSS variables.

24. [@radix-ui/colors](https://www.npmjs.com/package/@radix-ui/colors/v/0.1.5?activeTab=dependents) - [![Radix Colors Logo](colors.png)](https://radix-ui.com/colors). Latest version: 3.0.0, last publish...

25. [Radix Colors](https://www.radix-ui.com/colors) - An open-source color system for designing beautiful, accessible websites and apps.

26. [culori vs chroma-js vs tinycolor2: Color Manipulation in JavaScript ...](https://www.pkgpulse.com/blog/culori-vs-chroma-js-vs-tinycolor2-color-manipulation-javascript-2026) - Compare culori, chroma-js, and tinycolor2 for color manipulation in JavaScript. CSS color spaces (OK...

27. [gka/chroma.js: JavaScript library for all kinds of color manipulations](https://github.com/gka/chroma.js/) - Chroma.js is a tiny small-ish zero-dependency JavaScript library for all kinds of color conversions ...

28. [StackOverflowIsBetterThanAnyAI/accessible-color-contrast - GitHub](https://github.com/StackOverflowIsBetterThanAnyAI/accessible-color-contrast) - Accessible Color Contrast is a CLI tool which checks two colors for a high enough contrast in the co...

29. [@mdhnpm/wcag-contrast-checker - npm](https://www.npmjs.com/package/@mdhnpm/wcag-contrast-checker) - A module to access the color contrast between background and foreground based on Web Contenet Access...

30. [color-contrast-checker - npm](https://www.npmjs.com/package/color-contrast-checker) - Color Contast Checker. An accessibility checker tool for validating the color contrast based on WCAG...

31. [Advanced Framer Motion Animation Techniques for 2025](https://luxisdesign.io/blog/advanced-framer-motion-animation-techniques-for-2025) - It's a tool that empowers developers to create smooth, declarative animations effortlessly. ... Fram...

32. [Motion UI with Framer Motion in 2025 - More Than Just Animations](https://shoaib-blog.yumeui.com/motion-ui-with-framer-motion-in-2025-more-than-just-animations/) - In 2025, Framer Motion isn't just a design tool — it's a core part of building responsive, accessibl...

33. [2. Button Feedback & Micro...](https://www.shoaibsid.dev/blog/motion-ui-with-framer-motion-in-2025-more-than-just-animations) - ✍️ By Shoaib — A Full-Stack Developer Sharing What Actually Works 🧠 TL;DR Framer...

34. [Axe MCP Server: Digital accessibility expertise right in your AI agent](https://digitalaccessibility.virginia.edu/axe-mcp-server-digital-accessibility-expertise-right-your-ai-agent) - Accelerate and enhance digital accessibility with expert testing and remediation directly in the too...

35. [Axe MCP Server for digital accessibility - YouTube](https://www.youtube.com/watch?v=zY8H8lDVEf4) - ... AI coding agent of choice directly in their development tools—including within their IDE. This m...

36. [Accessibility Scanner MCP Server by Justas Monkevicius - PulseMCP](https://www.pulsemcp.com/servers/justasmonkev-accessibility-scanner) - Integrates Axe Core with Playwright to perform automated web accessibility testing, enabling continu...

37. [Accessibility MCP Server - LobeHub](https://lobehub.com/mcp/duds-accessibility-mcp) - An MCP server providing accessibility auditing tools for LLMs integrating axe-core, Lighthouse CLI, ...

38. [Pa11y](https://pa11y.org) - A command-line interface which loads web pages and highlights any accessibility issues it finds. Use...

39. [Pa11y](https://www.qed42.com/insights/4-opensource-accessibility-audit-tools-you-must-know) - Four open-source tools that help teams identify accessibility gaps and maintain compliance.

40. [Lighthouse Accessibility: Simple Setup and Audit Guide - Codoid](https://codoid.com/accessibility-testing/lighthouse-accessibility-simple-setup-and-audit-guide/) - Lighthouse accessibility helps quick find and fix issues. Learn setup steps, run audits in any brows...

41. [Expose accessibility findings from lighthouse · Issue #473 - GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/473) - As Lighthouse provides some limited automatic accessibility testing I would like to see it in the MC...

42. [wcag-audit-patterns — Claude Code Skill - FastMCP](https://fastmcp.me/skills/details/456/wcag-audit-patterns) - Conduct WCAG 2.2 accessibility audits with automated testing, manual verification, and remediation g...

43. [MCP Server - Shadcn UI](https://ui.shadcn.com/docs/mcp) - The shadcn MCP Server allows AI assistants to interact with items from registries. You can browse av...

44. [August 2025 - shadcn CLI 3.0 and MCP Server](https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp) - You can now install components from registries: a community registry, your company's private registr...

45. [4 MCPs Every Frontend Dev Should Install Today (Part 1)](https://www.aiagentshub.net/blog/best-4-mcp-frontend) - These 4 MCPs turn Claude/Cursor from guessing to knowing—no more outdated APIs, manual browser testi...

46. [Shadcn UI MCP Server](https://mcpservers.org/en/servers/heilgar/shadcn-ui-mcp-server) - Shadcn UI MCP Server. A powerful and flexible MCP (Model Control Protocol) server designed to enhanc...

47. [shadcn-ui-mcp-server - Trust Score 79/100 — AgentAudit](https://agentaudit.dev/packages/shadcn-ui-mcp-server) - A mcp server to allow LLMS gain context about shadcn ui component structure,usage and installation,c...

48. [@gianpieropuleo/radix-mcp-server](https://www.npmjs.com/package/@gianpieropuleo/radix-mcp-server) - A Model Context Protocol (MCP) server for Radix UI libraries (Themes, Primitives, Colors), providing...

49. [I built an open-source MCP server for UI-Layouts](https://www.reddit.com/r/shadcn/comments/1qawpxl/i_built_an_opensource_mcp_server_for_uilayouts/) - I built an open-source MCP server for UI-Layouts

50. [Free MCP Server for Shadcn UI](https://www.shadcn.io/mcp) - Free MCP server connects Claude and AI coding tools to shadcn/ui components. Accurate TypeScript pro...

51. [How to Use Playwright MCP Server with Claude Code](https://www.builder.io/blog/playwright-mcp-server-claude-code) - Set up the Playwright MCP server with Claude Code in one command. Covers self-QA, exploratory testin...

52. [Claude Code MCP Integration: Playwright, Supabase,...](https://vladimirsiedykh.com/blog/claude-code-mcp-workflow-playwright-supabase-figma-linear-integration-2025) - Master Claude Code MCP workflow with Playwright browser automation, Supabase database management, Fi...

53. [Chrome DevTools MCP: Revolutionizing AI-Powered Development](https://atalupadhyay.wordpress.com/2025/10/06/chrome-devtools-mcp-revolutionizing-ai-powered-development/) - A: Chrome DevTools MCP is a Model Context Protocol server that enables AI coding assistants to progr...

54. [Using AI and Chrome MCP to Automate Core Web Vitals](https://dev.to/marianocodes/using-ai-and-chrome-devtools-to-automate-core-web-vitals-56j1) - The key piece here is ChromeMCP, which provides a wide range of functions that allow an LLM to acces...

55. [Automating Visual Regression Checks with Playwright MCP - TestDino](https://testdino.com/blog/playwright-mcp-visual-regression/) - Playwright MCP improves visual regression testing by adding DOM and accessibility context to Playwri...

56. [Flowbite MCP](https://mcpservers.org/servers/themesberg/flowbite-mcp) - This MCP server is the official tool that allows you to work with the Flowbite UI framework and gene...

57. [flowbite-mcp | Glama](https://glama.ai/mcp/servers/@zoltanszogyenyi/flowbite-mcp) - This MCP server is the official resource of the Flowbite UI framework and enhances development of we...

58. [Tailwind CSS MCP Server - Flowbite](https://flowbite.com/docs/getting-started/mcp/) - In this guide you will learn how to install the Flowbite MCP server and convert Figma design files i...

59. [Convert Figma layers to code in Tailwind CSS with Flowbite MCP](https://dev.to/themesberg/convert-figma-layers-to-code-in-tailwind-css-with-flowbite-mcp-50ec) - In this guide you will learn how to install the Flowbite MCP server and convert Figma design files i...

60. [Tailwind CSS v4 Development - Claude Code Skill - MCP Market](https://mcpmarket.com/tools/skills/tailwind-css-v4-development-6) - This skill empowers Claude to architect and style high-performance user interfaces using the latest ...

61. [Tailwind CSS v4 Best Practices | Claude Code Skill - MCP Market](https://mcpmarket.com/tools/skills/tailwind-css-v4-best-practices) - Master Tailwind CSS v4 with this Claude Code skill. Get real-time docs, component templates, and v4 ...

62. [TailwindPlus MCP Server | MCP Servers · LobeHub](https://lobehub.com/nl/mcp/richardkmichael-mcp-tailwindplus) - An MCP (Model Context Protocol) server for TailwindPlus UI components. Requires a TailwindPlus compo...

63. [TailwindPlus MCP-Server | MCP Servers · LobeHub](https://lobehub.com/de/mcp/richardkmichael-mcp-tailwindplus) - Ein MCP (Model Context Protocol) Server für TailwindPlus UI-Komponenten. Erfordert eine TailwindPlus...

64. [Tailwind UI Components Claude Code Skill | AI Frontend](https://mcpmarket.com/tools/skills/tailwind-ui-components)

