# Repo-Ninja UI Design Brief v2

> **Audience:** Developer implementing the front-end.
> **Scope:** Complete visual specification -- no framework names, no library-specific syntax.
> **Token Reference:** `ui-design-tokens-v2.jsonc` (sibling file)
> **Supersedes:** `ui-design-brief-v1.md` (indigo theme, flat dark/light toggle, non-collapsible sidebar)

---

## 1. Overview

Repo-Ninja is an AI-powered command center for GitHub development workflows. It lets authenticated users scaffold repositories, run AI code reviews and best-practices audits, dispatch AI agents to solve issues or write code, and manage a knowledge base of documents that power the AI features.

### Visual Identity (v2)

The v2 interface adopts a **dark-first, premium, data-forward** aesthetic inspired by modern fintech dashboards. The defining traits are:

- **Dark by default.** The base surface is a near-black blue-tinted gray (`#080C16`). Light mode is available as a toggle, but the dark presentation is the primary design target.
- **Chartreuse/lime primary accent** (`#CCFF00` in dark mode, `#84B300` in light mode) replaces the former indigo. This vivid accent is used for CTAs, active navigation, focus rings, progress bars, and featured-card glows.
- **Teal secondary accent** (`#14B8A6`) replaces the former neutral slate secondary. Teal is used for secondary data points, specific badge categories, and supporting highlights.
- **Blue-tinted gray surfaces.** All neutral surfaces carry a subtle blue undertone (~hue 220 HSL). Pure neutral grays are never used for surfaces or borders. Five dark-mode elevation levels (base, sidebar, card, raised, overlay) create depth through brightness increments rather than shadows.
- **Elevation through brightness, not shadow.** In dark mode, higher surfaces are brighter. Shadows are minimal and reserved for overlays and floating elements.
- **Glow effects** for emphasis: featured metric cards receive a chartreuse border glow with an optional pulse animation; focus rings glow in primary at 50% opacity.
- **Collapsible sidebar** that transitions between 15 rem (expanded) and 4 rem (collapsed icon-only rail).
- **Solid primary fill for active navigation** -- the active nav item receives a full chartreuse background with dark text, rather than a tinted background.
- **Status badges with leading dots** -- every status indicator gains a small colored dot before the label text, on a tinted translucent background.

The overall aesthetic is premium, information-dense, and data-forward. The interface feels like a control room.

---

## 2. Global Layout

### Shell Structure

```
EXPANDED SIDEBAR (15 rem)                    COLLAPSED SIDEBAR (4 rem)

+------------+-----------------------------+  +----+-----------------------------+
| SIDEBAR    | HEADER (sticky, full width) |  | S  | HEADER (sticky, full width) |
| 15 rem     +-----------------------------+  | 4  +-----------------------------+
| sticky     | MAIN CONTENT                |  | r  | MAIN CONTENT                |
| full ht    | flex-1, fluid (no max-w)    |  | e  | flex-1, fluid (no max-w)    |
|            | px: 1.5 rem (2 rem on 2xl)  |  | m  | px: 1.5 rem (2 rem on 2xl)  |
| +--------+ | py: 1.5 rem                 |  |    | py: 1.5 rem                 |
| | Logo   | | fadeIn on page load         |  | IC | fadeIn on page load         |
| | Search | |                             |  | ON |                             |
| | NAV    | |                             |  | S  |                             |
| | items  | |                             |  |    |                             |
| +--------+ |                             |  +----+                             |
+------------+-----------------------------+  +----------------------------------+
```

The page is a horizontal flex container spanning the full viewport height.

### Header

- Sits at the top of the main content area (not a global bar spanning the sidebar)
- Height: 3.5 rem
- Background: transparent (inherits the main content background)
- No bottom border (separated from content by spacing alone)
- Horizontal padding: 1.5 rem
- **Left:** Page title (xl size, bold, text-primary)
- **Right (authenticated):** Three icon buttons in a row (0.5 rem gap) -- history/clock, notification bell, user avatar silhouette. Each is 2 rem square, text-secondary color, text-primary on hover. Additionally: theme toggle button (ghost variant, icon size).
- **Right (unauthenticated):** Theme toggle and a primary-filled "Sign in with GitHub" button with a log-in icon

### Sidebar

- **Expanded width:** 15 rem
- **Collapsed width:** 4 rem (icon-only rail)
- Sticky, full viewport height
- Background: `surface-sidebar` (`#0C1019` dark, `#FFFFFF` light)
- Right border: `border-subtle` (`#162031` dark, `#F1F5F9` light)
- Padding: 1 rem
- Z-index: 40

**Sidebar contents (expanded):**

1. **Logo row:** Circular icon (2 rem diameter, primary-400 background, dark glyph centered) + application name in lg bold text-primary, 0.5 rem gap. A collapse toggle button sits at the top-right: double-chevron-left icon, 1.5 rem, text-muted color (text-secondary on hover). The icon rotates 180 degrees when the sidebar is collapsed.
2. **Search input:** 2.25 rem tall, `surface-input` background, `border-default` border, md radius, magnifying-glass icon on the left in text-muted, sm placeholder text.
3. **Navigation sections:** Three collapsible groups labeled MENU, FEATURES, TOOLS. Section labels use 2xs size, semibold weight, text-muted color, uppercase, wider letter-spacing. Each has a chevron-up/down toggle on the right.
4. **Navigation items:** Dashboard, Scaffold, Agents, Reviews, Knowledge Base (under MENU); additional items under FEATURES and TOOLS as needed. Each item is 2.25 rem tall, md radius, 0.75 rem horizontal padding, 0.75 rem gap between icon and label, base (14px) font size.

**Sidebar contents (collapsed):**

- Logo icon only (no text)
- No search input
- No section labels
- Navigation items show icon only, centered, with a tooltip on hover showing the page name

**Collapse animation:** 250ms width transition using the standard easing curve (`cubic-bezier(0.4, 0, 0.2, 1)`). See `animations.sidebarCollapse` in the token file.

### Main Content

- Takes all remaining horizontal space (`flex: 1`)
- Horizontal padding: 1.5 rem (2 rem at the `2xl` breakpoint)
- Vertical padding: 1.5 rem
- No max-width cap -- the layout is fully fluid
- Page entrance uses the `fadeIn` animation (300ms ease-out)
- Background: `background` token (`#080C16` dark, `#F8FAFC` light)

### Responsive Behavior

