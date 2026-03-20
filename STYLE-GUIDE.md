# Crosby Style Guide

## Stack
- **Tailwind CSS v3** — utility-first, always dark mode (`dark` class on `<html>`)
- **shadcn/ui** — component library built on Radix UI primitives
- **Lucide React** — icon library
- **CVA (Class Variance Authority)** — for component variants
- **`cn()` utility** (`src/lib/utils.ts`) — always use this for conditional/merged class names

---

## Color System

All colors are **HSL CSS custom properties** defined in `src/app/globals.css`. Never hardcode hex or rgb values — always use the semantic tokens.

| Token | Usage |
|---|---|
| `bg-background` | Page background (very dark brown-gray) |
| `text-foreground` | Primary text (light tan) |
| `bg-card` | Card backgrounds (slightly lighter than background) |
| `text-card-foreground` | Text on cards |
| `bg-muted` | Disabled states, subtle fills |
| `text-muted-foreground` | Secondary/quiet text |
| `bg-primary` | Primary button backgrounds (light tan) |
| `text-primary-foreground` | Text on primary buttons |
| `bg-secondary` | Secondary button backgrounds |
| `border-border` | Standard borders |
| `ring-ring` | Focus rings |
| `text-destructive` | Errors, warnings |
| `bg-sidebar` | Sidebar background (darkest tone) |

**Transparency modifiers** are used extensively for semantic layering:
- `bg-muted/50` → faded fill
- `text-muted-foreground/50` → very quiet label text
- `ring-foreground/10` → ultra-subtle border on cards

---

## Typography

- **Body font**: Geist Sans (variable, loaded via CSS var `--font-geist-sans`)
- **Mono font**: Geist Mono (for code, CSS var `--font-geist-mono`)
- **Base size**: 16px mobile / 18px desktop
- **Antialiasing**: `antialiased` applied globally

### Common text patterns

```
Body text:        text-[0.8125rem] font-light
Small body:       text-[0.75rem] font-light
Section heading:  text-[0.8125rem] font-medium uppercase tracking-[0.1em]
Quiet label:      text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium
Code/mono:        font-mono text-sm
```

- Use **font-light (300)** for body text
- Use **font-medium (500)** for labels, headings
- Use **font-semibold (600)** sparingly for strong headings
- Wide letter-spacing (`tracking-[0.1em]`, `tracking-[0.15em]`) goes with uppercase labels

---

## Spacing

Follow the Tailwind scale. Common values in this project:

| Purpose | Class |
|---|---|
| Tight inline gap (icon+text) | `gap-1.5` |
| Card internal gap | `gap-2` to `gap-4` |
| Section padding | `px-4 pt-4` or `px-4 pt-6` |
| Compact input padding | `px-2.5 py-1` |
| Standard input padding | `px-3 py-2` |

---

## Border Radius

`--radius` is set to `0` — sharp corners are the default. Override explicitly when needed:

| Use | Class |
|---|---|
| Buttons, inputs, cards | `rounded-lg` (or sharp, since --radius = 0) |
| Larger cards/containers | `rounded-xl` |
| Pill-shaped elements (user chat bubbles) | `rounded-2xl` |
| Badges (always pill) | `rounded-4xl` |
| Small checkboxes | `rounded-[4px]` |

---

## Borders & Dividers

- **Standard border**: `border border-border`
- **Subtle card ring**: `ring-1 ring-foreground/10`
- **Input border**: `border border-input`
- Border color transitions on focus: `.input-container` class handles this globally

---

## Focus States

All interactive elements use a consistent focus ring:

```
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
```

Never remove focus styles. This is applied globally to all shadcn inputs, buttons, and form controls.

---

## Component Conventions

### Buttons
Use the `<Button>` component from `src/components/ui/button.tsx`.

```tsx
// Variants: default, outline, secondary, ghost, destructive, link
// Sizes: xs, sm, default, lg, icon, icon-sm, icon-xs

<Button variant="default" size="sm">Save</Button>
<Button variant="ghost" size="icon"><PlusIcon /></Button>
```

- Always add `active:translate-y-px` for subtle press feedback (built in to Button component)
- Icon buttons: use `size="icon"` variant

### Cards
Use the Card primitives from `src/components/ui/card.tsx`.

```tsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

Card footer gets `bg-muted/50` and a top border — use it for secondary actions only.

### Inputs
Use `<Input>` from `src/components/ui/input.tsx`. All inputs are `h-8` by default.

For textarea + send pattern (like the chat input), use a custom wrapper with `.input-container` class for the border-glow focus effect.

### Labels (form fields)
```tsx
<label className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">
  Field Name
</label>
```

### Badges
Always use `<Badge>` from `src/components/ui/badge.tsx`. Always pill-shaped (`rounded-4xl`).

### Dialogs / Modals
Use `<Dialog>` from `src/components/ui/dialog.tsx`. Footer buttons stack on mobile (`flex-col-reverse sm:flex-row`).

### Toasts
Use `sonner` via the `<Toaster>` component. Import `toast` from `sonner`.

---

## Icons

Use **Lucide React** exclusively. Import from `lucide-react`.

```tsx
import { PlusIcon, CheckIcon, Loader2 } from 'lucide-react'

// Loading state
<Loader2 className="animate-spin" />

// Success
<CheckIcon className="text-green-500" />
```

Icon sizing follows text context — use `size-3`, `size-4`, `size-5` to match text scale.

---

## Animations

Custom keyframes are defined in `globals.css`. Use via utility classes:

| Class | Effect |
|---|---|
| `.animate-in-up` | Slides in from below + fade in (0.3s, spring easing) |
| `.animate-in-fade` | Fade in (0.4s ease) |
| `.skeleton` | Pulsing loading placeholder |
| `.digest-expand` | Smooth grid expand/collapse |
| `animate-spin` | Spinner (Tailwind built-in, use with `Loader2`) |

For Radix-based components (dialogs, dropdowns), use data-attribute animation classes:
```
data-open:animate-in data-closed:animate-out fade-in-0 zoom-in-95
```

---

## Layout

- **Sidebar**: Fixed left nav on desktop, bottom tab bar on mobile
- **Content area**: `flex-1 overflow-auto` with `px-4 pt-4` padding
- **Max width**: Most content pages use `max-w-2xl` or `max-w-lg` centered
- **Mobile-first**: Use `md:` breakpoint (768px) for desktop variants
- **Safe area**: iOS notch handled via `env(safe-area-inset-*)` on body — don't fight it

---

## Visual Personality

- **Dark, minimal, utilitarian** — no gradients, no glassmorphism, no decorative elements
- **Brown-gray palette** — warm dark background, not pure black
- **High contrast text** — light tan on dark background
- **Quiet hierarchy** — use opacity and size to create hierarchy, not aggressive color differences
- **Borders are subtle** — `ring-foreground/10` reads as a soft separator, not a hard box
- **Motion is subtle** — short durations (0.2–0.4s), spring/ease easing, no bouncy effects

---

## File Locations

| File | Purpose |
|---|---|
| `src/app/globals.css` | CSS custom properties, keyframes, global utilities |
| `tailwind.config.ts` | Tailwind theme extensions |
| `src/components/ui/` | All shadcn/Radix UI components |
| `src/lib/utils.ts` | `cn()` utility function |
| `src/app/layout.tsx` | Font loading, dark mode setup |
