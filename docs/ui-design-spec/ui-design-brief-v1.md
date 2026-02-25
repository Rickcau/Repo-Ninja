# Repo-Ninja UI Design Brief v1

> **Audience:** Developer implementing the front-end.
> **Scope:** Complete visual specification — no framework names, no library-specific syntax.
> **Token Reference:** `ui-design-tokens-v1.jsonc` (sibling file)

---

## 1. Overview

Repo-Ninja is an AI-powered command center for GitHub development workflows. It lets authenticated users scaffold repositories, run AI code reviews and best-practices audits, dispatch AI agents to solve issues or write code, and manage a knowledge base of documents that power the AI features.

The interface is a **sidebar-navigation web application** with a fixed header, a persistent left sidebar, and a scrollable main content area. It ships with a **light and dark theme** (dark by default), uses an **indigo-dominant brand palette**, and follows a clean, information-dense dashboard aesthetic.

---

## 2. Global Layout

### Shell Structure

```
┌────────────────────────────────────────────────────────┐
│ HEADER (sticky, full width, 3.5 rem tall)              │
├──────────┬─────────────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT                               │
│ 15 rem   │  flex-1, max 80 rem, centered               │
│ fixed    │  px: 1→1.5→2 rem (responsive)               │
│ width    │  py: 2 rem                                   │
│          │  fade-in animation on page load              │
│          │                                              │
│          │                                              │
│          │                                              │
└──────────┴─────────────────────────────────────────────┘
```

### Header

- **Sticky** at the top, z-index 50
- Background: page background at 95% opacity with backdrop blur
- Border on the bottom edge
- Height: 3.5 rem
- Horizontal padding: 1 rem
- **Left:** Application logo — bold text in the primary color, linking to the dashboard
- **Right (authenticated):** Theme toggle button, user display name in muted-foreground, settings icon button (ghost), sign-out icon button (ghost)
- **Right (unauthenticated):** Primary button "Sign in with GitHub" with a log-in icon

### Sidebar

- Width: 15 rem
- Full height below the header (`min-height: calc(100vh - 3.5rem)`)
- Border on the right edge
- Background: page background
- Contains a vertical navigation list with 0.75 rem padding and 0.25 rem gap between items
- **Navigation items:** Dashboard, Scaffold, Agents, Reviews, Knowledge Base — each with an icon

### Main Content

- Takes remaining horizontal space (`flex: 1`)
- Horizontally padded: 1 rem on mobile, 1.5 rem at the `sm` breakpoint, 2 rem at `lg`
- Vertical padding: 2 rem
- Content is wrapped in a centered container capped at 80 rem
- Page entrance uses the `fadeIn` animation

### Responsive Notes

- The sidebar is always visible (no collapsible behavior in v1)
- Grids on pages collapse from multi-column to single-column at the `sm` / `lg` breakpoints
- Input font size is `base` (1 rem) on mobile, `sm` (0.875 rem) on desktop (prevents iOS zoom)

---

## 3. Pages

### 3.1 Dashboard (`/`)

**Unauthenticated state:**
- Vertically and horizontally centered content, minimum 60vh height
- A large circular icon container: primary color at 10% opacity background, primary-colored GitHub icon (3 rem)
- Heading: "Welcome to Repo-Ninja" (2xl, bold)
- Subtitle: muted-foreground, sm, max-width ~28 rem

**Authenticated state:**
- Page heading: "Dashboard" (2xl, bold) + connected-as subtitle
- **Metric tiles:** 4-column grid (`1 col → 2 at sm → 4 at lg`, gap 1 rem)
  - Each tile is a Card with compact content padding (1 rem vertical)
  - Icon (1 rem, muted-foreground) + label (xs, muted-foreground) in a row
  - Large number below (2xl, bold)
  - Metrics: Active Agents, Completed Tasks, Total Tasks, Knowledge Docs
- **Quick actions:** Horizontal row of buttons with 0.75 rem gap
  - "Scaffold New Repo" (default/primary), "Start Code Review" (outline), "Run Audit" (outline)
  - Each has a leading icon
- **Recent Agent Activity:** Card with a table (or empty state)
  - Table columns: Agent, Repo (monospace, xs), Description (truncated max-width), Status (StatusBadge)
  - Shows up to 10 rows
  - Empty state: large muted icon (3 rem, 50% opacity), message in sm muted-foreground, centered with 3 rem vertical padding