| Breakpoint | Sidebar | Content Layout |
|---|---|---|
| Below `md` (< 768px) | Hidden by default; available as an overlay drawer that slides in from the left | Single-column stacking for all grids. Tables scroll horizontally. |
| `md` to `lg` (768px -- 1023px) | Visible, may default to collapsed (4 rem) state | 2-column grids where applicable. Tables show full width. |
| `lg` and above (>= 1024px) | Visible, expanded at 15 rem | Multi-column grids (3-col metric cards, 2-col content splits). Full tables. |
| `xl` and above (>= 1280px) | No layout change, more breathing room | Same as `lg`. |
| `2xl` and above (>= 1536px) | No layout change | Main content horizontal padding increases to 2 rem. |

---

## 3. Pages

### 3.1 Dashboard (`/`)

**Unauthenticated state:**

- Vertically and horizontally centered content, minimum 60vh height
- A large circular icon container: primary color at 10% opacity background, primary-colored GitHub icon (3 rem)
- Heading: "Welcome to Repo-Ninja" (2xl, bold, text-primary)
- Subtitle: text-secondary, sm, max-width ~28 rem, describing what the application does
- Below: primary-filled "Sign in with GitHub" button

**Authenticated state:**

- Page title "Dashboard" shown in the header area (xl, bold)
- Connected-as subtitle: text-secondary, sm

**Metric tiles:** 4-tile grid (1 col default, 2 at `sm`, 4 at `lg`), gap 1 rem.

Each tile is a Card on the `surface-card` background with `border-default` border, lg radius, 1.25 rem padding:
- Small label at the top (xs, normal weight, text-muted)
- Large metric number below (2xl, bold, text-primary, tabular-nums)
- Footer row: clock icon (0.875 rem, text-muted) + "Vs Last month" text (xs, text-muted), 0.375 rem gap

Metrics: Active Agents, Completed Tasks, Total Tasks, Knowledge Docs.

**Featured metric tile (optional):** One tile (e.g., "Completed Tasks") may be designated as the featured variant:
- 2px solid primary-400 left border
- Glow box-shadow: `inset 2px 0 0 0 #CCFF00, 0 0 30px rgba(204, 255, 0, 0.15)`
- Optional `glowPulse` animation (2s infinite, pulsing the glow intensity)

**Quick actions:** Horizontal row of buttons with 0.75 rem gap, below the metric tiles.
- "Scaffold New Repo" (primary-filled button: chartreuse background, dark text)
- "Start Code Review" (outline button: transparent background, border-default border, text-secondary, hover shifts to surface-raised background and text-primary)
- "Run Audit" (outline button, same treatment)
- Each has a leading icon (1 rem)

**Recent Agent Activity:** A Card containing a data table (or empty state).
- Card uses `surface-card` background, `border-default` border, lg radius
- Table columns: Agent, Repo (monospace, xs), Description (truncated max-width), Status (StatusBadge with leading dot)
- Shows up to 10 rows
- Row hover: background shifts to `surface-raised`
- Empty state: large muted icon (3 rem, 50% opacity), message in sm text-muted, centered with 3 rem vertical padding

### 3.2 Reviews (`/reviews`)

- Page heading (xl, bold in header) + description (sm, text-secondary)
- **Tabbed interface** (default tab variant) with two tabs: "Code Review" and "Best Practices Audit"
- Tab list: `surface-input` background, md radius container, 2.25 rem tall, 3px internal padding
- Active tab: `surface-card` background, text-primary, border-default border, sm radius
- Inactive tab: transparent, text-muted
- Tab content has 1 rem top margin and 1.5 rem vertical gap

**Code Review tab:**

- Review configuration form inside a Card:
  - Repository selector (Select component on dark surface-input background)
  - Branch input (Input component)
  - Configuration options (Checkbox components -- chartreuse checked state)
  - Submit button (primary-filled, chartreuse)
- Error display (when present): md radius container, rose-500 tinted background at 12% opacity, rose-500 border at 20% opacity, sm text in rose-400 (dark) / rose-600 (light), 1 rem padding
- Review results (when available):
  - **Overall score:** Large number (3xl or 5xl, bold, tabular-nums) with a circular or semi-circular gauge. The gauge fill uses the primary chartreuse color.
  - **Category progress bars:** Vertical list of categories (Security, Performance, Maintainability, etc.), each with a label (sm, text-secondary) on the left, a thin progress bar (0.5 rem height, chartreuse fill on muted track, full radius), and a score (sm, text-primary, tabular-nums) on the right.
  - **Finding cards:** A vertical list of FindingCard components (see Section 4.19)

**Best Practices Audit tab:**

- Card containing a repository input and a full-width primary submit button
- Same error display pattern as Code Review
- Audit results:
  - **Compliance score:** Large percentage display + thick progress bar (0.75 rem height, chartreuse fill)
  - **Check list:** Rows of audit checks, each showing a check name (sm, text-primary), description (xs, text-muted), and an AuditCheckStatus badge (Pass/Fail/Warning)
  - **Recommendations:** Text blocks in sm, text-secondary, inside muted-background containers

### 3.3 Agents (`/agents`)

- Page heading + description
- **Repo selector card:** A Card containing a labeled Select for choosing a repository. The Select trigger sits on `surface-input` background with `border-default` border. The selected repo name appears below in monospace text (sm, text-secondary).

- **Conditional two-column grid** (appears only after a repo is selected, 1 col default, 2 at `lg`, gap 1 rem):

  **Issue Solver card:**
  - Card with heading (lg, semibold, text-primary) and description (sm, text-secondary)
  - Scrollable issue list inside the card content, each issue is a row with:
    - Issue number (monospace, xs, text-muted)
    - Issue title (sm, text-primary, truncated)
    - "Assign" button (outline, sm size)
  - Scroll area has a max-height with a subtle fade-out gradient at the bottom

  **Code Writer card:**
  - Card with heading and description
  - Text input for the task description (Input component on surface-input background)
  - Textarea for additional context (Textarea component)
  - Submit button (primary-filled, full width within the card)

- **Recent Agent Tasks card:** Always visible below the grid. Contains a table:
  - Columns: Task ID (monospace, xs), Agent Type, Repository (monospace, xs), Description (truncated), Status (StatusBadge with leading dot), Created (xs, text-muted)
  - Row hover: `surface-raised` background
  - Status badges use the new leading-dot pattern with tinted translucent backgrounds (see Section 4.13)

### 3.4 Scaffold (`/scaffold`)

- Page heading + description
- **Tabbed interface** (default tab variant): "Natural Language" and "Guided" tabs
- Tab content at 1 rem top margin

**Natural Language tab:**
- Card containing:
  - Label (sm, medium weight, text-primary)
  - Textarea for describing the desired repository (surface-input background, border-default border)
  - Optional configuration checkboxes (chartreuse checked state)
  - Primary submit button ("Generate Plan")

