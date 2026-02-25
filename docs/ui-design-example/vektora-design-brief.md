# UI Implementation Brief — Fintech Dashboard ("Qiespend")

> **Token file:** `vektora-design-tokens.jsonc` (all values referenced below live there)

---

## What You Are Building

A dark-first fintech dashboard with a collapsible left sidebar, a minimal top header, and a fluid main content area. The interface manages personal finances: revenue tracking, savings, spending limits, available balance with a bar chart, a transaction table with filtering/pagination, and a credit-card display.

The design uses a **chartreuse/lime** primary accent on an extremely dark blue-tinted background. Surfaces are layered through subtle brightness steps rather than shadows. The overall aesthetic is premium, information-dense, and data-forward.

---

## Global Shell

The page is a horizontal flex container spanning the full viewport height.

- **Sidebar** (left): Fixed 15 rem wide (collapsible to 4 rem). Sticky, full height, separated from the main area by a subtle right border. Contains: logo + collapse toggle, a search input, and three collapsible nav sections (MENU, FEATURES, TOOLS). The active nav item gets a solid primary-400 fill with dark text; inactive items are muted with a hover tint.
- **Main area** (right): Takes all remaining width. 1.5 rem horizontal padding (2 rem on 2xl). 1.5 rem vertical padding. No max-width cap — the layout is fluid.
- **Header** sits at the top of the main area (not a global bar): page title on the left, three icon buttons (history, notification, user avatar) on the right.

### Responsive Rules (use token `breakpoints`)

| Below md (< 768) | md – lg (768–1023) | lg + (≥ 1024) |
|---|---|---|
| Sidebar hidden or slides in as an overlay | Sidebar visible | Sidebar visible, 15 rem |
| Metric cards stack 1-col | Metric cards 2-col | Metric cards 3-col |
| Spending + balance stack 1-col | Spending + balance stack or 2-col | 2-col ~40/60 split |
| Table scrolls horizontally | Full table | Full table |

---

## Page Sections (top to bottom)

### 1. Action Bar
Two outline buttons ("Generate Report", "Export") on the left; a search input on the right. All use `components.actionBar` specs.

### 2. Metric Cards Row (3 cards)
Three cards in a responsive grid (`layout.grid.metricCards`). Each card shows a small label, a large monetary value (3xl, bold, tabular-nums), and a "Vs Last month" footer with a clock icon.

**The middle card ("Total Saving") is the featured variant**: it has a 2 px solid primary-400 left border and a lime glow box-shadow (see `shadows.card-featured`). Optionally animate with `animations.glowPulse`.

### 3. Middle Row — Two Cards Side by Side

**Left: AI-Generated Spending Limits**
- Large dollar value at the top
- A horizontal segmented bar showing four spending categories by percentage. Each segment is color-coded (coral, blue, teal, dark-slate). Fully rounded track, 0.5 rem tall.
- A 2×2 legend grid: colored dot + category name + percentage
- Below: a credit-card visual using a dark gradient background (teal-green to dark), VISA logo, card number in monospace, chip icon with a lime gradient, cardholder name and expiry. See `components.creditCard` and `gradients.creditCard`.

**Right: Available Balance**
- Large dollar value
- Action row: "Request" outline button, "Transfer" primary-filled button (with arrow icon), menu icon
- A segmented "Line view / Bar view" toggle (pill-shaped, dark bg, active tab gets card bg + border)
- A vertical bar chart (Jan–Sep). All bars are idle-colored (dark raised surface) except one highlighted month in primary-400 (bright chartreuse). Bars have rounded tops (xs radius). Y-axis and X-axis labels in xs, muted. See `components.barChart`.
- Footer: "Vs Last month" with clock icon

### 4. Transaction Table

**Filter bar** above the table: search input, filter pills (pill-shaped, muted bg/border), "More" dropdown pill, "Import" and "Export" ghost buttons on the right.

**Table**: header row with muted medium-weight labels, body rows with subtle bottom borders, hover tint. Columns:

| Checkbox | Payment ID (mono) | Total Amount | To (avatar + name) | Payment Period | Payment Method (badge) | Processed Date | Status (badge) |

- **Avatars**: 1.75 rem circles in varied accent colors (orange, green, blue, purple) with white initials.
- **Method badges**: pill-shaped, muted tinted backgrounds. "Wire Transfer" uses secondary-teal tint; "Bank Transfer" uses blue tint. See `components.transactionTable.methodBadge`.
- **Status badges**: pill-shaped with a small leading dot. "Received" = green, "Failed" = red, "Processed" = amber. See `components.transactionTable.statusBadge`.