### 3.2 Reviews (`/reviews`)

- Page heading + description
- **Tabbed interface** (default tab variant) with two tabs: "Code Review" and "Best Practices Audit"
- Tab content has 1 rem top margin and 1.5 rem vertical gap

**Code Review tab:**
- Review configuration form (separate component)
- Error display: rounded container with rose-500 tinted background (10% opacity), rose-500 border (20% opacity), rose-600 text (dark: rose-400)
- Review results (when available): score display + category progress bars + finding cards

**Best Practices Audit tab:**
- Card containing repo input and full-width submit button
- Same error display pattern as above
- Audit results: compliance score bar + check list + recommendations

### 3.3 Agents (`/agents`)

- Page heading + description
- **Repo selector card** — a Card containing a labeled select/combobox for choosing a repository, with the selected repo shown as monospace text below
- **Conditional two-column grid** (appears only after a repo is selected, `1 col → 2 at lg`)
  - **Issue Solver card:** heading (lg, semibold), description, scrollable issue list with assign buttons
  - **Code Writer card:** heading, description, text input form with submit
- **Recent Agent Tasks card:** always visible, contains a task list table with status badges

### 3.4 Scaffold (`/scaffold`)

- Page heading + description
- **Tabbed interface:** "Natural Language" and "Guided" tabs
- Tab content at 1 rem top margin
- Each tab contains a form card
- **Scaffold plan view** (conditional): appears below tabs when a plan is generated, showing the proposed repository structure
- **Success state:** replaces the entire page with a heading "Repo Created!" and a link to the new repository (primary color, underline on hover, medium weight)

### 3.5 Knowledge Base (`/knowledge`)

- **Header row:** page heading on the left, "Add Document" primary button with plus icon on the right
- **Filter bar:** category dropdown (15 rem wide select)
- **Document list** inside a Card (or replaced by an editor when editing)
- **Footer bar:** ChromaDB connection status — database icon + "ChromaDB:" label + connection badge (default=connected, destructive=disconnected) + chunk count + "Re-index All Documents" outline button with refresh icon (spinning when active)

### 3.6 Settings (`/settings`)

- **Header row:** heading on the left, "Refresh Status" (outline) + "Sign Out" (destructive) buttons on the right
- **2-column grid** at the `md` breakpoint, gap 1.5 rem
  - **GitHub Connection card:** avatar (3 rem circle with border), name (medium weight), email (sm muted-foreground), "Connected" badge
  - **ChromaDB card:** connection badge + details (chunk count, collection name)
  - **Health Check card:** API status badge + ChromaDB status badge + timestamp (xs muted-foreground)
  - **Environment card:** key-value list (muted label left, monospace value right) showing framework versions

---

## 4. Component Library

### 4.1 Button

A rectangular interactive element. See `components.button` in the token file for full specs.

- **Shape:** Rounded corners (md radius), inline-flex centered
- **Typography:** sm, medium weight
- **States:** Default, hover (bg shift), focus-visible (3px ring), disabled (50% opacity, no pointer events)
- **Variants:** Default (indigo fill), Destructive (red fill), Outline (bordered, transparent), Secondary (muted fill), Ghost (transparent, hover tint), Link (text only, underline on hover)
- **Sizes:** xs (1.5 rem), sm (2 rem), default (2.25 rem), lg (2.5 rem), icon (square 2.25 rem), icon-xs/sm/lg
- **Icon handling:** Icons inside buttons are 1 rem (xs size gets 0.75 rem), non-interactive, non-shrinkable

### 4.2 Badge

A pill-shaped label for status, categories, and tags.

- **Shape:** Fully rounded (pill), inline-flex centered
- **Typography:** xs, medium weight
- **Padding:** 0.5 rem horizontal, 0.125 rem vertical
- **Variants:** Default (indigo fill), Secondary (muted fill), Destructive (red fill), Outline (bordered), Ghost, Link

### 4.3 Card

A bordered container for grouping related content.

- **Shape:** xl radius, 1px border, sm shadow
- **Background:** card color
- **Internal gap:** 1.5 rem between children (header, content, footer)
- **Vertical padding:** 1.5 rem on the card itself
- **Sub-elements:** Header (with optional action slot), Title (semibold), Description (sm, muted), Content, Footer