**Guided tab:**
- Card containing a multi-step form:
  - Repository name input
  - Language/framework selector (Select component)
  - Feature checkboxes
  - Primary submit button ("Generate Plan")

**Scaffold plan view** (conditional, appears below tabs when a plan is generated):
- A Card showing the proposed repository structure
- File tree rendered with indentation, folder icons, and file icons
- Each file/folder line: monospace, sm, text-primary for names, text-muted for metadata
- "Create Repository" primary button and "Discard" outline/ghost button at the bottom

**Success state:** Replaces the entire page content with:
- A centered layout (similar to unauthenticated dashboard)
- Success icon in a circular container (primary at 10% opacity background, check-circle icon in primary)
- Heading: "Repo Created!" (2xl, bold, text-primary)
- Link to the new repository: primary-colored text, underline on hover, medium weight
- "Back to Dashboard" outline button below

### 3.5 Knowledge Base (`/knowledge`)

- **Header row:** Page heading on the left, "Add Document" primary button with plus icon on the right (chartreuse filled)

- **Filter bar:** Category dropdown (15 rem wide Select component on surface-input background)

- **Document list** inside a Card:
  - Each document is a row with: title (sm, medium weight, text-primary), category badge (secondary-tinted pill), date (xs, text-muted), and action buttons (edit icon, delete icon -- ghost buttons)
  - Row hover: `surface-raised` background
  - Row separator: `border-subtle` 1px bottom border

- **Editor view** (replaces the document list when editing):
  - Card with a title input (Input) and a large content textarea (Textarea, min-height 16 rem)
  - Category selector (Select)
  - Save (primary) and Cancel (outline) buttons in the card footer

- **Footer bar:** ChromaDB connection status displayed in a horizontal row:
  - Database icon (1 rem, text-muted)
  - "ChromaDB:" label (sm, text-secondary)
  - Connection badge: StatusBadge with leading dot -- green dot + "Connected" on success-muted background, or red dot + "Disconnected" on error-muted background
  - Chunk count (sm, text-muted, monospace)
  - "Re-index All Documents" outline button with refresh icon (icon spins with the `spin` animation while re-indexing is active)

### 3.6 Settings (`/settings`)

- **Header row:** Heading on the left; "Refresh Status" (outline button) + "Sign Out" (danger button: status-error background, white text) on the right

- **2x2 card grid** at the `md` breakpoint (1 col below `md`, 2 col at `md`+), gap 1.5 rem. All four cards use `surface-card` background, `border-default` border, lg radius.

  **GitHub Connection card:**
  - User avatar: 3 rem circle with `border-default` 1px border
  - User name (medium weight, text-primary) and email (sm, text-muted) stacked
  - "Connected" StatusBadge with green leading dot on success-muted background

  **ChromaDB card:**
  - Connection StatusBadge (same pattern as Knowledge Base footer)
  - Details below: chunk count, collection name -- each as a key-value row (xs label in text-muted left, monospace value in text-secondary right)

  **Health Check card:**
  - API status badge: StatusBadge with leading dot
  - ChromaDB status badge: StatusBadge with leading dot
  - Last checked timestamp (xs, text-muted)

  **Environment card:**
  - Key-value list: label (xs, text-muted, left) + value (sm, monospace, text-secondary, right)
  - Showing framework versions, runtime versions, and environment variables

---

## 4. Component Library

### 4.1 Button

A rectangular interactive element for actions and navigation.

- **Shape:** md radius (8px), inline-flex centered
- **Typography:** sm (13px), medium weight
- **Gap:** 0.5 rem between icon and text
- **Transition:** Background, border-color, and color all transition at 150ms with the standard easing
- **States:** Default, hover (bg shift), focus-visible (3px ring in primary at 50% opacity with glow), disabled (50% opacity, pointer events disabled)

**Variants (6):**

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `primary` (chartreuse `#CCFF00` dark / `#84B300` light) | `text-on-primary` (`#0F172A`) | None | `primary-hover` (`#DBFF55` dark / `#628A00` light) |
| Destructive (Danger) | `status-error` (`#EF4444` dark / `#DC2626` light) | White (`#FFFFFF`) | None | `red-600` |
| Outline | Transparent | `text-secondary` | `border-default` | `surface-raised` bg, `text-primary` text, `border-strong` border |
| Secondary | `surface-raised` | `text-primary` | None | Lightens slightly (next elevation step) |
| Ghost | Transparent | `text-secondary` | None | `surface-raised` bg, `text-primary` text |
| Link | Transparent | `primary` (chartreuse) | None | Underline appears |

**Sizes (8):**

| Size | Height | Horizontal Padding | Font Size | Notes |
|---|---|---|---|---|
| xs | 1.5 rem | 0.5 rem | xs (12px) | Compact inline actions |
| sm | 2 rem | 0.75 rem | sm (13px) | Table actions, secondary controls |
| default (md) | 2.25 rem | 1 rem | sm (13px) | Standard buttons |
| lg | 2.75 rem | 1.25 rem | base (14px) | Prominent actions |
| icon | 2.25 rem square | -- | -- | Square, icon only |
| icon-xs | 1.5 rem square | -- | -- | Tiny icon button |
| icon-sm | 2 rem square | -- | -- | Small icon button |
| icon-lg | 2.75 rem square | -- | -- | Large icon button |

**Icon handling:** Icons inside buttons are 1 rem (xs size gets 0.75 rem). Icons are non-interactive and non-shrinkable. Icons sit to the left of text by default; trailing icons are also supported.

### 4.2 Badge

A pill-shaped label for status, categories, and tags.

- **Shape:** Fully rounded (9999px radius -- pill), inline-flex centered
- **Typography:** xs (12px), medium weight
- **Padding:** 0.625 rem horizontal, 0.125 rem vertical
- **Gap:** 0.375 rem between leading dot (if present) and text

**Variants (6):**

| Variant | Background | Text | Border |
|---|---|---|---|
| Default | `primary` (chartreuse) | `text-on-primary` | None |
| Secondary | `surface-raised` | `text-secondary` | None |
| Destructive | `status-error` | White | None |
| Outline | Transparent | `text-primary` | `border-default` |
| Ghost | Transparent | `text-secondary` | None |
| Link | Transparent | `primary` | None (underline on hover) |

### 4.3 Card

A bordered container for grouping related content.

**Standard variant:**

