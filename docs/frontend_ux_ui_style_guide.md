# Repo-Ninja Frontend UX/UI Style Guide

**Date:** 2026-02-23
**Status:** Active
**Reference:** 2026 developer tool UI trends

---

## 1. Design Philosophy

Repo-Ninja is a **developer command center** — a tool where engineers delegate work to AI agents, monitor task progress, review results, and manage a knowledge base. The UI must feel like a trusted control panel: fast to scan, zero learning curve, and professional enough for enterprise demos.

This is not a consumer app or a marketing site. Developers are the audience. They value speed, clarity, and density over decoration.

**Core Principles:**
- **Clarity over decoration** — No element exists without a purpose. Developers don't want fluff.
- **Consistent rhythm** — Same spacing, radii, and color tokens everywhere
- **Dark mode first** — Deep navy background is the default; developers overwhelmingly prefer dark interfaces for tools they use daily
- **Subtle motion** — Gentle fade-in and slide-up animations, never distracting
- **Information density done right** — Show agent status, task progress, review scores, and knowledge docs at a glance without scrolling through empty space
- **Tool-grade trust** — The UI should feel like VS Code or GitHub, not Dribbble

---

## 2. Color System

### 2.1 CSS Custom Properties

All colors are defined as HSL values in CSS custom properties. Components reference these tokens — never hardcoded hex values.

#### Light Mode (`:root`)

```css
--background: 0 0% 100%;          /* #FFFFFF — pure white */
--foreground: 222.2 84% 4.9%;     /* #030712 — near-black with blue tint */
--card: 0 0% 100%;                /* #FFFFFF */
--card-foreground: 222.2 84% 4.9%;
--popover: 0 0% 100%;
--popover-foreground: 222.2 84% 4.9%;
--primary: 243 75% 59%;           /* #6366F1 — indigo */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;       /* #F1F5F9 — light gray-blue */
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;
--destructive: 0 84.2% 60.2%;    /* #EF4444 — red */
--destructive-foreground: 210 40% 98%;
--border: 214.3 31.8% 91.4%;     /* #E2E8F0 — light border */
--input: 214.3 31.8% 91.4%;
--ring: 243 75% 59%;              /* matches primary */
--radius: 0.5rem;                 /* 8px — default border radius */
```

#### Dark Mode (`.dark`)

```css
--background: 222.2 84% 4.9%;     /* #030712 — deep navy, almost black */
--foreground: 210 40% 98%;        /* #F8FAFC — off-white */
--card: 222.2 84% 4.9%;           /* same as background */
--card-foreground: 210 40% 98%;
--primary: 243 75% 59%;           /* #6366F1 — same indigo */
--primary-foreground: 210 40% 98%;
--secondary: 217.2 32.6% 17.5%;   /* #1E293B — dark slate */
--secondary-foreground: 210 40% 98%;
--muted: 217.2 32.6% 17.5%;
--muted-foreground: 215 20.2% 65.1%;
--accent: 217.2 32.6% 17.5%;
--accent-foreground: 210 40% 98%;
--destructive: 0 62.8% 30.6%;
--destructive-foreground: 210 40% 98%;
--border: 217.2 32.6% 17.5%;     /* #1E293B — subtle border */
--input: 217.2 32.6% 17.5%;
--ring: 243 75% 59%;
```

### 2.2 Brand Color Scale

The brand color is **indigo** — professional, modern, and distinct from the GitHub/blue ecosystem.

```
brand-50:  #EEF2FF
brand-100: #E0E7FF
brand-200: #C7D2FE
brand-300: #A5B4FC
brand-400: #818CF8
brand-500: #6366F1  ← primary
brand-600: #4F46E5
brand-700: #4338CA
brand-800: #3730A3
brand-900: #312E81
```

### 2.3 Semantic Status Colors

Used for badges, indicators, and status displays. Always use the translucent pattern for badges:

```
Success:  text-emerald-400  bg-emerald-500/10  border-emerald-500/20
Warning:  text-amber-400    bg-amber-500/10    border-amber-500/20
Error:    text-rose-400     bg-rose-500/10     border-rose-500/20
Info:     text-blue-400     bg-blue-500/10     border-blue-500/20
Running:  text-violet-400   bg-violet-500/10   border-violet-500/20
```

---

## 3. Typography

### 3.1 Font Stack

Use the system font stack for maximum performance and native feel:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, sans-serif;
```

Enable ligatures and antialiasing:

```css
font-feature-settings: "rlig" 1, "calt" 1;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### 3.2 Size Scale

| Use | Class | Size | Weight |
|-----|-------|------|--------|
| Page title | `text-2xl font-bold` | 1.5rem | 700 |
| Section header | `text-lg font-semibold` | 1.125rem | 600 |
| Card title | `text-sm font-medium` | 0.875rem | 500 |
| Body text | `text-sm` | 0.875rem | 400 |
| Caption/metadata | `text-xs text-muted-foreground` | 0.75rem | 400 |
| Badge text | `text-xs font-medium` | 0.75rem | 500 |

### 3.3 Rules

- **Never go above `text-3xl`** on any page — this is a tool, not a marketing site
- **Muted color for secondary text** — use `text-muted-foreground` for metadata, timestamps, descriptions
- **Consistent weight hierarchy** — bold for page titles, semibold for sections, medium for card titles, normal for everything else

---

## 4. Spacing & Layout

### 4.1 Page Structure

```
┌────────────────────────────────────────────────────┐
│ Header (sticky, h-14, border-b)                     │
├──────────┬─────────────────────────────────────────┤
│ Sidebar  │ Main Content                             │
│ (w-60)   │ (max-w-7xl mx-auto px-4 sm:px-6 lg:px-8)│
│          │ py-8                                      │
│          │                                           │
│          │                                           │
└──────────┴─────────────────────────────────────────┘
```

- **Max content width:** `max-w-7xl` (80rem / 1280px) — prevents lines from being too long
- **Horizontal padding:** `px-4` mobile, `px-6` tablet, `px-8` desktop
- **Vertical padding:** `py-8` below header
- **Dashboard background:** `bg-gray-50` (light) / `bg-background` (dark)

### 4.2 Spacing Scale

| Use | Value | Class |
|-----|-------|-------|
| Between page sections | 24px | `space-y-6` |
| Between cards in a grid | 16px | `gap-4` |
| Card internal padding | 24px | `p-6` |
| Between form fields | 16px | `space-y-4` |
| Between label and input | 6px | `mb-1.5` |
| Between icon and text | 8px | `gap-2` |

### 4.3 Grid Patterns

**Dashboard metrics:** 4 columns on desktop, 2 on tablet, 1 on mobile
```html
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
```

**Feature cards:** 3 columns on desktop, 2 on tablet, 1 on mobile
```html
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
```

**Two-panel layout:** (e.g., form + preview)
```html
grid grid-cols-1 lg:grid-cols-2 gap-6
```

---

## 5. Components

### 5.1 Cards

The card is the primary container for content. Keep it simple:

```html
<!-- Standard card -->
<div class="rounded-lg border bg-card p-6">
  <h3 class="text-sm font-medium">Title</h3>
  <p class="text-xs text-muted-foreground mt-1">Description</p>
</div>
```

**Rules:**
- Border radius: `rounded-lg` (0.5rem / 8px)
- Border: `border` using `--border` token
- Background: `bg-card` (white in light, deep navy in dark)
- Padding: `p-6` standard, `p-4` for compact cards
- No shadows by default — use `shadow-sm` sparingly for elevated elements
- Hover state (if interactive): `hover:border-primary/50 transition-colors`

### 5.2 Buttons

**Primary (CTA):**
```html
<button class="bg-primary text-primary-foreground hover:bg-primary/90
               rounded-md px-4 py-2 text-sm font-medium transition-colors">
  Action
</button>
```