### 4.4 Input

A single-line text field.

- **Height:** 2.25 rem
- **Shape:** md radius, 1px border (input color), xs shadow
- **Padding:** 0.75 rem horizontal, 0.25 rem vertical
- **Background:** Transparent (light), input color at 30% opacity (dark)
- **Placeholder:** muted-foreground color
- **Focus:** Border becomes ring color, 3px ring at 50% opacity
- **Invalid:** Ring becomes destructive at 20% (dark: 40%) opacity, border becomes destructive

### 4.5 Textarea

A multi-line text field. Same styling as Input except:

- **Min-height:** 4 rem
- **Padding:** 0.75 rem horizontal, 0.5 rem vertical
- **Height:** Content-driven (field-sizing: content)

### 4.6 Select

A dropdown chooser.

- **Trigger:** Same border/radius/shadow treatment as Input, with a chevron-down icon at 50% opacity on the right
- **Sizes:** Default (2.25 rem) and sm (2 rem)
- **Dropdown panel:** Popover background, md radius, border, md shadow, animate in/out (fade + zoom + directional slide)
- **Items:** sm text, sm radius, accent bg on hover, check icon for selected item

### 4.7 Checkbox

A small toggle square.

- **Size:** 1 rem square
- **Shape:** 4px radius (nearly square with slight rounding)
- **Unchecked:** Input-colored border, xs shadow
- **Checked:** Primary bg + primary-foreground check icon (0.875 rem)
- **Focus:** 3px ring

### 4.8 Tabs

A segmented control for switching between content panels.

**Default variant:**
- **List:** Muted background, lg radius, 2.25 rem tall, 3px internal padding
- **Trigger (inactive):** Transparent bg, foreground at 60% opacity (dark: muted-foreground), md radius
- **Trigger (active):** Page background, foreground color, sm shadow; in dark mode: input/30 bg

**Line variant:**
- **List:** Transparent background
- **Trigger (active):** 2px-thick bar below (horizontal) or to the right (vertical) in the foreground color

### 4.9 Table

A data display grid.

- **Container:** Full width, horizontal scroll overflow
- **Header row:** Bottom border, cells are 2.5 rem tall, medium weight, foreground color
- **Body rows:** Bottom border (except last), hover bg = muted at 50%, selected bg = muted
- **Cells:** 0.5 rem padding, middle-aligned, no wrapping
- **Footer:** muted/50 bg, top border
- **Caption:** muted-foreground, sm, 1 rem top margin

### 4.10 Dialog (Modal)

A centered overlay panel for confirmations and forms.

- **Overlay:** Fixed full-screen, black at 50% opacity, fade in/out
- **Content panel:** Page background, lg radius, border, lg shadow, 1.5 rem padding
- **Max width:** `calc(100% - 2rem)` on mobile, 32 rem at `sm` breakpoint
- **Centered:** Fixed position, translated -50% on both axes
- **Animation:** Fade + zoom (95%→100%) in 200ms
- **Close button:** Absolute top-right corner at 1 rem offset, 70% opacity (100% on hover), x-icon
- **Header:** Flex column, 0.5 rem gap; center-aligned on mobile, left-aligned at `sm`
- **Footer:** Column-reverse on mobile (primary action on top), row end-aligned at `sm`

### 4.11 Sheet (Drawer)

A slide-in panel from any edge.

- **Overlay:** Same as Dialog
- **Content:** Page background, lg shadow, slides in from the specified side
- **Width (left/right):** 75% of viewport, capped at 24 rem on `sm`
- **Height (top/bottom):** Auto
- **Open duration:** 500ms ease-in-out
- **Close duration:** 300ms ease-in-out
- **Header/Footer:** 1 rem padding
- **Close button:** Same as Dialog

### 4.12 Dropdown Menu

A floating menu triggered by a button or icon.

- **Panel:** Popover bg, md radius, border, md shadow, 0.25 rem padding, min-width 8 rem
- **Animation:** Fade + zoom + directional slide
- **Items:** sm text, sm radius, 0.5 rem horizontal / 0.375 rem vertical padding
- **Hover:** Accent bg + accent-foreground text
- **Destructive items:** Destructive-colored text, tinted destructive bg on hover
- **Separator:** 1px line in border color
- **Shortcut hints:** xs text, muted-foreground, tracking widest, pushed to the right