- **Shape:** lg radius (12px), 1px `border-default` border
- **Background:** `surface-card` (`#111827` dark, `#FFFFFF` light)
- **Shadow:** Minimal (sm in light mode; none or near-none in dark mode -- depth comes from surface brightness)
- **Internal gap:** 1.5 rem between children (header, content, footer)
- **Padding:** 1.25 rem on all sides (matching the Vektora card padding)
- **Sub-elements:** Header (with optional action slot), Title (semibold, text-primary), Description (sm, text-muted), Content, Footer

**Featured variant (new):**

All properties of the standard card, plus:
- 2px solid primary-400 left border
- Glow box-shadow: `inset 2px 0 0 0 #CCFF00, 0 0 30px rgba(204, 255, 0, 0.15)`
- Optional `glowPulse` animation: a 2-second infinite pulse that oscillates the glow intensity between `0 0 20px rgba(204, 255, 0, 0.15)` and `0 0 30px rgba(204, 255, 0, 0.30)`
- The featured variant is used for the highlighted metric tile on the Dashboard

### 4.4 Input

A single-line text field.

- **Height:** 2.25 rem
- **Shape:** md radius (8px), 1px `border-default` border
- **Padding:** 0.75 rem horizontal, 0.25 rem vertical
- **Background:** `surface-input` (`#0D111B` dark, `#F1F5F9` light)
- **Text:** text-primary, sm font size (base on mobile to prevent iOS zoom)
- **Placeholder:** text-muted color
- **Focus:** Border shifts to primary; 3px ring in primary at 50% opacity (chartreuse glow)
- **Invalid:** Ring becomes status-error at 20% opacity (dark: 40%), border becomes status-error
- **Disabled:** 50% opacity, no pointer events

### 4.5 Textarea

A multi-line text field. Same styling as Input except:

- **Min-height:** 4 rem
- **Padding:** 0.75 rem horizontal, 0.5 rem vertical
- **Height:** Content-driven (grows with content)
- **Background:** `surface-input` (same as Input)

### 4.6 Select

A dropdown chooser.

- **Trigger:** Same border/radius/shadow treatment as Input. Background is `surface-input`. Chevron-down icon at 50% opacity on the right.
- **Sizes:** Default (2.25 rem) and sm (2 rem)
- **Dropdown panel:** `surface-overlay` background (`#1F2D3D` dark, `#FFFFFF` light), md radius, `border-default` border, md shadow, animate in/out (popoverIn/popoverOut)
- **Items:** sm text, sm radius, `surface-raised` background on hover with text-primary text, check icon for selected item

### 4.7 Checkbox

A small toggle square.

- **Size:** 1 rem square
- **Shape:** xs radius (4px -- nearly square with slight rounding)
- **Unchecked:** `border-strong` border, transparent background
- **Checked:** `primary` background (chartreuse), `text-on-primary` check icon (0.875 rem). The chartreuse fill is the most visually distinctive change from v1.
- **Focus:** 3px ring in primary at 50% opacity (chartreuse glow)
- **Disabled:** 50% opacity

### 4.8 Tabs

A segmented control for switching between content panels.

**Default variant:**

- **List:** `surface-input` background, md radius, 2.25 rem tall, 2px internal padding
- **Trigger (inactive):** Transparent background, text-muted color
- **Trigger (active):** `surface-card` background, text-primary color, `border-default` border, sm radius (6px). This creates a "raised pill" effect inside the track.

**Line variant:**

- **List:** Transparent background
- **Trigger (inactive):** No underline, text-muted
- **Trigger (active):** 2px-thick bar below (horizontal) or to the right (vertical) in the primary chartreuse color. Text becomes text-primary.

Both variants: sm font size, medium weight. Transitions on background and color at 150ms.

### 4.9 Table

A data display grid.

- **Container:** Full width, horizontal scroll overflow on narrow viewports
- **Header row:** `border-default` bottom border, cells are 2.5 rem tall, sm (13px) font, medium weight, text-muted color. Padding: 1 rem horizontal, 0.75 rem vertical.
- **Body rows:** `border-subtle` bottom border (except last), sm font, text-primary color. Padding matches header. Hover background shifts to `surface-raised`. Transition on background at 150ms.
- **Selected row:** `surface-raised` background (persistent)
- **Cells:** Middle-aligned, no wrapping
- **Footer:** `surface-raised` background, `border-default` top border, medium weight text
- **Caption:** text-muted, sm, 1 rem top margin
- **Checkbox column (if present):** 1 rem checkbox with xs radius, `border-strong` border unchecked, primary-400 checked with text-on-primary check icon

### 4.10 Dialog (Modal)

A centered overlay panel for confirmations and forms.

- **Overlay:** Fixed full-screen, black at 60% opacity (slightly darker than v1 to emphasize the dark premium feel), fade in/out
- **Content panel:** `surface-card` background, lg radius, `border-default` border, lg shadow, 1.5 rem padding
- **Max width:** `calc(100% - 2rem)` on mobile, 32 rem at `sm` breakpoint
- **Centered:** Fixed position, translated -50% on both axes
- **Animation:** Fade + zoom (95% to 100%) in 200ms (matches popoverIn easing)
- **Close button:** Absolute top-right corner at 1 rem offset, 70% opacity (100% on hover), x-icon, text-muted color
- **Header:** Flex column, 0.5 rem gap; center-aligned on mobile, left-aligned at `sm`
- **Title:** lg font, semibold weight, text-primary
- **Description:** sm font, text-muted
- **Footer:** Column-reverse on mobile (primary action on top), row end-aligned at `sm`

### 4.11 Sheet (Drawer)

A slide-in panel from any edge.

- **Overlay:** Same as Dialog (black at 60% opacity)
- **Content:** `surface-card` background, lg shadow, slides in from the specified side
- **Width (left/right):** 75% of viewport, capped at 24 rem on `sm`
- **Height (top/bottom):** Auto
- **Border:** 1px on the edge opposite the opening direction (e.g., left border for a right-opening sheet)
- **Open duration:** 500ms ease-in-out
- **Close duration:** 300ms ease-in-out
- **Header/Footer:** 1 rem padding
- **Close button:** Same as Dialog

### 4.12 Dropdown Menu

A floating menu triggered by a button or icon.

- **Panel:** `surface-overlay` background (`#1F2D3D` dark, `#FFFFFF` light), md radius, `border-default` border, md shadow, 0.25 rem padding, min-width 8 rem
- **Animation:** popoverIn (150ms, scale 0.95 to 1 + fade) / popoverOut (100ms, reverse)
- **Items:** sm text, sm radius, 0.5 rem horizontal / 0.375 rem vertical padding
- **Hover:** `surface-raised` background, text-primary text
- **Destructive items:** status-error text color, `status-error-muted` background on hover
- **Separator:** 1px line in `border-default` color
- **Shortcut hints:** xs text, text-muted, tracking widest, pushed to the right