**Secondary:**
```html
<button class="border border-input bg-background hover:bg-accent
               hover:text-accent-foreground rounded-md px-4 py-2
               text-sm font-medium transition-colors">
  Cancel
</button>
```

**Destructive:**
```html
<button class="bg-destructive text-destructive-foreground hover:bg-destructive/90
               rounded-md px-4 py-2 text-sm font-medium transition-colors">
  Delete
</button>
```

**Icon button:**
```html
<button class="rounded-md p-2 hover:bg-accent transition-colors">
  <Icon class="h-4 w-4" />
</button>
```

### 5.3 Status Badges

Use the translucent pattern — colored text on a tinted background:

```html
<!-- Success -->
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
             bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
             border border-emerald-500/20">
  Completed
</span>

<!-- Running -->
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
             bg-violet-500/10 text-violet-600 dark:text-violet-400
             border border-violet-500/20">
  Running
</span>

<!-- Error -->
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
             bg-rose-500/10 text-rose-600 dark:text-rose-400
             border border-rose-500/20">
  Failed
</span>
```

### 5.4 Form Inputs

```html
<label class="text-sm font-medium mb-1.5 block">Label</label>
<input class="flex h-9 w-full rounded-md border border-input bg-background
              px-3 py-1 text-sm transition-colors
              placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
```

### 5.5 Tables

```html
<table class="w-full text-sm">
  <thead>
    <tr class="border-b">
      <th class="h-10 px-4 text-left font-medium text-muted-foreground">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b transition-colors hover:bg-muted/50">
      <td class="p-4">Value</td>
    </tr>
  </tbody>
</table>
```

### 5.6 Metric Tiles

For the dashboard, use a compact metric tile:

```html
<div class="rounded-lg border bg-card p-4">
  <div class="flex items-center gap-2">
    <Icon class="h-4 w-4 text-muted-foreground" />
    <span class="text-xs text-muted-foreground">Label</span>
  </div>
  <p class="text-2xl font-bold mt-2">42</p>
</div>
```

---

## 6. Navigation

### 6.1 Header

- Height: `h-14`
- Sticky: `sticky top-0 z-50`
- Background: `bg-background border-b`
- Content: Logo left, user actions right
- Logo text: `text-lg font-bold` — plain text, no gradient

### 6.2 Sidebar

- Width: `w-60` (expanded) / `w-16` (collapsed)
- Background: `bg-background border-r`
- Nav items: icon + label, `text-sm`
- Active state: `bg-accent text-accent-foreground font-medium`
- Hover state: `hover:bg-accent/50 transition-colors`
- Collapse transition: `transition-all duration-300`
- When collapsed: show only icons, use tooltips for labels

### 6.3 Nav Items

```html
<!-- Active -->
<a class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium
          bg-accent text-accent-foreground">
  <Icon class="h-4 w-4" />
  <span>Dashboard</span>
</a>

<!-- Inactive -->
<a class="flex items-center gap-3 rounded-md px-3 py-2 text-sm
          text-muted-foreground hover:bg-accent/50 hover:text-foreground
          transition-colors">
  <Icon class="h-4 w-4" />
  <span>Scaffold</span>
</a>
```

---

## 7. Animation

### 7.1 Keyframes

Two subtle animations for page/card entrance:

```css
@keyframes fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes slide-up {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

Tailwind classes:
```
animate-fade-in  →  fade-in 0.5s ease-out
animate-slide-up →  slide-up 0.6s ease-out
```

### 7.2 Rules

- **Page content:** Apply `animate-fade-in` to the main content wrapper on mount
- **Cards in a grid:** Stagger with `animation-delay` (e.g., 0ms, 100ms, 200ms, 300ms)
- **Interactive elements:** Use `transition-colors duration-200` for hover states
- **Never animate layout shifts** — no width/height animations that cause reflow
- **Respect `prefers-reduced-motion`** — wrap animations in a media query

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Icons

### 8.1 Library

Use **Lucide React** — consistent stroke width, modern, lightweight.

### 8.2 Sizing

| Context | Size | Class |
|---------|------|-------|
| Inline with text | 16px | `h-4 w-4` |
| Button icon | 16px | `h-4 w-4` |
| Metric tile icon | 16px | `h-4 w-4` |
| Empty state | 48px | `h-12 w-12` |

### 8.3 Color

- Default: `text-muted-foreground`
- Active/primary: `text-primary`
- Status: Match the semantic status color (emerald for success, rose for error, etc.)

---

## 9. Dark Mode

### 9.1 Implementation

Use `next-themes` with `class` strategy and `dark` as default:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  {children}
</ThemeProvider>
```

### 9.2 Toggle

Place a sun/moon toggle in the header. Use `useTheme()` from `next-themes`:

```tsx
const { theme, setTheme } = useTheme();
// Toggle: setTheme(theme === 'dark' ? 'light' : 'dark')
```

### 9.3 Rules

- **All colors use CSS custom properties** — never hardcode dark/light values in components
- **Test both modes** — every component must look correct in both
- **Images/icons:** Ensure sufficient contrast in both modes
- **Borders are subtle in dark mode** — `--border` is a dark slate, not invisible

---

## 10. Responsive Design

### 10.1 Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | < 640px | Mobile — single column, collapsed sidebar |
| `sm` | 640px | Small tablets — 2-column grids |
| `md` | 768px | Tablets — sidebar visible |
| `lg` | 1024px | Desktop — full layout |
| `xl` | 1280px | Wide desktop — max-w-7xl content |

### 10.2 Mobile Adaptations

- Sidebar: Hidden by default, toggled via hamburger menu (Sheet component)
- Grids: Collapse to single column
- Tables: Horizontal scroll with `overflow-x-auto`
- Header: Compact, hamburger menu replaces navigation

---

## 11. Accessibility

- **Focus rings:** Every interactive element gets `focus:ring-2 focus:ring-ring focus:ring-offset-2`
- **Color contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for large text)
- **Keyboard navigation:** Logical tab order, visible focus indicators
- **ARIA labels:** All icon-only buttons need `aria-label`
- **Screen reader text:** Use `sr-only` class for visually hidden labels
- **Reduced motion:** Respect `prefers-reduced-motion` (see Section 7.2)

---

## 12. Anti-Patterns (Do NOT Do These)

| Anti-Pattern | Instead |
|---|---|
| Glassmorphism/blur backgrounds on content cards | Solid `bg-card` with subtle border |
| Gradient text on body copy | Plain `text-foreground` |
| Neon/bright accent colors competing for attention | Single indigo primary, muted everything else |
| Heavy drop shadows on every card | `border` only; `shadow-sm` for elevated elements |
| Animated backgrounds or particle effects | Static backgrounds, animate content entrance only |
| Different border radii on different components | `rounded-md` for small elements, `rounded-lg` for cards — that's it |
| Custom scrollbars | Use native scrollbars |
| More than 2 font weights on one screen | Bold for titles, medium for labels, normal for body |

---

## 13. Quick Reference — Copy/Paste Patterns

### Page wrapper
```html
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
```

### Page title
```html
<h1 class="text-2xl font-bold">Page Title</h1>
<p class="text-sm text-muted-foreground mt-1">Brief description</p>
```

### Card grid
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
```

### Empty state
```html
<div class="flex flex-col items-center justify-center py-12 text-center">
  <Icon class="h-12 w-12 text-muted-foreground/50" />
  <p class="mt-4 text-sm text-muted-foreground">No items found</p>
</div>
```

### Loading state
```html
<div class="flex items-center gap-2 text-sm text-muted-foreground">
  <Loader2 class="h-4 w-4 animate-spin" />
  <span>Loading...</span>
</div>
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-23 | Initial style guide based on Soligence Presents V4 + 2026 SaaS trends |