### 4.13 Status Badge (Agent Tasks)

A specialized Badge for agent task statuses. Uses the outline badge variant with capitalized text.

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Queued | muted | muted-foreground | border |
| Running | violet-500 at 10% | violet-600 (dark: violet-400) | violet-500 at 20% |
| Completed | emerald-500 at 10% | emerald-600 (dark: emerald-400) | emerald-500 at 20% |
| Failed | rose-500 at 10% | rose-600 (dark: rose-400) | rose-500 at 20% |
| Cancelled | amber-500 at 10% | amber-600 (dark: amber-400) | amber-500 at 20% |

### 4.14 Finding Severity Badge (Code Review)

A filled Badge for review finding severity levels.

| Severity | Background | Text |
|----------|-----------|------|
| High | red-600 | white |
| Medium | yellow-500 | black |
| Low | blue-500 | white |
| Info | gray-400 | white |

### 4.15 Audit Check Badge

A filled Badge for audit check statuses.

| Status | Background | Text |
|--------|-----------|------|
| Pass | green-600 | white |
| Fail | red-600 | white |
| Warning | yellow-500 | black |

### 4.16 Progress Bar

A horizontal bar showing a ratio (score/max or percentage).

- **Track:** Muted background, fully rounded, overflow hidden
- **Heights:** 0.5 rem (thin — category scores) or 0.75 rem (thick — compliance bar)
- **Fill:** Primary color, fully rounded, width transitions smoothly, driven by percentage value

### 4.17 Toast / Notification

A transient message that appears at the edge of the viewport.

- **Background:** Popover
- **Text:** Popover-foreground
- **Border:** Border color
- **Radius:** Base radius
- **Icons:** Success (circle-check), Info (info), Warning (triangle-alert), Error (octagon-x), Loading (spinning loader)
- **Theme-aware:** Follows the current light/dark mode

### 4.18 Theme Toggle

An icon button in the header that switches between light and dark mode.

- Uses the ghost button variant at the icon size
- **Light mode visible:** Sun icon (rotates to -90 and scales to 0 when switching to dark)
- **Dark mode visible:** Moon icon (rotates from 90 to 0, scales from 0 to 1)
- Transition on both transform properties

### 4.19 Finding Card

A Card displaying a single code review finding.

- **Header area:** Severity badge + category badge (outline) + title (base size) in a horizontal row with 0.5 rem gap, compact bottom padding
- **Content area:** Description (sm, muted-foreground), optional file location (xs, monospace, muted-foreground), optional suggestion block (muted bg, 0.75 rem padding, xs label + sm content)

### 4.20 Error Display

An inline error message container (used in Reviews pages).

- **Shape:** md radius
- **Border:** rose-500 at 20% opacity
- **Background:** rose-500 at 10% opacity
- **Text:** sm, rose-600 (dark: rose-400)
- **Padding:** 1 rem

---

## 5. Color Rules

### Primary (Indigo)

Use for: call-to-action buttons, active navigation indicators, links, focus rings, the application logo, progress bar fills, chart accents.

- Default: `primary` (brand-500)
- Foreground on primary: `primary-foreground`
- Tinted backgrounds: `primary/10` (e.g., active nav item)

### Secondary (Slate)

Use for: muted surfaces, inactive/secondary text, borders, input borders, secondary buttons, tab list backgrounds.

- Surface: `secondary` / `muted` (same value)
- Text on surface: `secondary-foreground` / `muted-foreground`

### Gray (Neutral)

Use only when a completely achromatic tone is needed (e.g., `gray-400` for the "info" severity badge).

### Accents

Use accent colors exclusively for their designated semantic purpose:

- **Destructive (red):** Delete actions, error states
- **Violet:** Running/in-progress
- **Emerald:** Success/completed
- **Rose:** Failed/error messages
- **Amber:** Warning/cancelled
- **Blue:** Info/low severity
- **Yellow:** Medium severity
- **Green:** Audit pass

### Opacity Conventions