### 4.13 StatusBadge (Agent Tasks / Connections)

A specialized Badge for status display. **New in v2:** Every status badge now includes a small leading dot (0.375 rem / 6px circle) before the label text. The background is a tinted translucent color derived from the status hue.

**Base styling:** Pill shape (full radius), 0.625 rem horizontal padding, 0.125 rem vertical padding, xs font, medium weight. Text is capitalized.

| Status | Dot Color | Background | Text Color (dark) | Text Color (light) |
|---|---|---|---|---|
| Queued | `text-muted` | `surface-raised` | `text-muted` | `text-muted` |
| Running | violet-500 | `rgba(139, 92, 246, 0.12)` | violet-400 (`#A78BFA`) | violet-600 (`#7C3AED`) |
| Completed | emerald-500 | `rgba(16, 185, 129, 0.12)` | emerald-400 (`#34D399`) | emerald-600 (`#059669`) |
| Failed | rose-500 | `rgba(244, 63, 94, 0.12)` | rose-400 (`#FB7185`) | rose-600 (`#E11D48`) |
| Cancelled | amber-500 | `rgba(245, 158, 11, 0.12)` | amber-400 (`#FBBF24`) | amber-600 (`#D97706`) |
| Connected | green-500 | `rgba(34, 197, 94, 0.12)` | green-400 (`#4ADE80`) | green-600 (`#16A34A`) |
| Disconnected | red-500 | `rgba(239, 68, 68, 0.12)` | red-400 (`#F87171`) | red-600 (`#DC2626`) |

The leading dot provides a quick visual anchor, while the translucent background ties the badge into the dark surface aesthetic. The dot color is always the "bright" mid-ramp value (500), while the text shifts between 400 (dark mode, lighter for contrast) and 600 (light mode, darker for contrast).

### 4.14 Finding Severity Badge (Code Review)

A filled Badge for review finding severity levels. These use solid, opaque backgrounds for maximum visual impact.

| Severity | Background | Text |
|---|---|---|
| High | red-600 (`#DC2626`) | white |
| Medium | amber-500 (`#F59E0B`) | `#0F172A` (dark text for readability) |
| Low | blue-500 (`#3B82F6`) | white |
| Info | gray-500 (`#64748B`) | white |

Note: In v2, the "Info" severity uses the blue-tinted gray-500 instead of the pure neutral gray-400 from v1, maintaining the blue undertone throughout the interface.

### 4.15 Audit Check Status Badge

A filled Badge for audit check statuses.

| Status | Background | Text |
|---|---|---|
| Pass | green-600 (`#16A34A`) | white |
| Fail | red-600 (`#DC2626`) | white |
| Warning | amber-500 (`#F59E0B`) | `#0F172A` (dark text) |

### 4.16 NavItem

The sidebar navigation item. **New in v2:** The active state is dramatically different from v1.

**Inactive state:**
- Background: transparent
- Icon color: text-muted
- Text color: text-secondary
- On hover: `surface-raised` background, text-primary text and icon color
- Transition: background and color at 150ms

**Active state (v2 transformation):**
- Background: `primary` (solid chartreuse `#CCFF00` in dark, `#84B300` in light) -- a full opaque fill, not a tinted background
- Text color: `text-on-primary` (`#0F172A`) -- dark text on the bright chartreuse
- Icon color: `text-on-primary`
- Font weight: semibold (promoted from medium)
- Radius: md (8px)

This is the single most visible change from v1, where the active nav used a subtle `primary/10` (indigo at 10% opacity) tinted background. The v2 treatment makes the active page immediately obvious with a bold, high-contrast chartreuse bar in the sidebar.

### 4.17 ProgressBar

A horizontal bar showing a ratio (score/max or percentage).

- **Track:** `surface-raised` background (dark) / muted background (light), fully rounded, overflow hidden
- **Heights:** 0.5 rem (thin -- category scores) or 0.75 rem (thick -- compliance bar)
- **Fill:** `primary` chartreuse color, fully rounded, width transitions smoothly (150ms default transition)
- **Fill driven by:** Percentage value (0--100%)
- **Rounded tops on bar charts:** When used in a chart context (not in Repo-Ninja v2, but documented for completeness), bars have xs radius on top-left and top-right only

### 4.18 Toast / Notification

A transient message that appears at the edge of the viewport.

- **Background:** `surface-card`
- **Text:** text-primary
- **Border:** `border-default`
- **Radius:** lg (12px)
- **Shadow:** md (dark mode: minimal; light mode: standard)
- **Icons by type:**
  - Success: circle-check icon, green-400 (dark) / green-600 (light)
  - Info: info-circle icon, blue-400 (dark) / blue-600 (light)
  - Warning: triangle-alert icon, amber-400 (dark) / amber-600 (light)
  - Error: octagon-x icon, red-400 (dark) / red-600 (light)
  - Loading: loader-2 icon, text-muted, spinning (`spin` animation)
- **Theme-aware:** Follows the current dark/light mode token set

### 4.19 ThemeToggle

An icon button in the header that switches between dark and light mode.

- Uses the ghost button variant at the icon size
- **Dark mode visible:** Moon icon (rotates from 90 degrees to 0, scales from 0 to 1 as it appears)
- **Light mode visible:** Sun icon (rotates to -90 degrees and scales to 0 when switching to dark)
- Transition on both transform properties
- Color: text-secondary, text-primary on hover

### 4.20 FindingCard

A Card displaying a single code review finding.

- **Background:** `surface-card` (inherits from Card standard variant)
- **Border:** `border-default`
- **Radius:** lg
- **Header area:** Severity badge (Finding Severity Badge) + category badge (outline variant) + title (base size, medium weight, text-primary) in a horizontal row with 0.5 rem gap, compact bottom padding
- **Content area:**
  - Description: sm font, text-secondary
  - File location (optional): xs, monospace, text-muted
  - Suggestion block (optional): `surface-raised` background, 0.75 rem padding, xs label ("Suggestion" in text-muted) + sm content in text-secondary

### 4.21 ErrorDisplay

An inline error message container used in the Reviews pages.

- **Shape:** md radius (8px)
- **Background:** `rgba(239, 68, 68, 0.12)` (status-error-muted) -- a translucent red tint over the dark surface
- **Border:** 1px, status-error at 20% opacity
- **Text:** sm font, red-400 (`#F87171`) in dark mode, red-600 (`#DC2626`) in light mode
- **Padding:** 1 rem
- **Icon (optional):** octagon-x or alert-triangle, same color as text, 1 rem size