**Pagination** below the table: numbered page buttons (active page = primary fill, others = muted), prev/next arrows, ellipsis, "Showing X to Y of Z entries" text, "Show All" link.

### 5. Upgrade Banner (floating)

Fixed to the bottom-left corner (1.5 rem offset). A small card (16 rem wide) with a crown/sparkle icon in primary, "Upgrade Pro!" heading, description text, a primary "Upgrade" button with sparkle icon, and a "Learn more" text link. Has a close (x) button in the top-right.

---

## Dark Mode (default)

All surfaces use the `tokens.dark` map. The five elevation levels (base → sidebar → card → raised → overlay) create depth through brightness alone — shadows are minimal. The primary accent is bright chartreuse (#CCFF00). Status and accent colors use their 400-weight values for adequate contrast on dark backgrounds. Chart idle bars blend into the surface; only the highlight bar pops.

## Light Mode

Swap to `tokens.light`. Surfaces invert to white/light-gray. The primary accent darkens to primary-600 (#84B300) for legibility on white. Status colors shift to their 600-weight values. Borders become light slate. The credit card and featured-card glow retain the primary accent but with reduced glow intensity. The sidebar gets a white background with a light right border.

---

## Color Rules

- **Primary (chartreuse)**: CTAs, active nav, highlighted chart bars, pagination active page, featured-card glow, upgrade button, credit-card chip, focus rings.
- **Secondary (teal)**: "Wire Transfer" badges, spending-bar segment for dining, credit-card gradient undertone, secondary data points.
- **Gray (blue-tinted slate)**: All surfaces, borders, muted/secondary text, idle chart bars. The blue undertone is critical to the aesthetic — do not use pure neutral grays.
- **Accents**: Green = success/received, Red = error/failed, Amber = warning/processed, Blue = bank transfer / info, Coral = shopping spend, Purple + Orange = avatar variety.
- **Opacity conventions**: Use the `opacityConventions` section — e.g., 10% opacity for badge tinted backgrounds, 25–40% for glow shadows, 50% for focus rings.

## Typography Rules

- Sans-serif variable font for all UI text; monospace for card numbers, payment IDs, and code.
- **Size ladder**: 2xs (10px) for section headers → xs (12px) for labels/badges → sm (13px) for table/body → base (14px) for nav → lg (16px) for card numbers → xl (20px) for page titles → 3xl (30px) for metric values.
- **Weights**: normal (400) for body, medium (500) for buttons/nav/labels, semibold (600) for active nav/titles, bold (700) for page headings/metrics.
- Tabular numerals on all monetary values and numeric displays.
- Section headers (MENU, FEATURES, TOOLS) use uppercase, wider letter-spacing, semibold, 2xs size.

## Spacing & Radius Rules

- 4px grid. Card padding = 1.25 rem. Card gap = 1 rem. Sidebar padding = 1 rem. Table cells = 0.75 rem vertical, 1 rem horizontal.
- Radius: cards = lg (12px), buttons/inputs = md (8px), badges/pills/avatars = full (9999px), chart bar tops = xs (4px), credit card = xl (16px).

## Motion Rules

- Default transition: 150ms with cubic-bezier(0.4, 0, 0.2, 1).
- Page entrance: fadeIn 300ms.
- Chart bars: grow from zero height (600ms, spring easing) on initial load.
- Featured card glow: optional 2s infinite pulse.
- Popover/dropdown: scale 0.95→1 + fade, 150ms in / 100ms out.
- Sidebar collapse: 250ms width transition.
- Reduced motion: honor `prefers-reduced-motion` by disabling all animations.

## Accessibility

- Every interactive element needs a visible focus ring (3px, primary at 50% opacity).
- Icon-only buttons require accessible labels.
- Table uses semantic markup (thead/tbody/th/td).
- Status badges communicate meaning through text, not color alone (the label reads "Received", "Failed", etc.).
- Adequate contrast: all text meets WCAG 2.1 AA. The bright chartreuse on dark surfaces exceeds 7:1; light-mode primary-600 on white exceeds 4.5:1.
- Sidebar collapse toggle is keyboard-accessible.
- Pagination and filter pills are keyboard-navigable.