| Modifier | Use Case |
|----------|----------|
| /10 | Tinted backgrounds (status badges, active nav) |
| /20 | Accent borders, error rings (light mode) |
| /30 | Dark mode input backgrounds |
| /40 | Error rings (dark mode) |
| /50 | Focus ring glow, hover overlays, muted icon opacity, dialog overlay |
| /60 | Dark destructive button bg, inactive tab text |
| /80 | Secondary button hover |
| /90 | Primary/destructive button hover |
| /95 | Header bg (with backdrop blur) |

---

## 6. Typography Rules

### Font Stack

- **Body/UI text:** Geist Sans (variable font) with system-ui fallback
- **Code/monospace:** Geist Mono (variable font) with monospace fallback

### Size Ladder

| Name | Size | Line Height | Typical Use |
|------|------|------------|-------------|
| xs | 0.75 rem | 1 rem | Labels, timestamps, badge text, shortcuts |
| sm | 0.875 rem | 1.25 rem | Body text, descriptions, form labels |
| base | 1 rem | 1.5 rem | Mobile input text, paragraphs |
| lg | 1.125 rem | 1.75 rem | Dialog titles, section headings |
| xl | 1.25 rem | 1.75 rem | — |
| 2xl | 1.5 rem | 2 rem | Page headings |
| 5xl | 3 rem | 1 | Hero numbers (scores, metrics) |

### Weight Rules

| Weight | Name | Use |
|--------|------|-----|
| 400 | normal | Body text, descriptions |
| 500 | medium | Form labels, nav items, button text, dropdown labels |
| 600 | semibold | Card titles, section headings, sheet titles |
| 700 | bold | Page headings, metric numbers, user names |

### OpenType Features

- `rlig` and `calt` enabled globally for proper ligature and contextual-alternate rendering
- Tabular numerals (`font-variant-numeric: tabular-nums` or `font-feature-settings: "tnum"`) on scores, metrics, and numeric displays

### Rendering

- Antialiased font smoothing on all platforms
- Monospace font used for: repository names, file paths, version numbers, code snippets

---

## 7. Spacing & Radius

### Spacing Scale

Based on a 4px grid (0.25 rem increments). Common values in use:

| Token | Value | Typical Use |
|-------|-------|-------------|
| 0.5 | 0.125 rem | Badge vertical padding |
| 1 | 0.25 rem | Tight gaps, nav item vertical spacing |
| 2 | 0.5 rem | Badge horizontal padding, table cell padding, button gap |
| 3 | 0.75 rem | Input/card horizontal padding, nav padding, button row gap |
| 4 | 1 rem | Card internal gaps, sheet/dialog padding, page responsive px |
| 6 | 1.5 rem | Card content vertical gaps, card horizontal padding |
| 8 | 2 rem | Page vertical padding |

### Radius Scale

All radii derive from a base value of 0.625 rem (10px):

| Name | Computed | Use |
|------|----------|-----|
| sm | 6px | Select items, dropdown items, table row highlighting |
| md | 8px | Buttons, inputs, selects, tab triggers |
| lg | 10px | Tab lists, dialog content |
| xl | 14px | Cards |
| full | 9999px | Badges, progress bars, avatar circles |

---

## 8. Dark Mode

The application uses a class-based dark mode toggle (`.dark` on the root element). Default theme is dark.

### Token Swap Rules

When dark mode is active, the following tokens change:

| Token | Light | Dark |
|-------|-------|------|
| background | white | deep indigo-black |
| foreground | deep indigo-black | near-white |
| card / popover | white | slightly lighter indigo-black |
| secondary / muted / accent | light slate | dark slate |
| muted-foreground | mid slate | light slate |
| destructive | red-500 | red-400 (lighter for contrast) |
| border / input | light slate-200 | dark slate-800 |
| chart colors | warm palette | cool/vivid palette |
| sidebar | near-white | matches card |

### Component-Level Dark Adjustments

- **Inputs:** Background shifts to `input/30` (semi-transparent over the dark surface)
- **Destructive buttons:** Background shifts to `destructive/60`
- **Ghost button hover:** Uses `accent/50` instead of `accent`
- **Status badges:** Text shifts from 600-weight hues to 400-weight hues for adequate contrast
- **Error displays:** Text shifts from rose-600 to rose-400
- **Tab triggers (active):** Background uses `input/30` with an input-colored border