---

## 5. Color Rules

### Primary (Chartreuse / Lime)

Use for: call-to-action buttons, active navigation fill, focus rings and glow, progress bar fills, the application logo accent, featured card border and glow, links, highlighted chart elements.

- **Dark mode value:** `#CCFF00` (bright, high-contrast chartreuse)
- **Light mode value:** `#84B300` (darkened for legibility on white surfaces)
- **Foreground on primary:** `#0F172A` (near-black) -- always dark text on the bright chartreuse
- **Tinted backgrounds:** Primary at 10% opacity for subtle highlights (e.g., unauthenticated icon container)
- **Glow:** Primary at 25--40% opacity for box-shadow glow effects
- **Focus ring:** Primary at 50% opacity

### Secondary (Teal)

Use for: secondary data visualization accents, "Wire Transfer" or specific method badges, supporting highlights, and secondary interactive accents where chartreuse would be too dominant.

- **Dark mode value:** `#14B8A6`
- **Light mode value:** `#0D9488`
- **Tinted backgrounds:** Secondary at 10--15% opacity for badge backgrounds

### Gray (Blue-Tinted Slate)

Use for: all surfaces, borders, muted text, disabled text, idle/inactive elements. **The blue undertone (~hue 220) is critical to the aesthetic. Never use pure neutral grays for surfaces or borders.**

The gray ramp provides the five dark-mode elevation levels:

| Level | Name | Hex | Purpose |
|---|---|---|---|
| 0 | base | `#080C16` | Page background |
| 1 | sidebar | `#0C1019` | Sidebar background |
| 2 | card | `#111827` | Card surfaces, popover backgrounds |
| 3 | raised | `#1A2333` | Hover states, input backgrounds, table footers |
| 4 | overlay | `#1F2D3D` | Dropdown menus, tooltips, overlay panels |

### Accents

Use accent colors exclusively for their designated semantic purpose:

- **Red / Rose:** Delete actions, error states, failed status, high severity findings, audit fail
- **Violet:** Running / in-progress status
- **Emerald:** Success / completed status
- **Amber:** Warning, cancelled status, medium severity findings (as yellow-shifted amber), processed states, audit warning
- **Blue:** Info, low severity findings, "Bank Transfer" method badges
- **Green:** Audit pass, connected status
- **Coral (`#F43F5E`):** Available for category-specific accents (e.g., spending categories in data viz)
- **Purple / Orange:** Available for avatar variety and supplementary accents

### Opacity Conventions

| Opacity | Use Case |
|---|---|
| 6--8% | Chart grid lines, very subtle dividers |
| 10% | Tinted backgrounds for status badges and primary-muted highlights |
| 12--15% | Status badge translucent backgrounds (the standard for leading-dot badges) |
| 20% | Accent borders, error ring in light mode |
| 25% | Primary glow shadow (standard intensity) |
| 30% | Intense primary glow, dark mode input tint |
| 40% | Error ring in dark mode, credit-card-style deep shadows |
| 50% | Focus ring, hover overlays, muted icon opacity |
| 60% | Dialog/sheet overlay, inactive tab text, dark heavy shadow base |
| 70% | Subdued text on complex backgrounds (e.g., credit card details) |

---

## 6. Typography Rules

### Font Stack

- **Body/UI text:** Geist Sans (variable font) with system-ui, -apple-system, sans-serif fallback
- **Code/monospace:** Geist Mono (variable font) with ui-monospace, SFMono-Regular, monospace fallback

### Size Ladder

| Name | Size | Line Height | Px Equiv. | Typical Use |
|---|---|---|---|---|
| 2xs | 0.625 rem | 0.875 rem | 10px | Section headers in sidebar (MENU, FEATURES, TOOLS), uppercase labels |
| xs | 0.75 rem | 1 rem | 12px | Badge text, timestamps, labels, table detail cells, shortcuts |
| sm | 0.8125 rem | 1.25 rem | 13px | Body text, descriptions, table cells, button text, form labels |
| base | 0.875 rem | 1.25 rem | 14px | Navigation item text, paragraph text, input text on desktop |
| lg | 1 rem | 1.5 rem | 16px | Section headings within cards, dialog titles, monospace card numbers |
| xl | 1.25 rem | 1.75 rem | 20px | Page title in header |
| 2xl | 1.5 rem | 2 rem | 24px | Dashboard page headings, hero text |
| 3xl | 1.875 rem | 2.25 rem | 30px | Metric card large values |
| 4xl | 2.25 rem | 2.5 rem | 36px | Available for oversized hero numbers |
| 5xl | 3 rem | 1 (no extra leading) | 48px | Review scores, very large numeric displays |

**Key change from v1:** The base size shifts from 16px (1 rem) down to 14px (0.875 rem), creating a denser, more information-rich feel. The new 2xs step (10px) supports the uppercase section headers borrowed from the Vektora sidebar pattern. Mobile input text remains at base (14px) rather than the former 16px to maintain the dense aesthetic, though this may require explicit font-size declarations to prevent iOS zoom (>= 16px).

### Weight Rules

| Weight | Name | Use |
|---|---|---|
| 400 | normal | Body text, descriptions, card labels, inactive nav items |
| 500 | medium | Form labels, active (non-highlighted) nav items, button text, dropdown labels, badge text |
| 600 | semibold | Card titles, section headings, sheet titles, active nav item text, sidebar section headers, pagination active page |
| 700 | bold | Page headings, metric numbers, user names, large numeric displays |

### OpenType Features

- `rlig` and `calt` enabled globally for proper ligature and contextual-alternate rendering
- Tabular numerals (`font-variant-numeric: tabular-nums`) on all metric values, scores, timestamps, monetary values, and numeric table cells -- ensures columns of numbers align vertically
- Letter-spacing:
  - `tight` (-0.025em): Large headings (2xl+)
  - `normal` (0): Body text
  - `wide` (0.05em): Monospace card numbers
  - `wider` (0.1em): Uppercase section labels (sidebar groups)

### Rendering

- Antialiased font smoothing on all platforms
- Monospace font used for: repository names, file paths, version numbers, code snippets, task IDs, payment IDs, chunk counts

---

## 7. Spacing & Radius

### Spacing Scale

Based on a 4px grid (0.25 rem increments). Common values in use:

| Token | Value | Typical Use |
|---|---|---|
| 0.5 | 0.125 rem | Badge vertical padding |
| 1 | 0.25 rem | Tight gaps (nav item spacing, sidebar item gap, tab trigger padding) |
| 1.5 | 0.375 rem | Gap between dot and text in status badges, dropdown item vertical padding |
| 2 | 0.5 rem | Badge horizontal padding, table cell padding, button gap, header icon gap |
| 2.5 | 0.625 rem | Badge horizontal padding (status badges) |
| 3 | 0.75 rem | Input horizontal padding, nav padding, button row gap, sidebar nav item padding, table cell padding |
| 4 | 1 rem | Card internal gaps, sheet/dialog padding, sidebar padding, section gap within cards |
| 5 | 1.25 rem | Card padding (all sides) |
| 6 | 1.5 rem | Page gutter (main content padding), section gap between page elements, card content vertical gap |
| 8 | 2 rem | Page gutter on 2xl screens, large section separators |

### Radius Scale

| Name | Value | Use |
|---|---|---|
| xs | 4px | Checkbox corners, chart bar top corners |
| sm | 6px | Select items, dropdown items, active tab trigger within default tabs |
| md | 8px | Buttons, inputs, selects, tab list container, nav item active state, sidebar search |
| lg | 12px | Cards, dialog content, toast, credit-card style elements |
| xl | 16px | Oversized cards, specialty containers |
| 2xl | 20px | Available for feature panels |
| full | 9999px | Badges, progress bars, avatar circles, filter pills |

---

## 8. Dark Mode (Default) and Light Mode

### The Five-Level Elevation System (Dark Mode)

In dark mode, depth is communicated through surface brightness. Shadows are minimal or absent. Each successive elevation level is slightly brighter, with the same blue-tinted hue:

| Level | Token | Hex | Role |
|---|---|---|---|
| 0 -- Base | `background` | `#080C16` | The darkest surface. Page background, the canvas behind everything. |
| 1 -- Sidebar | `surface-sidebar` | `#0C1019` | Sidebar background. Just barely brighter than base, creating a subtle distinction. |
| 2 -- Card | `surface-card` | `#111827` | Primary content containers: cards, popovers, dialog/sheet content, toast backgrounds. The main "content surface." |
| 3 -- Raised | `surface-raised` | `#1A2333` | Hover states for table rows and list items, input backgrounds (`surface-input` is a dedicated token at `#0D111B` -- slightly darker than card for inset fields), table footers, secondary button backgrounds. |
| 4 -- Overlay | `surface-overlay` | `#1F2D3D` | Dropdown menus, tooltips, and other floating elements that need to visually sit above cards. The brightest non-interactive surface. |

Additionally:
- `surface-input` (`#0D111B`) is a purpose-built token for input field backgrounds, positioned between sidebar and card brightness to create a "recessed" effect for form fields.

### Token Swap Rules (Light Mode)

When light mode is active, the elevation system inverts:

| Token | Dark Value | Light Value |
|---|---|---|
| `background` | `#080C16` | `#F8FAFC` (light blue-tinted off-white) |
| `surface-sidebar` | `#0C1019` | `#FFFFFF` |
| `surface-card` | `#111827` | `#FFFFFF` |
| `surface-raised` | `#1A2333` | `#F1F5F9` |
| `surface-overlay` | `#1F2D3D` | `#FFFFFF` |
| `surface-input` | `#0D111B` | `#F1F5F9` |
| `text-primary` | `#F8FAFC` | `#0F172A` |
| `text-secondary` | `#94A3B8` | `#475569` |
| `text-muted` | `#64748B` | `#94A3B8` |
| `text-disabled` | `#475569` | `#CBD5E1` |
| `text-on-primary` | `#0F172A` | `#0F172A` (same -- always dark on chartreuse) |
| `border-default` | `#1E293B` | `#E2E8F0` |
| `border-subtle` | `#162031` | `#F1F5F9` |
| `border-strong` | `#334155` | `#CBD5E1` |
| `primary` | `#CCFF00` | `#84B300` (darkened for white-bg contrast) |
| `primary-hover` | `#DBFF55` | `#628A00` |
| `primary-glow` | `rgba(204, 255, 0, 0.30)` | `rgba(132, 179, 0, 0.25)` |
| `ring` | `rgba(204, 255, 0, 0.50)` | `rgba(132, 179, 0, 0.50)` |
| `secondary` | `#14B8A6` | `#0D9488` |
| `status-*` | 400-weight accent values | 600-weight accent values (darker for white-bg contrast) |
| `shadow-color` | `rgba(0, 0, 0, 0.60)` | `rgba(15, 23, 42, 0.08)` |

### Component-Level Mode Adjustments

- **Cards:** In light mode, cards gain a subtle sm shadow for definition (since brightness-based elevation is not effective on white surfaces). In dark mode, shadows are near-invisible.
- **Featured card glow:** Retains the primary accent but at reduced glow intensity in light mode (25% vs 30% opacity).
- **Status badges:** Text shifts from 400-weight hues (dark) to 600-weight hues (light) to maintain contrast. The leading dot color stays at the 500 midpoint in both modes.
- **Error displays:** Text shifts from rose-400 (dark) to rose-600 (light).
- **Active nav item:** Chartreuse fill in both modes, but the hue shifts (`#CCFF00` dark, `#84B300` light). Text is always `#0F172A`.
- **Sidebar:** In light mode gets a white background with a light-slate right border. The expanded/collapsed behavior is identical.

---

## 9. Motion

### Default Transition

All interactive state changes (hover, focus, active) use:
- Duration: 150ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Properties: background-color, border-color, color, opacity (as applicable)

### Page Transitions

- **fadeIn:** 300ms ease-out. Opacity 0 to 1. Applied to the main content area on page load/navigation.

### Slide Up

- **slideUp:** 400ms with spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`). translateY 12px to 0 + opacity 0 to 1. Available for staggered entrance effects on card grids.

### Spin

- **spin:** 1s linear infinite. Full 360-degree rotation. Used on loading spinners (refresh icons, loader icons).

### Popover / Dropdown / Select Animations

- **popoverIn:** 150ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`. Scale 0.95 to 1.0 + opacity 0 to 1. Applied with a directional slide (8px from the trigger direction).
- **popoverOut:** 100ms, ease-in. Scale 1.0 to 0.95 + opacity 1 to 0.

### Dialog Animations

- **animateIn:** 200ms ease-out. Opacity 0 to 1 + scale 0.95 to 1.0. No directional slide (dialog is centered).
- **animateOut:** 200ms ease-in. Reverse of animateIn.

### Sheet Animations

- **sheetIn:** 500ms ease-in-out. Slides in from the specified edge (translateX or translateY from 100%/-100% to 0).
- **sheetOut:** 300ms ease-in-out. Slides out to the specified edge.

### Glow Pulse (New)

- **glowPulse:** 2s ease-in-out, infinite repeat. Oscillates the box-shadow intensity on featured cards:
  - 0%: `0 0 20px rgba(204, 255, 0, 0.15)`
  - 50%: `0 0 30px rgba(204, 255, 0, 0.30)`
  - 100%: `0 0 20px rgba(204, 255, 0, 0.15)`
- Use sparingly -- only on the single featured metric card on the dashboard. The pulse is subtle and should not distract from the data.

### Chart Bar Grow (New)

- **chartBarGrow:** 600ms with spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`). scaleY from 0 to 1 with transform-origin at bottom. Applied to chart bars on initial render.
- Not currently used in Repo-Ninja pages but documented for data visualization extensions.

### Sidebar Collapse (New)

- **sidebarCollapse:** 250ms with standard easing (`cubic-bezier(0.4, 0, 0.2, 1)`). Transitions the sidebar width from 15 rem to 4 rem (or reverse). Content within the sidebar (text labels, search input) fades out/in during the transition.

### Theme Toggle

- Sun icon: rotates from 0 to -90 degrees and scales from 1 to 0 (when switching to dark mode)
- Moon icon: rotates from 90 to 0 degrees and scales from 0 to 1 (when switching to dark mode)
- Standard CSS transition on transform properties

### Reduced Motion

When the user's system requests reduced motion (`prefers-reduced-motion: reduce`), **all animations and transitions are forced to near-zero duration (0.01ms)**. This applies to:
- All keyframe animations (fadeIn, slideUp, spin, glowPulse, chartBarGrow, sidebarCollapse)
- All transitions (hover, focus, popover, sheet)
- Pseudo-element animations
- The sidebar collapse becomes instant
- The glow pulse is disabled entirely

---

## 10. Accessibility

### Focus Rings

Every interactive element has a visible focus indicator using the chartreuse primary:

- **Ring:** 3px solid in the `ring` token -- primary at 50% opacity (`rgba(204, 255, 0, 0.50)` dark, `rgba(132, 179, 0, 0.50)` light). This produces a visible glow effect, especially prominent on dark surfaces.
- **Border:** Shifts to the primary color on focus-visible
- **Exception:** Dialog/sheet close buttons use a 2px ring with a 2px ring-offset
- **Checkbox focus:** Same 3px chartreuse glow ring

The chartreuse focus ring is highly visible on the dark blue-tinted surfaces, exceeding WCAG 2.1 requirements for focus indicator visibility.

### Invalid State

Form elements with invalid data:

- **Ring:** `status-error` at 20% opacity (dark: 40%)
- **Border:** Solid `status-error` color
- The glow shifts from chartreuse to a subtle red tint

### Screen Reader Patterns

- Close buttons on dialogs and sheets include a visually-hidden "Close" label
- Icon-only buttons use accessible labels (e.g., "Toggle theme", "Settings", "Sign out", "Collapse sidebar", "Expand sidebar")
- The sidebar collapse toggle announces "Collapse sidebar" / "Expand sidebar" based on current state
- The theme toggle announces "Switch to light mode" / "Switch to dark mode"
- Tables use proper semantic markup (`thead`, `tbody`, `th`, `td`, `caption`)
- Status badges convey meaning through text ("Running", "Failed", etc.), not color alone -- the leading dot is decorative
- Select item indicators (check icons) are decorative; selection state is managed by the component primitives

### Color Contrast

- All text meets WCAG 2.1 AA contrast ratios against their backgrounds
- The bright chartreuse (`#CCFF00`) on the near-black base surface (`#080C16`) exceeds 7:1 contrast ratio
- The darkened light-mode primary (`#84B300`) on white exceeds 4.5:1
- Status badge text colors shift between 400 (dark) and 600 (light) weight hues to maintain adequate contrast in both modes
- Finding severity badges use white-on-dark or dark-on-light pairings chosen for contrast
- The `text-on-primary` token (`#0F172A`) against chartreuse `#CCFF00` exceeds 7:1

### Keyboard Navigation

- All interactive elements are reachable via Tab
- Dialogs and sheets trap focus while open
- Select and dropdown menus support arrow-key navigation
- Tabs support left/right arrow keys (horizontal) or up/down (vertical)
- Escape closes dialogs, sheets, dropdowns, and selects
- The sidebar collapse toggle is keyboard-accessible (responds to Enter and Space)
- When the sidebar collapses, focus is not lost -- it remains on the toggle button

### Disabled State

- Opacity reduced to 50%
- Pointer events disabled
- Cursor changes to not-allowed where applicable

---

## 11. Token Reference

All values defined in this brief are sourced from and validated against:

- **`ui-design-tokens-v2.jsonc`** -- The complete token file (sibling to this document)

The JSONC file contains:

| Section | Contents |
|---|---|
| `palettes.primary` | Chartreuse/lime ramp 50--950 (hex + HSL annotations) |
| `palettes.secondary` | Teal ramp 50--950 (hex + HSL annotations) |
| `gray` | Blue-tinted slate ramp 50--950 + dark elevation map (base, sidebar, card, raised, overlay) |
| `accents` | Green, red, amber, blue, coral, purple, orange, violet, emerald, rose, yellow |
| `tokens.dark` / `tokens.light` | All semantic tokens for both themes (surfaces, text, borders, interactive, status, chart, focus ring, shadows) |
| `typography` | Font families (Geist Sans/Mono), size scale (2xs through 5xl), weights, OpenType features, letter-spacing, usage map |
| `spacing` | Full spacing scale (4px grid) with usage annotations |
| `radius` | xs through full with usage annotations |
| `shadows` | sm through xl + glow-primary + glow-primary-intense + card-featured + credit-card |
| `gradients` | Featured card border gradient, page background vignette |
| `breakpoints` | sm (640) / md (768) / lg (1024) / xl (1280) / 2xl (1536) |
| `animations` | All animation definitions: fadeIn, slideUp, spin, glowPulse, chartBarGrow, sidebarCollapse, popoverIn, popoverOut |
| `components` | Full specs for: sidebar, header, button, badge, card (standard + featured), input, textarea, select, checkbox, tabs, table, dialog, sheet, dropdownMenu, statusBadge, findingSeverity, auditCheckStatus, navItem, progressBar, toast, themeToggle, findingCard, errorDisplay |
| `layout` | Shell structure, sidebar (expanded + collapsed), main content, responsive behavior, grid definitions |
| `opacityConventions` | Standard opacity modifiers and their use cases |
| `iconography` | Icon style, default/small sizes, catalog |