---

## 9. Motion

### Page Transitions

- **fadeIn:** 500ms ease-out, translateY(10px → 0) + opacity(0 → 1) — applied to main content on page load

### Slide Up

- **slideUp:** 600ms ease-out, translateY(20px → 0) + opacity(0 → 1) — available for staggered entrance effects

### Popover / Dropdown / Dialog Animations

- **Enter:** Fade in (opacity 0→1) + zoom in (scale 0.95→1.0) + directional slide (8px) — 150–200ms ease-out
- **Exit:** Reverse of enter — 150–200ms ease-in

### Sheet Animations

- **Enter:** Slide in from the specified edge — 500ms ease-in-out
- **Exit:** Slide out to the specified edge — 300ms ease-in-out

### Micro-interactions

- **Spin:** 1s linear infinite — used on loading spinners (refresh icons, loader icons)
- **Theme toggle:** Sun/Moon icons rotate +-90 degrees and scale 0↔1 with a standard CSS transition
- **Progress bars:** Width transitions smoothly when the value changes

### Reduced Motion

When the user's system requests reduced motion (`prefers-reduced-motion: reduce`), all animations and transitions are forced to near-zero duration (0.01ms). This applies to every element, including pseudo-elements.

---

## 10. Accessibility

### Focus Rings

Every interactive element has a visible focus indicator:

- **Ring:** 3px solid in the ring color (indigo) at 50% opacity
- **Border:** Shifts to the ring color on focus
- **Exception:** Dialog/sheet close buttons use a 2px ring with a 2px ring-offset

### Invalid State

Form elements with invalid data:

- **Ring:** Destructive color at 20% opacity (dark: 40%)
- **Border:** Solid destructive color

### Screen Reader Patterns

- Close buttons on dialogs and sheets include a visually-hidden "Close" label
- Icon-only buttons use `aria-label` (e.g., "Toggle theme", "Settings", "Sign out")
- The theme toggle announces its purpose, not its current state
- Tables use proper semantic markup (`thead`, `tbody`, `th`, `td`, `caption`)
- Select item indicators are decorative (selection state is managed by the component primitives)

### Color Contrast

- All text meets WCAG 2.1 AA contrast ratios against their backgrounds
- Status badge text colors shift between 600/400 weight hues in light/dark mode to maintain contrast
- Finding severity badges use white-on-dark or black-on-light pairings

### Keyboard Navigation

- All interactive elements are reachable via Tab
- Dialogs and sheets trap focus while open
- Select and dropdown menus support arrow-key navigation
- Tabs support left/right arrow keys (horizontal) or up/down (vertical)
- Escape closes dialogs, sheets, dropdowns, and selects

### Disabled State

- Opacity reduced to 50%
- Pointer events disabled
- Cursor changes to not-allowed where applicable

---

## 11. Token Reference

All values defined in this brief are sourced from and validated against:

- **`ui-design-tokens-v1.jsonc`** — The complete token file (sibling to this document)
- **`src/app/globals.css`** — The `:root` and `.dark` CSS custom property blocks

The JSONC file contains:

| Section | Contents |
|---------|----------|
| `palettes.primary` | Indigo ramp 50–900 (OKLCh + hex) |
| `palettes.secondary` | Slate ramp 50–950 (OKLCh + hex) |
| `gray` | Neutral achromatic ramp 50–950 |
| `accents` | Destructive, violet, emerald, rose, amber, blue, yellow, green, red |
| `tokens.light` / `tokens.dark` | All semantic tokens for both themes |
| `typography` | Font families, size scale, weights, OpenType features |
| `spacing` | Full spacing scale |
| `radius` | Base value + computed scale |
| `shadows` | xs through xl |
| `breakpoints` | sm (640) / md (768) / lg (1024) / xl (1280) / 2xl (1536) |
| `animations` | All animation definitions |
| `components` | Full specs for every component (button, badge, card, input, textarea, select, checkbox, tabs, table, dialog, sheet, dropdown, statusBadge, findingSeverity, auditCheckStatus, navItem, progressBar, toast, themeToggle) |
| `layout` | Header, sidebar, main content, page wrapper |
| `opacityConventions` | Standard opacity modifiers and their use cases |
